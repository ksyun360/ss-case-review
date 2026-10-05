# Synthetic development API startup

Phase 4 includes a runnable, loopback-only case metadata API. Use synthetic case labels and a dedicated development database. The browser lists, creates, and opens synthetic drafts through the Vite development proxy when the API runs.

## Configuration and startup

Use Node.js 24.21.0. Copy the nonsecret settings from `.env.example` into the ignored root `.env` if the settings are missing. Preserve any existing Gemini settings. Add `DEVELOPMENT_DATABASE_PASSWORD` with a separate password for the synthetic PostgreSQL instance. The startup command reads `.env` on the server through Node's environment-file option. Tests do not read that file.

The server requires `APP_ENV=development`, `DATA_CLASSIFICATION=synthetic`, `AUTH_MODE=development`, and `BIND_ADDRESS=127.0.0.1`. The database password must contain non-whitespace text. The server fixes the PostgreSQL target to `127.0.0.1:55432`, database and role `record_review_development`, and disables TLS only for this loopback development connection. The pool limits active connections to four and sets connection, idle, statement, and query timeouts. The server does not accept an arbitrary database URL through these settings.

For an optional synthetic byte-upload test, set `DEVELOPMENT_ORIGINAL_STORAGE_ROOT` to a dedicated absolute directory outside the repository. Leave the setting absent for the normal metadata-only workflow. Startup rejects a relative path or filesystem root and fixes the per-original limit at 512 MiB. The startup setting enables the [synthetic original route](case-api.md#request-contract), permits browser registration, and starts serial background PDF processing after migrations and loopback listener startup. Before opening the listener, startup fails and removes at most 25 still-receiving attempts older than 15 minutes. The scheduler checks every 250 milliseconds, applies five-minute leases, and stops before the database pool closes. Recovery is startup-bounded rather than periodic. The server does not isolate parser resources from the API process or authorize real case records. Do not point the setting at a shared directory or a directory containing other data.

Provision a **new synthetic-only** PostgreSQL 18.6 instance with the dedicated database and role before startup. For example, after setting `POSTGRES_PASSWORD` in your terminal to the same development database password, use a locally approved Docker installation and the [pinned image](postgres-migrations.md#run-isolated-native-tests):

```sh
docker run --detach --name record-review-development --pull=never \
  --publish 127.0.0.1:55432:5432 \
  --mount type=volume,source=record-review-development,target=/var/lib/postgresql \
  --env POSTGRES_USER=record_review_development \
  --env POSTGRES_DB=record_review_development \
  --env POSTGRES_PASSWORD \
  postgres:18.6-alpine3.24@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873
```

The named volume retains this development database after `docker stop record-review-development`. The PostgreSQL image creates a privileged initial role for local development; court deployment needs separate roles, TLS, backups, and approval. Do not reuse an existing database or put a password in a tracked file.

Start the API from the repository root:

```sh
npm run dev:api
```

The command runs schema migrations before binding `127.0.0.1:5176`. When private original storage is enabled, the command runs bounded stale-upload recovery before binding and starts the processing scheduler only after the listener succeeds. The process prints only `Synthetic case API listening at http://127.0.0.1:5176` after successful startup. Control-C and termination signals stop the scheduler, close the API, and close the database pool. A startup or shutdown failure prints a fixed error code and sets a nonzero exit status. An idle connection error prints `development_database_connection_lost` without driver details; later requests may return HTTP 503 until PostgreSQL recovers.

## Synthetic case check

The API requires a fixed Host and the public development request marker. The marker is a browser request safeguard, not court authentication. Use the following request to list cases:

```sh
curl --fail-with-body http://127.0.0.1:5176/api/v1/cases \
  --header 'x-record-review-client: synthetic-workspace'
```

To create one draft case, send a synthetic label:

```sh
curl --fail-with-body http://127.0.0.1:5176/api/v1/cases \
  --header 'x-record-review-client: synthetic-workspace' \
  --header 'content-type: application/json' \
  --data '{"label":"Synthetic development case"}'
```

Each successful POST creates a new draft; the API has no retry token or case deletion endpoint. The [case API contract](case-api.md) specifies validation and access boundaries. Run `npm run dev` separately to start the browser on port 5175. Open `/cases` to list or create drafts through Vite's same-origin development proxy. Select a saved label to open `/cases/:caseId`. The case page shows metadata only; no documents or review artifacts are available. The production-bundle preview has no API proxy.

## Evidence and limits

Unit tests cover explicit configuration, migration and recovery before listener startup, fixed recovery age and batch bounds, connection release, database and listener failures, idle connection diagnostics, and command-line signals. The full commit gate also runs the existing native PostgreSQL and Chromium suites. A separate temporary PostgreSQL 18.6 smoke check started the real Node process, migrated an empty database, created and listed a synthetic case over loopback HTTP, restarted the process, and confirmed that the case remained available. The smoke check stopped and removed only its memory-backed test container.

One native PostgreSQL test now launches Chromium, the loopback API, and the development proxy; the test verifies one small synthetic original from browser selection through its database reference and exact private-file bytes. The test does not establish large-record performance, court identity, record extraction, model use, record accuracy, processing latency, or backup and recovery. A separate mobile browser test intercepts a synthetic case-list response; that test does not connect to PostgreSQL. Component tests mock browser transfer responses. The synthetic identity flag records developer intent and cannot inspect whether submitted text contains real information. Keep real records out of this development service. Return to Phase 3 at the final setup gate before pilot handoff.
