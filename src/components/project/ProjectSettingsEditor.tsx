import { ProjectOverview } from './ProjectOverview';
import type { OpenProject, WorkModel } from '../../app/types';
import { messages } from '../../i18n/messages';
import { useProjectSettings } from './use-project-settings';
import type { ProjectSettingsDraft } from '../../domain/project-settings';
export function ProjectSettingsEditor({
  text,
  onSave,
  onCancel,
  onSaved,
  model,
  project,
}: {
  onCancel: () => void;
  onSaved: () => void;
  model: WorkModel;
  project: OpenProject;
  text: string;
  onSave: (expected: string, draft: ProjectSettingsDraft) => Promise<string>;
}) {
  const form = useProjectSettings(text, onSave);
  return (
    <form
      autoComplete="off"
      id="projectSettingsForm"
      className="project-settings-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await form.save()) onSaved();
      }}
    >
      <fieldset disabled={form.saving} className="project-settings-fields">
        <ProjectOverview
          model={model}
          project={project}
          draft={form.draft}
          onChange={form.change}
        />
      </fieldset>
      {form.error ? (
        <p id="projectSettings-error" className="task-editor-error" role="alert">
          {form.error}
        </p>
      ) : null}
      <div className="project-settings-actions">
        <button id="projectSettings-reset" type="button" disabled={form.saving} onClick={onCancel}>
          {messages.resetProjectSettings}
        </button>
        <button
          id="projectSettings-save"
          type="submit"
          className="task-save"
          disabled={form.saving || !form.dirty}
        >
          {form.saving ? messages.savingTask : messages.saveTask}
        </button>
      </div>
    </form>
  );
}
