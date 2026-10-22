import { renderToStaticMarkup } from 'react-dom/server';
import { TreeView } from '../../apps/desktop/src/components/workspace/TreeView';
import { MetricsContent } from '../../apps/desktop/src/components/workspace/MetricsContent';
import { TaskDetail } from '../../apps/desktop/src/components/task-detail/TaskDetail';
import { Problems } from '../../apps/desktop/src/components/problems/Problems';
import type { Problem, WorkModel, WorkRow } from '../../apps/desktop/src/app/types';
import { summarizeWork } from '@worktree/core/work-summary';
export const renderMetrics = (summary: ReturnType<typeof summarizeWork>, useEffort = true) =>
  renderToStaticMarkup(<MetricsContent summary={summary} useEffort={useEffort} />);
export const renderTree = (
  rows: WorkRow[],
  matches: (row: WorkRow) => boolean,
  label: (id: string) => string,
  useEffort = true,
) =>
  renderToStaticMarkup(
    <TreeView
      rows={rows}
      visibleIds={new Set(rows.filter(matches).map((row) => row.id))}
      useEffort={useEffort}
      label={label}
      selectedId={null}
      onSelect={() => {}}
      onToggle={() => {}}
    />,
  );
export const renderTaskDetail = (model: WorkModel, id: string, label: (id: string) => string) => ({
  body: renderToStaticMarkup(
    <TaskDetail
      documents={[]}
      source=""
      displayName=""
      onSaveComment={async () => {}}
      onDeleteComment={async () => {}}
      onOpenSettings={() => {}}
      model={{ ...model, useEffort: model.useEffort !== false }}
      id={id}
      path="C:/test/worktree.json"
      mode="sidebar"
      settingsOpen={false}
      collapsed={false}
      label={label}
      onSelect={() => {}}
      onEdit={() => {}}
      editing={false}
      editors={null}
      onDelete={() => {}}
      onClose={() => {}}
    />,
  ),
});
export const renderDocumentErrors = (problems: Problem[]) =>
  renderToStaticMarkup(<Problems problems={problems} open inert={false} onClose={() => {}} />);
