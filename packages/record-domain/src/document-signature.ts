export type DocumentSignature = 'pdf' | 'unknown';

export function detectDocumentSignature(bytes: Uint8Array): DocumentSignature {
  return bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
    ? 'pdf'
    : 'unknown';
}
