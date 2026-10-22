import { useState } from 'react';
import type { OpenDocument, TaskCreationTab } from '../../app/types';
import type { ProjectTaskDraft } from '../../domain/task-editing';
import { messages } from '../../i18n/messages';
import { Icon } from '../shared/Icon';
import { TaskEditor } from './TaskEditor';
import { TaskEditorTitleContext } from './task-editor-title-context';

export function TaskCreationDetail({
  documents,
  path,
  id,
  hidden,
  onSave,
  onClose,
  onBusyChange,
}: {
  documents: OpenDocument[];
  path: string | null;
  id: string | null;
  hidden: boolean;
  onSave: (path: string, tab: TaskCreationTab, draft: ProjectTaskDraft) => Promise<void>;
  onClose: (path: string, id: string) => void;
  onBusyChange: (path: string, id: string, saving: boolean) => void;
}) {
  const [titleTarget, setTitleTarget] = useState<HTMLDivElement | null>(null);
  const current = documents
    .find((doc) => doc.path === path)
    ?.creationTabs?.find((tab) => tab.id === id);
  const visible = !!current && !hidden;
  return (
    <section
      id="taskCreationDetail"
      className="task-creation-detail"
      hidden={!visible}
      role="tabpanel"
      aria-labelledby={current ? 'task-tab-' + current.id : undefined}
    >
      <header className="detail-header">
        <div className="detail-header-row">
          <span className="detail-type">
            {current?.kind === 'milestone' ? messages.newMilestone : messages.newTask}
          </span>
          <button
            type="button"
            className="modal-close"
            disabled={current?.saving}
            aria-label={messages.close}
            onClick={() => {
              if (current && path) onClose(path, current.id);
            }}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="detail-title-row">
          <div ref={setTitleTarget} className="task-creation-title" />
        </div>
      </header>
      <div className="task-creation-body">
        <TaskEditorTitleContext.Provider value={titleTarget}>
          {documents.flatMap((doc) =>
            (doc.creationTabs ?? []).map((tab) => (
              <TaskEditor
                key={JSON.stringify([doc.path, tab.id])}
                active={visible && doc.path === path && tab.id === id}
                session={{ path: doc.path, text: tab.text, kind: tab.kind }}
                onSave={(draft) => onSave(doc.path, tab, draft)}
                onClose={() => onClose(doc.path, tab.id)}
                onBusyChange={(saving) => onBusyChange(doc.path, tab.id, saving)}
              />
            )),
          )}
        </TaskEditorTitleContext.Provider>
      </div>
    </section>
  );
}
