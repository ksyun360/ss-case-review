# Phase 4 collaborator update

Date: September 23, 2026. Status: Phase 4 remains in progress. The application is not ready for court testing or real records.

## Shareable update

The project now includes a responsive navigation and document-selection preview, source-location validation, private original-file storage, versioned PostgreSQL case metadata, and a runnable synthetic-only case API. The backend creates draft cases and lists cases according to the configured reviewer's membership.

The case API assigns case IDs and ownership on the server, validates inputs, restricts development requests, and returns safe error codes. Startup now opens a bounded loopback PostgreSQL pool, runs migrations, and binds the API on loopback only. Native PostgreSQL tests confirm case persistence and membership filtering, including access after a membership change. A separate real-process smoke check confirmed synthetic case creation and listing across an API restart. The browser remains disconnected from these backend modules, and the upload button remains disabled.

Phase 4 is not complete. The remaining implementation includes browser integration, durable uploads and background processing, document extraction/OCR, source viewing and highlighting, Gemini integration, the four source-linked review views, corrections, and approved reference lookups. Current tests do not establish record accuracy, completeness, or processing latency.

The development team will continue with the browser-to-API synthetic case workflow before requesting full application qualification. Court IT must approve deployment, identity, certificate/PACER requirements, and the model data path before real-record testing. Hosted CI and repository protections remain scheduled for Phase 3 at the very end, before pilot handoff.

## Current evidence

The local gate passes 145 fast unit/integration tests, 8 native PostgreSQL tests, and 7 Chromium workflows. Current first-party source coverage reaches 100% across the four measured metrics; mutation testing kills all 449 generated mutants. These measurements cover implemented code, not the unfinished application. Read the [build-status report](build-status.md), [development startup guide](development-server.md), and [case API contract](case-api.md) for scope and limitations.

The current browser preview supports interface feedback only. No developer credential, real case record, or live model request enters the deterministic checks. No shared deployment or PR has occurred.

## Phase 4 completion checklist

- [x] Build the initial responsive navigation and document-selection preview.
- [x] Test initial source-span, original-storage, case-repository, and migration modules.
- [x] Implement and test the synthetic case-metadata API.
- [x] Connect guarded synthetic server startup and database lifecycle.
- [ ] Connect browser case actions to the synthetic API.
- [ ] Implement durable document uploads, inspection, extraction/OCR, and background progress.
- [ ] Persist source maps and provide original/source viewing with validated highlights.
- [ ] Integrate Gemini with bounded requests, refusal handling, and validated output contracts.
- [ ] Build the summary, medical chronology, procedural chronology, and five-step/RFC comparison.
- [ ] Add source-backed corrections, revision history, filtering, and approved reference lookups.
- [ ] Complete application integration tests and development/deployment documentation before Phase 5 qualification.

The next milestone is a browser-to-database synthetic case workflow. That milestone will not complete the remaining upload-to-review features.
