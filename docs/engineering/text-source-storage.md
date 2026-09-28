# Text-source persistence

Status: Phase 4 includes an internal insert-only text-source repository and a third ordered PostgreSQL migration. Extraction workers, source-read APIs, and browser source navigation do not call this repository yet. Use synthetic fixtures only.

## Stored identity

`TextSourceUnit` carries an opaque source-unit UUID, case UUID, original document-version UUID, record revision, original SHA-256 metadata, extraction version, one-based physical page number, and exact extracted text. UTF-16 source-span offsets refer to the stored text without further normalization. The repository preserves Unicode, newlines, and SQL-looking text through parameterized SQL.

The `text_source_units` table requires a registered original in the same case through a compound foreign key. The table constrains positive revisions and page numbers, SHA-256 formatting, nonblank bounded extraction versions, and nonnull text. A unique source UUID and a unique case/document/revision/extraction/page tuple prevent duplicate insertion under either identity. The repository exports no update or replacement operation. Privileged database access can still change rows; least-privilege roles, audit controls, and operational immutability remain deployment requirements.

## Internal write boundary

`insertTextSourceForReviewer` in `@record-review/case-repository/source-units` receives a typed source from trusted server code. One SQL statement inserts only when the reviewer belongs to the source case, the original version exists in that case, the supplied hash matches registered original metadata, and the supplied revision matches the case's current revision. The statement returns the stored source or `undefined` when no eligible row matches. Constraint and database errors propagate to the internal caller.

The caller must validate external inputs and enforce processing budgets before calling the helper. TypeScript does not validate JSON. The helper compares metadata, not file bytes; the worker must read integrity-checked original bytes and establish that extracted text came from those bytes. The helper does not prove extraction accuracy or authorize court-record processing.

## Evidence and remaining work

One PGlite regression stores exact synthetic text and source identity after registering an original. The native migration suite checks the three-step history and source-table discovery in the compiled package layout. Separate permission, hash/revision mismatch, constraint, replacement, and retrieval regressions remain pending. Stryker mutates the TypeScript helper but does not mutate SQL migration files.

Next work must add member-scoped reads, source-span integration, extraction publication, stored page geometry and coverage gaps, canonical coordinate mapping, and browser navigation. Background jobs must publish sources transactionally and preserve previous extraction versions. No source lookup or case artifact currently reaches the browser through this table.

Return to Phase 3 at the very end before pilot handoff. Keep private design/session files and credentials outside commits.
