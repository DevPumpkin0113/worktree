import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { messages } from '../../i18n/messages';
import { Icon } from './Icon';
import type { FilterOption } from './FilterDropdown';
import { useFloatingList } from '../../hooks/use-floating-list';
import { Badge } from './Badge';
export function SearchMultiSelect({
  id,
  label,
  placeholder,
  options,
  value,
  disabled = false,
  invalid = false,
  describedBy,
  creatable = false,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  value: string[];
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  creatable?: boolean;
  onChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [createError, setCreateError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const matching = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const queryValue = query.trim();
  const canCreate =
    creatable &&
    queryValue &&
    !options.some((option) => option.value === queryValue) &&
    !value.includes(queryValue);
  const filtered = [
    ...matching,
    ...(canCreate ? [{ value: queryValue, label: messages.addNewLabel(queryValue) }] : []),
  ];
  const index = Math.min(active, Math.max(0, filtered.length - 1));
  const expanded = open && !disabled;
  useEffect(() => {
    input.current?.setCustomValidity(createError);
  }, [createError]);
  const position = useFloatingList(expanded, input, list, filtered.length);
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [expanded]);
  useEffect(() => {
    if (!expanded) return;
    const option = document.getElementById(`${id}-option-${index}`),
      popup = list.current;
    if (!option || !popup) return;
    if (option.offsetTop < popup.scrollTop) popup.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > popup.scrollTop + popup.clientHeight)
      popup.scrollTop = option.offsetTop + option.offsetHeight - popup.clientHeight;
  }, [expanded, index, id, query]);
  function toggle(selected: string) {
    if (creatable && /[,\r\n\0]/.test(selected)) {
      setCreateError(messages.labelValueInvalid);
      return;
    }
    onChange(
      value.includes(selected) ? value.filter((item) => item !== selected) : [...value, selected],
    );
    if (creatable) {
      setQuery('');
      setActive(0);
      setCreateError('');
    }
    input.current?.focus();
  }
  function keydown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive(
        !expanded
          ? event.key === 'ArrowDown'
            ? 0
            : Math.max(0, filtered.length - 1)
          : Math.max(
              0,
              Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
            ),
      );
      return;
    }
    if (event.key === 'Enter' && expanded) {
      event.preventDefault();
      if (filtered[index]) {
        if (creatable && value.includes(filtered[index].value)) {
          setQuery('');
          setCreateError('');
        } else toggle(filtered[index].value);
      }
    }
  }
  return (
    <div
      ref={root}
      className={'search-multi-select' + (creatable ? ' search-multi-creatable' : '')}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {value.length ? (
        <ul className="search-multi-selected" aria-label={messages.selectedItems}>
          {value.map((selected) => {
            const name = options.find((option) => option.value === selected)?.label ?? selected;
            return (
              <li key={selected}>
                {creatable ? (
                  <Badge label={name}>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={messages.removeSelection(name)}
                      onClick={() => toggle(selected)}
                    >
                      <Icon name="close" />
                    </button>
                  </Badge>
                ) : (
                  <>
                    <span>{name}</span>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={messages.removeSelection(name)}
                      title={messages.removeSelection(name)}
                      onClick={() => toggle(selected)}
                    >
                      <Icon name="close" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <input
        autoComplete="off"
        ref={input}
        id={id}
        role="combobox"
        aria-label={label}
        aria-invalid={invalid || !!createError}
        aria-describedby={createError ? `${id}-create-error` : describedBy}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={`${id}-options`}
        aria-activedescendant={expanded && filtered[index] ? `${id}-option-${index}` : undefined}
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
          setCreateError('');
        }}
        onKeyDown={keydown}
      />
      {expanded ? (
        <div
          id={`${id}-options`}
          ref={list}
          popover="manual"
          style={position}
          className="filter-options search-multi-options"
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
        >
          {filtered.length ? (
            filtered.map((option, position) => (
              <div
                id={`${id}-option-${position}`}
                role="option"
                key={option.value}
                data-value={option.value}
                aria-selected={value.includes(option.value)}
                className={'filter-option' + (position === index ? ' focused' : '')}
                onPointerMove={() => setActive(position)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => toggle(option.value)}
              >
                <span>
                  {creatable && !(canCreate && option.value === queryValue) ? (
                    <Badge label={option.label} />
                  ) : (
                    option.label
                  )}
                </span>
                {value.includes(option.value) ? (
                  <span className="filter-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </div>
            ))
          ) : (
            <p className="search-multi-empty" role="status">
              {messages.noSearchResults}
            </p>
          )}
        </div>
      ) : null}
      {createError ? (
        <p id={`${id}-create-error`} className="task-field-error" role="alert">
          {createError}
        </p>
      ) : null}
    </div>
  );
}
