import { messages } from '../i18n/messages';
import { ko } from '../i18n/ko';
import { ProjectValidationError, readSource } from '@worktree/core/project-source';
import type { Problem } from '@worktree/core/types';
export function describeDocumentErrors(
  error: unknown,
  markdown = '',
  source = '',
  kind = ko.documentError,
): Problem[] {
  if (error instanceof ProjectValidationError) {
    let content = '';
    try {
      content = readSource(markdown).files[error.file] ?? '';
    } catch {
      /* A malformed snapshot has no individual source file. */
    }
    const base = source.replace(/[\\/]worktree\.json$/, '');
    let directory = '';
    try {
      directory = readSource(markdown).dataDirectory;
    } catch {
      /* Keep the known root marker path. */
    }
    const filePath =
      error.file === 'worktree.json'
        ? source
        : [base, directory, error.file].filter(Boolean).join('/');
    return [
      {
        category: 'documentError',
        get kind() {
          return messages.documentError;
        },
        source: filePath,
        get message() {
          return messages.invalidProjectField(error.file, error.field);
        },
        id: '',
        name: '',
        get reason() {
          return {
            dependency: messages.projectDependencyError,
            cycle: messages.projectCycleError,
            dependencyDate: messages.projectDependencyDateError,
            milestone: messages.projectMilestoneError,
            field: messages.invalidProjectField(error.file, error.field),
          }[error.reason];
        },
        field: error.field,
        value: error.value,
        get hint() {
          return messages.projectFieldHint;
        },
        example:
          (
            {
              status: '"todo"',
              priority: '"normal"',
              start: '"2026-10-21"',
              labels: '["ui", "api"]',
              references: '[{"type":"file","value":"docs/spec.md"}]',
              createdAt: '"2026-10-21T00:00:00.000Z"',
              updatedAt: '"2026-10-21T00:00:00.000Z"',
              schemaVersion: '1',
              dependencies: '["W001"]',
            } as Record<string, string>
          )[error.field] ?? '',
        raw: error.line ? (content.split(/\r?\n/)[error.line - 1] ?? '') : '',
        lineNumbers: error.line ? [error.line] : [],
        positions: [],
      },
    ];
  }
  const category = Object.keys(ko).find((key) => ko[key as keyof typeof ko] === kind);
  const message = error instanceof Error ? error.message : String(error);
  return [
    {
      category,
      get kind() {
        return category ? String(messages[category as keyof typeof ko]) : kind;
      },
      source,
      message,
      id: '',
      name: '',
      reason: message,
      field: '',
      value: '',
      get hint() {
        return messages.retryHint;
      },
      example: '',
      raw: '',
      lineNumbers: [],
      positions: [],
    },
  ];
}

export function problemLocation(problem: Pick<Problem, 'positions' | 'lineNumbers'>) {
  if (problem.positions?.length)
    return problem.positions
      .map(({ line, column, endColumn }) =>
        messages.columnLocation(line, column, endColumn > column ? '~' + endColumn : ''),
      )
      .join(', ');
  return problem.lineNumbers?.length
    ? problem.lineNumbers.map((line) => line + messages.rowSuffix).join(', ')
    : messages.unknownLocation;
}

export function formatDocumentProblem(problem: Problem) {
  const lines = [
    problem.kind,
    problem.id ? problem.id + ' · ' + problem.name : '',
    problem.source ? messages.filePrefix + problem.source : '',
    messages.locationPrefix + problemLocation(problem),
    messages.reasonPrefix + problem.reason,
    problem.field ? messages.fieldPrefix + problem.field + ' = ' + problem.value : '',
    messages.hintPrefix + problem.hint,
  ];
  if (problem.example) lines.push(messages.examplePrefix + problem.example);
  if (problem.raw) lines.push(messages.sourceHeading, problem.raw);
  return lines.filter(Boolean).join('\n');
}
