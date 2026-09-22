import { posix } from 'node:path';

export function isFeatureBranch(branch: string): boolean {
  return branch.startsWith('feature/') && branch !== 'feature/';
}

export function isPublishablePath(path: string): boolean {
  return posix.basename(path) !== 'application-design.md';
}
