import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type PdfTextPage = Readonly<{
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

export async function extractPdfPages(document: PDFDocumentProxy): Promise<PdfTextPage[]> {
  const pages: PdfTextPage[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
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
      pages.push({
        pageNumber,
        rawText,
        view: [...page.view],
        rotation: page.rotate,
        items,
      });
    } finally {
      page.cleanup();
    }
  }
  return pages;
}

export async function inspectPdf(
  bytes: Uint8Array,
  loadDocument: typeof getDocument = getDocument,
): Promise<{ pageCount: number }> {
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
