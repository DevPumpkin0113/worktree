import { DEFAULT_TASK_TYPES, defaultTaskTypeColors } from '@worktree/core/default-task-types';
import { serializeSource, type ProjectSource } from '@worktree/core/project-source';
import { writeTaskFile } from '@worktree/core/task-file';
export const timestamp = '2026-10-21T00:00:00.000Z';
export function projectFixture(name = 'Test project', prefix = 'W') {
  const config = {
    schemaVersion: 1,
    name,
    taskPrefix: prefix,
    useEffort: false,
    taskTypes: [...DEFAULT_TASK_TYPES],
    taskTypeColors: defaultTaskTypeColors(),
    labels: ['ui'],
    nextTaskNumber: 3,
    nextMilestoneNumber: 2,
  };
  const milestone = {
    schemaVersion: 1,
    id: 'MS001',
    title: '화면 작업',
    start: '-',
    end: '-',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const task = (id: string, title: string, status: string, owner: string, deps: string[] = []) => ({
    schemaVersion: 1,
    id,
    title,
    status,
    owner,
    milestone: 'MS001',
    start: '-',
    end: '-',
    effort: '-',
    dependencies: deps,
    priority: 'normal',
    type: 'feature',
    labels: [],
    blockedReason: '',
    references: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const source: ProjectSource = {
    dataDirectory: 'docs/worktree',
    files: {
      'project.json': JSON.stringify(config, null, 2) + '\n',
      'milestones/MS001.md': writeTaskFile(milestone),
      [`tasks/${prefix}001.md`]: writeTaskFile(
        task(prefix + '001', '댓글 구현', 'doing', 'codex'),
        '입력 확인',
      ),
      [`tasks/${prefix}002.md`]: writeTaskFile(
        task(prefix + '002', 'UI 확인', 'done', '박대호', [prefix + '001']),
        '인수 확인',
      ),
    },
  };
  return serializeSource(source);
}
