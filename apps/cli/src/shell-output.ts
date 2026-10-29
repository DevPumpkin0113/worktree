import type { execute } from './commands';
import type { Options } from './arguments';
import { table } from './table';
import { formatResult } from './output';
export function shellOutput(result: ReturnType<typeof execute>, options: Options) {
  const labels: Record<string, string> =
    options.language === 'ko'
      ? {
          Title: '제목',
          Status: '상태',
          Owner: '담당자',
          Metric: '항목',
          Value: '값',
          Project: '프로젝트',
          Issues: '이슈',
          Epics: '에픽',
          Parent: '소속',
          Completed: '완료',
          Progress: '진행률',
          Milestones: '마일스톤',
          Comments: '댓글',
          Field: '항목',
          Milestone: '마일스톤',
          Priority: '우선순위',
          Type: '이슈 유형',
          Labels: '라벨',
          Start: '시작일',
          End: '종료일',
          Predecessors: '선행 이슈',
          Successors: '후속 이슈',
          Author: '작성자',
          'Reply to': '답글 대상',
          Comment: '내용',
        }
      : {};
  const translatedTable = (headers: string[], rows: unknown[][]) =>
    table(
      headers.map((h) => labels[h] ?? h),
      rows.map((row) =>
        row.map((value, index) =>
          index === 0 && typeof value === 'string' ? (labels[value] ?? value) : value,
        ),
      ),
    );
  if (options.json || 'reset' in result) return formatResult(result, options);
  if ('tasks' in result && result.tasks)
    return translatedTable(
      ['ID', 'Title', 'Status', 'Owner'],
      result.tasks.map((t) => [t.id, t.title, t.status, t.owner]),
    );
  if ('taskCount' in result)
    return translatedTable(
      ['Metric', 'Value'],
      [
        ['Project', result.project],
        ['Issues', result.taskCount],
        ['Completed', result.completedTasks],
        ['Progress', `${result.taskProgress ?? 0}%`],
        ['Epics', result.epicCount],
        ['Milestones', result.milestoneCount],
        ['Comments', result.comments],
        ...Object.entries(result.statuses),
      ],
    );
  if ('task' in result && result.task) {
    const t = result.task;
    return (
      translatedTable(
        ['Field', 'Value'],
        [
          ['ID', t.id],
          ['Title', t.name],
          ['Status', t.status],
          ['Owner', t.owner],
          ['Parent', t.parent],
          ['Priority', t.priority],
          ['Type', t.taskType],
          ['Labels', t.labels?.join(', ')],
          ['Start', t.start],
          ['End', t.end],
          ['Predecessors', t.deps.join(', ')],
          ['Successors', result.successors?.join(', ')],
        ],
      ) +
      '\n' +
      t.description
    );
  }
  if ('comments' in result && Array.isArray(result.comments))
    return translatedTable(
      ['#', 'Author', 'Reply to', 'Comment'],
      result.comments.map((c) => [
        String(c.number).padStart(3, '0'),
        c.author,
        c.replyTo ? result.comments?.find((p) => p.id === c.replyTo)?.number : '-',
        c.deleted ? '[deleted]' : c.text,
      ]),
    );
  return formatResult(result, options);
}
