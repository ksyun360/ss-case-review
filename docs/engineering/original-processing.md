# Original processing coordinator

Status: Phase 4 includes a synthetic-only server coordinator that reads an integrity-checked registered original, enforces an admission byte ceiling, confirms the PDF signature, extracts bounded pages through PDF.js, and publishes extracted page text through the atomic source repository operation. No API route, job runner, or durable processing state calls this coordinator yet.

`processPdfOriginalForReviewer` resolves the server-selected reviewer's current case and registered original before reading private bytes. The storage adapter verifies the stored length and SHA-256 against trusted metadata. The coordinator refuses an original above the supplied byte ceiling and rejects a non-PDF signature before extraction.

The concrete entry point supplies the bounded PDF.js byte adapter. Lower-level tests may supply a page extractor. Every caller supplies an explicit extraction version, a page ceiling, and a source-unit ID generator. The coordinator maps only successful physical pages to immutable source rows. Every row carries the current record revision, registered document hash and version, extraction version, physical page number, and exact extracted text. Unavailable pages become fixed `page_extraction_failed` gaps and never become empty fabricated sources.

The coordinator publishes successful pages through one all-pages-or-none PostgreSQL statement. Authorization or provenance loss before publication produces `publication_rejected` and no source rows. The current service does not persist gaps or attempts, claim jobs, retry work, isolate parser resources in a worker process, or make filesystem reads and database writes one transaction.

One PGlite and real-filesystem regression covers missing case and original metadata, byte-budget rejection, format rejection, membership loss during extraction, exact two-page publication, deterministic source identity, and one reported page gap. A second regression stores a structurally valid two-page synthetic PDF, invokes the concrete PDF.js adapter, and verifies exact persisted page text and provenance. These results do not establish extraction accuracy for real records, OCR quality, large-record latency, or court-data authorization.

Next work must add durable processing attempts and claims, persist page geometry and gaps, expose safe status, and recover interrupted jobs. Keep real records out of this path until court IT approves identity, storage, parser isolation, and the model data path.
