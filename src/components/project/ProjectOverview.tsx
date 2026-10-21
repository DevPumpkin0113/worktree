import { folderName } from '../../domain/project-paths';
import { messages } from '../../i18n/messages';
import { STATUS_NAMES, type OpenProject, type WorkModel } from '../../app/types';
export function ProjectOverview({
  model,
  project,
}: {
  model: WorkModel | null;
  project: OpenProject;
}) {
  const facts = [
    [messages.projectName, model?.title ?? folderName(project.path)],
    [messages.projectFolder, project.path],
    [messages.dataDirectory, model?.dataDirectory ?? '—'],
    [messages.idPrefix, model?.idPrefix ?? '—'],
    [messages.useEffort, model ? (model.useEffort ? messages.enabled : messages.disabled) : '—'],
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
            <dd>{model?.taskTypes?.join(' · ') ?? '—'}</dd>
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
