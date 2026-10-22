import { priorityColor } from '../../views/priority-color';
import type { CSSProperties } from 'react';
import { UnassignedPriorityRow } from './UnassignedPriorityRow';
import { PriorityScale } from './PriorityScale';
import { messages } from '../../i18n/messages';
import type { ProjectPriority } from '@worktree/core/project-priorities';
export function PriorityList({ values }: { values: ProjectPriority[] }) {
  return (
    <div className="priority-summary">
      <small>{messages.priorityOrderSummary}</small>
      <div className="priority-ranked-list">
        <PriorityScale count={values.length} />
        <ol>
          {values.map((priority, index) => (
            <li
              key={priority.id}
              style={{ '--priority-color': priorityColor(index, values.length) } as CSSProperties}
            >
              {priority.name}
            </li>
          ))}
        </ol>
        <UnassignedPriorityRow />
      </div>
    </div>
  );
}
