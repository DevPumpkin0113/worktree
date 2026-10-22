import type { ReactNode } from 'react';
import type { ProjectComment } from '@worktree/core/comment-file';
import { commentLabel } from '@worktree/core/comment-thread';
import { messages } from '../../i18n/messages';
import { useProjectDates } from '../project/ProjectDateFormatProvider';
export interface CommentItemProps {
  comments: ProjectComment[];
  busy: boolean;
  editingId?: string;
  replyingId?: string;
  deletingId?: string;
  renderEditor: (comment: ProjectComment) => ReactNode;
  onReply: (comment: ProjectComment) => void;
  onEdit: (comment: ProjectComment) => void;
  onDelete: (comment: ProjectComment) => void;
  onConfirmDelete: () => Promise<void>;
  onCancelDelete: () => void;
}

export function CommentItem({
  comment,
  target,
  hasReplies,
  elementRef,
  onJump,
  busy,
  editingId,
  replyingId,
  renderEditor,
  deletingId,
  onReply,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: Omit<CommentItemProps, 'comments'> & {
  comment: ProjectComment;
  target?: ProjectComment;
  hasReplies: boolean;
  elementRef: (element: HTMLElement | null) => void;
  onJump: (id: string) => void;
}) {
  const dates = useProjectDates();
  return (
    <article
      className={'comment' + (replyingId === comment.id ? ' comment-reply-selected' : '')}
      key={comment.id}
      data-comment-id={comment.id}
      tabIndex={-1}
      ref={elementRef}
    >
      <div className="comment-avatar" aria-hidden="true">
        {comment.deleted ? '–' : Array.from(comment.author)[0]}
      </div>
      <div className="comment-content">
        <header>
          <span className="comment-number">{commentLabel(comment)}</span>
          <strong>{comment.deleted ? messages.deletedComment : comment.author}</strong>
          <div className="comment-timestamps">
            <time
              dateTime={comment.createdAt}
              aria-label={`${messages.createdAt}: ${dates.timestamp(comment.createdAt)}`}
            >
              {dates.timestamp(comment.createdAt)}
            </time>
          </div>
          {!comment.deleted ? (
            <span className="comment-edit-control">
              <button
                type="button"
                className="comment-edit"
                disabled={busy || !!editingId || hasReplies}
                aria-describedby={hasReplies ? `comment-edit-hint-${comment.id}` : undefined}
                onClick={() => onEdit(comment)}
              >
                {messages.edit}
              </button>
              {hasReplies ? (
                <span
                  className="comment-edit-tooltip"
                  role="tooltip"
                  id={`comment-edit-hint-${comment.id}`}
                >
                  {messages.commentEditHasReplies}
                </span>
              ) : null}
            </span>
          ) : null}
        </header>
        {comment.deleted ? (
          <p className="comment-empty">{messages.deletedComment}</p>
        ) : (
          (renderEditor(comment) ?? (
            <p>
              {target ? (
                <>
                  <button
                    type="button"
                    className="comment-reference"
                    aria-label={`${messages.replyTarget} ${commentLabel(target)} · ${target.deleted ? messages.deletedComment : target.author}`}
                    onClick={() => onJump(target.id)}
                  >
                    {commentLabel(target)}
                  </button>{' '}
                </>
              ) : null}
              {comment.text}
            </p>
          ))
        )}
        {!comment.deleted ? (
          <div className="comment-actions">
            <button
              type="button"
              className="comment-reply"
              aria-pressed={replyingId === comment.id}
              disabled={busy}
              onClick={() => onReply(comment)}
            >
              {messages.replyComment}
            </button>
            {deletingId === comment.id ? (
              <div className="comment-delete-prompt">
                <span>{messages.commentDeleteConfirm}</span>
                <button type="button" disabled={busy} onClick={onCancelDelete}>
                  {messages.cancelEdit}
                </button>
                <button
                  type="button"
                  className="comment-delete-confirm"
                  disabled={busy}
                  onClick={() => void onConfirmDelete()}
                >
                  {messages.delete}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="comment-delete"
                disabled={busy}
                onClick={() => onDelete(comment)}
              >
                {messages.delete}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
