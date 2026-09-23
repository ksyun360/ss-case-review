# Synthetic original-ingestion service

Status: An internal server service coordinates bounded original-file streaming with a membership-scoped PostgreSQL reference. No HTTP upload route calls the service, and the browser still does not transfer document bytes. Use synthetic data only.

`storeOriginalForReviewer(database, reviewerId, caseId, root, chunks, maximumBytes)` checks membership before consuming the byte stream. The service generates a document-version UUID on the server, writes accepted bytes through the private storage adapter, and registers the returned SHA-256 and byte length through the membership-filtered repository operation. A non-member receives no reference; the service does not read the stream or create a file for that request.

The repository checks membership again while inserting the reference. If access disappears during streaming, the service removes the exact newly published version and returns no reference. If PostgreSQL rejects registration, the service attempts the same exact-file cleanup and propagates the database error. The service never treats a registration failure as successful receipt.

This compensation is not an atomic transaction across PostgreSQL and the filesystem. A process crash, power loss, storage cleanup failure, or failure after file publication can still leave an orphan. The storage adapter does not synchronize the containing directory, and the service has no durable upload-attempt record or recovery scan. Do not acknowledge a court upload as durable or connect this service to a public route until those gaps are resolved. The service also lacks document filename/format metadata, type inspection, malware policy, audit events, resumable transfer, and court identity.

Tests use synthetic bytes, isolated PGlite databases, and test-owned temporary directories. They verify exact file bytes and reference metadata, non-member rejection before stream consumption, membership revocation during streaming, and PostgreSQL registration failure. Run `npm run verify:commit` for the full coverage, mutation, browser, and native PostgreSQL gate.
