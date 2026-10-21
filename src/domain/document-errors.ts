import { messages, getLanguage } from '../i18n/messages';
import { ko } from '../i18n/ko';
import { en } from '../i18n/en';
import { DocumentValidationError, diagnosticReason } from './document-diagnostics';
import { WBS_COLUMNS } from './wbs-schema';
import type { Problem } from './types';
import type { SourceLine, TableRow } from './work-table';
import { findWorkTable, tableCellPositions } from './work-table';

const fields = (messages: typeof ko) => ({
  parent: messages.parentId,
  type: messages.type,
  status: messages.status,
  start: messages.dateRange,
  effort: messages.effortHours,
  deps: messages.predecessors,
  id: 'ID',
});
const fieldColumns = {
  id: [0],
  parent: [1],
  type: [2],
  status: [6],
  start: [7, 8],
  effort: [9],
  deps: [10],
};
const examples = (messages: typeof ko) => ({
  id: messages.idExample,
  parent: messages.rootParentExample,
  type: 'task',
  status: 'milestone: auto / task: todo',
  start: messages.dateExample,
  effort: messages.effortExample,
  deps: messages.noDependencyExample,
});

function locateCells(items: SourceLine[], indexes: number[]) {
  return items.flatMap((item) => {
    const positions = tableCellPositions(item.raw);
    return indexes
      .filter((index) => positions[index])
      .map((index) => ({ line: item.line, ...positions[index] }));
  });
}

