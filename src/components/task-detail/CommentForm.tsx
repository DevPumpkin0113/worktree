import { messages } from '../../i18n/messages';
import { MAX_COMMENT_LENGTH } from '../../domain/comment-file';
export function CommentForm({
  author,
  text,
  busy,
  editing = false,
  canSubmit = true,
  onChange,
  onSubmit,
  onCancel,
  onOpenSettings,
}: {
  author: string;
  text: string;
  busy: boolean;
  editing?: boolean;
  canSubmit?: boolean;
  onChange: (text: string) => void;
  onSubmit: () => Promise<void>;
  onCancel?: () => void;
  onOpenSettings?: () => void;
}) {
  const id = editing ? 'commentEditContent' : 'commentContent';
  return (
    <form
      autoComplete="off"
      className="comment-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && canSubmit && author && text.trim()) void onSubmit();
      }}
    >
      <div className="comment-composer-heading">
        <h3>{editing ? messages.editComment : messages.writeComment}</h3>
        <div className="comment-author">
          <span>
            {messages.authorName}: {author || messages.displayNameMissing}
          </span>
          {!editing ? (
            <button type="button" disabled={busy} onClick={onOpenSettings}>
              {messages.displayNameSettings}
            </button>
          ) : null}
        </div>
      </div>
      {!author ? <p className="comment-name-hint">{messages.displayNameRequired}</p> : null}
      <textarea
        id={id}
        name="comment"
        aria-label={messages.content}
        rows={2}
        maxLength={MAX_COMMENT_LENGTH}
        required
        disabled={busy || !author}
        placeholder={messages.commentPlaceholder}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Enter' &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="comment-composer-actions">
        <small>{messages.commentShortcut}</small>
        <div className="comment-edit-actions">
          {onCancel ? (
            <button type="button" disabled={busy} onClick={onCancel}>
              {messages.cancelEdit}
            </button>
          ) : null}
          <button type="submit" disabled={busy || !canSubmit || !author || !text.trim()}>
            {busy ? messages.savingTask : editing ? messages.saveTask : messages.submitComment}
          </button>
        </div>
      </div>
    </form>
  );
}
