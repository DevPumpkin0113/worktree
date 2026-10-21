import { messages } from '../../i18n/messages';
import { useRef, type KeyboardEvent } from 'react';
import type { Thread } from './comment-types';
export function DetailTabs({
  thread,
  onChange,
}: {
  thread: Thread;
  onChange: (tab: Thread['tab']) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const keys = ['info', 'comments'] as const;
  function keydown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
    onChange(keys[next]);
    refs.current[next]?.focus();
  }
  return (
    <div className="detail-preview-tabs" role="tablist" aria-label={messages.taskDetailView}>
      {keys.map((tab, index) => (
        <button
          key={tab}
          ref={(node) => {
            refs.current[index] = node;
          }}
          id={tab === 'info' ? 'previewInfoTab' : 'previewCommentsTab'}
          type="button"
          role="tab"
          aria-selected={thread.tab === tab}
          aria-controls={tab === 'info' ? 'previewInfoPanel' : 'previewCommentsPanel'}
          tabIndex={thread.tab === tab ? 0 : -1}
          onClick={() => onChange(tab)}
          onKeyDown={(event) => keydown(event, index)}
        >
          {tab === 'info' ? (
            messages.taskInfo
          ) : (
            <>
              {messages.comments + ' '}
              <span>{thread.comments.length}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
