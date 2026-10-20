import { useLayoutEffect, useMemo, useRef } from 'react';
import { workOwners, matchesWork } from '../../domain/work-filter';
import { createDocumentViewState } from '../../interactions/document-view-state';
import { Metrics } from './Metrics';
import { TreeView } from './TreeView';
import { KanbanView } from './KanbanView';
import { AllTasks } from './AllTasks';
import { Analytics } from './Analytics';
import { ChartView } from './ChartView';
import { Icon } from '../shared/Icon';
import { PAGES } from '../layout/WorkspaceNav';
import type { WorkspaceStore } from '../../app/workspace-store';
import type { View, WorkspaceSnapshot } from '../../app/types';
const VIEWS: Record<View, string> = {
  tree: '트리',
  board: '칸반',
  flow: '작업 네트워크',
  gantt: '간트 차트',
};
export function Content({
  store,
  state,
  label,
}: {
  store: WorkspaceStore;
  state: WorkspaceSnapshot;
  label: (id: string) => string;
}) {
  const active = store.active,
    model = active?.model;
  const selectedId =
    state.settings.detailMode === 'sidebar' && !state.settingsOpen ? state.selectedId : null;
  const rows = model?.rows;
  const root = useRef<HTMLDivElement>(null);
  const viewState = useRef(createDocumentViewState());
  const pageKey = state.page === 'board' ? (active?.view ?? 'tree') : state.page;
  const filtered = useMemo(
    () =>
      rows?.filter(
        (row) =>
          row.type !== 'group' &&
          matchesWork(row, { query: state.query, status: state.status, owner: state.owner }, label),
      ) ?? [],
    [rows, state.query, state.status, state.owner, label],
  );
  const visibleIds = useMemo(() => new Set(filtered.map((row) => row.id)), [filtered]);
  const owners = useMemo(() => (rows ? (workOwners(rows) as string[]) : []), [rows]);
  const capture = () => {
    if (active && root.current) viewState.current.capture(active.path, pageKey, root.current);
  };
  useLayoutEffect(() => {
    if (!root.current) return;
    const path = active?.path;
    if (path) viewState.current.restore(path, pageKey, root.current, rows ?? []);
  }, [active?.path, pageKey, rows, filtered, label]);
  return (
    <main id="workspace" inert={state.settingsOpen}>
      <div className="workspace-page-heading">
        <div>
          <h2 id="workspacePageTitle">{PAGES[state.page][0]}</h2>
          <p id="workspacePageDescription">{PAGES[state.page][1]}</p>
        </div>
        <span className="workspace-page-chip">워크스페이스</span>
      </div>
      {state.page !== 'analytics' && model ? (
        <Metrics rows={model.rows} useEffort={model.useEffort} />
      ) : null}
      <div id="workspaceTools" className="tools" hidden={state.page === 'analytics'}>
        {(Object.keys(VIEWS) as View[]).map((view) => (
          <button
            key={view}
            data-view={view}
            className={'view-button' + (active?.view === view ? ' active' : '')}
            title={VIEWS[view]}
            aria-label={VIEWS[view]}
            aria-pressed={active?.view === view}
            hidden={state.page !== 'board'}
            onClick={() => {
              capture();
              store.setView(view);
            }}
          >
            <Icon className="view-icon" name={view} />
          </button>
        ))}
        <input
          id="search"
          aria-label="작업 검색"
          placeholder="ID, 작업명, 담당자 검색"
          value={state.query}
          onChange={(event) => {
            capture();
            store.setFilters({ query: event.target.value });
          }}
        />
        <select
          id="owner"
          aria-label="담당자 필터"
          value={state.owner}
          onChange={(event) => {
            capture();
            store.setFilters({ owner: event.target.value });
          }}
        >
          <option value="all">전체 담당자</option>
          {owners.map((owner) => (
            <option value={'owner:' + owner} key={owner}>
              {owner === '-' ? '담당 미정' : owner}
            </option>
          ))}
        </select>
        <select
          id="status"
          aria-label="상태 필터"
          value={state.status}
          onChange={(event) => {
            capture();
            store.setFilters({ status: event.target.value });
          }}
        >
          <option value="all">전체 상태</option>
          <option value="todo">시작 전</option>
          <option value="doing">진행 중</option>
          <option value="blocked">막힘</option>
          <option value="done">완료</option>
        </select>
      </div>
      <div id="content" ref={root} onScrollCapture={capture}>
        {state.page === 'analytics' ? (
          <Analytics />
        ) : !active ? (
          <div className="empty">우측 하단 + 버튼으로 문서를 열거나 파일을 끌어오세요.</div>
        ) : !model ? (
          <div className="document-unavailable">
            <strong>문서를 표시할 수 없습니다.</strong>
            <p>하단 상태 표시줄의 오류를 눌러 원인과 수정 방법을 확인하세요.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">조건에 맞는 작업이 없습니다.</div>
        ) : state.page === 'tasks' ? (
          <AllTasks
            rows={filtered}
            label={label}
            selectedId={selectedId}
            onSelect={(id) => store.selectWork(id)}
          />
        ) : active.view === 'tree' ? (
          <TreeView
            rows={model.rows}
            visibleIds={visibleIds}
            useEffort={model.useEffort}
            label={label}
            selectedId={selectedId}
            onSelect={(id) => store.selectWork(id)}
            onToggle={capture}
          />
        ) : active.view === 'board' ? (
          <KanbanView
            rows={filtered}
            label={label}
            selectedId={selectedId}
            onSelect={(id) => store.selectWork(id)}
          />
        ) : (
          <ChartView
            key={active.path + active.view}
            focus={active.graphFocus}
            onFocus={(focus) => {
              capture();
              store.setGraphFocus(focus);
            }}
            view={active.view}
            rows={model.rows.filter((row) => row.type !== 'group')}
            filtered={filtered}
            label={label}
            selectedId={selectedId}
            unit={active.ganttUnit}
            onUnit={(unit) => store.setGanttUnit(unit)}
            onSelect={(id) => store.selectWork(id)}
            onScroll={capture}
          />
        )}
      </div>
    </main>
  );
}
