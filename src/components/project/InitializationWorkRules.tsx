import { PriorityListEditor } from './PriorityListEditor';
import { messages } from '../../i18n/messages';
import type { ProjectInitializationDraft } from '../../domain/project-initialization';
import { projectRuleValues } from '../../domain/project-initialization';
import { BadgeInput } from '../shared/BadgeInput';
export function InitializationWorkRules({
  draft,
  onChange,
}: {
  draft: ProjectInitializationDraft;
  onChange: (change: Partial<ProjectInitializationDraft>) => void;
}) {
  return (
    <div className="milestone-editor-fields">
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
        <label className="project-effort-toggle">
          <span>{messages.useEffort}</span>
          <input
            type="checkbox"
            aria-describedby="initialization-effort-hint"
            checked={draft.useEffort}
            onChange={(event) => onChange({ useEffort: event.target.checked })}
          />
        </label>
        <small id="initialization-effort-hint" className="project-label-examples">
          {messages.effortHint}
        </small>
      </div>
    </div>
  );
}
