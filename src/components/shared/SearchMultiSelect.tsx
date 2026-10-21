import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { messages } from '../../i18n/messages';
import { Icon } from './Icon';
import type { FilterOption } from './FilterDropdown';
export function SearchMultiSelect({
  id,
  label,
  placeholder,
  options,
  value,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  value: string[];
  disabled?: boolean;
  onChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const index = Math.min(active, Math.max(0, filtered.length - 1));
  const expanded = open && !disabled;
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [expanded]);
  useEffect(() => {
    if (expanded)
      document.getElementById(`${id}-option-${index}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [expanded, index, id, query]);
  function toggle(selected: string) {
    onChange(
      value.includes(selected) ? value.filter((item) => item !== selected) : [...value, selected],
    );
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
      if (filtered[index]) toggle(filtered[index].value);
    }
  }
  return (
    <div
      ref={root}
      className="search-multi-select"
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
              </li>
            );
          })}
        </ul>
      ) : null}
      <input
        ref={input}
        id={id}
        role="combobox"
        aria-label={label}
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
        }}
        onKeyDown={keydown}
      />
      {expanded ? (
        <div
          id={`${id}-options`}
          className="search-multi-options"
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
                <span>{option.label}</span>
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
    </div>
  );
}
