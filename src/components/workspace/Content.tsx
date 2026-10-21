import { ProjectInitializer } from '../project/ProjectInitializer';
import { messages } from '../../i18n/messages';
import { ProjectManagement } from '../project/ProjectManagement';
import { FilterDropdown } from '../shared/FilterDropdown';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { workOwners, matchesWork } from '../../domain/work-filter';
import { createDocumentViewState } from '../../interactions/document-view-state';
import { CompactProgress } from './CompactProgress';
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
  get tree() {
    return messages.tree;
  },
  get board() {
    return messages.kanban;
  },
  get flow() {
    return messages.workNetwork;
  },
  get gantt() {
    return messages.gantt;
  },
};
export function Content({
  store,
  state,
  label,
  onAddTask,
  onAddMilestone,
}: {
  store: WorkspaceStore;
  state: WorkspaceSnapshot;
  label: (id: string) => string;
  onAddTask: () => void;
  onAddMilestone: () => void;
}) {
  const active = store.active,
    model = active?.model;
  const selectedId =
    state.settings.detailMode === 'sidebar' && !state.settingsOpen ? state.selectedId : null;
  const rows = model?.rows;
  const root = useRef<HTMLDivElement>(null);
  const viewState = useRef(createDocumentViewState());
  const pageKey =
    state.page === 'board'
      ? active?.view === 'gantt'
        ? 'gantt:' + active.ganttUnit
        : (active?.view ?? 'tree')
      : state.page;
  const filtered = useMemo(
    () =>
      rows?.filter(
        (row) =>
          row.type !== 'group' &&
          matchesWork(row, { query: state.query, status: state.status, owner: state.owner }, label),
      ) ?? [],
    [rows, state.query, state.status, state.owner, label],
  );
  const showEmptyMilestones = !state.query && state.owner === 'all' && state.status === 'all';
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
        {(state.page === 'board' || state.page === 'tasks') && model ? (
          <CompactProgress rows={model.rows} />
        ) : null}
      </div>
      <div
        id="workspaceTools"
        className="tools"
        hidden={state.page === 'analytics' || state.page === 'project'}
      >
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
          aria-label={messages.searchTasks}
          placeholder={messages.searchPlaceholder}
          value={state.query}
          onChange={(event) => {
            capture();
            store.setFilters({ query: event.target.value });
          }}
        />
        <FilterDropdown
          key={'owner:' + active?.path + state.page + state.settingsOpen}
          id="owner"
          label={messages.ownerFilter}
          value={state.owner}
          options={[
            { value: 'all', label: messages.allOwners },
            ...owners.map((owner) => ({
              value: 'owner:' + owner,
              label: owner === '-' ? messages.unassigned : owner,
            })),
          ]}
          disabled={state.settingsOpen}
          onChange={(owner) => {
            capture();
            store.setFilters({ owner });
          }}
        />
        <FilterDropdown
          key={'status:' + active?.path + state.page + state.settingsOpen}
          id="status"
          label={messages.statusFilter}
          value={state.status}
          options={[
            { value: 'all', label: messages.allStatuses },
            { value: 'todo', label: messages.todo },
            { value: 'doing', label: messages.doing },
            { value: 'blocked', label: messages.blocked },
            { value: 'done', label: messages.done },
          ]}
          disabled={state.settingsOpen}
          onChange={(status) => {
            capture();
            store.setFilters({ status });
          }}
        />
        {model ? (
          <div className="workspace-create-actions">
            <button
              id="milestoneAddOpen"
              className="task-add-button"
              type="button"
              onClick={onAddMilestone}
            >
              <Icon name="plus" />
              <span>{messages.addMilestone}</span>
            </button>
            <button id="taskAddOpen" className="task-add-button" type="button" onClick={onAddTask}>
              <Icon name="plus" />
              <span>{messages.addTask}</span>
            </button>
          </div>
        ) : null}
      </div>
      <div id="content" ref={root} onScrollCapture={capture}>
        {store.activeProject && store.activeProject.files.length === 0 ? (
          <ProjectInitializer key={store.activeProject.path} store={store} />
        ) : state.page === 'project' && store.activeProject ? (
          <ProjectManagement model={model ?? null} project={store.activeProject} />
        ) : state.page === 'analytics' ? (
          <Analytics model={model ?? null} />
        ) : !active ? (
          <div className="empty">
            {store.activeProject ? messages.documentUnavailable : messages.projectOpenPrompt}
          </div>
        ) : !model ? (
          <div className="document-unavailable">
            <strong>{messages.documentUnavailable}</strong>
            <p>{messages.checkProblemsHint}</p>
          </div>
        ) : filtered.length === 0 &&
          !(
            showEmptyMilestones &&
            state.page === 'board' &&
            active.view === 'tree' &&
            model.rows.some((row) => row.milestone)
          ) ? (
          <div className="empty">
            {model.rows.length ? messages.noMatchingTasks : messages.emptyProjectTasks}
          </div>
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
            showEmptyMilestones={showEmptyMilestones}
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
            onUnit={(unit) => {
              capture();
              store.setGanttUnit(unit);
            }}
            onSelect={(id) => store.selectWork(id)}
            onScroll={capture}
          />
        )}
      </div>
    </main>
  );
}
