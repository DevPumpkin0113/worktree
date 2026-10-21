import { renderToStaticMarkup } from 'react-dom/server';
import { TreeView } from '../../src/components/workspace/TreeView';
import { MetricsContent } from '../../src/components/workspace/MetricsContent';
import { TaskDetail } from '../../src/components/task-detail/TaskDetail';
import { Problems } from '../../src/components/problems/Problems';
import type { Problem, WorkModel, WorkRow } from '../../src/app/types';
import { summarizeWork } from '../../src/domain/work-summary.ts';
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
      model={{ ...model, useEffort: model.useEffort !== false }}
      id={id}
      path="test.wbs"
      mode="sidebar"
      settingsOpen={false}
      collapsed={false}
      label={label}
      onSelect={() => {}}
      onEdit={() => {}}
      onClose={() => {}}
    />,
  ),
});
export const renderDocumentErrors = (problems: Problem[]) =>
  renderToStaticMarkup(<Problems problems={problems} open inert={false} onClose={() => {}} />);
