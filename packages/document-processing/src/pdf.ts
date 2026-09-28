import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

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
