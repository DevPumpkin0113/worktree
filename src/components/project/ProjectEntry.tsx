import { messages } from '../../i18n/messages';
import { Icon } from '../shared/Icon';
export function ProjectEntry({
  title,
  active,
  onManage,
}: {
  title: string | null;
  active: boolean;
  onManage: () => void;
}) {
  return (
    <section className="project-tree" aria-label={messages.project}>
      <div className="project-entry">
        <span className="project-entry-title" title={title ?? messages.noOpenProject}>
          {title ?? messages.noOpenProject}
        </span>
        <button
          id="projectManageOpen"
          type="button"
          className="project-manage-open"
          aria-label={messages.projectManagement}
          title={messages.projectManagement}
          aria-current={active ? 'page' : undefined}
          disabled={!title}
          onClick={onManage}
        >
          <Icon name="project" />
        </button>
      </div>
    </section>
  );
}
