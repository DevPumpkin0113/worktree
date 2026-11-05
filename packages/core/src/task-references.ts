import { isRelativePath, type TaskReference } from './project-source';
export const REFERENCE_TYPES = ['text', 'file', 'web', 'folder'] as const;
export function referenceWebUrl(value: string): string | undefined {
  if (/[\r\n\0]/.test(value)) return;
  try {
    const url = new URL(value);
    if (['http:', 'https:'].includes(url.protocol) && url.hostname) return url.href;
  } catch {
    /* Legacy text references are not necessarily URLs. */
  }
}
export function validTaskReference(value: unknown): value is TaskReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const reference = value as TaskReference;
  if (
    !REFERENCE_TYPES.includes(reference.type) ||
    typeof reference.value !== 'string' ||
    !reference.value.trim() ||
    reference.value.includes('\0')
  )
    return false;
  if (
    reference.name !== undefined &&
    (typeof reference.name !== 'string' || /[\r\n\0]/.test(reference.name))
  )
    return false;
  if (reference.type === 'web') return !!referenceWebUrl(reference.value);
  if (reference.type === 'file' || reference.type === 'folder')
    return isRelativePath(reference.value);
  return true;
}
export function referenceDisplayName(reference: TaskReference): string {
  if (reference.name?.trim()) return reference.name.trim();
  if (reference.type === 'web' || reference.type === 'text') {
    const url = referenceWebUrl(reference.value);
    if (url) return new URL(url).host;
  }
  if (reference.type === 'file' || reference.type === 'folder') {
    const parts = reference.value.replaceAll('\\', '/').replace(/\/+$/, '').split('/');
    return parts.at(-1) || reference.value;
  }
  return reference.value;
}
