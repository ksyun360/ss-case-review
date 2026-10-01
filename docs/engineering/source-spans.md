# Source-span validation

Status: Internal text-span contract implemented. The [local original-storage adapter](local-original-storage.md) preserves document bytes separately, and a [text-source repository and API](text-source-storage.md) store and retrieve synthetic source identity and exact text through member-scoped SQL. One regression connects repository retrieval to the validator, and the case screen can open stored exact text. Extraction publication, span APIs, geometry mapping, and artifact-to-source navigation remain pending.

The record-domain package exposes `locateSourceSpan` through `@record-review/record-domain/source-span`. The [implementation](../../packages/record-domain/src/source-span.ts) checks a typed candidate against a trusted stored-text unit. The validator performs no network request, file read, database query, model call, or text normalization.

## Inputs and trust boundary

The caller supplies a case identifier from authorized server context, a trusted source unit or `undefined`, and a typed candidate. The source unit carries case identity, record revision, document-version identity, document SHA-256 metadata, extraction version, source-unit identity, and raw extracted text. The candidate identifies the expected source version and supplies start/end offsets and the proposed literal quotation.

The caller must validate external payload shapes, identifiers, numeric fields, and size limits before invoking this function. TypeScript declarations do not validate JSON. The caller must enforce user/case membership before loading source text. Comparing case identifiers inside this function adds a reference check; the comparison does not authenticate a user or authorize a database request.

Use trusted storage metadata for the source unit. Never treat a client-supplied source object or model-generated text as the trusted source. The hash comparison checks matching metadata; the validator does not compute a file hash or prove that stored bytes match the supplied hash. The storage layer must establish and preserve that relationship.

## Matching behavior

The validator rejects a missing source or a source from another case without returning passage text. The validator also rejects mismatches in record revision, document version, document hash, extraction version, or source-unit identity.

Offsets count JavaScript UTF-16 code units, starting at zero. The start is inclusive; the end is exclusive. A quote can cover the entire source unit. The validator rejects negative starts, ends beyond the text, empty or reversed spans, and noninteger positions. JavaScript slicing must not silently round or truncate the requested selection.

After checking identity and bounds, the validator compares the proposed quotation with the exact raw-text slice. The comparison preserves spelling, capitalization, punctuation, whitespace, and Unicode text. A different quotation fails; the validator performs no fuzzy matching or silent correction. On success, the validator returns the source identity, offsets, and text sliced from the trusted source.

| Result                               | Meaning                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `located`                            | The candidate identifies this source version and exactly matches the selected raw text.                           |
| `not_located` / `source_unavailable` | The source lookup supplied no unit, or the supplied unit belongs to another case. The result contains no passage. |
| `not_located` / `source_mismatch`    | At least one source-version identifier differs. The result contains no passage.                                   |
| `not_located` / `invalid_offsets`    | The selection violates the integer, ordering, or text-bound rules. The result contains no passage.                |
| `not_located` / `quote_mismatch`     | The proposed quotation differs from the selected raw text. The result contains no passage.                        |

These result codes describe a lookup/validation outcome. A failure does not establish that evidence does not exist elsewhere in the record. A successful text match does not establish OCR fidelity, medical significance, legal support, or the relevance of a passage to an argument. Preserve those distinctions in later API responses and reviewer-facing states.

## Verification and remaining work

The [source-span tests](../../packages/record-domain/tests/source-span.test.ts) cover missing sources, cross-case references, each version field, changed quotations, full-unit boundaries, negative/oversized/empty/reversed/fractional/invalid-number positions, and Unicode offsets. Each case entered a separate checked feature-branch commit. The package participates in strict type checking, compilation, coverage, and the full mutation gate.

Next implementation work must connect original storage to source-unit extraction, persisted page/native-unit locators, span APIs, and geometry transforms. The artifact pipeline must use validated spans before publication. The browser opens the correct stored source revision as exact text but does not map offsets to a highlighted passage in an original document. No current UI or API publishes case findings through this module.
