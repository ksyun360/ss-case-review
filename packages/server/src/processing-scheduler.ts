import type { SqlClient } from '@record-review/case-repository/cases';
import { runNextDocumentProcessing } from './processing-worker.ts';

type SchedulerInput = Readonly<{
  database: SqlClient;
  root: string;
  intervalMilliseconds: number;
  leaseMilliseconds: number;
  now: () => Date;
  createId: () => string;
  schedule: (callback: () => Promise<void>, delay: number) => unknown;
  clear: (timer: unknown) => void;
  runNext: typeof runNextDocumentProcessing;
}>;

export function startDocumentProcessingScheduler(input: SchedulerInput): () => void {
  let stopped = false;
  let timer: unknown;

  const run = async () => {
    if (stopped) return;
    const startedAt = input.now();
    try {
      await input.runNext({
        database: input.database,
        root: input.root,
        now: startedAt,
        leaseExpiresAt: new Date(startedAt.getTime() + input.leaseMilliseconds),
        leaseToken: input.createId(),
        createSourceUnitId: input.createId,
      });
    } catch {
      // The durable lease permits a later retry after an unexpected worker failure.
    }
    if (!stopped) timer = input.schedule(run, input.intervalMilliseconds);
  };

  timer = input.schedule(run, input.intervalMilliseconds);
  return () => {
    if (stopped) return;
    stopped = true;
    input.clear(timer);
  };
}
