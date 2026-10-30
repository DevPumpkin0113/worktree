import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useFloatingList } from '../../hooks/use-floating-list';
import { Icon } from '../shared/Icon';

export function WorkspaceToolsPanel({
  id,
  label,
  icon,
  active = false,
  children,
}: {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const position = useFloatingList(open, trigger, panel, undefined, true);
  useLayoutEffect(() => {
    if (open) panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return (
    <div
      className="workspace-tools-panel"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        id={id}
        ref={trigger}
        type="button"
        className={'workspace-tool-button' + (active ? ' active' : '')}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id + '-panel'}
        onClick={() => setOpen(!open)}
      >
        <Icon name={icon} />
      </button>
      <div
        id={id + '-panel'}
        ref={panel}
        hidden={!open}
        popover="manual"
        role="dialog"
        aria-labelledby={id}
        className="filter-options workspace-tool-popover"
        style={position}
      >
        <h3>{label}</h3>
        {children}
      </div>
    </div>
  );
}
