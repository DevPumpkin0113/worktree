import { worktreeReleaseStage } from '../../domain/release-name';
import { messages } from '../../i18n/messages';
import { version } from '../../../package.json';
import { InitializationSteps } from '../project/InitializationSteps';
import { ProjectEntry } from '../project/ProjectEntry';
import { Icon } from '../shared/Icon';
import type { Page } from '../../app/types';
export const PAGES: Record<Page, [string, string]> = {
  get initialize() {
    return [messages.initializeProject, messages.initializationDescription] as [string, string];
  },
  get project() {
    return [messages.projectManagement, messages.projectManagementDescription] as [string, string];
  },
  get board() {
    return [messages.workBoard, messages.workBoardDescription] as [string, string];
  },
  get tasks() {
    return [messages.workList, messages.workListDescription] as [string, string];
  },
  get analytics() {
    return [messages.insights, messages.insightsDescription] as [string, string];
  },
};
const PAGE_ICONS: Record<Page, string> = {
  initialize: 'project',
  project: 'project',
  board: 'workspace',
  tasks: 'task-list',
  analytics: 'insights',
};
export function WorkspaceNav({
  initializationStep,
  projectTitle,
  onManage,
  page,
  collapsed,
  onPage,
  onCollapse,
  inert,
}: {
  initializationStep: number;
  projectTitle: string | null;
  onManage: () => void;
  page: Page;
  collapsed: boolean;
  onPage: (page: Page) => void;
  onCollapse: () => void;
  inert: boolean;
}) {
  const collapseName = collapsed ? messages.expandWorkspace : messages.collapseWorkspace;
  return (
    <aside
      id="workspaceNav"
      className="workspace-nav"
      aria-label={messages.workspace}
      inert={inert}
    >
      <ProjectEntry title={projectTitle} onManage={onManage} active={page === 'project'} />
      {page === 'initialize' ? (
        <InitializationSteps step={initializationStep} />
      ) : (
        <>
          <p className="workspace-nav-label">{messages.workspace}</p>
          <nav aria-label={messages.workspaceMenu}>
            {(['board', 'tasks', 'analytics'] as const).map((key) => (
              <button
                key={key}
                type="button"
                data-workspace-page={key}
                aria-label={PAGES[key][0]}
                title={PAGES[key][0]}
                aria-current={key === page ? 'page' : undefined}
                onClick={() => onPage(key)}
              >
                <span className="workspace-nav-icon" aria-hidden="true">
                  <Icon name={PAGE_ICONS[key]} />
                </span>
                <span className="workspace-nav-text">{PAGES[key][0]}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      <div className="workspace-nav-footer">
        <div className="workspace-footer-copy">
          {worktreeReleaseStage(version)} Worktree<span>{version}</span>
        </div>
        <button
          id="workspaceCollapse"
          className="workspace-collapse"
          type="button"
          aria-label={collapseName}
          title={collapseName}
          aria-expanded={!collapsed}
          aria-controls="workspaceNav"
          onClick={onCollapse}
        >
          <Icon name="collapse" />
        </button>
      </div>
    </aside>
  );
}
