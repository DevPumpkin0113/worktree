import { Badge } from './Badge';
import { useFloatingList } from '../../hooks/use-floating-list';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from './Icon';
export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}
export function FilterDropdown({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const expanded = open && !disabled;
  const position = useFloatingList(expanded, trigger, list);
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
    const option = document.getElementById(`${id}-option-${active}`),
      popup = list.current;
    if (!option || !popup) return;
    if (option.offsetTop < popup.scrollTop) popup.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > popup.scrollTop + popup.clientHeight)
      popup.scrollTop = option.offsetTop + option.offsetHeight - popup.clientHeight;
  }, [expanded, active, id]);
  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }
  function keydown(event: KeyboardEvent<HTMLButtonElement>) {
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
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (expanded) choose(active);
      else {
        setActive(selected);
        setOpen(true);
      }
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = expanded ? active : selected;
    setActive(
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : !expanded
            ? selected
            : Math.max(
                0,
                Math.min(options.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)),
              ),
    );
    setOpen(true);
  }
  return (
    <div
      className="filter-dropdown"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        id={id}
        ref={trigger}
        type="button"
        className="filter-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={`${id}-options`}
        aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
        disabled={disabled}
        onKeyDown={keydown}
        onClick={() => {
          setActive(selected);
          setOpen(!expanded);
        }}
      >
        <span>
          {options[selected]?.color ? (
            <Badge label={options[selected].label} color={options[selected].color} />
          ) : (
            options[selected]?.label
          )}
        </span>
        <Icon name="chevron-right" className="filter-chevron" />
      </button>
      {expanded ? (
        <div
          ref={list}
          id={`${id}-options`}
          popover="manual"
          style={position}
          className="filter-options"
          role="listbox"
          aria-label={label}
        >
          {options.map((option, index) => (
            <div
              id={`${id}-option-${index}`}
              key={option.value}
              role="option"
              data-value={option.value}
              aria-selected={option.value === value}
              className={'filter-option' + (active === index ? ' focused' : '')}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>
                {option.color ? <Badge label={option.label} color={option.color} /> : option.label}
              </span>
              {option.value === value ? (
                <span className="filter-check" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
