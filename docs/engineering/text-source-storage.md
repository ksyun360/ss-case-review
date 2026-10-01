# Text-source persistence

Status: Phase 4 includes single-page and atomic document-page insertion, member-scoped inventory and retrieval, guarded inventory and source-read APIs, strict browser clients, and an exact-text source workspace, backed by a third ordered PostgreSQL migration. Extraction workers do not publish to this repository yet. Use synthetic fixtures only.

## Stored identity

`TextSourceUnit` carries an opaque source-unit UUID, case UUID, original document-version UUID, record revision, original SHA-256 metadata, extraction version, one-based physical page number, and exact extracted text. UTF-16 source-span offsets refer to the stored text without further normalization. The repository preserves Unicode, newlines, and SQL-looking text through parameterized SQL.

The `text_source_units` table requires a registered original in the same case through a compound foreign key. The table constrains positive revisions and page numbers, SHA-256 formatting, nonblank bounded extraction versions, and nonnull text. A unique source UUID and a unique case/document/revision/extraction/page tuple prevent duplicate insertion under either identity. The repository exports no update or replacement operation. Privileged database access can still change rows; least-privilege roles, audit controls, and operational immutability remain deployment requirements.

## Internal write boundary

`insertTextSourceForReviewer` in `@record-review/case-repository/source-units` receives a typed source from trusted server code. One SQL statement inserts only when the reviewer belongs to the source case, the original version exists in that case, the supplied hash matches registered original metadata, and the supplied revision matches the case's current revision. The statement returns the stored source or `undefined` when no eligible row matches. Constraint and database errors propagate to the internal caller.

`insertTextSourcesForReviewer` admits a complete extracted page set through one PostgreSQL statement. The statement validates every candidate against current membership, original identity and hash, and case revision before inserting any candidate. A mixed authorized and unauthorized set returns an empty result and inserts no pages. A successful set returns exact rows in caller order. The operation does not replace an existing extraction or create processing state; constraint conflicts fail the statement.

The caller must validate external inputs and enforce processing budgets before calling the helper. TypeScript does not validate JSON. The helper compares metadata, not file bytes; the worker must read integrity-checked original bytes and establish that extracted text came from those bytes. The helper does not prove extraction accuracy or authorize court-record processing.

## Evidence and remaining work

`findTextSourceForReviewer` accepts server-selected reviewer identity, case identity, and source-unit identity. The query joins current case membership and the registered original, checks the stored hash against original metadata, and returns the stored source or `undefined`. The query retains the source's stored record revision; retrieval does not rewrite provenance to the case's latest revision. API callers must validate identifiers and return safe, nonrevealing failures.

Five PGlite regressions check exact synthetic text and source identity after original registration, atomic all-pages-or-none publication, denied insertion through another case's membership, member retrieval followed by a Unicode quotation check through `locateSourceSpan`, and denied retrieval of an existing source by another reviewer. The denied read preserves the authorized owner's result. The existing implementation passed both new permission regressions, so each permission increment adds a test without production changes. The native migration suite checks the three-step history and source-table discovery in the compiled package layout. Further requested-case, membership-revocation, hash/revision mismatch, constraint, and replacement regressions remain pending. Stryker mutates the TypeScript helper but does not mutate SQL migration files.

The guarded development API exposes `GET /api/v1/cases/:caseId/text-sources/:sourceUnitId`. One Fastify regression connects registered original metadata, persisted source text, and an HTTP response with source provenance. The regression also checks no-store headers, absent sources, malformed UUIDs before database access, and fixed service-failure responses. A separate regression creates a real source for another reviewer, proves owner-scoped retrieval succeeds, and verifies that the configured development reviewer receives the same no-store 404 used for an absent source. The route uses the server-selected reviewer and the repository's membership filter. Browser navigation remains pending.

The repository inventory returns metadata only for a reviewer membership, a matching registered original hash, and the case's current record revision. The query orders rows by document version, physical page, extraction version, and source-unit identity. The inventory excludes raw page text so discovery does not duplicate the direct source payload.

The guarded inventory API returns `{ sources }` after verifying access to the requested case. An accessible case without current sources receives an empty list; an unknown or inaccessible case receives the same 404 case response. The route validates the case UUID before SQL and inherits the API's no-store and fixed-error behavior.

The browser inventory client uses no-store semantics, preserves the returned order, validates every identity and provenance field, and rejects any inventory row that includes raw page text. The direct-source client requests one known source unit and additionally validates exact requested-source identity and raw text before returning the response. A direct-source 404 becomes an absent result; other failures return no server detail to the interface.

The case screen lists source document suffixes and physical page numbers, then retrieves exact text only after the reviewer selects a source. The screen displays extraction-version and SHA-256 provenance, preserves multiline text in a bounded reader, supports inventory and source retries, and reports a source that disappears after inventory. The screen does not render the original document, geometry, or a visual highlight.

Next work must connect bounded extraction to the atomic page-set operation, store page geometry and coverage gaps, add canonical coordinate mapping, and provide original-document navigation. Background jobs must preserve previous extraction versions and durable processing state. Uploaded originals do not automatically create source rows; no case artifact currently uses this route.

Return to Phase 3 at the very end before pilot handoff. Keep private design/session files and credentials outside commits.
