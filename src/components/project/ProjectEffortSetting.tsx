import { messages } from '../../i18n/messages';
export function ProjectEffortSetting({
  value,
  id = 'projectSettings',
  onChange,
}: {
  value: boolean;
  id?: string;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="project-effort-setting">
      <p id={id + '-effort-hint'}>{messages.effortHint}</p>
      <div
        className="project-effort-options"
        role="radiogroup"
        aria-label={messages.effort}
        aria-describedby={id + '-effort-hint'}
      >
        <label>
          <input
            id={id + '-useEffort'}
            name={id + '-effort'}
            type="radio"
            value="enabled"
            checked={value}
            disabled={!onChange}
            onChange={() => onChange?.(true)}
          />
          {messages.enabled}
        </label>
        <label>
          <input
            id={id + '-noEffort'}
            name={id + '-effort'}
            type="radio"
            value="disabled"
            checked={!value}
            disabled={!onChange}
            onChange={() => onChange?.(false)}
          />
          {messages.disabled}
        </label>
      </div>
    </div>
  );
}
