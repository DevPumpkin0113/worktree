import { useRef, type ReactNode } from 'react';
import type { ProjectComment } from '@worktree/core/comment-file';
import { commentThreads, hasCommentReplies } from '@worktree/core/comment-thread';
import { messages } from '../../i18n/messages';
import { CommentItem } from './CommentItem';
export function CommentList({
  comments,
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
}: {
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
}) {
  const elements = useRef(new Map<string, HTMLElement>());
  const groups = commentThreads(comments);
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const renderComment = (comment: ProjectComment) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      hasReplies={hasCommentReplies(comments, comment.id)}
      target={comment.replyTo ? byId.get(comment.replyTo) : undefined}
      elementRef={(element) => {
        if (element) elements.current.set(comment.id, element);
        else elements.current.delete(comment.id);
      }}
      onJump={(id) => {
        const element = elements.current.get(id);
        element?.focus({ preventScroll: true });
        element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }}
      busy={busy}
      editingId={editingId}
      replyingId={replyingId}
      deletingId={deletingId}
      renderEditor={renderEditor}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
      onConfirmDelete={onConfirmDelete}
      onCancelDelete={onCancelDelete}
    />
  );
  return (
    <div className="comment-list" aria-label={messages.commentList}>
      {!groups.length ? <p className="comment-empty">{messages.noComments}</p> : null}
      {groups.map(({ root, replies }) => (
        <section className="comment-thread" key={root.id}>
          {renderComment(root)}
          {replies.length ? (
            <div className="comment-replies">{replies.map(renderComment)}</div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
