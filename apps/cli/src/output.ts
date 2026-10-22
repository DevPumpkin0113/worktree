import type { Options } from './arguments';
export function formatResult(
  value: ReturnType<typeof import('./commands').execute>,
  options: Options,
) {
  if (options.json) return JSON.stringify(value, null, 2);
  const english = options.language === 'en';
  if ('config' in value || 'schema' in value || 'recovery' in value)
    return JSON.stringify(value, null, 2);
  if ('initialized' in value)
    return `${value.dryRun ? 'DRY RUN' : 'INITIALIZED'} ${value.project}\n${value.root}\n${value.dataDirectory} · ${value.prefix}`;
  if ('operation' in value)
    return [
      `${value.dryRun ? 'DRY RUN' : 'OK'} ${value.operation} ${value.id}`,
      ...(value.deletion
        ? [
            `${english ? 'Delete' : '삭제 대상'}: ${value.deletion.removedIds.join(', ')}`,
            `${english ? 'Retained tasks' : '유지할 작업'}: ${value.deletion.retainedChildIds.join(', ') || '-'}`,
            `${english ? 'Detach predecessors from' : '선행 참조 해제 대상'}: ${value.deletion.detachedFrom.join(', ') || '-'}`,
            `${english ? 'Comments' : '댓글'}: ${value.deletion.commentCount}`,
          ]
        : []),
      ...(Array.isArray(value.results)
        ? value.results.map((item) => `${item.index + 1}. ${item.operation} ${item.id}`)
        : []),
      ...value.changedFiles,
    ].join('\n');
  if ('comments' in value && !('task' in value) && !('taskCount' in value))
    return (value.comments ?? [])
      .map(
        (c) =>
          `#${String(c.number).padStart(3, '0')} ${c.author}: ${c.deleted ? '[deleted]' : c.text}`,
      )
      .join('\n');
  if ('valid' in value)
    return `${value.project}: ${english ? 'Valid' : '검증 통과'} (${value.files} ${english ? 'files' : '파일'})`;
  if ('taskCount' in value)
    return [
      value.project,
      value.root,
      `${english ? 'Tasks' : '작업'}: ${value.completedTasks}/${value.taskCount}`,
      `${english ? 'Progress' : '진행률'}: ${value.taskProgress ?? 0}%`,
      `${english ? 'Milestones' : '마일스톤'}: ${value.milestoneCount}`,
      `${english ? 'Comments' : '댓글'}: ${value.comments}`,
      ...Object.entries(value.statuses).map(([status, count]) => `  ${status}: ${count}`),
    ].join('\n');
  if ('tasks' in value) {
    const tasks = value.tasks ?? [];
    return tasks.length
      ? [
          english ? 'ID\tStatus\tOwner\tTitle' : 'ID\t상태\t담당자\t제목',
          ...tasks.map((task) => [task.id, task.status, task.owner, task.title].join('\t')),
        ].join('\n')
      : english
        ? 'No matching tasks.'
        : '일치하는 작업이 없습니다.';
  }
  if (!('task' in value) || !value.task) return '';
  const task = value.task;
  return [
    task.id + ' · ' + task.name,
    `${task.status} · ${task.owner}`,
    `${task.start} ~ ${task.end}`,
    `${english ? 'Milestone' : '마일스톤'}: ${task.parent}`,
    `${english ? 'Priority' : '우선순위'}: ${task.priority ?? '-'}`,
    `${english ? 'Type' : '작업 유형'}: ${task.taskType ?? '-'}`,
    `${english ? 'Labels' : '라벨'}: ${task.labels?.join(', ') || '-'}`,
    `${english ? 'Estimated hours' : '예상 작업 시간'}: ${task.effort}`,
    `${english ? 'Blocked reason' : '막힘 사유'}: ${task.blockedReason || '-'}`,
    `${english ? 'References' : '참조'}: ${task.references?.map((item) => item.value).join(', ') || '-'}`,
    task.description,
    `${english ? 'Predecessors' : '선행 작업'}: ${task.deps.join(', ') || '-'}`,
    `${english ? 'Successors' : '후속 작업'}: ${(value.successors ?? []).join(', ') || '-'}`,
    ...(value.comments ?? [])
      .filter((comment) => !comment.deleted)
      .map(
        (comment) =>
          `#${String(comment.number).padStart(3, '0')} ${comment.author}: ${comment.text}`,
      ),
  ].join('\n');
}
