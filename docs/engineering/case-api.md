# Synthetic development case API

Status: Phase 4 includes a tested Fastify API factory and a [runnable synthetic development server](development-server.md). The browser lists saved synthetic case metadata through the development proxy; browser case creation and case-detail navigation remain pending. Use synthetic fixtures only.

## Construction and identity

`createDevelopmentApi(environment, database)` lives in `packages/server/src/case-api.ts`. Supply a trusted server-owned environment map and an already-connected `SqlClient` against the migrated case schema. The caller owns migration execution, connection settings, database lifetime, and eventual listener startup. The factory returns a Fastify instance for request injection and later integration; the factory does not load `.env`, call Gemini, or read original documents.

The factory calls `readDevelopmentIdentity` before constructing the API. The helper requires every setting below and returns the fixed synthetic reviewer `00000000-0000-4000-8000-000000000011`:

| Setting               | Required value |
| --------------------- | -------------- |
| `APP_ENV`             | `development`  |
| `DATA_CLASSIFICATION` | `synthetic`    |
| `AUTH_MODE`           | `development`  |
| `BIND_ADDRESS`        | `127.0.0.1`    |

Missing or mismatched settings raise `development_identity_disabled` without echoing configuration. Tests separately cover production, court-test, court-record classification, another identity mode, and wildcard binding. The classification flag records operator intent; the flag cannot determine whether uploaded material contains real records.

The synthetic reviewer represents one trusted local developer, not an authenticated court user. Request headers, query parameters, and case-creation fields cannot select another reviewer. Court identity, roles, chambers scope, sessions, and audit events remain unimplemented.

## Request contract

The API requires `Host: 127.0.0.1:5176` and `x-record-review-client: synthetic-workspace`. When a request contains `Origin`, the API accepts only `http://127.0.0.1:5175`. The API ignores forwarded-host claims and grants no cross-origin access. The client marker is public and provides a browser request safeguard, not a password or authentication token. Local software can construct these headers.

The development entry point now validates startup configuration and binds the listener to `127.0.0.1:5176`. The current preview contains no API proxy or client integration. Do not expose the development API through a shared server or reverse proxy.

| Endpoint             | Behavior                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/cases`  | Returns `{ cases: [...] }` using membership-filtered repository queries for the configured reviewer.                                                                   |
| `POST /api/v1/cases` | Accepts a JSON object containing only `label`; returns HTTP 201 with `{ case: { caseId, label, recordRevision } }` after atomic case and creator-membership insertion. |

Labels must contain non-whitespace text and contain at most 120 Unicode code points before trimming. The JSON schema rejects numeric labels without coercion and rejects extra fields without silently removing those fields. The server trims surrounding label whitespace and generates a canonical version-4 UUID. Initial record revision remains 1; case creation does not upload or process documents.

The metadata API limits request bodies to 4,096 bytes and sets `Cache-Control: no-store`. The limit applies to this metadata factory, not to a future document-upload allowance. Every successful POST creates a new draft; the API provides no idempotency key or automatic retry. Future browser integration must address ambiguous delivery before offering automatic creation retries.

| HTTP status / code                    | Meaning                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| 400 / `invalid_request`               | The JSON body fails schema validation or contains malformed JSON.                             |
| 403 / `development_request_forbidden` | A required request marker, Host value, or supplied Origin fails the development restrictions. |
| 413 / `request_too_large`             | The request exceeds the metadata body limit.                                                  |
| 503 / `case_service_unavailable`      | An unclassified handler or parser failure prevents completion, including database failures.   |

The error handler returns fixed codes rather than exception messages, query details, or submitted text. Additional parser/error classifications remain pending. Unknown routes retain Fastify's default not-found behavior. The factory provides no source, download, upload, artifact, or membership-administration endpoint.

## Verification and remaining work

Run `npm test -- packages/server packages/server-config/tests/development-identity.test.ts` for focused checks. Three API integration cases use a real in-memory PostgreSQL test engine to check reviewer scoping, creation, and atomic rollback with safe failure responses. Eleven request cases check validation, request restrictions, payload limits, malformed JSON, and response caching. Seven configuration cases check the development identity contract.

The [native PostgreSQL suite](postgres-migrations.md) additionally checks API creation, filtering, and membership revocation against PostgreSQL 18.6. Request injection exercises Fastify's lifecycle without opening an HTTP listener. The [development server checks](development-server.md) cover startup ordering, pool cleanup, loopback binding, and a separate real-process HTTP smoke run. These tests do not establish browser-to-server behavior, production authentication, general concurrency, or recovery.

Connect the browser and private-file finalization next. Add pagination, case administration, request idempotency, complete error classification, and audit records before a shared deployment. Keep real records blocked until court IT approves identity and data handling. Return to Phase 3 at the very end before pilot handoff.
