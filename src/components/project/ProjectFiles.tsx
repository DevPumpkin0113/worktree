import { messages } from '../../i18n/messages';
import { useMemo } from 'react';
import { projectFileTree } from './project-file-tree';
import { ProjectFileBranch } from './ProjectFileBranch';
export function ProjectFiles({
  projectPath,
  files,
  activePath,
  onSelect,
}: {
  projectPath: string | null;
  files: string[];
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const tree = useMemo(
    () => (projectPath ? projectFileTree(projectPath, files) : []),
    [projectPath, files],
  );
  return (
    <ul id="projectFiles" className="project-files" aria-label={messages.projectWbsFiles}>
      {tree.length ? (
        tree.map((node) => (
          <ProjectFileBranch
            key={node.path}
            node={node}
            activePath={activePath}
            onSelect={onSelect}
          />
        ))
      ) : (
        <li className="project-files-empty">{messages.noWbsFiles}</li>
      )}
    </ul>
  );
}
