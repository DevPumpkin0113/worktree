import { latestVersion, saveCache } from './update';
try {
  saveCache(await latestVersion());
} catch {
  /* Background checks are best effort. */
}
