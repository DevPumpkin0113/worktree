import { messages } from '../../i18n/messages';
import type { useAppInfo } from '../../hooks/use-app-info';
export function IssueReport({
  app,
}: {
  app: Pick<ReturnType<typeof useAppInfo>, 'reporting' | 'report' | 'feedback'>;
}) {
  return (
    <section className="about-section about-support" aria-labelledby="aboutSupportTitle">
      <div>
        <h4 id="aboutSupportTitle">{messages.reportIssue}</h4>
        <p>{messages.reportIssueHint}</p>
      </div>
      <div className="about-support-action">
        <button
          id="reportIssue"
          type="button"
          disabled={app.reporting}
          onClick={() => void app.report()}
        >
          {messages.reportIssue}
        </button>
        <span id="issueFeedback" role="status" aria-live="polite">
          {app.feedback}
        </span>
      </div>
    </section>
  );
}
