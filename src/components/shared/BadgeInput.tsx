import { useEffect, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import { projectRuleValues, validProjectRuleValues } from '../../domain/project-initialization';
import { taskTypeColor, type TaskTypeColors } from '../../domain/task-type-colors';
import { Badge } from './Badge';
import { ColorInput } from './ColorInput';
import { Icon } from './Icon';

export function BadgeInput({
  id,
  label,
  values,
  onChange,
  colors,
  onColorChange,
  locked = [],
  required = false,
  displayLabel = (value) => value,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  colors?: TaskTypeColors;
  onColorChange?: (value: string, color: string) => void;
  locked?: string[];
  required?: boolean;
  displayLabel?: (value: string) => string;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.setCustomValidity(error);
  }, [error]);
  function add() {
    if (!text.trim()) {
      setText('');
      return;
    }
    const additions = projectRuleValues(text);
    if (!validProjectRuleValues(text, true)) {
      setError(messages.projectDuplicateValues);
      return;
    }
    if (additions.some((value) => values.includes(value))) {
      setError(messages.projectDuplicateValues);
      return;
    }
    onChange([...values, ...additions]);
    setText('');
    setError('');
  }
  const themeColor = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary')
    .trim();
  const pickerDefault = /^#[0-9a-f]{6}$/i.test(themeColor) ? themeColor : '#000000';
  const requiredError = required && values.length === 0 ? messages.projectTypesRequired : '';
  return (
    <div className="badge-input">
      <ul id={id + '-badges'} className="badge-input-values" aria-label={label}>
        {values.map((value) => (
          <li key={value} data-value={value}>
            <Badge
              label={displayLabel(value)}
              color={onColorChange ? taskTypeColor(colors, value) : undefined}
              leading={
                onColorChange ? (
                  <ColorInput
                    label={messages.badgeColorLabel(displayLabel(value))}
                    value={taskTypeColor(colors, value) ?? pickerDefault}
                    onChange={(color) => onColorChange(value, color)}
                  />
                ) : null
              }
            >
              <button
                type="button"
                disabled={locked.includes(value)}
                aria-label={
                  locked.includes(value)
                    ? messages.projectTypeInUse(displayLabel(value))
                    : messages.removeBadge(displayLabel(value))
                }
                onClick={() => onChange(values.filter((item) => item !== value))}
              >
                <Icon name="close" />
              </button>
            </Badge>
          </li>
        ))}
      </ul>
      <div className="badge-input-entry">
        <input
          ref={input}
          id={id}
          autoComplete="off"
          aria-label={label}
          required={required && values.length === 0}
          value={text}
          placeholder={messages.badgeInputHint}
          aria-invalid={!!error || !!requiredError}
          aria-describedby={error || requiredError ? id + '-error' : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
          onBlur={() => add()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add();
            }
          }}
        />
        <button
          id={id + '-add'}
          type="button"
          onClick={() => {
            add();
            input.current?.focus();
          }}
          aria-label={messages.addBadge(label)}
        >
          <Icon name="plus" />
        </button>
      </div>
      {error || requiredError ? (
        <span id={id + '-error'} className="task-editor-error" role="alert">
          {error || requiredError}
        </span>
      ) : null}
    </div>
  );
}
