import { legacyPriorities } from '@worktree/core/project-priorities';
import { priorityColor } from '../../views/priority-color';
import { taskTypeColor } from '@worktree/core/task-type-colors';
import { WorkspaceToolsPanel } from './WorkspaceToolsPanel';
import { AppliedFilters } from './AppliedFilters';
import { TaskTabs } from './TaskTabs';
import { ProjectInitializer } from '../project/ProjectInitializer';
import { messages } from '../../i18n/messages';
import { ProjectManagement } from '../project/ProjectManagement';
import { FilterDropdown } from '../shared/FilterDropdown';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { workOwners, matchesWork } from '@worktree/core/work-filter';
import { createDocumentViewState } from '../../interactions/document-view-state';
import { WorkspaceProgressActions } from './WorkspaceProgressActions';
import { TreeView } from './TreeView';
import { KanbanView } from './KanbanView';
import { AllTasks } from './AllTasks';
import { Analytics } from './Analytics';
import { EpicOverview } from './EpicOverview';
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
  onCloseTaskTab,
  onAddMilestone,
  onAddEpic,
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
  onCloseTaskTab: (id: string) => void;
  onAddMilestone: () => void;
  onAddEpic: () => void;
}) {
  const active = store.active,
    model = active?.model;
  const selectedId =
    store.detailMode === 'sidebar' && !state.settingsOpen ? state.selectedId : null;
  const rows = model?.rows;
  const root = useRef<HTMLDivElement>(null);
  const viewState = useRef(createDocumentViewState({ trackGroups: false }));
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
          matchesWork(
            row,
            {
              query: state.query,
              status: state.status,
              owner: state.owner,
              taskType: state.taskType,
              priority: state.priority,
            },
            label,
          ),
      ) ?? [],
    [rows, state.query, state.status, state.owner, state.taskType, state.priority, label],
  );
  const showEmptyMilestones =
    !state.query &&
    state.owner === 'all' &&
    state.status === 'all' &&
    state.taskType === 'all' &&
    state.priority === 'all';
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
      <div className="workspace-page-heading">
        <h2 id="workspacePageTitle">{PAGES[state.page][0]}</h2>
        {(state.page === 'board' || state.page === 'tasks') && model ? (
          <WorkspaceProgressActions
            key={active?.path + ':' + state.page + ':' + state.settingsOpen}
            rows={model.rows}
            onAddTask={onAddTask}
            onAddMilestone={onAddMilestone}
            onAddEpic={onAddEpic}
          />
        ) : null}
      </div>
      <div className="workspace-tab-row">
        {tabsVisible && model ? (
          <TaskTabs
            ids={active?.taskTabs ?? []}
            creationTabs={active?.creationTabs}
            selectedId={state.selectedId}
            model={model}
            label={label}
            onSelect={selectWork}
            onClose={onCloseTaskTab}
            onMove={(source, target, after) => store.reorderTaskTabs(source, target, after)}
            enabled={!state.settingsOpen}
          />
        ) : null}
        <div
          id="workspaceTools"
          className="tools"
          hidden={
            state.page === 'epics' ||
            state.page === 'analytics' ||
            state.page === 'project' ||
            state.page === 'initialize'
          }
        >
          <div hidden={state.page !== 'board'}>
            <WorkspaceToolsPanel
              key={'view:' + active?.path + state.page + state.settingsOpen + state.selectedId}
              id="viewOptionsOpen"
              label={messages.viewOptions}
              icon="view-options"
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
            </WorkspaceToolsPanel>
          </div>
          <WorkspaceToolsPanel
            key={'filter:' + active?.path + state.page + state.settingsOpen + state.selectedId}
            id="filterOptionsOpen"
            label={messages.filters}
            icon="filter"
            active={[state.priority, state.taskType, state.owner, state.status].some(
              (value) => value !== 'all',
            )}
          >
            <div className="workspace-filter-actions">
              <FilterDropdown
                key={'status:' + active?.path + state.page + state.settingsOpen}
                id="status"
                submenu={{ label: messages.status, icon: 'status' }}
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
              <FilterDropdown
                key={'priority:' + active?.path + state.page + state.settingsOpen}
                id="priorityFilter"
                submenu={{ label: messages.priority, icon: 'priority' }}
                label={messages.priority}
                value={state.priority}
                options={[
                  { value: 'all', label: messages.allPriorities },
                  { value: 'priority:-', label: messages.unassignedPriority },
                  ...(model?.priorities ?? legacyPriorities()).map(
                    (priority, index, priorities) => ({
                      value: 'priority:' + priority.id,
                      label: priority.name,
                      badge: true,
                      color: priorityColor(index, priorities.length),
                    }),
                  ),
                ]}
                disabled={state.settingsOpen}
                onChange={(priority) => {
                  capture();
                  store.setFilters({ priority });
                }}
              />
              <FilterDropdown
                key={'taskType:' + active?.path + state.page + state.settingsOpen}
                id="taskTypeFilter"
                submenu={{ label: messages.taskType, icon: 'task-list' }}
                label={messages.taskType}
                value={state.taskType}
                options={[
                  { value: 'all', label: messages.allTaskTypes },
                  ...(model?.taskTypes ?? []).map((type) => ({
                    value: 'type:' + type,
                    label: type,
                    badge: true,
                    color: taskTypeColor(model?.taskTypeColors, type),
                  })),
                ]}
                disabled={state.settingsOpen}
                onChange={(taskType) => {
                  capture();
                  store.setFilters({ taskType });
                }}
              />
              <FilterDropdown
                key={'owner:' + active?.path + state.page + state.settingsOpen}
                id="owner"
                submenu={{ label: messages.owner, icon: 'person' }}
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
            </div>
          </WorkspaceToolsPanel>
        </div>
      </div>
      <div
        id="workspaceHome"
        className="workspace-home"
        role={tabsVisible ? 'tabpanel' : undefined}
        aria-labelledby={tabsVisible ? 'task-home-tab' : undefined}
        hidden={!homeVisible}
      >
        {(state.page === 'board' || state.page === 'tasks') && model ? (
          <AppliedFilters
            state={state}
            model={model}
            onRemove={(key) => {
              capture();
              store.setFilters({ [key]: 'all' });
            }}
          />
        ) : null}
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
          ) : state.page === 'epics' ? (
            <EpicOverview
              key={active?.path}
              model={model ?? null}
              label={label}
              onOpen={(id) => {
                store.setPage('board');
                store.setView('tree');
                store.selectWork(id);
              }}
              onAdd={() => {
                store.setPage('board');
                onAddEpic();
              }}
            />
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
              model.rows.some((row) => row.type === 'group')
            ) ? (
            <div className="empty">
              {model.rows.length ? messages.noMatchingTasks : messages.emptyProjectTasks}
            </div>
          ) : state.page === 'tasks' ? (
            <AllTasks rows={filtered} label={label} selectedId={selectedId} onSelect={selectWork} />
          ) : active.view === 'tree' ? (
            <TreeView
              key={active.path}
              rows={model.rows}
              visibleIds={visibleIds}
              showEmptyMilestones={showEmptyMilestones}
              useEffort={model.useEffort}
              label={label}
              selectedId={selectedId}
              onSelect={selectWork}
              collapsedGroups={active.collapsedGroups ?? []}
              onGroupToggle={(id, open) => {
                if (homeVisible) capture();
                store.setTreeGroupOpen(active.path, id, open);
              }}
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
