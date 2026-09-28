import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect, test, vi } from 'vitest';
import { inspectPdf } from '../src/pdf.ts';

function syntheticOnePagePdf(): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: string[] = ['%PDF-1.4\n'];
  const offsets = [0];
  const addObject = (body: string) => {
    offsets.push(encoder.encode(chunks.join('')).byteLength);
    chunks.push(`${offsets.length - 1} 0 obj\n${body}\nendobj\n`);
  };
  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  );
  const content = 'BT /F1 12 Tf 72 720 Td (Synthetic hearing) Tj ET';
  addObject(`<< /Length ${encoder.encode(content).byteLength} >>\nstream\n${content}\nendstream`);
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const xref = encoder.encode(chunks.join('')).byteLength;
  chunks.push('xref\n0 6\n0000000000 65535 f \n');
  for (const offset of offsets.slice(1))
    chunks.push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  chunks.push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
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
