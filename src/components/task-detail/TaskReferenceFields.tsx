import { messages } from '../../i18n/messages';
import { FilterDropdown } from '../shared/FilterDropdown';
import type { TaskReference } from '../../domain/project-source';
export function TaskReferenceFields({
  value,
  disabled,
  onChange,
}: {
  value: TaskReference[];
  disabled: boolean;
  onChange: (value: TaskReference[]) => void;
}) {
  return (
    <fieldset className="task-field-references" disabled={disabled}>
      <legend>{messages.references}</legend>
      <p className="task-editor-hint">{messages.referenceHint}</p>
      {value.map((reference, index) => (
        <div className="task-reference-row" key={index}>
          <FilterDropdown
            id={'taskReference-type-' + index}
            label={messages.type}
            disabled={disabled}
            value={reference.type}
            options={[
              { value: 'text', label: messages.referenceText },
              { value: 'file', label: messages.referenceFile },
            ]}
            onChange={(type) =>
              onChange(
                value.map((item, i) =>
                  i === index ? { ...item, type: type as TaskReference['type'] } : item,
                ),
              )
            }
          />
          <input
            aria-label={messages.references + ' ' + (index + 1)}
            value={reference.value}
            required
            disabled={disabled}
            onChange={(e) =>
              onChange(
                value.map((item, i) => (i === index ? { ...item, value: e.target.value } : item)),
              )
            }
          />
          <button
            type="button"
            aria-label={messages.removeReference + ' ' + (index + 1)}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            {messages.delete}
          </button>
        </div>
      ))}
      <button
        type="button"
        id="taskReference-add"
        onClick={() => onChange([...value, { type: 'text', value: '' }])}
      >
        {messages.addReference}
      </button>
    </fieldset>
  );
}
