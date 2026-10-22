import { projectConfig } from '@worktree/core/project-source';
import { projectSettingsDraft } from '@worktree/core/project-settings';
import { DATE_FORMATS, TIME_FORMATS } from '@worktree/core/project-display';
import type { readProject } from './project-reader';

export function projectInformation(project: ReturnType<typeof readProject>) {
  const config = projectConfig(project.source);
  const defaults = projectSettingsDraft(project.snapshot);
  return {
    project: project.model.title,
    revision: project.revision,
    root: project.root,
    dataDirectory: project.source.dataDirectory,
    config: {
      ...config,
      dateFormat: defaults.dateFormat,
      timeFormat: defaults.timeFormat,
      idSeparator: defaults.idSeparator,
      priorities: defaults.priorities,
      assignees: config.assignees ?? [],
    },
  };
}
export function schemaInformation(project: ReturnType<typeof readProject>) {
  const info = projectInformation(project);
  const field = (type: string, extra = {}) => ({ type, required: false, ...extra });
  return {
    project: info.project,
    revision: info.revision,
    schema: {
      version: 1,
      task: {
        title: field('string', { required: true }),
        description: field('string'),
        owner: field('string', { suggestions: info.config.assignees }),
        status: field('string', { enum: ['todo', 'doing', 'blocked', 'done'] }),
        milestone: field('string', {
          enum: ['-', ...project.model.rows.filter((r) => r.milestone).map((r) => r.id)],
        }),
        start: field('string', { format: 'YYYY-MM-DD', unset: '-' }),
        end: field('string', { format: 'YYYY-MM-DD', unset: '-' }),
        effort: field('string', { unit: 'hour', unset: '-' }),
        priority: field('string', { enum: ['-', ...info.config.priorities.map((p) => p.id)] }),
        type: field('string', { enum: info.config.taskTypes }),
        labels: field('string[] | comma-separated string', { suggestions: info.config.labels }),
        deps: field('string[] | comma-separated string', {
          suggestions: project.model.rows.filter((r) => !r.milestone).map((r) => r.id),
        }),
        'blocked-reason': field('string'),
        references: field('array', {
          items: {
            type: { enum: ['text', 'file'] },
            value: 'string; file paths are project-relative',
          },
        }),
      },
      milestone: {
        title: field('string', { required: true }),
        start: field('string', { format: 'YYYY-MM-DD', unset: '-' }),
        end: field('string', { format: 'YYYY-MM-DD', unset: '-' }),
      },
      project: {
        fields: {
          name: field('string'),
          useEffort: field('boolean'),
          dateFormat: field('string', { enum: DATE_FORMATS }),
          timeFormat: field('string', { enum: TIME_FORMATS }),
          idSeparator: field('string', { enum: ['none', 'hyphen'] }),
          taskTypes: field('string[]'),
          labels: field('string[]'),
          assignees: field('string[]'),
          taskTypeColors: field('object', { values: '#RRGGBB', keys: 'defined task types' }),
          priorities: field('array', {
            items: { id: 'string', name: 'string' },
            order: 'highest to lowest',
            unset: '-',
          }),
        },
        editable: [
          'name',
          'useEffort',
          'dateFormat',
          'timeFormat',
          'idSeparator',
          'taskTypes',
          'taskTypeColors',
          'labels',
          'priorities',
          'assignees',
        ],
        readOnly: [
          'schemaVersion',
          'taskPrefix',
          'nextTaskNumber',
          'nextMilestoneNumber',
          'root',
          'dataDirectory',
        ],
        dateFormats: DATE_FORMATS,
        timeFormats: TIME_FORMATS,
        priorities: info.config.priorities,
        taskTypeColors: info.config.taskTypeColors ?? {},
        idSeparators: ['none', 'hyphen'],
      },
      writes: {
        dryRun: true,
        expect: 'project revision',
        arrays: 'replace, not append',
        ids: 'original IDs without display separators',
      },
    },
  };
}
