import { messages } from '../i18n/messages';
import { isRelativePath, ProjectValidationError } from './project-source';
import { nextProjectId, updateProjectTask, type ProjectTaskDraft } from './task-editing';

export type TaskDraftErrors = Record<string, string>;

export function validateTaskDraft(
  text: string,
  draft: ProjectTaskDraft,
  id?: string,
): TaskDraftErrors {
  const errors: TaskDraftErrors = {};
  if (!draft.name.trim() || /[\r\n\0]/.test(draft.name)) errors.name = messages.taskRequiredFields;
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  const start = draft.start || '-',
    end = draft.end || '-';
  if (
    (start === '-') !== (end === '-') ||
    (start !== '-' && (!validDate(start) || !validDate(end) || start > end))
  ) {
    errors.start = messages.taskDateRangeInvalid;
    errors.end = messages.taskDateRangeInvalid;
  }
  if (draft.type === 'task') {
    if (
      draft.effort &&
      draft.effort !== '-' &&
      (!Number.isFinite(Number(draft.effort)) || Number(draft.effort) <= 0)
    )
      errors.effort = messages.taskEffortInvalid;
    draft.references.forEach((reference, index) => {
      if (!reference.value.trim() || reference.value.includes('\0'))
        errors['reference-' + index] = messages.taskReferenceRequired;
      else if (reference.type === 'file' && !isRelativePath(reference.value))
        errors['reference-' + index] = messages.taskReferencePathInvalid;
    });
  }
  if (Object.keys(errors).length) return errors;
  const targetId = id ?? nextProjectId(text, draft.type === 'milestone');
  try {
    updateProjectTask(text, draft, id);
  } catch (error) {
    if (!(error instanceof ProjectValidationError)) throw error;
    const fields: Record<string, string> = {
      title: 'name',
      milestone: 'parent',
      dependencies: 'deps',
      type: 'taskType',
    };
    const field = fields[error.field] ?? error.field;
    if (
      ![
        'name',
        'start',
        'end',
        'effort',
        'owner',
        'status',
        'parent',
        'deps',
        'priority',
        'taskType',
        'labels',
        'blockedReason',
        'references',
        'description',
      ].includes(field)
    )
      throw error;
    const reasons = {
      field: messages.taskFieldInvalid,
      dependency: messages.projectDependencyError,
      cycle: messages.projectCycleError,
      dependencyDate: messages.projectDependencyDateError,
      milestone: messages.projectMilestoneError,
    };
    if (error.reason === 'dependencyDate' && !error.file.endsWith('/' + targetId + '.md'))
      errors.end = reasons.dependencyDate;
    else errors[field] = reasons[error.reason];
  }
  return errors;
}
