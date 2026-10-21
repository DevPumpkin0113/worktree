import { messages } from '../../i18n/messages';
import { IdSeparatorInput } from '../shared/IdSeparatorInput';
export function ProjectIdFormat({
  prefix,
  separator,
  onChange,
}: {
  prefix: string;
  separator: 'none' | 'hyphen';
  onChange?: (separator: 'none' | 'hyphen') => void;
}) {
  return (
    <div className="project-format-fields project-id-fields">
      <div className="task-editor-field">
        {onChange ? (
          <label htmlFor="projectFixed-2">{messages.idPrefixPart}</label>
        ) : (
          <span>{messages.idPrefixPart}</span>
        )}
        {onChange ? <input id="projectFixed-2" value={prefix} disabled /> : <span>{prefix}</span>}
      </div>
      <div className="task-editor-field">
        {onChange ? (
          <label htmlFor="projectSettings-idSeparator">{messages.idSeparatorPart}</label>
        ) : (
          <span>{messages.idSeparatorPart}</span>
        )}
        {onChange ? (
          <IdSeparatorInput
            id="projectSettings-idSeparator"
            prefix={prefix}
            value={separator}
            showPreview={false}
            onChange={onChange}
          />
        ) : (
          <span>{separator === 'hyphen' ? messages.hyphen : messages.none}</span>
        )}
      </div>
      {onChange ? (
        <small className="project-id-preview">
          {messages.previewPrefix} {prefix}
          {separator === 'hyphen' ? '-' : ''}001
        </small>
      ) : null}
    </div>
  );
}
