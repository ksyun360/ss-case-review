import { expect, test } from 'vitest';
import { isPublishablePath } from '../src/index.ts';

test('rejects the private design document in a nested directory', () => {
  expect(isPublishablePath('docs/design/application-design.md')).toBe(false);
});
