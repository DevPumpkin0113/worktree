import { pathKey } from '../../domain/project-paths';
import { ProjectFolder } from './ProjectFolder';
import { Icon } from '../shared/Icon';
import type { ProjectFileNode } from './project-file-tree';
interface BranchProps {
  node: ProjectFileNode;
  activePath: string | null;
  onSelect: (path: string) => void;
}
export function ProjectFileBranch(props: BranchProps) {
  const { node, activePath, onSelect } = props;
  if (node.kind === 'folder')
    return (
      <ProjectFolder name={node.name} path={node.path} activePath={activePath}>
        {node.children.map((child) => (
          <ProjectFileBranch
            key={child.path}
            node={child}
            activePath={activePath}
            onSelect={onSelect}
          />
        ))}
      </ProjectFolder>
    );
  const selected = activePath !== null && pathKey(node.path) === pathKey(activePath);
  return (
    <li>
      <button
        type="button"
        className={'project-file' + (selected ? ' selected' : '')}
        title={node.path}
        aria-label={node.relativePath}
        aria-current={selected ? 'true' : undefined}
        onClick={() => onSelect(node.path)}
      >
        <Icon name="wbs-file" />
        <span>{node.name}</span>
      </button>
    </li>
  );
}
