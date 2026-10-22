import type { ProjectSettingsDraft } from './project-settings';
export interface ProjectInitializationDraft extends ProjectSettingsDraft {
  directory: string;
  prefix: string;
}
export function projectRuleValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
export function validProjectRuleValues(value: string, required = false) {
  const values = projectRuleValues(value);
  return (
    (!required || values.length > 0) &&
    new Set(values).size === values.length &&
    values.every((item) => !/[\r\n\0]/.test(item))
  );
}

export function validTaskPrefix(value: string) {
  return /^[A-Z]{1,20}$/.test(value) && value !== 'MS';
}
export function validInitializationDirectory(value: string) {
  return (
    !!value &&
    !/^[\\/]|[:\\<>"|?*\x00-\x1f]/.test(value) &&
    value
      .split('/')
      .every(
        (part) =>
          !!part &&
          part !== '.' &&
          part !== '..' &&
          !/[. ]$/.test(part) &&
          !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),
      )
  );
}
export function splitInitializationDirectory(value: string) {
  const index = value.lastIndexOf('/');
  return { parent: index < 0 ? '' : value.slice(0, index), name: value.slice(index + 1) };
}
