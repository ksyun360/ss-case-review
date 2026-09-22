import { posix } from 'node:path';

export function isFeatureBranch(branch: string): boolean {
  return branch.startsWith('feature/') && branch !== 'feature/';
}

export function isPublishablePath(path: string): boolean {
  const basename = posix.basename(path);
  return basename !== 'application-design.md' && basename !== 'session-log.md';
}

export function isCommitMessage(message: string): boolean {
  const verbs =
    'Accepted Added Blocked Configured Documented Enforced Fixed Implemented Initialized Queried Refactored Rejected Updated Verified';
  return verbs.split(' ').includes(String(message.split(' ')[0]));
}
