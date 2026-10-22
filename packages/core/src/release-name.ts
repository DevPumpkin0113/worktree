export function worktreeReleaseStage(version: string): 'Beta' | 'Release' {
  return version.startsWith('0.') ? 'Beta' : 'Release';
}
export function worktreeReleaseName(version: string): string {
  return `${worktreeReleaseStage(version)} Worktree ${version}`;
}
