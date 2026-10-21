import { messages } from '../../i18n/messages';
import type { Thread } from './comment-types';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
export function Comments({
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
    <>
      <div className="comments-preview-notice">
        <strong>{messages.commentPreview}</strong>
        <p>{messages.commentPreviewHint}</p>
      </div>
      <CommentList comments={thread.comments} />
      <CommentForm thread={thread} author={author} onAuthor={onAuthor} onChange={onChange} />
    </>
  );
}
