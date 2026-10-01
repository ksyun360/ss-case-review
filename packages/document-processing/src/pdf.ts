import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type PdfTextPage = Readonly<{
  status: 'extracted';
  pageNumber: number;
  rawText: string;
  view: readonly number[];
  rotation: number;
  items: readonly Readonly<{
    start: number;
    end: number;
    transform: readonly number[];
    width: number;
    height: number;
  }>[];
}>;

export type PdfPageResult =
  | PdfTextPage
  | Readonly<{ pageNumber: number; status: 'unavailable'; reason: 'page_extraction_failed' }>;

export async function extractPdfBytes(
  bytes: Uint8Array,
  maximumBytes: number,
  maximumPages: number,
  loadDocument: typeof getDocument = getDocument,
): Promise<PdfPageResult[]> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error('invalid_pdf_byte_budget');
  }
  if (bytes.byteLength > maximumBytes) {
    throw new Error('pdf_byte_budget_exceeded');
  }
  const task = loadDocument({ data: new Uint8Array(bytes), stopAtErrors: true });
  try {
    const document = await task.promise;
    return await extractPdfPages(document, maximumPages);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'invalid_pdf_page_budget' || error.message === 'pdf_page_budget_exceeded')
    ) {
      throw error;
    }
    throw new Error('pdf_extraction_failed', { cause: error });
  } finally {
    await task.destroy();
  }
}

export async function extractPdfPages(
  document: PDFDocumentProxy,
  maximumPages: number,
): Promise<PdfPageResult[]> {
  if (!Number.isSafeInteger(maximumPages) || maximumPages < 1) {
    throw new Error('invalid_pdf_page_budget');
  }
  if (document.numPages > maximumPages) {
    throw new Error('pdf_page_budget_exceeded');
  }
  const pages: PdfPageResult[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    try {
      const page = await document.getPage(pageNumber);
      let result: PdfTextPage;
      try {
        const content = await page.getTextContent({
          includeMarkedContent: true,
          disableNormalization: true,
        });
        let rawText = '';
        const items: PdfTextPage['items'][number][] = [];
        for (const item of content.items) {
          if (!('str' in item)) continue;
          const start = rawText.length;
          rawText += item.str;
          items.push({
            start,
            end: rawText.length,
            transform: [...item.transform],
            width: item.width,
            height: item.height,
          });
          if (item.hasEOL) rawText += '\n';
        }
        result = {
          status: 'extracted',
          pageNumber,
          rawText,
          view: [...page.view],
          rotation: page.rotate,
          items,
        };
      } finally {
        page.cleanup();
      }
      pages.push(result);
    } catch {
      pages.push({ pageNumber, status: 'unavailable', reason: 'page_extraction_failed' });
    }
  }
  return pages;
}

export async function inspectPdf(
  bytes: Uint8Array,
  maximumBytes: number,
  loadDocument: typeof getDocument = getDocument,
): Promise<{ pageCount: number }> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error('invalid_pdf_byte_budget');
  }
  if (bytes.byteLength > maximumBytes) {
    throw new Error('pdf_byte_budget_exceeded');
  }
  const task = loadDocument({
    data: new Uint8Array(bytes),
    stopAtErrors: true,
  });
  try {
    const document = await task.promise;
    return { pageCount: document.numPages };
  } catch {
    throw new Error('pdf_inspection_failed');
  } finally {
    await task.destroy();
  }
}
