# Phase 4 collaborator update

Date: September 24, 2026. Status: Phase 4 remains in progress. The application is not ready for court testing or real records.

## Shareable update

The project includes a responsive navigation and document-selection preview, source-location validation, private original-file storage, versioned PostgreSQL case metadata, and a runnable synthetic-only case API. The backend creates drafts and lists or opens cases according to the configured reviewer's membership. An internal [original-ingestion service](original-ingestion.md) links bounded byte streams to membership-scoped PostgreSQL references. A [persistent attempt journal](upload-journal.md) records versions before receipt and tracks tested success and failure paths. The browser can create a synthetic draft, list saved labels and revisions, and open a metadata-only case page through the local development API.

The case API assigns case IDs and ownership on the server, validates inputs, restricts development requests, and returns safe error codes. An opt-in route accepts a bounded synthetic original byte stream for a member case and rejects oversized or unsupported-media requests safely. Guarded startup enables that route only when the developer supplies a dedicated absolute storage root; the default remains metadata-only. Startup opens a bounded loopback PostgreSQL pool, runs migrations, and binds the API on loopback only. Native PostgreSQL tests confirm case persistence and membership filtering, including access after a membership change. A separate real-process smoke check confirmed synthetic case creation and listing across an API restart. The browser displays loading, empty, unavailable/retry, and populated case-list states. A case page distinguishes an inaccessible case from a temporary service failure. The upload screen now registers selected synthetic originals in one new draft and shows per-file progress when the opt-in route is available. The screen does not extract or review documents.

Phase 4 is not complete. The remaining implementation includes durable uploads and background processing, document extraction/OCR, source viewing and highlighting, Gemini integration, the four source-linked review views, corrections, and approved reference lookups. Current tests do not establish record accuracy, completeness, or processing latency.

The development team will continue with durable synthetic document transfer and source provenance before requesting full application qualification. Court IT must approve deployment, identity, certificate/PACER requirements, and the model data path before real-record testing. Hosted CI and repository protections remain scheduled for Phase 3 at the very end, before pilot handoff.

## Current evidence

The local gate passes 202 fast unit/integration tests, 9 native PostgreSQL tests, and 9 Chromium workflows. Current first-party source coverage reaches 100% across the four measured metrics; the latest commit hook killed all 822 generated mutants. These measurements cover implemented code, not the unfinished application. A browser test exercises creation and case navigation at 320 pixels with intercepted API responses; the test does not prove a browser-to-database round trip. Read the [build-status report](build-status.md), [development startup guide](development-server.md), and [case API contract](case-api.md) for scope and limitations.

The current browser preview supports synthetic case-metadata feedback and opt-in synthetic original registration. The development proxy forwards case and capability requests to the loopback API when both processes run. Component tests mock the upload service; no automated browser-to-PostgreSQL file round trip has passed yet. The upload workflow lacks error recovery, document inspection, processing, and source links. No developer credential, real case record, or live model request enters the deterministic checks. No shared deployment or PR has occurred.

## Phase 4 completion checklist

- [x] Build the initial responsive navigation and document-selection preview.
- [x] Test initial source-span, original-storage, case-repository, and migration modules.
- [x] Implement and test the synthetic case-metadata API.
- [x] Connect guarded synthetic server startup and database lifecycle.
- [x] Connect the browser's synthetic case list to the local API and test loading, retry, empty, and populated states.
- [x] Connect browser synthetic draft creation and member-scoped case-detail navigation to the local API.
- [ ] Complete recoverable document uploads, inspection, extraction/OCR, and background progress; the current browser only registers synthetic originals with local per-file progress.
- [ ] Persist source maps and provide original/source viewing with validated highlights.
- [ ] Integrate Gemini with bounded requests, refusal handling, and validated output contracts.
- [ ] Build the summary, medical chronology, procedural chronology, and five-step/RFC comparison.
- [ ] Add source-backed corrections, revision history, filtering, and approved reference lookups.
- [ ] Complete application integration tests and development/deployment documentation before Phase 5 qualification.

The private storage adapter and internal ingestion service accept bounded byte streams and maintain a persistent attempt journal. An opt-in synthetic HTTP route invokes the service in isolated API tests; guarded startup exposes the route only with an explicit storage root. The API reports that configuration as a Boolean, and the upload screen displays available, disabled, or unavailable status without exposing the storage path. The browser-client helper sends one selected synthetic `File` to the route and validates the returned receipt. The upload screen now calls that helper sequentially for the selected files and links to the new draft after all receipts. A failed request currently leaves the screen without a recovery message; do not rely on the browser workflow for case records. A bounded query identifies stale receiving attempts, but no recovery worker acts on those attempts. Crash recovery and directory synchronization remain incomplete. The next milestones are browser-to-database transfer evidence and source provenance. Neither milestone alone completes the upload-to-review features.
