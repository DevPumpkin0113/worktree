import { useState } from 'react';
import { ProjectFiles } from './ProjectFiles';
import { Icon } from '../shared/Icon';
export function ProjectEntry({
  filePath,
  onFile,
  active,
  title,
  onManage,
  disabled,
}: {
  filePath: string | null;
  onFile: () => void;
  active: boolean;
  title: string | null;
  onManage: () => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section className="project-tree" aria-label="프로젝트 탐색">
      <div className="project-entry">
        <button
          id="projectTreeToggle"
          type="button"
          className="project-tree-toggle"
          aria-label={(title ?? '프로젝트') + (expanded ? ' 접기' : ' 펼치기')}
          title={title ?? '열린 문서 없음'}
          aria-expanded={expanded}
          aria-controls="projectFiles"
          onClick={() => setExpanded(!expanded)}
          disabled={disabled}
        >
          <Icon name="chevron-right" />
          <span className="project-entry-title">{title ?? '열린 문서 없음'}</span>
        </button>
        <button
          id="projectManageOpen"
          type="button"
          className="project-manage-open"
          aria-label="프로젝트 관리"
          title="프로젝트 관리"
          aria-current={active ? 'page' : undefined}
          aria-controls="content"
          disabled={disabled}
          onClick={onManage}
        >
          <Icon name="project" />
        </button>
      </div>
      <div hidden={!expanded}>
        <ProjectFiles path={filePath} onSelect={onFile} />
      </div>
    </section>
  );
}
