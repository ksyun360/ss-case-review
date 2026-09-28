# Internal document inspection

Status: Phase 4 includes internal signature checks, a PDF parser, and native PDF text extraction. Upload routes and browser status do not call these modules yet. A registered original remains uninspected.

## Signature checks

`detectDocumentSignature` in `@record-review/record-domain/document-signature` classifies a `%PDF-` prefix at byte zero and the two classic TIFF byte-order signatures. The function returns `unknown` for other prefixes. The tests reject shifted, truncated, and byte-corrupted near matches. The TIFF cases follow the [IETF TIFF media-type registration](https://datatracker.ietf.org/doc/rfc2302/).

A signature does not prove valid structure, readable content, format completeness, or malware safety. Office-container classification, archive expansion limits, and TIFF-frame parsing remain pending.

## PDF parsing

`inspectPdf` in `@record-review/document-processing/pdf` uses pinned `pdfjs-dist` 6.3.289 to load a copy of the supplied bytes with `stopAtErrors: true`. A successful call returns `{ pageCount }`. A failed loading promise raises the fixed error `pdf_inspection_failed`. The function destroys the loading task in both paths. Tests use a generated one-page synthetic PDF and malformed synthetic bytes; an observed real loader checks the strict-loading option and cleanup.

The implementation follows Mozilla's [Node loading example](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs). PDF.js distributes the parser through npm under the Apache-2.0 license. The npm package declares the optional `@napi-rs/canvas` dependency; deployment qualification must cover native binaries and supported platforms before rendering or court use.

The inspection function does not extract text, render pages, inspect attachments or actions, scan malware, or establish that every page is readable. The parser currently runs in-process without a time, memory, byte, or page budget. Network isolation and password-specific handling remain unqualified. Do not connect untrusted or court records to this function before adding those boundaries.

## Native PDF text extraction

`extractPdfPages` accepts a loaded PDF.js document and visits every physical page in order. The caller owns the document loading task and must destroy that task after use. The extractor releases each page through `cleanup`, including when text extraction fails.

Each returned page contains a one-based physical page number, extracted `rawText`, PDF.js page view box and rotation, and text-item offsets and geometry. Offsets use zero-based UTF-16 positions with an inclusive start and exclusive end. The extractor concatenates PDF.js text strings without rewriting medical terms, dates, or punctuation; PDF.js end-of-line markers add newline characters. Tagged-content markers contribute no text. The extractor disables PDF.js text normalization. Extracted text remains a parser transcription, not a claim of perfect correspondence with the original visual record.

Geometry retains the PDF.js text transform, width, and height in the parser's coordinate convention. The future source mapper must convert that geometry to the approved canonical coordinates before displaying highlights. No viewer consumes these values yet. A three-page synthetic fixture checks page ordering, multiple lines, tagged content, an empty page, exact offsets, geometry, parser options, and page cleanup. An empty extracted page does not establish a blank original; image-only pages still need rendering and OCR.

The extractor has no worker isolation or resource budgets, persistent source identity, OCR, quality assessment, or upload integration. Loading-task errors and page-extraction failures require bounded worker handling before untrusted-record use.

## Verification and next integration

Run `npm test -- packages/document-processing/tests/pdf.test.ts packages/record-domain/tests/document-signature.test.ts` for focused checks. Run `npm run verify:commit` for the full gate.

Next increments must add bounded worker execution, safe encrypted/corrupt-file outcomes, OCR and extraction quality checks, immutable source units, and persisted inspection states. The upload service must distinguish receipt from inspection and extraction. Court IT must approve the malware-scanning integration and data path before real-record use. Phase 4 remains active; return to Phase 3 at the very end before pilot handoff.
