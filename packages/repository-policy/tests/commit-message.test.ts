import { expect, test } from 'vitest';
import { isCommitMessage } from '../src/index.ts';

test('rejects a question followed by another sentence', () => {
  expect(isCommitMessage('Implemented the guard? Added another rule')).toBe(false);
});

test('rejects two period-separated sentences', () => {
  expect(isCommitMessage('Implemented the guard. Added another rule')).toBe(false);
});

test('requires a description after the leading verb', () => {
  expect(isCommitMessage('Implemented')).toBe(false);
});

test('rejects additional message lines and attribution trailers', () => {
  expect(
    isCommitMessage('Implemented the guard\n\nCo-authored-by: Example <example@example.com>\n'),
  ).toBe(false);
});

test('accepts a subject beginning with a configured past-tense verb', () => {
  expect(isCommitMessage('Implemented the repository guard\n')).toBe(true);
});

test('rejects a subject beginning with a present-tense verb', () => {
  expect(isCommitMessage('Implement the repository guard')).toBe(false);
});
