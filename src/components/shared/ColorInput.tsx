import { useEffect, useId, useRef, useState } from 'react';
import { useFloatingList } from '../../hooks/use-floating-list';
import { messages } from '../../i18n/messages';

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const hex = useRef<HTMLInputElement>(null);
  const id = useId();
  const position = useFloatingList(open, trigger, popup);
  const valid = /^#[0-9a-f]{6}$/i.test(draft);
  useEffect(() => {
    if (!open) return;
    hex.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function choose(color: string) {
    setDraft(color);
    if (/^#[0-9a-f]{6}$/i.test(color)) onChange(color);
  }
  return (
    <span
      ref={root}
      className="color-input"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        // Native color pickers can move focus outside the WebView without a DOM target.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="badge-color-control"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        style={{ backgroundColor: value }}
        onClick={() => {
          setDraft(value);
          setOpen(!open);
        }}
      />
      {open ? (
        <div
          ref={popup}
          id={id}
          role="dialog"
          aria-label={label}
          popover="manual"
          className="color-input-popup"
          style={{
            ...position,
            width: 220,
            overflowY: 'auto',
            left: Math.max(8, Math.min(Number(position.left) || 8, window.innerWidth - 228)),
          }}
        >
          <input
            type="color"
            aria-label={label}
            value={value}
            onChange={(event) => choose(event.target.value)}
          />
          <label htmlFor={id + '-hex'}>HEX</label>
          <input
            ref={hex}
            id={id + '-hex'}
            type="text"
            autoComplete="off"
            spellCheck={false}
            aria-label={label + ' HEX'}
            placeholder="#000000"
            value={draft}
            aria-invalid={!valid}
            aria-describedby={!valid ? id + '-error' : undefined}
            onChange={(event) => choose(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
          {!valid ? (
            <span id={id + '-error'} className="task-editor-error" role="alert">
              {messages.colorHexInvalid}
            </span>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}
