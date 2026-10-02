# Document processing worker

Status: Phase 4 includes a callable synthetic one-job worker that claims durable processing work, invokes the verified stored-PDF coordinator, and records a lease-guarded terminal state. Server startup does not schedule or loop this worker yet.

`runNextDocumentProcessing` atomically claims the oldest queued or expired document through the [processing journal](processing-journal.md). The claim supplies the reviewer, original version, extraction version, byte ceiling, page ceiling, and lease token. The worker passes those values to the concrete [original processing coordinator](original-processing.md), which rechecks membership and original integrity before PDF extraction and atomic text-source publication.

The worker records `published` only when the coordinator publishes sources and the same lease token still owns the journal row. The worker maps unavailable originals, publication rejection, unsupported formats, byte and page budget errors, and all other extraction errors to a closed set of safe failure codes. The worker does not expose exception messages. A changed or expired lease prevents either success or failure from overwriting a later worker and returns `lease_lost`.

One PGlite regression covers idle polling, exact claim-to-processor inputs, published source IDs and page gaps, unavailable and rejected publication outcomes, every fixed error mapping, non-Error rejection, lease loss, and invocation of the concrete processor. The regression injects processing results for most branches and uses a missing synthetic storage root to exercise the concrete processor's contained failure path.

The callable worker does not provide a continuous scheduler, graceful worker shutdown, lease renewal, parser subprocess isolation, time or memory enforcement, retry policy for terminal failures, persisted page gaps, or operational metrics. No API starts processing after upload, and no browser status route reads journal state. Keep real records out of this path until court IT approves identity, storage, parser isolation, and the model data path.
