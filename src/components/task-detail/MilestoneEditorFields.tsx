import { messages } from '../../i18n/messages';
import { TaskScheduleFields, type TaskScheduleProps } from './TaskScheduleFields';
export function MilestoneEditorFields(props: TaskScheduleProps) {
  return (
    <div className="milestone-editor-fields">
      <fieldset className="milestone-period" disabled={props.disabled}>
        <legend>{messages.optionalTargetPeriod}</legend>
        <TaskScheduleFields {...props} />
      </fieldset>
    </div>
  );
}
