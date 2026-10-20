import type { useAppInfo } from '../../hooks/use-app-info';
export function IssueReport({
  app,
}: {
  app: Pick<ReturnType<typeof useAppInfo>, 'reporting' | 'report' | 'feedback'>;
}) {
  return (
    <section className="about-section about-support" aria-labelledby="aboutSupportTitle">
      <div>
        <h4 id="aboutSupportTitle">문제 제보</h4>
        <p>
          버전·빌드 정보가 포함된 작성 화면을 브라우저에서 엽니다. 문서 내용과 경로는 포함하지
          않습니다.
        </p>
      </div>
      <div className="about-support-action">
        <button
          id="reportIssue"
          type="button"
          disabled={app.reporting}
          onClick={() => void app.report()}
        >
          문제 제보
        </button>
        <span id="issueFeedback" role="status" aria-live="polite">
          {app.feedback}
        </span>
      </div>
    </section>
  );
}
