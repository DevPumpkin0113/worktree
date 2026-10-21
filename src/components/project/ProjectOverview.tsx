import { messages } from '../../i18n/messages';
import { STATUS_NAMES, TYPE_NAMES, type WorkModel } from '../../app/types';
export function ProjectOverview({ model, path }: { model: WorkModel; path: string | null }) {
  const facts = [
    [messages.projectName, model.title],
    [messages.sourceDocument, path ?? '—'],
    [messages.idPrefix, model.idPrefix],
    [messages.useEffort, model.useEffort ? messages.enabled : messages.disabled],
  ];
  return (
    <div className="project-overview">
      <p className="project-management-notice">{messages.projectReadOnlyHint}</p>
      <section className="project-management-section">
        <h3>{messages.basicInfo}</h3>
        <dl>
          {facts.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="project-management-section">
        <h3>{messages.workRules}</h3>
        <dl>
          <div>
            <dt>{messages.workTypes}</dt>
            <dd>{Object.values(TYPE_NAMES).join(' · ')}</dd>
          </div>
          <div>
            <dt>{messages.workStatuses}</dt>
            <dd>{Object.values(STATUS_NAMES).join(' · ')}</dd>
          </div>
        </dl>
        <p className="project-rule-note">{messages.commonRulesHint}</p>
      </section>
    </div>
  );
}
