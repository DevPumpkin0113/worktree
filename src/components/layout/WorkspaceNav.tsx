import { version } from '../../../package.json';
import { ProjectEntry } from '../project/ProjectEntry';
import { Icon } from '../shared/Icon';
import type { Page } from '../../app/types';
export const PAGES: Record<Page, [string, string]> = {
  project: ['프로젝트 관리', '프로젝트 정보와 작업 규칙을 확인하세요.'],
  board: ['작업 보드', '다양한 보기로 작업의 흐름을 확인하세요.'],
  tasks: ['작업 목록', '문서의 작업을 한 목록에서 확인하고 찾아보세요.'],
  analytics: ['인사이트', '프로젝트 진행 상황을 살펴볼 공간입니다.'],
};
const PAGE_ICONS: Record<Page, string> = {
  project: 'project',
  board: 'workspace',
  tasks: 'task-list',
  analytics: 'insights',
};
export function WorkspaceNav({
  projectPath,
  projectTitle,
  onManage,
  page,
  collapsed,
  onPage,
  onCollapse,
  inert,
}: {
  projectPath: string | null;
  projectTitle: string | null;
  onManage: () => void;
  page: Page;
  collapsed: boolean;
  onPage: (page: Page) => void;
  onCollapse: () => void;
  inert: boolean;
}) {
  const collapseName = collapsed ? '워크스페이스 펼치기' : '워크스페이스 접기';
  return (
    <aside id="workspaceNav" className="workspace-nav" aria-label="워크스페이스" inert={inert}>
      <ProjectEntry
        filePath={projectPath}
        onFile={() => onPage('board')}
        title={projectTitle}
        onManage={onManage}
        disabled={!projectTitle}
        active={page === 'project'}
      />
      <p className="workspace-nav-label">워크스페이스</p>
      <nav aria-label="워크스페이스 메뉴">
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
      <div className="workspace-nav-footer">
        <div className="workspace-footer-copy">
          Worktree<span>v{version}</span>
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
