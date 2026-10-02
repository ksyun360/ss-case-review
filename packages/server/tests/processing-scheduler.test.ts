import { expect, test, vi } from 'vitest';
import { startDocumentProcessingScheduler } from '../src/processing-scheduler.ts';

test('schedules document processing serially and stops cleanly', async () => {
  const database = { query: vi.fn() };
  const scheduled: Array<() => Promise<void>> = [];
  const schedule = vi.fn((callback: () => Promise<void>, _delay: number) => {
    scheduled.push(callback);
    return scheduled.length;
  });
  const clear = vi.fn();
  const now = vi
    .fn<() => Date>()
    .mockReturnValueOnce(new Date('2026-10-02T12:00:00.000Z'))
    .mockReturnValueOnce(new Date('2026-10-02T12:00:01.000Z'))
    .mockReturnValueOnce(new Date('2026-10-02T12:00:02.000Z'));
  const identifiers = [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000006',
  ];
  const createId = vi.fn(() => {
    const identifier = identifiers.shift();
    if (!identifier) throw new Error('Unexpected identifier request');
    return identifier;
  });
  let releaseThirdRun: (() => void) | undefined;
  const thirdRun = new Promise<void>((resolve) => {
    releaseThirdRun = resolve;
  });
  let runCount = 0;
  const runNext = vi.fn(async (input: { createSourceUnitId: () => string }) => {
    input.createSourceUnitId();
    runCount += 1;
    if (runCount === 2) throw new Error('Synthetic contained worker failure');
    if (runCount === 3) await thirdRun;
    return { status: 'idle' as const };
  });

  const stop = startDocumentProcessingScheduler({
    database,
    root: '/synthetic/private/originals',
    intervalMilliseconds: 250,
    leaseMilliseconds: 300_000,
    now,
    createId,
    schedule,
    clear,
    runNext,
  });

  expect(schedule).toHaveBeenCalledExactlyOnceWith(scheduled[0], 250);
  await scheduled[0]?.();
  expect(runNext).toHaveBeenNthCalledWith(1, {
    database,
    root: '/synthetic/private/originals',
    now: new Date('2026-10-02T12:00:00.000Z'),
    leaseExpiresAt: new Date('2026-10-02T12:05:00.000Z'),
    leaseToken: '00000000-0000-4000-8000-000000000001',
    createSourceUnitId: expect.any(Function),
  });
  expect(createId).toHaveBeenCalledTimes(2);
  expect(schedule).toHaveBeenNthCalledWith(2, scheduled[1], 250);

  await scheduled[1]?.();
  expect(runNext).toHaveBeenNthCalledWith(2, {
    database,
    root: '/synthetic/private/originals',
    now: new Date('2026-10-02T12:00:01.000Z'),
    leaseExpiresAt: new Date('2026-10-02T12:05:01.000Z'),
    leaseToken: '00000000-0000-4000-8000-000000000003',
    createSourceUnitId: expect.any(Function),
  });
  expect(createId).toHaveBeenCalledTimes(4);
  expect(schedule).toHaveBeenNthCalledWith(3, scheduled[2], 250);

  const inFlight = scheduled[2]?.();
  expect(runNext).toHaveBeenCalledTimes(3);
  stop();
  expect(clear).toHaveBeenCalledExactlyOnceWith(3);
  releaseThirdRun?.();
  await inFlight;
  expect(createId).toHaveBeenCalledTimes(6);
  expect(schedule).toHaveBeenCalledTimes(3);
  await scheduled[2]?.();
  expect(runNext).toHaveBeenCalledTimes(3);
  expect(now).toHaveBeenCalledTimes(3);
  expect(schedule).toHaveBeenCalledTimes(3);
  stop();
  expect(clear).toHaveBeenCalledTimes(1);
});
