import { getLanguage } from '@worktree/core/i18n/messages';
import { en } from './en';
import { ko } from './ko';
export function errorMessage(key: keyof typeof en, values: unknown[] = []) {
  const text = (getLanguage() === 'ko' ? ko : en)[key];
  return text.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)]));
}
