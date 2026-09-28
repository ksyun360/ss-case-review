import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, test, vi } from 'vitest';
import { extractPdfPages, inspectPdf } from '../src/pdf.ts';

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
  await expect(inspectPdf(syntheticOnePagePdf())).resolves.toEqual({ pageCount: 1 });
  let destroy: ReturnType<typeof vi.fn> | undefined;
  const loadDocument: typeof getDocument = (source) => {
    expect(source).toMatchObject({ stopAtErrors: true });
    const task = getDocument(source);
    destroy = vi.spyOn(task, 'destroy');
    return task;
  };
  await expect(inspectPdf(syntheticOnePagePdf(), loadDocument)).resolves.toEqual({ pageCount: 1 });
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
  await expect(inspectPdf(bytes, loadDocument)).rejects.toThrow('pdf_inspection_failed');
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
    const pages = await extractPdfPages(document);
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
