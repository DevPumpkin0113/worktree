import { Icon } from '../shared/Icon';
export function ProjectFiles({ path, onSelect }: { path: string | null; onSelect: () => void }) {
  const name = path?.split(/[\\/]/).at(-1);
  return (
    <ul id="projectFiles" className="project-files" aria-label="프로젝트 WBS 파일">
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
        <li className="project-files-empty">표시할 WBS 파일 없음</li>
      )}
    </ul>
  );
}
