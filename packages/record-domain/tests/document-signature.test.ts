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

test('recognizes both TIFF byte-order signatures without accepting near matches', () => {
  const signatures = [
    Uint8Array.of(0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00),
    Uint8Array.of(0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08),
  ];
  for (const signature of signatures) {
    expect(detectDocumentSignature(signature)).toBe('tiff');
    expect(detectDocumentSignature(signature.subarray(0, 3))).toBe('unknown');
    for (let index = 0; index < 4; index += 1) {
      const corrupt = signature.slice();
      corrupt[index] = 0x58;
      expect(detectDocumentSignature(corrupt)).toBe('unknown');
    }
  }
});
