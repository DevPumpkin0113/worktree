import type { Comment } from './comment-types';
export function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <div className="preview-thread" aria-label="댓글 목록">
      {comments.map((comment, index) => (
        <article className="preview-comment" key={index}>
          <div className="preview-comment-avatar" aria-hidden="true">
            {comment.author.slice(0, 1)}
          </div>
          <div className="preview-comment-content">
            <header>
              <strong>{comment.author}</strong>
              {comment.sample ? <span className="preview-sample">예시</span> : null}
              <time>{comment.time}</time>
            </header>
            <p>{comment.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
