import { messages } from '../../i18n/messages';
import { useState } from 'react';
import { useProjectTreeHeight } from './use-project-tree-height';
import { ProjectFiles } from './ProjectFiles';
import { Icon } from '../shared/Icon';
export function ProjectEntry({
  projectPath,
  files,
  activePath,
  onFile,
  active,
  title,
  onManage,
  disabled,
  resizable,
}: {
  projectPath: string | null;
  files: string[];
  activePath: string | null;
  onFile: (path: string) => void;
  active: boolean;
  title: string | null;
  onManage: () => void;
  disabled: boolean;
  resizable: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const enabled = expanded && !disabled && resizable;
  const resize = useProjectTreeHeight(enabled);
  return (
    <section ref={resize.container} className="project-tree" aria-label={messages.projectExplorer}>
      <div className="project-entry">
        <button
          id="projectTreeToggle"
          type="button"
          className="project-tree-toggle"
          aria-label={
            (title ?? messages.project) +
            (expanded ? messages.collapseSuffix : messages.expandSuffix)
          }
          title={title ?? messages.noOpenProject}
          aria-expanded={expanded}
          aria-controls="projectFiles"
          onClick={() => setExpanded(!expanded)}
          disabled={disabled}
        >
          <Icon name="chevron-right" />
          <span className="project-entry-title">{title ?? messages.noOpenProject}</span>
        </button>
        <button
          id="projectManageOpen"
          type="button"
          className="project-manage-open"
          aria-label={messages.projectManagement}
          title={messages.projectManagement}
          aria-current={active ? 'page' : undefined}
          aria-controls="content"
          disabled={disabled}
          onClick={onManage}
        >
          <Icon name="project" />
        </button>
      </div>
      <div
        ref={resize.viewport}
        className="project-files-scroll"
        hidden={!expanded}
        style={{ height: resize.height }}
      >
        <ProjectFiles
          key={projectPath}
          projectPath={projectPath}
          files={files}
          activePath={activePath}
          onSelect={onFile}
        />
      </div>
      <div
        id="projectTreeResize"
        className="project-tree-resize"
        role="separator"
        tabIndex={enabled ? 0 : -1}
        hidden={!enabled}
        aria-label={messages.resizeProjectTree}
        aria-orientation="horizontal"
        aria-valuemin={resize.limits.min}
        aria-valuemax={resize.limits.max}
        aria-valuenow={Math.round(resize.height)}
        aria-controls="projectFiles"
        title={messages.resizeProjectTreeHint}
        onPointerDown={resize.onPointerDown}
        onPointerMove={resize.onPointerMove}
        onPointerUp={resize.onPointerUp}
        onPointerCancel={resize.onPointerCancel}
        onLostPointerCapture={resize.onLostPointerCapture}
        onKeyDown={resize.onKeyDown}
      />
    </section>
  );
}
