import { messages } from '../../i18n/messages';
export function PriorityScale({ count }: { count: number }) {
  if (!count) return null;
  return (
    <div className="priority-scale" aria-hidden="true">
      <span>{messages.highPriority}</span>
      {count > 1 ? (
        <>
          <div className="priority-scale-arrow">
            <svg viewBox="0 0 12 7" fill="none">
              <path d="m2 5 4-4 4 4" />
            </svg>
            <svg viewBox="0 0 12 7" fill="none">
              <path d="m2 2 4 4 4-4" />
            </svg>
          </div>
          <span>{messages.lowPriority}</span>
        </>
      ) : null}
    </div>
  );
}
