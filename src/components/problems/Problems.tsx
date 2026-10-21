import { messages } from '../../i18n/messages';
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
      setFeedback(messages.copied);
    } catch {
      setFeedback(messages.copyFailed);
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
          {messages.problems + ' '}
          <span id="problemsCount">{problems.length}</span>
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
            {messages.copyAll}
          </button>
          <button
            id="problemsClose"
            className="modal-close"
            aria-label={messages.closeProblems}
            title={messages.close}
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
                {messages.copyError}
              </button>
            </div>
            {problem.source ? <p className="problem-source">{problem.source}</p> : null}
            <dl>
              <dt>{messages.reason}</dt>
              <dd>{problem.reason}</dd>
              {problem.field ? (
                <>
                  <dt>{messages.problemField}</dt>
                  <dd>{problem.field}</dd>
                  <dt>{messages.inputValue}</dt>
                  <dd>
                    <code>{problem.value}</code>
                  </dd>
                </>
              ) : null}
              <dt>{messages.fixHint}</dt>
              <dd>{problem.hint}</dd>
              {problem.example ? (
                <>
                  <dt>{messages.fixExample}</dt>
                  <dd>
                    <code>{problem.example}</code>
                  </dd>
                </>
              ) : null}
            </dl>
            {problem.raw ? (
              <details className="problem-original">
                <summary>
                  {messages.viewSourcePrefix + ' '}
                  {problemLocation(problem)}
                </summary>
                <div className="problem-source-actions">
                  <button
                    type="button"
                    className="problem-copy"
                    onClick={() => void copy(problem.raw)}
                  >
                    {messages.copySource}
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
