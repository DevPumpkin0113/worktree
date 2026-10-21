import { ko } from './ko';
import { en } from './en';
export type Language = 'ko' | 'en';
export let messages: typeof ko = ko;
let language: Language = 'ko';
export function getLanguage() {
  return language;
}
export function setLanguage(value: Language) {
  language = value;
  messages = value === 'en' ? en : ko;
}
export function isLanguage(value: string): value is Language {
  return value === 'ko' || value === 'en';
}
