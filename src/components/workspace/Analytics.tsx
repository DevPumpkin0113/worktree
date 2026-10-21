import { messages } from '../../i18n/messages';
import { Metrics } from './Metrics';
import type { WorkModel } from '../../app/types';
export function Analytics({ model }: { model: WorkModel | null }) {
  return (
    <>
      <section className="analytics-intro">
        <span className="workspace-eyebrow">PROJECT INSIGHTS</span>
        <h2>{messages.insightsHeading}</h2>
        <p>{messages.insightsHint}</p>
      </section>
      {model ? (
        <Metrics rows={model.rows} useEffort={model.useEffort} />
      ) : (
        <p className="empty">{messages.insightsEmpty}</p>
      )}
      <div className="analytics-grid">
        {[
          [messages.progressTrend, messages.progressTrendHint],
          [messages.workStatus, messages.workStatusHint],
          [messages.teamDistribution, messages.teamDistributionHint],
        ].map(([title, description]) => (
          <section className="analytics-card" key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="analytics-placeholder" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <i key={index} />
              ))}
            </div>
            <small>{messages.analyticsPlaceholder}</small>
          </section>
        ))}
      </div>
    </>
  );
}
