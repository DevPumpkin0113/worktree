import { messages } from '../i18n/messages';
interface DetailStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}
const KEY = 'worktree.detail-mode';
export function readDetailMode(storage: Pick<DetailStorage, 'getItem'>) {
  try {
    return storage.getItem(KEY) === 'modal' ? 'modal' : 'sidebar';
  } catch {
    return 'sidebar';
  }
}
export function saveDetailMode(storage: DetailStorage, value: string) {
  if (!['modal', 'sidebar'].includes(value)) throw Error(messages.invalidDetailMode);
  return storage.setItem(KEY, value);
}
