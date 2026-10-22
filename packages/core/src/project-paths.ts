export function pathKey(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/\/+$/, '');
  return /^[A-Za-z]:|^\/\//.test(normalized) ? normalized.toLowerCase() : normalized;
}
export function parentFolder(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  const index = normalized.lastIndexOf('/');
  return index === 2 && normalized[1] === ':'
    ? normalized.slice(0, 3)
    : normalized.slice(0, index) || '/';
}
export function withinProject(file: string, folder: string): boolean {
  return pathKey(file).startsWith(pathKey(folder) + '/');
}
export function folderName(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '').split('/').at(-1) || path;
}
export function relativeProjectPath(file: string, folder: string): string {
  return withinProject(file, folder)
    ? file.replaceAll('\\', '/').slice(pathKey(folder).length + 1)
    : file;
}
