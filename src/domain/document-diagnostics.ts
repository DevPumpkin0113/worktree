import { ko } from '../i18n/ko';
import { messages } from '../i18n/messages';

type DocumentCode =
  | 'UNSUPPORTED_SCHEMA'
  | 'INVALID_USE_EFFORT'
  | 'INVALID_ID_PREFIX'
  | 'MISSING_WORK_SECTION'
  | 'INVALID_COLUMN_ORDER'
  | 'INVALID_SEPARATOR'
  | 'INVALID_COLUMN_COUNT';
type RowCode =
  | 'INVALID_MILESTONE_CONTAINER'
  | 'INVALID_ID'
  | 'DUPLICATE_ID'
  | 'INVALID_TYPE'
  | 'INVALID_STATUS'
  | 'INVALID_DATE'
  | 'INVALID_EFFORT'
  | 'INVALID_PARENT';
export type DocumentDiagnostic =
  | { code: DocumentCode }
  | { code: RowCode; taskId: string }
  | { code: 'PREFIX_MISMATCH'; taskId: string; prefix: string }
  | {
      code: 'INVALID_DEPENDENCY';
      taskId: string;
      dependencyId: string;
      target: 'milestone' | 'missing';
    }
  | { code: 'INVALID_DEPENDENCY_DATE'; taskId: string; dependencyId: string }
  | { code: 'CYCLIC_REFERENCE'; taskId: string; relation: 'parent' | 'deps' };

export function diagnosticReason(
  issue: DocumentDiagnostic,
  resource: typeof ko = messages,
): string {
  switch (issue.code) {
    case 'UNSUPPORTED_SCHEMA':
      return resource.unsupportedWbsSchema;
    case 'INVALID_MILESTONE_CONTAINER':
      return resource.invalidMilestoneContainer;
    case 'INVALID_USE_EFFORT':
      return resource.invalidUseEffort;
    case 'INVALID_ID_PREFIX':
      return resource.invalidIdPrefix;
    case 'MISSING_WORK_SECTION':
      return resource.missingWorkSection;
    case 'INVALID_COLUMN_ORDER':
      return resource.invalidColumnOrder;
    case 'INVALID_SEPARATOR':
      return resource.invalidSeparator;
    case 'INVALID_COLUMN_COUNT':
      return resource.invalidColumnCount;
    case 'INVALID_ID':
      return resource.invalidIdReason;
    case 'PREFIX_MISMATCH':
      return resource.prefixMismatch(issue.prefix);
    case 'DUPLICATE_ID':
      return resource.duplicateId;
    case 'INVALID_TYPE':
      return resource.invalidType;
    case 'INVALID_STATUS':
      return resource.invalidStatus;
    case 'INVALID_DATE':
      return resource.invalidDate;
    case 'INVALID_EFFORT':
      return resource.invalidEffort;
    case 'INVALID_PARENT':
      return resource.invalidParent;
    case 'INVALID_DEPENDENCY':
      return (
        resource.dependencyPrefix +
        issue.dependencyId +
        (issue.target === 'milestone'
          ? resource.milestoneDependencySuffix
          : resource.missingDependencySuffix)
      );
    case 'INVALID_DEPENDENCY_DATE':
      return resource.invalidDependencyDate(issue.dependencyId);
    case 'CYCLIC_REFERENCE':
      return resource.cyclicReference(
        issue.relation === 'parent' ? resource.hierarchy : resource.predecessors,
      );
  }
}

export class DocumentValidationError extends Error {
  readonly diagnostics: readonly DocumentDiagnostic[];
  constructor(diagnostics: readonly DocumentDiagnostic[]) {
    const unique = [
      ...new Map(diagnostics.map((issue) => [JSON.stringify(issue), issue])).values(),
    ];
    super(
      unique
        .map((issue) => ('taskId' in issue ? issue.taskId + ': ' : '') + diagnosticReason(issue))
        .join('\n'),
    );
    this.name = 'DocumentValidationError';
    this.diagnostics = unique;
  }
}
