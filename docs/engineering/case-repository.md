# PostgreSQL case metadata

Status: The case-repository package provides internal SQL operations for cases, memberships, and original-file references. The browser does not call this package. Native PostgreSQL connectivity, migrations, authenticated API access, and coordinated file/database storage remain pending. Use synthetic fixtures only.

## Server contract

Import the helpers from `@record-review/case-repository/cases` in server code only. Supply a trusted `SqlClient` with a parameterized `query` method. The package declares node-postgres (`pg`) as the native deployment client; the current application does not create a connection pool or load database credentials. Queries bind values separately from SQL text. [node-postgres parameterized queries](https://node-postgres.com/features/queries).

| Helper                                                                 | Current behavior                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createCase(client, input)`                                            | Inserts a case with record revision 1 and the creator's membership in one SQL statement. A membership failure rolls back the case insertion. A duplicate case ID raises a conflict.                                                   |
| `listCasesForReviewer(client, reviewerId)`                             | Returns member cases in case-ID order, without duplicates. A reviewer with no membership receives an empty list.                                                                                                                      |
| `registerOriginalReference(client, reviewerId, reference)`             | Inserts a reference only when the supplied reviewer has membership in the reference's case. A nonmember receives `undefined` without a write. An existing case/document-version pair raises a conflict instead of replacing metadata. |
| `findOriginalReference(client, reviewerId, caseId, documentVersionId)` | Returns the exact matching reference only for a current case member. A missing version or unauthorized lookup returns `undefined`.                                                                                                    |
| `installCaseSchema(client)`                                            | Creates the three draft tables in an empty schema. The test harness uses this initializer; no application startup invokes the initializer.                                                                                            |

The caller must authenticate the reviewer and authorize case creation before calling the repository. Never accept a reviewer identity from an unverified browser field or model response. Membership filtering does not establish identity, court/chambers scope, or separate read/write roles. The repository does not implement PostgreSQL row-level security or protect against a caller with unrestricted SQL access.

Supply canonical lowercase, hyphenated UUIDs from trusted server context. Allocate and canonicalize case/document-version identifiers before using the filesystem adapter, and preserve the same identifiers across both stores. PostgreSQL UUID values normalize alternate spellings; the filesystem adapter hashes the exact supplied strings. The future API must reject or canonicalize external identifiers before any storage operation.

All public types describe trusted internal values, not runtime request schemas. The caller must validate labels and identifiers, enforce limits, and translate database failures into safe API diagnostics. Internal PostgreSQL errors currently propagate; do not expose database errors or query parameters to browser clients. Case-list pagination, operational error mapping, and full case-field constraints remain pending.

## Reference integrity

The schema gives each case a primary key and each membership a composite case/reviewer primary key. Membership and original-reference foreign keys require an existing case. The original-reference primary key combines case ID and document-version ID, so two cases can retain distinct metadata for the same version identifier.

Each reference requires a 64-character lowercase hexadecimal SHA-256 and a byte length from zero through `Number.MAX_SAFE_INTEGER`. PostgreSQL stores the length as `bigint`; the queries cast the constrained value to `float8` for an exact JavaScript number. The metadata range is not an upload-size allowance. Future admission controls must enforce substantially smaller configured resource limits.

The repository offers insertion and lookup, without an update operation. Duplicate registration raises a conflict even when the metadata matches. Privileged SQL can still modify rows; the current schema does not establish tamper-proof storage, retention, or idempotent upload retries.

Obtain hash and length values from the trusted storage operation, never from an authoritative-looking browser or model claim. Metadata shape checks cannot prove that bytes exist or match the hash. The separate [original-storage adapter](local-original-storage.md) compares stored bytes with a trusted reference. The application does not yet coordinate these helpers, handle orphan files, advance the record revision after uploads, or acknowledge durable receipt.

A lookup checks membership within the query's database snapshot. A later query observes a completed membership revocation. The current contract does not cancel downloads or transactions already in progress and does not supply a membership-administration API.

## Schema and deployment boundaries

`installCaseSchema` is a development initializer, not a migration system. The initializer executes three creation statements without a migration transaction, version ledger, upgrade path, or rollback procedure. Do not run the initializer against an existing or shared database. Later work must add reviewed migrations, database-role restrictions, schema hardening, connection/TLS configuration, and native PostgreSQL integration tests before deployment.

Keep PostgreSQL as the deployment database. PGlite supplies only the npm-packaged, in-memory PostgreSQL test engine; PGlite does not replace the server database or add browser storage. Native wire protocol, pooling, multi-connection concurrency, locking/revocation races, backup/restore, query plans, and service performance remain unqualified.

## Verification

Run `npm test -- packages/case-repository/tests/cases.test.ts` for the focused suite. The 21 tests cover atomic creation, uniqueness and foreign keys, reviewer-filtered lists, literal parameter values, original-reference writes and reads, cross-case isolation, revoked membership, missing references, and required hash/length constraints.

The tests create one isolated in-memory PGlite instance and rebuild the test-owned schema before each case. The tests never read a database URL, contact an existing database, load `.env`, or use real records. PGlite runs PostgreSQL through WebAssembly and supports parameterized SQL; the suite uses real SQL execution rather than mocked query results. [PGlite documentation](https://pglite.dev/docs/); [PGlite API](https://pglite.dev/docs/api).

Run `npm run verify:commit` for all repository gates. Coverage and mutation results cover the current first-party TypeScript scope. Stryker does not parse SQL strings into SQL predicate mutations; targeted positive and negative SQL tests provide separate evidence. Passing metrics do not establish complete authorization, record accuracy, or deployment readiness.

Phase 4 remains active. The next integration work must connect authenticated server context, native database startup/migrations, and private-file storage before enabling uploads. Return to Phase 3 at the very end, before pilot handoff, for hosted CI and repository protections.
