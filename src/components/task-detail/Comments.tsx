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
        <strong>댓글 UI 미리보기</strong>
        <p>
          예시 대화가 포함되어 있습니다. 작성한 댓글은 현재 창에서만 유지되며 파일에 저장되지
          않습니다.
        </p>
      </div>
      <CommentList comments={thread.comments} />
      <CommentForm thread={thread} author={author} onAuthor={onAuthor} onChange={onChange} />
    </>
  );
}
