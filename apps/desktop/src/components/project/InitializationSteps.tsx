import { messages } from '../../i18n/messages';

export function initializationTitles() {
  return [messages.initializationBasic, messages.workRules, messages.initializationReview];
}

export function InitializationSteps({ step }: { step: number }) {
  return (
    <div className="initialization-steps">
      <p className="workspace-nav-label">{messages.initializationSteps}</p>
      <ol aria-label={messages.initializationSteps}>
        {initializationTitles().map((title, index) => (
          <li
            key={index}
            className="initialization-step"
            aria-label={title}
            aria-current={step === index ? 'step' : undefined}
          >
            <span className="initialization-step-number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="workspace-nav-text">{title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
