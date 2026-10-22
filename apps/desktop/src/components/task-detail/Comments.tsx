import { hasCommentReplies } from '@worktree/core/comment-thread';
import { messages } from '../../i18n/messages';
import type { ProjectComment } from '@worktree/core/comment-file';
import type { Thread } from './comment-types';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
export function Comments({
  thread,
  comments,
  source,
  author,
  onChange,
  onSave,
  onDelete,
  onOpenSettings,
}: {
  thread: Thread;
  comments: ProjectComment[];
  source: string;
  author: string;
  onChange: () => void;
  onSave: (expected: string, text: string, id?: string, replyTo?: string) => Promise<void>;
  onDelete: (expected: string, id: string) => Promise<void>;
  onOpenSettings: () => void;
}) {
  async function run(operation: () => Promise<void>, success: () => void) {
    if (thread.busy) return;
    thread.busy = true;
    thread.feedback = '';
    thread.error = false;
    onChange();
    try {
      await operation();
      success();
    } catch (error) {
      thread.error = true;
      thread.feedback =
        messages.commentSaveFailed + String(error instanceof Error ? error.message : error);
    } finally {
      thread.busy = false;
      onChange();
    }
  }
  return (
    <>
      <div className="comment-scroll-area">
        <CommentList
          comments={comments}
          busy={thread.busy}
          editingId={thread.editing?.id}
          replyingId={thread.replying?.id}
          deletingId={thread.deleting?.id}
          onReply={(comment) => {
            thread.replying =
              thread.replying?.id === comment.id
                ? undefined
                : {
                    id: comment.id,
                    number: comment.number,
                    author: comment.author,
                    text: comment.text,
                  };
            thread.feedback = '';
            onChange();
          }}
          onEdit={(comment) => {
            thread.editing = {
              id: comment.id,
              author: comment.author,
              text: comment.text,
              expected: source,
            };
            thread.deleting = undefined;
            thread.feedback = '';
            onChange();
          }}
          onDelete={(comment) => {
            thread.deleting = { id: comment.id, expected: source };
            thread.feedback = '';
            onChange();
          }}
          onCancelDelete={() => {
            thread.deleting = undefined;
            thread.feedback = '';
            onChange();
          }}
          onConfirmDelete={async () => {
            const deletion = thread.deleting;
            if (deletion)
              await run(
                () => onDelete(deletion.expected, deletion.id),
                () => {
                  thread.deleting = undefined;
                  if (thread.editing?.id === deletion.id) thread.editing = undefined;
                  thread.feedback = '';
                },
              );
          }}
          renderEditor={(comment) => {
            const editing = thread.editing;
            return editing?.id === comment.id ? (
              <CommentForm
                author={comment.author}
                text={editing.text}
                busy={thread.busy}
                editing
                canSubmit={!hasCommentReplies(comments, comment.id)}
                onChange={(text) => {
                  editing.text = text;
                  onChange();
                }}
                onCancel={() => {
                  thread.editing = undefined;
                  thread.feedback = '';
                  onChange();
                }}
                onSubmit={() =>
                  run(
                    () => onSave(editing.expected, editing.text, editing.id),
                    () => {
                      thread.editing = undefined;
                      thread.feedback = '';
                    },
                  )
                }
              />
            ) : null;
          }}
        />
        {thread.editing &&
        !comments.some((comment) => comment.id === thread.editing?.id && !comment.deleted) ? (
          <div>
            <p className="comment-feedback comment-error" role="alert">
              {messages.commentMissing}
            </p>
            <CommentForm
              author={thread.editing.author}
              text={thread.editing.text}
              busy={thread.busy}
              editing
              canSubmit={false}
              onChange={(text) => {
                if (thread.editing) thread.editing.text = text;
                onChange();
              }}
              onSubmit={async () => {
                thread.feedback = messages.commentMissing;
                thread.error = true;
                onChange();
              }}
              onCancel={() => {
                thread.editing = undefined;
                onChange();
              }}
            />
          </div>
        ) : null}
      </div>
      <div className="comment-composer-fixed">
        {thread.replying &&
        !comments.some((comment) => comment.id === thread.replying?.id && !comment.deleted) ? (
          <p className="comment-feedback comment-error" role="alert">
            {messages.commentMissing}
            <button
              type="button"
              disabled={thread.busy}
              onClick={() => {
                thread.replying = undefined;
                onChange();
              }}
            >
              {messages.cancelReply}
            </button>
          </p>
        ) : null}
        <CommentForm
          canSubmit={
            !thread.replying ||
            comments.some((comment) => comment.id === thread.replying?.id && !comment.deleted)
          }
          author={author}
          text={thread.draft}
          busy={thread.busy}
          onOpenSettings={onOpenSettings}
          onChange={(text) => {
            thread.draft = text;
            onChange();
          }}
          onSubmit={() =>
            run(
              () => onSave(source, thread.draft, undefined, thread.replying?.id),
              () => {
                thread.draft = '';
                thread.replying = undefined;
                thread.feedback = '';
              },
            )
          }
        />
        {thread.feedback ? (
          <p
            className={'comment-feedback' + (thread.error ? ' comment-error' : '')}
            role={thread.error ? 'alert' : 'status'}
          >
            {thread.feedback}
          </p>
        ) : null}
      </div>
    </>
  );
}
