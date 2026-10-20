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
          thread.feedback = '작성자 이름과 댓글 내용을 입력해 주세요.';
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
        thread.feedback = '댓글을 임시로 등록했습니다. 파일에는 저장되지 않습니다.';
        onChange();
      }}
    >
      <div className="preview-composer-heading">
        <h3>댓글 작성</h3>
        <span>이 작업에 의견 남기기</span>
      </div>
      <label htmlFor="previewAuthor">작성자 이름</label>
      <input
        id="previewAuthor"
        name="author"
        maxLength={40}
        value={author}
        onChange={(event) => onAuthor(event.target.value)}
        required
        autoComplete="off"
      />
      <label htmlFor="previewComment">내용</label>
      <textarea
        id="previewComment"
        name="comment"
        rows={4}
        maxLength={2000}
        required
        placeholder="질문, 검토 의견이나 결정 내용을 남겨 주세요."
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
        <small>Ctrl+Enter로 등록 · 임시 보관</small>
        <button type="submit">댓글 등록</button>
      </div>
      <p className="preview-comment-feedback" role="status" aria-live="polite">
        {thread.feedback}
      </p>
    </form>
  );
}
