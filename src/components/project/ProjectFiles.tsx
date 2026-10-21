import { messages } from '../../i18n/messages';
import { Icon } from '../shared/Icon';
export function ProjectFiles({ path, onSelect }: { path: string | null; onSelect: () => void }) {
  const name = path?.split(/[\\/]/).at(-1);
  return (
    <ul id="projectFiles" className="project-files" aria-label={messages.projectWbsFiles}>
      {path && name && /\.wbs$/i.test(name) ? (
        <li>
          <button
            type="button"
            className="project-file selected"
            title={path}
            aria-label={name}
            aria-current="true"
            onClick={onSelect}
          >
            <Icon name="wbs-file" />
            <span>{name}</span>
          </button>
        </li>
      ) : (
        <li className="project-files-empty">{messages.noWbsFiles}</li>
      )}
    </ul>
  );
}
