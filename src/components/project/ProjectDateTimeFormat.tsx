import { messages } from '../../i18n/messages';
import type { DateFormat, TimeFormat } from '../../domain/project-display';
export function ProjectDateTimeFormat({
  dateFormat = 'yyyy-MM-dd',
  timeFormat = '24h',
}: {
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
}) {
  return (
    <div className="project-format-fields">
      <div className="task-editor-field">
        <span>{messages.dateFormat}</span>
        <span>{dateFormat}</span>
      </div>
      <div className="task-editor-field">
        <span>{messages.timeFormat}</span>
        <span>{timeFormat === '12h' ? messages.time12Hour : messages.time24Hour}</span>
      </div>
    </div>
  );
}
