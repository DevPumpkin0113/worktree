import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createIdLabels } from './domain/id-display';
import { summarizeWork, statusNotice } from './domain/work-summary';
import { useWorkspace } from './hooks/use-workspace';
import { Titlebar } from './components/layout/Titlebar';
import { WorkspaceNav } from './components/layout/WorkspaceNav';
import { Content } from './components/workspace/Content';
import { DocumentDock } from './components/documents/DocumentDock';
import { TaskDetail } from './components/task-detail/TaskDetail';
import { Settings } from './components/settings/Settings';
import { Problems } from './components/problems/Problems';
import type { WorkspaceStore } from './app/workspace-store';
export function App({ store }: { store: WorkspaceStore }) {
  const state = useWorkspace(store),
    model = store.active?.model ?? null;
  const [collapsed, setCollapsed] = useState(false);
  const labels = useMemo(
    () =>
      model
        ? (createIdLabels(model, state.settings.separator) as Map<string, string>)
        : new Map<string, string>(),
    [model, state.settings.separator],
  );
  const label = useMemo(() => (id: string) => labels.get(id) ?? id, [labels]);
  const summary = useMemo(() => (model ? summarizeWork(model.rows) : null), [model]);
  const problems = store.problems;
  const collisions = [...labels.values()].filter((value) => value.includes('[')).length;
  const notice = summary
    ? statusNotice(summary, model!.useEffort) +
      (collisions ? ' 표시 ID 중복 ' + collisions + '개: 원본 ID를 함께 표시합니다.' : '')
    : '문서를 열어 주세요.';
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
      } else if (state.selectedId && state.settings.detailMode === 'modal') {
        return;
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
  return (
    <>
      <Titlebar store={store} settingsOpen={state.settingsOpen} />
      <WorkspaceNav
        page={state.page}
        collapsed={collapsed}
        onPage={(page) => store.setPage(page)}
        onCollapse={() => setCollapsed((value) => !value)}
        inert={state.settingsOpen}
      />
      <Content store={store} state={state} label={label} />
      <Problems
        problems={problems}
        open={state.problemsOpen}
        inert={state.settingsOpen}
        onClose={() => {
          store.closeProblems();
          document.getElementById('error')?.focus();
        }}
      />
      <DocumentDock store={store} state={state} />
      <footer
        id="appStatusbar"
        className="app-statusbar"
        aria-label="문서 상태"
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
          title={problems[0] ? '클릭하여 문제 패널 열기/닫기: ' + problems[0].message : ''}
        >
          {problems[0]
            ? '⚠ ' + problems[0].kind + ' ' + problems.length + '개 · ' + problems[0].message
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
          {state.activePath ?? '열린 문서 없음'}
        </span>
        <span className="statusbar-mode">읽기 전용</span>
      </footer>
      <TaskDetail
        model={model}
        path={state.activePath}
        id={state.selectedId}
        mode={state.settings.detailMode}
        settingsOpen={state.settingsOpen}
        collapsed={collapsed}
        label={label}
        onSelect={(id) => store.selectWork(id)}
        onClose={() => store.selectWork(null)}
      />
      <Settings store={store} state={state} />
    </>
  );
}
