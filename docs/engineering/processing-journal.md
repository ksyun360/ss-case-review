# Document processing journal

Status: Phase 4 includes a durable synthetic document-processing queue in PostgreSQL. The queue records one extraction version for a registered original, applies fixed byte and page ceilings, and tracks `queued`, `processing`, `published`, or `failed` states. No background worker invokes the queue yet.

`reserveDocumentProcessing` inserts work only when the requesting reviewer currently belongs to the case and the registered original exists. A unique case, document-version, and extraction-version key prevents duplicate work. Duplicate reservations return no new row.

`claimDocumentProcessing` atomically selects the oldest eligible row with `FOR UPDATE SKIP LOCKED`. A claim writes a caller-generated lease token, a fixed lease expiration, and an incremented attempt count. Another worker cannot claim an unexpired processing row. A worker can reclaim a row after the stored lease expires. `completeDocumentProcessing` accepts only the current lease token, clears lease data, and records `published`; a stale worker cannot overwrite a later claim. `failDocumentProcessing` applies the same lease check, accepts a closed set of safe failure codes, clears lease data, and records terminal `failed` status.

`findDocumentProcessingForReviewer` returns status only through current case membership and a still-registered original. The status contract omits lease tokens and expiration timestamps. Two PGlite regressions cover unauthorized and duplicate reservation, exclusive claiming, expired-lease recovery, stale-token rejection, successful completion, fixed failure reporting, terminal non-reclaimability, and member-scoped status.

The journal does not run extraction, persist page gaps or geometry, renew leases, enforce wall-clock or memory limits, or reconcile source publication with journal completion. A later worker must connect claims to the verified original-processing coordinator and contain parser work outside the API process. Keep real records out of this path until court IT approves identity, storage, parser isolation, and the model data path.
