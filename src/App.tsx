import { ProjectTaskTypeContext, EMPTY_TASK_TYPE_COLORS } from './app/project-task-type-context';
import {
  TaskDeleteDialog,
  type TaskDeleteSession,
} from './components/task-detail/TaskDeleteDialog';
import { TaskEditor, type TaskEditorSession } from './components/task-detail/TaskEditor';
import { messages } from './i18n/messages';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createIdLabels } from './domain/id-display';
import { summarizeWork, statusNotice } from './domain/work-summary';
import { useWorkspace } from './hooks/use-workspace';
import { Titlebar } from './components/layout/Titlebar';
import { WorkspaceNav } from './components/layout/WorkspaceNav';
import { Content } from './components/workspace/Content';
import { ProjectDock } from './components/project/ProjectDock';
import { folderName } from './domain/project-paths';
import { ProjectDateFormatProvider } from './components/project/ProjectDateFormatProvider';
import { TaskDetail } from './components/task-detail/TaskDetail';
import { Settings } from './components/settings/Settings';
import { Problems } from './components/problems/Problems';
import type { WorkspaceStore } from './app/workspace-store';
export function App({ store }: { store: WorkspaceStore }) {
  const state = useWorkspace(store),
    model = store.active?.model ?? null;
  const page = store.activeProject?.files.length === 0 ? 'initialize' : state.page;
  const [editor, setEditor] = useState<TaskEditorSession | null>(null);
  const openEditor = (id?: string, kind: 'task' | 'milestone' = 'task') => {
    const doc = store.active;
    if (doc?.model) setEditor({ path: doc.path, text: doc.text, id, kind });
  };
  const [deletion, setDeletion] = useState<TaskDeleteSession | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [initializationStep, setInitializationStep] = useState(0);
  useEffect(() => setInitializationStep(0), [state.activeProjectPath, state.page]);
  useEffect(() => {
    document.documentElement.lang = state.settings.language;
  }, [state.settings.language]);
  const labels = useMemo(
    () =>
      model
        ? (createIdLabels(model, model.idSeparator ?? 'none') as Map<string, string>)
        : new Map<string, string>(),
    [model],
  );
  const label = useMemo(() => (id: string) => labels.get(id) ?? id, [labels]);
  const summary = useMemo(() => (model ? summarizeWork(model.rows) : null), [model]);
  const problems = store.problems;
  const collisions = [...labels.values()].filter((value) => value.includes('[')).length;
  const notice = summary
    ? statusNotice(summary, model!.useEffort) +
      (collisions ? messages.idCollisionPrefix + collisions + messages.idCollisionSuffix : '')
    : messages.projectOpenPrompt;
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('workspace-nav-collapsed', collapsed);
    return () => document.documentElement.classList.remove('workspace-nav-collapsed');
  }, [collapsed]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape') return;
      if (state.settingsOpen) {
        event.preventDefault();
        store.closeSettings();
      } else if (state.problemsOpen) {
        event.preventDefault();
        store.closeProblems();
        document.getElementById('error')?.focus();
      } else if (state.selectedId) {
        event.preventDefault();
        store.selectWork(null);
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [store, state.settingsOpen, state.selectedId, state.problemsOpen, state.settings.detailMode]);
  const detail = (
    <TaskDetail
      documents={state.documents}
      source={store.active?.text ?? ''}
      displayName={state.settings.displayName}
      onSaveComment={(expected, text, id, replyTo) =>
        store.saveComment(state.activePath!, expected, state.selectedId!, text, id, replyTo)
      }
      onDeleteComment={(expected, id) =>
        store.deleteComment(state.activePath!, expected, state.selectedId!, id)
      }
      onOpenSettings={() => store.toggleSettings()}
      model={model}
      path={state.activePath}
      id={state.selectedId}
      mode={state.settings.detailMode}
      settingsOpen={
        state.settingsOpen ||
        (state.settings.detailMode === 'tabs' && page !== 'board' && page !== 'tasks')
      }
      collapsed={collapsed}
      label={label}
      onSelect={(id) => store.selectWork(id)}
      onEdit={(id) => openEditor(id)}
      onDelete={(id) => {
        const doc = store.active;
        if (doc?.model) setDeletion({ path: doc.path, text: doc.text, id });
      }}
      onClose={() =>
        state.settings.detailMode === 'tabs' && state.selectedId
          ? store.closeTaskTab(state.selectedId)
          : store.selectWork(null)
      }
    />
  );
  return (
    <ProjectTaskTypeContext.Provider value={model?.taskTypeColors ?? EMPTY_TASK_TYPE_COLORS}>
      <ProjectDateFormatProvider dateFormat={model?.dateFormat} timeFormat={model?.timeFormat}>
        <Titlebar
          store={store}
          settingsOpen={state.settingsOpen}
          collapsed={collapsed}
          query={state.query}
          searchEnabled={!!model && (page === 'board' || page === 'tasks')}
        />
        <WorkspaceNav
          initializationStep={initializationStep}
          projectTitle={
            model?.title ?? (state.activeProjectPath ? folderName(state.activeProjectPath) : null)
          }
          onManage={() => {
            store.setPage('project');
          }}
          page={page}
          collapsed={collapsed}
          onPage={(page) => store.setPage(page)}
          onCollapse={() => setCollapsed((value) => !value)}
          inert={state.settingsOpen}
        />
        <Content
          detail={detail}
          initializationStep={initializationStep}
          onInitializationStep={setInitializationStep}
          store={store}
          state={{ ...state, page }}
          label={label}
          onAddTask={() => openEditor()}
          onAddMilestone={() => openEditor(undefined, 'milestone')}
        />
        <Problems
          problems={problems}
          open={state.problemsOpen}
          inert={state.settingsOpen}
          onClose={() => {
            store.closeProblems();
            document.getElementById('error')?.focus();
          }}
        />
        <ProjectDock store={store} state={state} />
        <footer
          id="appStatusbar"
          className="app-statusbar"
          aria-label={messages.documentStatus}
          inert={state.settingsOpen}
        >
          <button
            id="error"
            className="statusbar-error"
            aria-expanded={state.problemsOpen}
            aria-controls="documentProblems"
            aria-live="polite"
            hidden={!problems.length}
            onClick={() => store.toggleProblems()}
            title={problems[0] ? messages.toggleProblemsPrefix + problems[0].message : ''}
          >
            {problems[0]
              ? '⚠ ' +
                problems[0].kind +
                ' ' +
                problems.length +
                messages.issueCountSeparator +
                problems[0].message
              : ''}
          </button>
          <span
            id="notice"
            className="statusbar-notice"
            role="status"
            aria-live="polite"
            title={notice}
            hidden={!!problems.length}
          >
            {notice}
          </span>
          <span id="source" className="source-status" title={state.activePath ?? ''}>
            {state.activePath ?? state.activeProjectPath ?? messages.noOpenProject}
          </span>
          <span className="statusbar-mode">{messages.localDocument}</span>
        </footer>
        <Settings store={store} state={state} />
        {deletion ? (
          <TaskDeleteDialog
            session={deletion}
            onDelete={(options) =>
              store.deleteTask(deletion.path, deletion.text, deletion.id, options)
            }
            onClose={() => setDeletion(null)}
          />
        ) : null}
        {editor ? (
          <TaskEditor
            session={editor}
            onSave={async (draft) => {
              await store.saveTask(editor.path, editor.text, draft, editor.id);
            }}
            onClose={() => setEditor(null)}
          />
        ) : null}
      </ProjectDateFormatProvider>
    </ProjectTaskTypeContext.Provider>
  );
}
