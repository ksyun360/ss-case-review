import { expect, test } from 'vitest';
import { isCommitMessage } from '../src/index.ts';

test('rejects a subject beginning with a present-tense verb', () => {
  expect(isCommitMessage('Implement the repository guard')).toBe(false);
});
