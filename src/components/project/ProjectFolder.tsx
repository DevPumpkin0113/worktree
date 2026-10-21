import { useEffect, useState, type ReactNode } from 'react';
import { withinProject } from '../../domain/project-paths';
import { Icon } from '../shared/Icon';
export function ProjectFolder({
  name,
  path,
  activePath,
  children,
}: {
  name: string;
  path: string;
  activePath: string | null;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (activePath && withinProject(activePath, path)) setExpanded(true);
  }, [activePath, path]);
  return (
    <li className="project-folder">
      <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary className="project-folder-label" title={path}>
          <Icon name="chevron-right" className="project-folder-chevron" />
          <Icon name="folder" />
          <span>{name}</span>
        </summary>
        <ul className="project-folder-children">{children}</ul>
      </details>
    </li>
  );
}