function buildDocumentProblems(
  error: unknown,
  markdown: string,
  source: string,
  kind: string,
  messages: typeof ko,
): Problem[] {
  const sourceLines = markdown.split(/\r?\n/).map((raw, index) => ({ raw, line: index + 1 }));
  const { table } = findWorkTable(markdown);
  const rows = table.slice(2);
  const diagnostics = error instanceof DocumentValidationError ? error.diagnostics : [];
  const entries = diagnostics.length
    ? diagnostics
    : [
        ...new Set(
          String(error && typeof error === 'object' && 'message' in error ? error.message : error)
            .split('\n')
            .filter(Boolean),
        ),
      ];
  const kindKey = (Object.keys(ko) as (keyof typeof ko)[]).find(
    (key) => typeof ko[key] === 'string' && (ko[key] === kind || en[key] === kind),
  );
  const documentKind = kindKey === 'documentError';
  return entries.map((entry) => {
    const issue = typeof entry === 'string' ? undefined : entry;
    const code = issue?.code;
    const metadataKey = (
      {
        INVALID_ID_PREFIX: 'id_prefix',
        INVALID_USE_EFFORT: 'use_effort',
        UNSUPPORTED_SCHEMA: 'schema_version',
      } as Record<string, string>
    )[code ?? ''];
    const matches =
      documentKind && issue && 'taskId' in issue
        ? rows.filter((row) => row.cells[0] === issue.taskId)
        : [];
    const row = matches[0],
      id = row?.cells[0] || '';
    const reason = issue ? diagnosticReason(issue, messages) : String(entry);
    const message = issue && 'taskId' in issue ? issue.taskId + ': ' + reason : reason;
    let key: keyof ReturnType<typeof fields> | undefined,
      example = '',
      indexes: number[] = [];
    let field = '',
      value = '',
      hint = messages.fixDocumentHint;
    if (row) {
      if (
        code === 'INVALID_DEPENDENCY' ||
        code === 'INVALID_DEPENDENCY_DATE' ||
        (issue?.code === 'CYCLIC_REFERENCE' && issue.relation === 'deps')
      )
        key = 'deps';
      else if (
        code === 'INVALID_PARENT' ||
        (issue?.code === 'CYCLIC_REFERENCE' && issue.relation === 'parent')
      )
        key = 'parent';
      else if (['INVALID_ID', 'DUPLICATE_ID', 'PREFIX_MISMATCH'].includes(code || '')) key = 'id';
      else if (code === 'INVALID_STATUS') key = 'status';
      else if (code === 'INVALID_MILESTONE_CONTAINER') {
        field = messages.milestone;
        hint = messages.milestoneContainerHint;
        indexes = [1, 9, 10];
        value = [row.cells[1], row.cells[9], row.cells[10]].join(' / ');
        example = '- / - / -';
      } else if (code === 'INVALID_TYPE') key = 'type';
      else if (code === 'INVALID_DATE') key = 'start';
      else if (code === 'INVALID_EFFORT') key = 'effort';
      if (key) {
        field = fields(messages)[key];
        value =
          key === 'start'
            ? [row.cells[7], row.cells[8]].join(' / ')
            : row.cells[{ id: 0, parent: 1, type: 2, status: 6, effort: 9, deps: 10 }[key]] || '';
      }
      if (key === 'deps')
        hint =
          code === 'CYCLIC_REFERENCE'
            ? messages.dependencyCycleHint
            : code === 'INVALID_DEPENDENCY_DATE'
              ? messages.dependencyDateHint
              : messages.dependencyFixHint;
      if (key === 'parent') hint = messages.parentFixHint;
      if (key === 'id') hint = messages.idFixHint;
      if (key === 'status') hint = messages.statusFixHint;
      if (key === 'type') hint = messages.typeFixHint;
      if (key === 'start') hint = messages.dateFixHint;
      if (key === 'effort') hint = messages.effortFixHint;
      indexes = key ? fieldColumns[key] : [];
      example = key ? examples(messages)[key] : example;
      if (key === 'status') example = 'milestone: auto / task: todo';
      if (code === 'INVALID_MILESTONE_CONTAINER') indexes = [1, 9, 10];
      if (code === 'INVALID_DEPENDENCY_DATE') {
        indexes = [7];
        field = messages.startDate;
        value = row.cells[7];
        example = messages.dependencyDateExample;
      }
    } else if (code === 'INVALID_SEPARATOR') hint = messages.separatorFixHint;
    else if (code === 'INVALID_COLUMN_ORDER' || code === 'INVALID_COLUMN_COUNT')
      hint = messages.columnsFixHint;
    else if (code === 'MISSING_WORK_SECTION') hint = messages.sectionFixHint;
    else if (code === 'INVALID_USE_EFFORT') hint = messages.useEffortFixHint;
    else if (code === 'UNSUPPORTED_SCHEMA') hint = messages.unsupportedWbsSchema;
    else if (code === 'INVALID_ID_PREFIX') hint = messages.prefixFixHint;
    else if (kindKey === 'fileReadError') hint = messages.fileReadFixHint;
    else if (!documentKind) hint = messages.retryHint;
    let locations: SourceLine[] = matches;
    if (documentKind && !locations.length) {
      if (code === 'INVALID_COLUMN_ORDER' && table[0]) locations = [table[0]];
      else if (code === 'INVALID_SEPARATOR' && table[0]) locations = [table[1] || table[0]];
      else if (code === 'INVALID_COLUMN_COUNT')
        locations = rows.filter((item) => item.cells.length !== 11).slice(0, 1);
      else if (metadataKey && /^\uFEFF?---$/.test(sourceLines[0]?.raw || '')) {
        const end = sourceLines.findIndex((item, index) => index > 0 && item.raw === '---');
        const prefix = sourceLines
          .slice(1, end < 0 ? 1 : end)
          .find((item) => new RegExp('^' + metadataKey + ':').test(item.raw));
        if (prefix) locations = [prefix];
      }
    }
    const lineNumbers = locations.map((item) => item.line);
    let positions = locateCells(locations, indexes);
    if (!row && documentKind) {
      if (code === 'INVALID_COLUMN_ORDER' && table[0]) {
        const expected = WBS_COLUMNS;
        positions = locateCells(
          locations,
          table[0].cells
            .map((cell, index) => (cell !== expected[index] ? index : -1))
            .filter((index) => index >= 0),
        );
        field = messages.columnOrder;
        value = table[0].cells.join(' / ');
        example = '| ' + expected.join(' | ') + ' |';
      } else if (code === 'INVALID_SEPARATOR') {
        positions =
          table[1] && table[1].cells.length === 11
            ? locateCells(
                locations,
                table[1].cells
                  .map((cell, index) => (/^:?-{3,}:?$/.test(cell) ? -1 : index))
                  .filter((index) => index >= 0),
              )
            : [];
        field = messages.separator;
        value = table[1]?.raw || messages.missingValue;
        example = '|' + Array(11).fill('---').join('|') + '|';
      } else if (code === 'INVALID_COLUMN_COUNT') {
        if (locations.length) {
          field = messages.columnCount;
          value = String((locations[0] as TableRow).cells.length);
        }
        example = messages.columnsExample;
      } else if (metadataKey && locations.length) {
        const item = locations[0],
          key = metadataKey,
          prefix = item.raw.match(new RegExp('^' + key + ':[ \t]*'))![0];
        const column = Array.from(prefix).length + 1;
        positions = [
          {
            line: item.line,
            column,
            endColumn: Math.max(column, Array.from(item.raw.trimEnd()).length),
          },
        ];
        field = key;
        value = item.raw.slice(prefix.length);
        example = key.startsWith('next_')
          ? key + ': 1'
          : key === 'schema_version'
            ? 'schema_version: 2'
            : key === 'use_effort'
              ? 'use_effort: false'
              : 'id_prefix: OBS';
      }
    }
    return {
      category: kindKey,
      kind: kindKey ? String(messages[kindKey]) : kind,
      source,
      message,
      id,
      name: row?.cells[3] || '',
      reason,
      field,
      value,
      hint,
      example,
      positions,
      lineNumbers,
      raw: locations.map((item) => item.raw).join('\n'),
    };
  });
}

export function describeDocumentErrors(
  error: unknown,
  markdown = '',
  source = '',
  kind = ko.documentError,
): Problem[] {
  const localized = {
    ko: buildDocumentProblems(error, markdown, source, kind, ko),
    en: buildDocumentProblems(error, markdown, source, kind, en),
  };
  return localized[getLanguage()].map((problem, index) => {
    const result = { ...problem };
    // Keep source coordinates stable and resolve presentation in the active language.
    for (const key of ['kind', 'message', 'reason', 'field', 'hint', 'example', 'value'] as const) {
      Object.defineProperty(result, key, {
        enumerable: true,
        get: () => localized[getLanguage()][index][key],
      });
    }
    return result;
  });
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
