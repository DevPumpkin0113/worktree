import { messages } from '../../i18n/messages';
import type { Thread } from './comment-types';
export function CommentForm({
  thread,
  author,
  onAuthor,
  onChange,
}: {
  thread: Thread;
  author: string;
  onAuthor: (author: string) => void;
  onChange: () => void;
}) {
  return (
    <form
      className="preview-comment-form"
      onSubmit={(event) => {
        event.preventDefault();
        const name = author.trim(),
          text = thread.draft.trim();
        if (!name || !text || name.length > 40 || text.length > 2000) {
          thread.feedback = messages.commentRequired;
          onChange();
          return;
        }
        thread.comments.push({
          author: name,
          text,
          time: new Intl.DateTimeFormat('ko-KR', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date()),
          sample: false,
        });
        thread.draft = '';
        thread.feedback = messages.commentAdded;
        onChange();
      }}
    >
      <div className="preview-composer-heading">
        <h3>{messages.writeComment}</h3>
        <span>{messages.leaveOpinion}</span>
      </div>
      <label htmlFor="previewAuthor">{messages.authorName}</label>
      <input
        id="previewAuthor"
        name="author"
        maxLength={40}
        value={author}
        onChange={(event) => onAuthor(event.target.value)}
        required
        autoComplete="off"
      />
      <label htmlFor="previewComment">{messages.content}</label>
      <textarea
        id="previewComment"
        name="comment"
        rows={4}
        maxLength={2000}
        required
        placeholder={messages.commentPlaceholder}
        value={thread.draft}
        onChange={(event) => {
          thread.draft = event.target.value;
          onChange();
        }}
        onKeyDown={(event) => {
          if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="preview-composer-actions">
        <small>{messages.commentShortcut}</small>
        <button type="submit">{messages.submitComment}</button>
      </div>
      <p className="preview-comment-feedback" role="status" aria-live="polite">
        {thread.feedback}
      </p>
    </form>
  );
}
