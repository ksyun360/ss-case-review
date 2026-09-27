import { expect, test } from 'vitest';
import { detectDocumentSignature } from '../src/document-signature.ts';

test('recognizes a PDF signature only at the start of original bytes', () => {
  const bytes = new TextEncoder();
  const pdf = bytes.encode('%PDF-1.7\nsynthetic content');
  expect(detectDocumentSignature(pdf)).toBe('pdf');
  expect(detectDocumentSignature(bytes.encode('x%PDF-1.7\nsynthetic content'))).toBe('unknown');
  expect(detectDocumentSignature(bytes.encode('%PDF'))).toBe('unknown');
  for (let index = 0; index < 5; index += 1) {
    const corrupt = pdf.slice();
    corrupt[index] = 0x58;
    expect(detectDocumentSignature(corrupt)).toBe('unknown');
  }
});
