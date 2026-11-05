import { useState } from 'react';
import { messages } from '../../i18n/messages';
import { MarkdownContent } from './MarkdownContent';
export function MarkdownDescriptionEditor({
  value,
  disabled,
  invalid,
  onChange,
  label = messages.description,
}: {
  value: string;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="task-editor-field task-field-description">
      <div className="markdown-editor-heading">
        <label htmlFor="taskEditor-description">{label}</label>
        <div className="markdown-editor-modes" role="group" aria-label={messages.markdownMode}>
          <button
            type="button"
            className="action-button"
            data-variant="secondary"
            aria-pressed={!preview}
            onClick={() => setPreview(false)}
          >
            {messages.markdownWrite}
          </button>
          <button
            type="button"
            className="action-button"
            data-variant="secondary"
            aria-pressed={preview}
            onClick={() => setPreview(true)}
          >
            {messages.markdownPreview}
          </button>
        </div>
      </div>
      {preview ? (
        <div className="markdown-editor-preview">
          <MarkdownContent text={value} />
        </div>
      ) : (
        <textarea
          id="taskEditor-description"
          aria-invalid={invalid}
          aria-describedby={invalid ? 'taskEditor-description-error' : undefined}
          rows={7}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
