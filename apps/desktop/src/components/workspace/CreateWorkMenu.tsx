import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useFloatingList } from '../../hooks/use-floating-list';
import { messages } from '../../i18n/messages';
import { CircleDot, Layers, Plus } from 'lucide-react';
import { Icon } from '../shared/Icon';

export function CreateWorkMenu({
  onAddTask,
  onAddMilestone,
  onAddEpic,
}: {
  onAddTask: () => void;
  onAddMilestone: () => void;
  onAddEpic: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const options = [
    { id: 'epicAddOpen', label: messages.epic, action: onAddEpic, icon: <Layers /> },
    {
      id: 'milestoneAddOpen',
      label: messages.milestone,
      action: onAddMilestone,
      icon: <Icon name="milestone-diamond" />,
    },
    { id: 'taskAddOpen', label: messages.task, action: onAddTask, icon: <CircleDot /> },
  ];
  const position = useFloatingList(open, trigger, menu, options.length, true);
  useLayoutEffect(() => {
    if (open)
      menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[active]?.focus();
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function menuKeydown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      close();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setActive((index) =>
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length,
      );
    }
  }
  return (
    <div
      className="workspace-create-actions"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        id="workAddOpen"
        ref={trigger}
        className="task-add-button"
        type="button"
        title={messages.addWork}
        aria-label={messages.addWork}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'workAddMenu' : undefined}
        onClick={() => {
          setActive(0);
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setActive(event.key === 'ArrowUp' ? options.length - 1 : 0);
          setOpen(true);
        }}
      >
        <Plus size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
      </button>
      {open ? (
        <div
          id="workAddMenu"
          ref={menu}
          popover="manual"
          role="menu"
          aria-labelledby="workAddOpen"
          className="filter-options filter-options-content create-work-menu"
          style={position}
          onKeyDown={menuKeydown}
        >
          {options.map((option, index) => (
            <button
              id={option.id}
              key={option.id}
              type="button"
              role="menuitem"
              className="filter-option"
              tabIndex={index === active ? 0 : -1}
              onFocus={() => setActive(index)}
              onClick={() => {
                setOpen(false);
                option.action();
              }}
            >
              <span className="create-work-icon" aria-hidden="true">
                {option.icon}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
