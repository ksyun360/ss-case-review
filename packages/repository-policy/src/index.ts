export function isFeatureBranch(branch: string): boolean {
  return branch.startsWith('feature/') && branch !== 'feature/';
}

export function isPublishablePath(_path: string): boolean {
  return false;
}
