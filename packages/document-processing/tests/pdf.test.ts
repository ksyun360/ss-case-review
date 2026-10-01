import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, test, vi } from 'vitest';
import { extractPdfBytes, extractPdfPages, inspectPdf } from '../src/pdf.ts';

function syntheticOnePagePdf(
  contents = ['BT /F1 12 Tf 72 720 Td (Synthetic hearing) Tj ET'],
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: string[] = ['%PDF-1.4\n'];
  const offsets = [0];
  const addObject = (body: string) => {
    offsets.push(encoder.encode(chunks.join('')).byteLength);
    chunks.push(`${offsets.length - 1} 0 obj\n${body}\nendobj\n`);
  };
  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pageReferences = contents.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  addObject(`<< /Type /Pages /Kids [${pageReferences}] /Count ${contents.length} >>`);
  const fontId = 3 + contents.length * 2;
  for (const [index, content] of contents.entries()) {
    addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + index * 2} 0 R >>`,
    );
    addObject(`<< /Length ${encoder.encode(content).byteLength} >>\nstream\n${content}\nendstream`);
  }
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const xref = encoder.encode(chunks.join('')).byteLength;
  chunks.push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1))
    chunks.push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  chunks.push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return encoder.encode(chunks.join(''));
}

test('inspects a structurally valid one-page synthetic PDF', async () => {
  await expect(inspectPdf(syntheticOnePagePdf(), 1024)).resolves.toEqual({ pageCount: 1 });
  let destroy: ReturnType<typeof vi.fn> | undefined;
  const loadDocument: typeof getDocument = (source) => {
    expect(source).toMatchObject({ stopAtErrors: true });
    const task = getDocument(source);
    destroy = vi.spyOn(task, 'destroy');
    return task;
  };
  await expect(inspectPdf(syntheticOnePagePdf(), 1024, loadDocument)).resolves.toEqual({
    pageCount: 1,
  });
  expect(destroy).toHaveBeenCalledOnce();
});

test('rejects malformed PDF content with a safe error after releasing parser resources', async () => {
  let destroy: ReturnType<typeof vi.fn> | undefined;
  const loadDocument: typeof getDocument = (source) => {
    const task = getDocument(source);
    destroy = vi.spyOn(task, 'destroy');
    return task;
  };
  const bytes = new TextEncoder().encode('%PDF-1.7\nsynthetic malformed content');
  await expect(inspectPdf(bytes, 1024, loadDocument)).rejects.toThrow('pdf_inspection_failed');
  expect(destroy).toHaveBeenCalledOnce();
});

test('extracts every native PDF page with stable text offsets and source geometry', async () => {
  const bytes = syntheticOnePagePdf([
    '/Artifact BMC BT /F1 12 Tf 72 720 Td (Synthetic hearing) Tj 0 -20 Td (No new evidence) Tj ET EMC',
    'BT /F1 12 Tf 100 600 Td (Second page) Tj ET',
    '',
  ]);
  const task = getDocument({
    data: bytes,
    stopAtErrors: true,
    standardFontDataUrl: new URL(
      '../../../node_modules/pdfjs-dist/standard_fonts/',
      import.meta.url,
    ).pathname,
  });
  try {
    const document = await task.promise;
    const getPage = document.getPage.bind(document);
    const observations: { cleanup: ReturnType<typeof vi.fn>; text: ReturnType<typeof vi.fn> }[] =
      [];
    vi.spyOn(document, 'getPage').mockImplementation(async (pageNumber) => {
      const page = await getPage(pageNumber);
      observations.push({
        cleanup: vi.spyOn(page, 'cleanup'),
        text: vi.spyOn(page, 'getTextContent'),
      });
      return page;
    });
    const results = await extractPdfPages(document, 3);
    expect(results.map((page) => page.status)).toEqual(['extracted', 'extracted', 'extracted']);
    const pages = results.filter((page) => page.status === 'extracted');
    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.pageNumber)).toEqual([1, 2, 3]);
    expect(pages.map((page) => page.rawText)).toEqual([
      'Synthetic hearing\nNo new evidence',
      'Second page',
      '',
    ]);
    expect(pages.map((page) => page.view)).toEqual(
      Array.from({ length: 3 }, () => [0, 0, 612, 792]),
    );
    expect(pages.map((page) => page.rotation)).toEqual([0, 0, 0]);
    expect(pages[0]?.items).toEqual([
      {
        start: 0,
        end: 17,
        transform: [12, 0, 0, 12, 72, 720],
        width: expect.any(Number),
        height: 12,
      },
      {
        start: 18,
        end: 33,
        transform: [12, 0, 0, 12, 72, 700],
        width: expect.any(Number),
        height: 12,
      },
    ]);
    expect(pages[1]?.items).toEqual([
      {
        start: 0,
        end: 11,
        transform: [12, 0, 0, 12, 100, 600],
        width: expect.any(Number),
        height: 12,
      },
    ]);
    expect(pages[2]?.items).toEqual([]);
    for (const observation of observations) {
      expect(observation.cleanup).toHaveBeenCalledOnce();
      expect(observation.text).toHaveBeenCalledWith({
        includeMarkedContent: true,
        disableNormalization: true,
      });
    }
  } finally {
    await task.destroy();
  }
});

test('rejects invalid or exceeded PDF page budgets before reading any page', async () => {
  const task = getDocument({ data: syntheticOnePagePdf(), stopAtErrors: true });
  try {
    const document = await task.promise;
    const getPage = vi.spyOn(document, 'getPage');
    for (const maximumPages of [0, -1, 0.5, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(extractPdfPages(document, maximumPages)).rejects.toThrow(
        'invalid_pdf_page_budget',
      );
    }
    expect(getPage).not.toHaveBeenCalled();
    const largeTask = getDocument({ data: syntheticOnePagePdf(['', '']), stopAtErrors: true });
    try {
      const largeDocument = await largeTask.promise;
      const largeGetPage = vi.spyOn(largeDocument, 'getPage');
      await expect(extractPdfPages(largeDocument, 1)).rejects.toThrow('pdf_page_budget_exceeded');
      expect(largeGetPage).not.toHaveBeenCalled();
    } finally {
      await largeTask.destroy();
    }
  } finally {
    await task.destroy();
  }
});

test('retains successful PDF pages and records safe gaps after page-processing failures', async () => {
  const task = getDocument({
    data: syntheticOnePagePdf([
      '',
      '',
      'BT /F1 12 Tf 72 720 Td (Retained source) Tj ET',
      '',
      'BT /F1 12 Tf 72 720 Td (Final source) Tj ET',
    ]),
    stopAtErrors: true,
    standardFontDataUrl: new URL(
      '../../../node_modules/pdfjs-dist/standard_fonts/',
      import.meta.url,
    ).pathname,
  });
  try {
    const document = await task.promise;
    const getPage = document.getPage.bind(document);
    const diagnostic = new Error('Synthetic private extraction diagnostic');
    const cleanups: ReturnType<typeof vi.fn>[] = [];
    const pageCalls = vi.spyOn(document, 'getPage').mockImplementation(async (pageNumber) => {
      if (pageNumber === 1) throw diagnostic;
      const page = await getPage(pageNumber);
      if (pageNumber === 2) {
        vi.spyOn(page, 'getTextContent').mockRejectedValue(diagnostic);
        cleanups.push(vi.spyOn(page, 'cleanup'));
      }
      if (pageNumber === 4) {
        const cleanup = page.cleanup.bind(page);
        cleanups.push(
          vi.spyOn(page, 'cleanup').mockImplementation(() => {
            cleanup();
            throw diagnostic;
          }),
        );
      }
      return page;
    });
    const pages = await extractPdfPages(document, 5);
    expect(pages).toHaveLength(5);
    expect(pages.map((page) => page.pageNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(pages.map((page) => page.status)).toEqual([
      'unavailable',
      'unavailable',
      'extracted',
      'unavailable',
      'extracted',
    ]);
    for (const index of [0, 1, 3]) {
      expect(pages[index]).toEqual({
        pageNumber: index + 1,
        status: 'unavailable',
        reason: 'page_extraction_failed',
      });
    }
    expect(pages[2]).toMatchObject({ rawText: 'Retained source' });
    expect(pages[4]).toMatchObject({ rawText: 'Final source' });
    expect(pageCalls.mock.calls).toEqual([[1], [2], [3], [4], [5]]);
    for (const cleanup of cleanups) expect(cleanup).toHaveBeenCalledOnce();
    expect(JSON.stringify(pages)).not.toContain(diagnostic.message);
  } finally {
    await task.destroy();
  }
});

test('enforces PDF inspection byte budgets before creating a parser task', async () => {
  const bytes = syntheticOnePagePdf();
  const snapshot = new Uint8Array(bytes);
  const loadDocument = vi.fn(getDocument);
  for (const maximumBytes of [0, -1, 0.5, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await expect(inspectPdf(bytes, maximumBytes, loadDocument)).rejects.toThrow(
      'invalid_pdf_byte_budget',
    );
  }
  await expect(inspectPdf(bytes, bytes.byteLength - 1, loadDocument)).rejects.toThrow(
    'pdf_byte_budget_exceeded',
  );
  expect(loadDocument).not.toHaveBeenCalled();
  await expect(inspectPdf(bytes, bytes.byteLength, loadDocument)).resolves.toEqual({
    pageCount: 1,
  });
  expect(loadDocument).toHaveBeenCalledOnce();
  expect(bytes).toEqual(snapshot);
  await expect(inspectPdf(new Uint8Array(), 1, loadDocument)).rejects.toThrow(
    'pdf_inspection_failed',
  );
  expect(loadDocument).toHaveBeenCalledTimes(2);
});

test('loads bounded PDF bytes into extracted pages and always releases parser resources', async () => {
  const bytes = syntheticOnePagePdf([
    'BT /F1 12 Tf 72 720 Td (First source page) Tj ET',
    'BT /F1 12 Tf 72 720 Td (Second source page) Tj ET',
  ]);
  const snapshot = new Uint8Array(bytes);
  const destroyed: ReturnType<typeof vi.fn>[] = [];
  const loadDocument: typeof getDocument = (source) => {
    expect(source).toMatchObject({ stopAtErrors: true });
    const task = getDocument(source);
    destroyed.push(vi.spyOn(task, 'destroy'));
    return task;
  };

  for (const maximumBytes of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await expect(extractPdfBytes(bytes, maximumBytes, 2, loadDocument)).rejects.toThrow(
      'invalid_pdf_byte_budget',
    );
  }
  expect(destroyed).toEqual([]);
  await expect(extractPdfBytes(bytes, bytes.byteLength - 1, 2, loadDocument)).rejects.toThrow(
    'pdf_byte_budget_exceeded',
  );
  expect(destroyed).toEqual([]);
  await expect(extractPdfBytes(bytes, bytes.byteLength, 1, loadDocument)).rejects.toThrow(
    'pdf_page_budget_exceeded',
  );
  await expect(extractPdfBytes(bytes, bytes.byteLength, 0, loadDocument)).rejects.toThrow(
    'invalid_pdf_page_budget',
  );
  await expect(extractPdfBytes(new Uint8Array([0]), 1, 2, loadDocument)).rejects.toMatchObject({
    message: 'pdf_extraction_failed',
    cause: expect.any(Error),
  });
  await expect(
    extractPdfBytes(new TextEncoder().encode('%PDF-malformed'), 100, 2, loadDocument),
  ).rejects.toMatchObject({ message: 'pdf_extraction_failed', cause: expect.any(Error) });
  await expect(extractPdfBytes(bytes, bytes.byteLength, 2, loadDocument)).resolves.toMatchObject([
    { status: 'extracted', pageNumber: 1, rawText: 'First source page' },
    { status: 'extracted', pageNumber: 2, rawText: 'Second source page' },
  ]);
  expect(bytes).toEqual(snapshot);
  expect(destroyed).toHaveLength(5);
  for (const destroy of destroyed) expect(destroy).toHaveBeenCalledOnce();
});
