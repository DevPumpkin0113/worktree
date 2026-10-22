import { priorityColor } from '../../views/priority-color';
import { UnassignedPriorityRow } from './UnassignedPriorityRow';
import { PriorityScale } from './PriorityScale';
import { useRef, useState, type CSSProperties } from 'react';
import {
  movePriority,
  MAX_PROJECT_PRIORITIES,
  MAX_PRIORITY_NAME_LENGTH,
  validPriorities,
  type ProjectPriority,
} from '../../domain/project-priorities';
import { messages } from '../../i18n/messages';
import { Icon } from '../shared/Icon';
export function PriorityListEditor({
  id,
  value,
  locked = [],
  onChange,
}: {
  id: string;
  value: ProjectPriority[];
  locked?: string[];
  onChange: (value: ProjectPriority[]) => void;
}) {
  const drag = useRef<{ id: string; original: ProjectPriority[]; pointer: number } | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const invalid = !validPriorities(value);
  function move(from: number, to: number) {
    onChange(movePriority(value, from, to));
  }
  return (
    <div className="priority-editor" id={id}>
      <small id={id + '-hint'}>{messages.priorityOrderHint}</small>
      <div className="priority-ranked-list">
        <PriorityScale count={value.length} />
        <ol
          ref={list}
          aria-label={messages.priorities}
          data-dragging={!!dragging}
          onPointerMove={(event) => {
            const active = drag.current;
            if (!active || active.pointer !== event.pointerId) return;
            const target = document
              .elementFromPoint?.(event.clientX, event.clientY)
              ?.closest<HTMLElement>('[data-priority-id]');
            if (!target || !list.current?.contains(target)) return;
            const from = value.findIndex((p) => p.id === active.id),
              to = value.findIndex((p) => p.id === target.dataset.priorityId);
            if (from !== to) {
              move(from, to);
            }
          }}
          onPointerUp={() => {
            drag.current = null;
            setDragging(null);
          }}
          onPointerCancel={() => {
            if (drag.current) onChange(drag.current.original);
            drag.current = null;
            setDragging(null);
          }}
          onLostPointerCapture={() => {
            drag.current = null;
            setDragging(null);
          }}
        >
          {value.map((priority, index) => (
            <li
              key={priority.id}
              data-priority-id={priority.id}
              style={{ '--priority-color': priorityColor(index, value.length) } as CSSProperties}
              className={dragging === priority.id ? 'priority-item-dragging' : undefined}
            >
              <button
                type="button"
                className="priority-drag"
                aria-label={messages.reorderPriority + ' ' + priority.name}
                aria-describedby={id + '-hint'}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  drag.current = {
                    id: priority.id,
                    original: [...value],
                    pointer: event.pointerId,
                  };
                  setDragging(priority.id);
                  // Capture on the list: rows move in the DOM while sorting.
                  list.current?.setPointerCapture?.(event.pointerId);
                }}
                onKeyDown={(event) => {
                  if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
                    event.preventDefault();
                    move(index, index + (event.key === 'ArrowUp' ? -1 : 1));
                  }
                }}
              >
                <Icon name="grip" />
              </button>
              <input
                aria-label={messages.priority + ' ' + (index + 1)}
                aria-invalid={invalid}
                aria-describedby={invalid ? id + '-error' : undefined}
                required
                maxLength={MAX_PRIORITY_NAME_LENGTH}
                value={priority.name}
                autoComplete="off"
                onChange={(event) =>
                  onChange(
                    value.map((p) =>
                      p.id === priority.id ? { ...p, name: event.target.value } : p,
                    ),
                  )
                }
                ref={(input) => {
                  input?.setCustomValidity(invalid ? messages.invalidPriorities : '');
                }}
              />
              <button
                type="button"
                disabled={locked.includes(priority.id)}
                aria-label={
                  locked.includes(priority.id)
                    ? messages.priorityInUse
                    : messages.removeBadge(priority.name)
                }
                onClick={() => onChange(value.filter((p) => p.id !== priority.id))}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ol>
        <UnassignedPriorityRow />
      </div>
      {invalid ? (
        <span id={id + '-error'} role="alert" className="task-editor-error">
          {messages.invalidPriorities}
        </span>
      ) : null}
      <button
        type="button"
        className="priority-add"
        disabled={value.length >= MAX_PROJECT_PRIORITIES}
        onClick={() => {
          let name = messages.priority;
          let number = 1;
          while (value.some((p) => p.name === name)) name = messages.priority + ' ' + ++number;
          onChange([...value, { id: 'P_' + crypto.randomUUID(), name }]);
        }}
      >
        <Icon name="plus" />
        {messages.addPriority}
      </button>
    </div>
  );
}
