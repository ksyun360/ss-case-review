# Document processing scheduler

Status: Phase 4 includes a tested serial scheduler boundary for the durable one-job worker. Server startup does not invoke the scheduler yet.

`startDocumentProcessingScheduler` waits for a fixed interval, creates a fresh lease token and timestamp, and invokes at most one `runNextDocumentProcessing` call at a time. The scheduler calculates a fixed lease expiration from the attempt start. The scheduler waits for each worker promise to settle before scheduling another timer, which prevents parser overlap inside one server process.

An unexpected worker rejection does not terminate the loop. The durable processing row remains recoverable after its lease expires, and the scheduler waits for the next interval before attempting more work. The scheduler does not expose exception details or alter the worker's safe terminal failure mapping.

The returned stop function clears the pending timer once and prevents an already captured callback from starting work or rescheduling. A deterministic test supplies clocks, identifiers, worker behavior, and timer primitives to verify serial execution, lease bounds, continued scheduling after failure, and idempotent shutdown.

The scheduler still runs extraction in the API process. Production deployment requires a separately isolated worker with court-approved CPU, memory, wall-clock, parser, and malware controls. Startup integration and browser progress polling remain pending.
