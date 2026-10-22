import { createContext, useContext } from 'react';
import type { TaskDraftErrors } from '@worktree/core/task-draft-validation';

export const TaskFieldErrorsContext = createContext<TaskDraftErrors>({});

export function TaskFieldError({ field }: { field: string }) {
  const errors = useContext(TaskFieldErrorsContext);
  return errors[field] ? (
    <p id={'taskEditor-' + field + '-error'} className="task-field-error" role="alert">
      {errors[field]}
    </p>
  ) : null;
}
