# PostgreSQL case metadata

Status: The case-repository package provides internal SQL operations for cases, memberships, original-file references, and [upload attempts](upload-journal.md). A [versioned migration runner and native PostgreSQL tests](postgres-migrations.md) supplement the fast SQL tests. The [synthetic case API](case-api.md) calls case creation, listing, and member-only detail lookup with a fixed development reviewer. The browser accesses case metadata through that API, not through a direct database connection. Court-authenticated API access and crash-safe file/database recovery remain pending. Use synthetic fixtures only.

## Server contract

Import the helpers from `@record-review/case-repository/cases` in server code only. Supply a trusted `SqlClient` with a parameterized `query` method. The package declares node-postgres (`pg`) as the native client; the development server creates a bounded pool and loads its dedicated database password from the ignored root `.env`. Queries bind values separately from SQL text. [node-postgres parameterized queries](https://node-postgres.com/features/queries).

| Helper                                                                 | Current behavior                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createCase(client, input)`                                            | Inserts a case with record revision 1 and the creator's membership in one SQL statement. A membership failure rolls back the case insertion. A duplicate case ID raises a conflict.                                                   |
| `listCasesForReviewer(client, reviewerId)`                             | Returns member cases in case-ID order, without duplicates. A reviewer with no membership receives an empty list.                                                                                                                      |
| `registerOriginalReference(client, reviewerId, reference)`             | Inserts a reference only when the supplied reviewer has membership in the reference's case. A nonmember receives `undefined` without a write. An existing case/document-version pair raises a conflict instead of replacing metadata. |
| `findOriginalReference(client, reviewerId, caseId, documentVersionId)` | Returns the exact matching reference only for a current case member. A missing version or unauthorized lookup returns `undefined`.                                                                                                    |

The caller must authenticate the reviewer and authorize case creation before calling the repository. Never accept a reviewer identity from an unverified browser field or model response. Membership filtering does not establish identity, court/chambers scope, or separate read/write roles. The repository does not implement PostgreSQL row-level security or protect against a caller with unrestricted SQL access.

Supply canonical lowercase, hyphenated UUIDs from trusted server context. Allocate and canonicalize case/document-version identifiers before using the filesystem adapter, and preserve the same identifiers across both stores. PostgreSQL UUID values normalize alternate spellings; the filesystem adapter hashes the exact supplied strings. The future API must reject or canonicalize external identifiers before any storage operation.

All public types describe trusted internal values, not runtime request schemas. The caller must validate labels and identifiers, enforce limits, and translate database failures into safe API diagnostics. Internal PostgreSQL errors propagate; do not expose database errors or query parameters to browser clients. The synthetic case API now validates case-creation labels, generates UUIDs, rejects caller-supplied ownership fields, and returns fixed failure codes. Case-list pagination, broader operational error mapping, and full case-field constraints remain pending.

## Reference integrity

The schema gives each case a primary key and each membership a composite case/reviewer primary key. Membership and original-reference foreign keys require an existing case. The original-reference primary key combines case ID and document-version ID, so two cases can retain distinct metadata for the same version identifier.

Each reference requires a 64-character lowercase hexadecimal SHA-256 and a byte length from zero through `Number.MAX_SAFE_INTEGER`. PostgreSQL stores the length as `bigint`; the queries cast the constrained value to `float8` for an exact JavaScript number. The metadata range is not an upload-size allowance. Future admission controls must enforce substantially smaller configured resource limits.

The repository offers insertion and lookup, without an update operation. Duplicate registration raises a conflict even when the metadata matches. Privileged SQL can still modify rows; the current schema does not establish tamper-proof storage, retention, or idempotent upload retries.

Obtain hash and length values from the trusted storage operation, never from an authoritative-looking browser or model claim. Metadata shape checks cannot prove that bytes exist or match the hash. The separate [original-storage adapter](local-original-storage.md) compares stored bytes with a trusted reference. The internal [ingestion service](original-ingestion.md) coordinates tested synthetic success and failure paths; no crash-recovery worker handles stranded attempts or orphan files. The application does not advance the record revision after uploads or acknowledge durable receipt.

A lookup checks membership within the query's database snapshot. A later query observes a completed membership revocation. The current contract does not cancel downloads or transactions already in progress and does not supply a membership-administration API.

## Schema and deployment boundaries

The package no longer exports `installCaseSchema`. Import `migrateCaseSchema` from the separate `@record-review/case-repository/migrations` entry point and follow the [migration contract](postgres-migrations.md). The development server applies both ordered SQL migrations before listening, records applied migrations, and refuses unknown history or automatic adoption of unversioned tables. Database roles, schema hardening, deployment TLS configuration, and restore procedures remain pending.

Keep PostgreSQL as the deployment database. PGlite supplies only the npm-packaged, in-memory PostgreSQL test engine; PGlite does not replace the server database or add browser storage. Native tests now check local PostgreSQL 18.6 connectivity, repository round-trips, and migration locking across two connections. Pooling, general application concurrency, revocation races, backup/restore, query plans, and service performance remain unqualified.

## Verification

Run `npm test -- packages/case-repository/tests/cases.test.ts packages/case-repository/tests/upload-attempts.test.ts` for the focused suite. The 22 case-metadata tests cover atomic creation, uniqueness and foreign keys, reviewer-filtered lists and case details, literal parameter values, original-reference writes and reads, cross-case isolation, revoked membership, missing references, and required hash/length constraints. Three upload-attempt tests cover member-only reservation, atomic completion, and failed-state transition.

The fast SQL tests create isolated in-memory PGlite instances and rebuild test-owned schemas from the required ordered migration SQL before each case. These tests never read a database URL, contact an existing database, load `.env`, or use real records. PGlite runs PostgreSQL through WebAssembly and supports parameterized SQL; the suite uses real SQL execution rather than mocked query results. [PGlite documentation](https://pglite.dev/docs/); [PGlite API](https://pglite.dev/docs/api). The separate native suite runs the actual migration library against test-owned containers.

Run `npm run verify:commit` for all repository gates. Coverage and mutation results cover the current first-party TypeScript scope. Stryker does not parse SQL strings into SQL predicate mutations; targeted positive and negative SQL tests provide separate evidence. Passing metrics do not establish complete authorization, record accuracy, or deployment readiness.

Phase 4 remains active. The next integration work must add crash reconciliation, bounded HTTP upload transport, approved document inspection, and court-authenticated server context before enabling real records. Return to Phase 3 at the very end, before pilot handoff, for hosted CI and repository protections.
