import { Icon } from '../shared/Icon';
import type { Page } from '../../app/types';
export const PAGES: Record<Page, [string, string]> = {
  board: ['작업 보드', '다양한 보기로 작업의 흐름을 확인하세요.'],
  tasks: ['작업 목록', '문서의 작업을 한 목록에서 확인하고 찾아보세요.'],
  analytics: ['인사이트', '프로젝트 진행 상황을 살펴볼 공간입니다.'],
};
const PAGE_ICONS: Record<Page, string> = {
  board: 'workspace',
  tasks: 'task-list',
  analytics: 'insights',
};
export function WorkspaceNav({
  page,
  collapsed,
  onPage,
  onCollapse,
  inert,
}: {
  page: Page;
  collapsed: boolean;
  onPage: (page: Page) => void;
  onCollapse: () => void;
  inert: boolean;
}) {
  const collapseName = collapsed ? '워크스페이스 펼치기' : '워크스페이스 접기';
  return (
    <aside id="workspaceNav" className="workspace-nav" aria-label="워크스페이스" inert={inert}>
      <p className="workspace-nav-label">워크스페이스</p>
      <nav aria-label="워크스페이스 메뉴">
        {(Object.keys(PAGES) as Page[]).map((key) => (
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
          Worktree<span>계획에서 실행까지</span>
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
