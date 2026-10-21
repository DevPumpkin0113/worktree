import { messages } from '../../i18n/messages';
import { useRef, useState } from 'react';
import { ProjectSettingsEditor } from './ProjectSettingsEditor';
import type { WorkspaceStore } from '../../app/workspace-store';
import { ProjectOverview } from './ProjectOverview';
import type { WorkModel, OpenProject } from '../../app/types';
export function ProjectManagement({
  model,
  store,
  project,
}: {
  model: WorkModel | null;
  store: WorkspaceStore;
  project: OpenProject;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastValid = useRef<{ text: string; path: string; model: WorkModel } | null>(null);
  if (store.active?.model)
    lastValid.current = {
      text: store.active.text,
      path: store.active.path,
      model: store.active.model,
    };
  const source = lastValid.current;
  return (
    <section
      id="projectManagement"
      className="project-management"
      aria-labelledby="workspacePageTitle"
    >
      {editing && source ? (
        <ProjectSettingsEditor
          text={source.text}
          onSave={(expected, draft) => store.saveProjectSettings(source.path, expected, draft)}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSaved(true);
          }}
          model={model ?? source.model}
          project={project}
        />
      ) : (
        <>
          {saved ? (
            <p className="project-settings-feedback" role="status">
              {messages.projectSettingsSaved}
            </p>
          ) : null}
          <ProjectOverview model={model ?? source?.model ?? null} project={project} />
          <div className="project-management-actions">
            <button
              id="projectInitializePreview"
              onClick={() => store.setPage('initialize')}
              className="project-initialize-preview"
              type="button"
            >
              {messages.initializeProject}
            </button>
            <button
              id="projectEditOpen"
              type="button"
              disabled={!model || !source}
              onClick={() => {
                setEditing(true);
                setSaved(false);
              }}
            >
              {messages.editProject}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
