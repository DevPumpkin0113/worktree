import { InitializationIdFields } from './InitializationIdFields';
import { DateTimeFormatInput } from '../shared/DateTimeFormatInput';
import { ProjectEffortSetting } from './ProjectEffortSetting';
import { PriorityListEditor } from './PriorityListEditor';
import { messages } from '../../i18n/messages';
import type { ProjectInitializationDraft } from '@worktree/core/project-initialization';
import { projectRuleValues } from '@worktree/core/project-initialization';
import { BadgeInput } from '../shared/BadgeInput';
export function InitializationWorkRules({
  draft,
  onChange,
  busy = false,
}: {
  draft: ProjectInitializationDraft;
  busy?: boolean;
  onChange: (change: Partial<ProjectInitializationDraft>) => void;
}) {
  return (
    <div className="milestone-editor-fields">
      <div className="task-editor-field">
        <span>{messages.idFormat}</span>
        <InitializationIdFields draft={draft} busy={busy} onChange={onChange} />
      </div>
      <div className="task-editor-field">
        <span>{messages.dateTimeDisplay}</span>
        <DateTimeFormatInput
          id="initialization-format"
          dateFormat={draft.dateFormat}
          timeFormat={draft.timeFormat}
          disabled={busy}
          onChange={onChange}
        />
      </div>
      <div className="task-editor-field">
        <span>{messages.priorities}</span>
        <PriorityListEditor
          id="initialization-priorities"
          value={draft.priorities}
          onChange={(priorities) => onChange({ priorities })}
        />
      </div>
      <div className="task-editor-field">
        <label htmlFor="initialization-assignees">{messages.assignees}</label>
        <BadgeInput
          id="initialization-assignees"
          label={messages.assignees}
          values={projectRuleValues(draft.assignees)}
          onChange={(values) => onChange({ assignees: values.join(', ') })}
        />
      </div>
      <div className="task-editor-field">
        <label htmlFor="initialization-taskTypes">{messages.workTypes} *</label>
        <BadgeInput
          id="initialization-taskTypes"
          label={messages.workTypes}
          required
          values={projectRuleValues(draft.taskTypes)}
          colors={draft.taskTypeColors}
          onChange={(values) =>
            onChange({
              taskTypes: values.join(', '),
              taskTypeColors: Object.fromEntries(
                Object.entries(draft.taskTypeColors).filter(([type]) => values.includes(type)),
              ),
            })
          }
          onColorChange={(type, color) =>
            onChange({ taskTypeColors: { ...draft.taskTypeColors, [type]: color } })
          }
        />
      </div>
      <div className="task-editor-field">
        <div className="project-field-heading">
          <label htmlFor="initialization-labels">{messages.labels}</label>
          <small>{messages.commonLabelExamples}</small>
        </div>
        <BadgeInput
          id="initialization-labels"
          label={messages.labels}
          values={projectRuleValues(draft.labels)}
          onChange={(values) => onChange({ labels: values.join(', ') })}
        />
      </div>
      <div className="task-editor-field">
        <span>{messages.useEffort}</span>
        <ProjectEffortSetting
          id="initialization"
          value={draft.useEffort}
          onChange={(useEffort) => onChange({ useEffort })}
        />
      </div>
    </div>
  );
}
