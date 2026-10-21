import { messages } from '../../i18n/messages';

export function initializationTitles() {
  return [
    messages.initializationBasic,
    messages.initializationStorage,
    messages.initializationReview,
  ];
}

export function InitializationSteps({
  step,
  onStep,
}: {
  step: number;
  onStep: (step: number) => void;
}) {
  return (
    <div className="initialization-steps">
      <p className="workspace-nav-label">{messages.initializationSteps}</p>
      <nav aria-label={messages.initializationSteps}>
        {initializationTitles().map((title, index) => (
          <button
            key={index}
            type="button"
            title={title}
            aria-label={title}
            aria-current={step === index ? 'step' : undefined}
            onClick={() => onStep(index)}
          >
            <span className="initialization-step-number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="workspace-nav-text">{title}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
