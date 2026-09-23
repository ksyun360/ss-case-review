# PostgreSQL migrations and native checks

Status: The case-repository package now provides a versioned initial schema and a transactional migration runner. Native tests exercise PostgreSQL 18.6 through node-postgres. The application does not yet start a database connection, run migrations at startup, or connect browser requests to storage. Use synthetic fixtures only.

## Migration contract

Import `migrateCaseSchema` from `@record-review/case-repository/migrations`. Supply an already-connected, dedicated `pg.Client` with the intended migration privileges. The caller owns connection creation, TLS settings, timeouts, and connection closure. Do not pass a pool or share the client with concurrent queries during migration.

The wrapper pins node-pg-migrate 9.0.0, the repository's migration directory, the `public` schema, the `record_review_migrations` ledger, upward migration direction, and a single transaction for pending migrations. The migration library checks history order and acquires a session advisory lock before changing the schema. A competing runner fails rather than waiting indefinitely. [Pinned migration runner implementation](https://github.com/salsita/node-pg-migrate/blob/v9.0.0/src/runner.ts).

The initial SQL migration creates cases, case memberships, and original references. The repository no longer exports the draft `installCaseSchema` helper. Fast repository tests and native migration tests consume the same SQL file.

A repeated run returns an empty result when no migrations remain. A failed migration rolls back the pending schema changes and leaves no applied entry. The library creates the migration ledger before the migration transaction, so a failed first run can leave an empty ledger. Failure does not imply that the database contains no objects.

Unknown migration names and an existing unversioned schema produce errors. The runner does not adopt, drop, or recreate an existing schema automatically. Inspect the target and prepare a separately reviewed reconciliation plan before migrating any legacy database. Never mark migrations as applied merely to bypass an error.

Keep applied migration files unchanged and add later changes in new, ordered files. The current library tracks names and order, not SQL content checksums. The wrapper provides no downward migration or destructive reset command. Database rollback/restore procedures still require implementation and rehearsal.

The wrapper suppresses library log output and propagates errors to the internal caller. Future operational code must report safe failure codes without exposing SQL, connection settings, or case data to browser clients. No current helper loads `.env`, reads a database URL, or selects a target service automatically.

## Run isolated native tests

Install the pinned Node/npm dependencies and Chromium as described in [Contributing](../../CONTRIBUTING.md). The full commit gate also requires a running local Docker engine, access to the Docker socket, and `docker` on the active PATH. On macOS, terminal and editor Git processes may need Docker Desktop's CLI directory on PATH.

Download the exact test image, build the packages, then run the native suite:

```sh
docker pull postgres:18.6-alpine3.24@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873
npm run build
npm run test:postgres
```

The test command refuses to pull an image implicitly. The compiled-layout regression requires the preceding build. `npm run verify:commit` performs that build and runs the native suite automatically; a missing Docker service or image fails the gate rather than skipping verification.

Each native suite creates a new container with a random password, an ephemeral host port bound to `127.0.0.1`, temporary in-memory PostgreSQL storage, and resource limits. The tests never use an existing database, persistent volume, developer credential, or court record. The test-only connection uses local plaintext TCP; court deployments must supply approved TLS and CA configuration rather than copy test settings.

The harness resets only the public schema in the newly created test database. Teardown closes the client and stops only the container whose ID the harness captured; Docker then removes that container. An abruptly terminated process can leave a test container running. Inspect containers with the `record-review.test=postgres-migrations` label and stop only the confirmed test-owned ID. Do not stop unrelated services.

The official PostgreSQL 18 image stores data beneath `/var/lib/postgresql`; the harness mounts temporary storage at that location. [Official image documentation](https://hub.docker.com/_/postgres).

## Evidence and limits

Seven native cases cover initial migration and repository round-trips, repeat runs, rollback/retry, advisory-lock contention across two connections, unknown history, unversioned-schema rejection, and migration discovery from the compiled package. A separate unit test verifies the wrapper's fixed options. PGlite retains the 21 fast repository SQL cases.

The native suite runs separately from TypeScript mutation testing. The existing mutation scope and thresholds remain active; Stryker does not mutate SQL files or third-party migration internals. Positive and negative SQL execution tests supply separate evidence.

Release packaging must retain `packages/case-repository/migrations/` alongside `dist/`; compiling TypeScript alone does not copy SQL assets. The compiled-layout test checks the repository build layout, not a court deployment archive.

Remaining work includes application startup/configuration, least-privilege runtime and migration roles, TLS, connection pooling, further schema constraints, authenticated endpoints, file/database finalization, backup/restore, and workload evaluation. The native checks do not qualify court infrastructure or processing accuracy. Phase 4 remains active; return to Phase 3 at the very end before pilot handoff.
