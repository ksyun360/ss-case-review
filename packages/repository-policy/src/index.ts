export function isFeatureBranch(branch: string): boolean {
  return branch.startsWith('feature/') && branch !== 'feature/';
}
