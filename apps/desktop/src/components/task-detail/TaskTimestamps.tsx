import type { WorkRow } from '@worktree/core/types';
import { messages } from '../../i18n/messages';
import { useProjectDates } from '../project/ProjectDateFormatProvider';

export function TaskTimestamps({ row }: { row: WorkRow }) {
  const { timestamp } = useProjectDates();
  return (
    <dl className="detail-timestamps">
      {[
        [messages.createdAt, row.createdAt],
        [messages.updatedAt, row.updatedAt],
      ].map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>
            <time dateTime={value}>{timestamp(value)}</time>
          </dd>
        </div>
      ))}
    </dl>
  );
}
