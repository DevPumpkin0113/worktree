import { TaskTabs } from './TaskTabs';
import { ProjectInitializer } from '../project/ProjectInitializer';
import { messages } from '../../i18n/messages';
import { ProjectManagement } from '../project/ProjectManagement';
import { FilterDropdown } from '../shared/FilterDropdown';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { workOwners, matchesWork } from '../../domain/work-filter';
import { createDocumentViewState } from '../../interactions/document-view-state';
import { useWorkspaceHeadingHeight } from '../../hooks/use-workspace-heading-height';
import { WorkspaceProgressActions } from './WorkspaceProgressActions';
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
  detail,
  creation,
  label,
  onAddTask,
  onAddMilestone,
  initializationStep,
  onInitializationStep,
}: {
  initializationStep: number;
  onInitializationStep: (step: number) => void;
  detail: ReactNode;
  creation: ReactNode;
  store: WorkspaceStore;
  state: WorkspaceSnapshot;
  label: (id: string) => string;
  onAddTask: () => void;
  onAddMilestone: () => void;
}) {
  const active = store.active,
    model = active?.model;
  const selectedId =
    store.detailMode === 'sidebar' && !state.settingsOpen ? state.selectedId : null;
  const rows = model?.rows;
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  useWorkspaceHeadingHeight(heading);
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
  const tabsVisible =
    store.detailMode === 'tabs' && (state.page === 'board' || state.page === 'tasks') && !!model;
  const homeVisible = !tabsVisible || !state.selectedId;
  const selectWork = (id: string | null) => {
    if (homeVisible) capture();
    store.selectWork(id);
  };
  useLayoutEffect(() => {
    if (!root.current || !homeVisible) return;
    const path = active?.path;
    if (path) viewState.current.restore(path, pageKey, root.current, rows ?? []);
  }, [active?.path, pageKey, rows, filtered, label, homeVisible]);
  return (
    <main id="workspace" data-page={state.page} inert={state.settingsOpen}>
      <div className="workspace-page-heading" ref={heading}>
        <div>
          <h2 id="workspacePageTitle">{PAGES[state.page][0]}</h2>
          <p id="workspacePageDescription">{PAGES[state.page][1]}</p>
        </div>
        {(state.page === 'board' || state.page === 'tasks') && model ? (
          <WorkspaceProgressActions
            rows={model.rows}
            onAddTask={onAddTask}
            onAddMilestone={onAddMilestone}
          />
        ) : null}
      </div>
      {tabsVisible && model ? (
        <TaskTabs
          ids={active?.taskTabs ?? []}
          creationTabs={active?.creationTabs}
          selectedId={state.selectedId}
          model={model}
          label={label}
          onSelect={selectWork}
          onClose={(id) => store.closeTaskTab(id)}
          onMove={(source, target, after) => store.reorderTaskTabs(source, target, after)}
          enabled={!state.settingsOpen}
        />
      ) : null}
      <div
        id="workspaceHome"
        className="workspace-home"
        role={tabsVisible ? 'tabpanel' : undefined}
        aria-labelledby={tabsVisible ? 'task-home-tab' : undefined}
        hidden={!homeVisible}
      >
        <div
          id="workspaceTools"
          className="tools"
          hidden={
            state.page === 'analytics' || state.page === 'project' || state.page === 'initialize'
          }
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
          <div className="workspace-filter-actions">
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
          </div>
        </div>
        <div id="content" ref={root} onScrollCapture={capture}>
          {store.activeProject && store.activeProject.files.length === 0 ? (
            <ProjectInitializer
              key={store.activeProject.path}
              store={store}
              step={initializationStep}
              onStep={onInitializationStep}
            />
          ) : state.page === 'project' && store.activeProject ? (
            <ProjectManagement
              key={store.activeProject.path}
              store={store}
              model={model ?? null}
              project={store.activeProject}
            />
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
            <AllTasks rows={filtered} label={label} selectedId={selectedId} onSelect={selectWork} />
          ) : active.view === 'tree' ? (
            <TreeView
              rows={model.rows}
              visibleIds={visibleIds}
              showEmptyMilestones={showEmptyMilestones}
              useEffort={model.useEffort}
              label={label}
              selectedId={selectedId}
              onSelect={selectWork}
              onToggle={capture}
            />
          ) : active.view === 'board' ? (
            <KanbanView
              rows={filtered}
              label={label}
              selectedId={selectedId}
              onSelect={selectWork}
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
              onSelect={selectWork}
              onScroll={capture}
            />
          )}
        </div>
      </div>
      {detail}
      {creation}
    </main>
  );
}
