import { expect, test } from 'vitest';
import { isCommitMessage } from '../src/index.ts';

test('accepts a subject beginning with a configured past-tense verb', () => {
  expect(isCommitMessage('Implemented the repository guard\n')).toBe(true);
});

test('rejects a subject beginning with a present-tense verb', () => {
  expect(isCommitMessage('Implement the repository guard')).toBe(false);
});
