import { relativeProjectPath } from '../../domain/project-paths';
export type ProjectFileNode =
  | { kind: 'file'; name: string; path: string; relativePath: string }
  | { kind: 'folder'; name: string; path: string; children: ProjectFileNode[] };

export function projectFileTree(projectPath: string, files: string[]): ProjectFileNode[] {
  const root: ProjectFileNode[] = [];
  const folders = new Map<string, Extract<ProjectFileNode, { kind: 'folder' }>>();
  for (const path of files) {
    const relativePath = relativeProjectPath(path, projectPath);
    const parts = relativePath.split('/');
    const name = parts.pop()!;
    let children = root;
    let prefix = '';
    for (const part of parts) {
      prefix += (prefix ? '/' : '') + part;
      let folder = folders.get(prefix);
      if (!folder) {
        folder = {
          kind: 'folder',
          name: part,
          path: projectPath.replace(/[\\/]+$/, '') + '/' + prefix,
          children: [],
        };
        folders.set(prefix, folder);
        children.push(folder);
      }
      children = folder.children;
    }
    children.push({ kind: 'file', name, path, relativePath });
  }
  function sort(nodes: ProjectFileNode[]) {
    nodes.sort(
      (a, b) =>
        Number(b.kind === 'folder') - Number(a.kind === 'folder') ||
        a.name.localeCompare(b.name, undefined, { numeric: true }),
    );
    for (const node of nodes) if (node.kind === 'folder') sort(node.children);
  }
  sort(root);
  return root;
}
