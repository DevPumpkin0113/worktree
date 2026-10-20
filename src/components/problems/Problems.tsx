import { useLayoutEffect, useRef, useState } from 'react';
import { formatDocumentProblem, problemLocation } from '../../domain/document-errors';
import { copyText } from '../../platform/clipboard';
import { Icon } from '../shared/Icon';
import type { Problem } from '../../app/types';
export function Problems({
  problems,
  open,
  inert,
  onClose,
}: {
  problems: Problem[];
  open: boolean;
  inert: boolean;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState('');
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true });
  }, [open]);
  async function copy(text: string) {
    try {
      await copyText(text);
      setFeedback('복사했습니다.');
    } catch {
      setFeedback('복사 실패 · 내용을 선택해 직접 복사하세요.');
    }
  }
  return (
    <section
      ref={panel}
      id="documentProblems"
      className="problems-panel"
      role="region"
      aria-labelledby="documentProblemsTitle"
      tabIndex={-1}
      hidden={!open || !problems.length}
      inert={inert}
    >
      <div className="problems-heading">
        <h2 id="documentProblemsTitle">
          문제 <span id="problemsCount">{problems.length}</span>
        </h2>
        <div className="problems-actions">
          <span id="copyFeedback" role="status" aria-live="polite">
            {feedback}
          </span>
          <button
            id="problemsCopyAll"
            type="button"
            className="problem-copy"
            onClick={() => void copy(problems.map(formatDocumentProblem).join('\n\n---\n\n'))}
          >
            전체 복사
          </button>
          <button
            id="problemsClose"
            className="modal-close"
            aria-label="문제 패널 닫기"
            title="닫기"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
      <div id="problemsBody">
        {problems.map((problem, index) => (
          <article className="problem-card" key={index}>
            <div className="problem-card-heading">
              <div>
                <div className="problem-kind">
                  {problem.kind} · {problemLocation(problem)}
                </div>
                <h3>{problem.id ? problem.id + ' · ' + problem.name : problem.kind}</h3>
              </div>
              <button
                type="button"
                className="problem-copy"
                onClick={() => void copy(formatDocumentProblem(problem))}
              >
                오류 복사
              </button>
            </div>
            {problem.source ? <p className="problem-source">{problem.source}</p> : null}
            <dl>
              <dt>원인</dt>
              <dd>{problem.reason}</dd>
              {problem.field ? (
                <>
                  <dt>문제 필드</dt>
                  <dd>{problem.field}</dd>
                  <dt>입력된 값</dt>
                  <dd>
                    <code>{problem.value}</code>
                  </dd>
                </>
              ) : null}
              <dt>수정 안내</dt>
              <dd>{problem.hint}</dd>
              {problem.example ? (
                <>
                  <dt>수정 예시</dt>
                  <dd>
                    <code>{problem.example}</code>
                  </dd>
                </>
              ) : null}
            </dl>
            {problem.raw ? (
              <details className="problem-original">
                <summary>관련 원문 보기 · {problemLocation(problem)}</summary>
                <div className="problem-source-actions">
                  <button
                    type="button"
                    className="problem-copy"
                    onClick={() => void copy(problem.raw)}
                  >
                    원문 복사
                  </button>
                </div>
                <pre>{problem.raw}</pre>
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
