import { expect, test } from 'vitest';
import { isPublishablePath } from '../src/index.ts';

test('rejects the private session log in a nested directory', () => {
  expect(isPublishablePath('docs/development/session-log.md')).toBe(false);
});

test('accepts shared documentation', () => {
  expect(isPublishablePath('docs/design/brand-and-interaction.md')).toBe(true);
});

test('rejects the private design document in a nested directory', () => {
  expect(isPublishablePath('docs/design/application-design.md')).toBe(false);
});
