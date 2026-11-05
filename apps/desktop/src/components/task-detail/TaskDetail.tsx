import type { OpenDocument } from '../../app/types';
import { useRef, useState, type ReactNode } from 'react';
import { TaskEditorTitleContext, TaskEditorIconRequestContext } from './task-editor-title-context';
import { messages } from '../../i18n/messages';
import { useDetailDialog } from './use-detail-dialog';
import { Comments } from './Comments';
import { DetailTabs } from './DetailTabs';
import { useCommentThreads } from './use-comment-threads';
import { TaskInfo } from './TaskInfo';
import { TaskTimestamps } from './TaskTimestamps';
import { Icon } from '../shared/Icon';
import { WorkGroupIcon } from '../shared/WorkGroupIcon';
import { STATUS_NAMES, type DetailMode, type WorkModel } from '../../app/types';
export function TaskDetail({
  model,
  path,
  id,
  mode,
  settingsOpen,
  collapsed,
  label,
  onSelect,
  onClose,
  onEdit,
  editing,
  editors,
  onDelete,
  documents,
  source,
  displayName,
  onSaveComment,
  onDeleteComment,
  onOpenSettings,
}: {
  documents: OpenDocument[];
  source: string;
  displayName: string;
  onSaveComment: (expected: string, text: string, id?: string, replyTo?: string) => Promise<void>;
  onDeleteComment: (expected: string, id: string) => Promise<void>;
  onOpenSettings: () => void;
  model: WorkModel | null;
  path: string | null;
  id: string | null;
  mode: DetailMode;
  settingsOpen: boolean;
  collapsed: boolean;
  label: (id: string) => string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onEdit: (id: string) => void;
  editing: boolean;
  editors: ReactNode;
  onDelete: (id: string) => void;
}) {
  const comments = useCommentThreads(documents);
  const [titleTarget, setTitleTarget] = useState<HTMLDivElement | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [titleSpace, setTitleSpace] = useState<{ id: string; height: number } | null>(null);
  function startEditing(id: string) {
    const height = title.current?.getBoundingClientRect().height ?? 0;
    setTitleSpace({ id, height });
    onEdit(id);
  }
  const [iconRequest, setIconRequest] = useState<string | null>(null);
  const visible = !!model && !!id && !settingsOpen;
  const row = model?.rows.find((item) => item.id === id);
  const taskComments = model?.comments?.filter((comment) => comment.taskId === id) ?? [];
  const thread = comments.get(path, id);
  const { dialog, header, handle, pressedOutside, isBackdrop } = useDetailDialog({
    visible,
    mode,
    path,
    id,
    collapsed,
    onClose,
  });
  const Frame = mode === 'tabs' ? 'section' : 'dialog';
  return (
    <>
      <div
        ref={handle}
        hidden={mode !== 'sidebar'}
        id="detailResize"
        role="separator"
        aria-label={messages.resizeDetail}
        aria-orientation="vertical"
        aria-controls="detail"
        tabIndex={0}
        title={messages.resizeDetailHint}
      />
      <Frame
        ref={mode === 'sidebar' ? dialog : undefined}
        hidden={mode === 'tabs' && !visible}
        role={mode === 'tabs' ? 'tabpanel' : undefined}
        id="detail"
        className={
          (mode === 'sidebar' ? 'sidebar' : 'task-detail-tab') + (editing ? ' detail-editing' : '')
        }
        aria-labelledby={mode === 'tabs' && id ? 'task-tab-' + id : 'detailTitle'}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClose={() => {
          if (visible) onClose();
        }}
        onPointerDown={(event) => {
          pressedOutside.current =
            event.button === 0 && isBackdrop(event.target, event.clientX, event.clientY);
        }}
        onPointerCancel={() => {
          pressedOutside.current = false;
        }}
        onClick={(event) => {
          if (pressedOutside.current && isBackdrop(event.target, event.clientX, event.clientY))
            onClose();
          pressedOutside.current = false;
        }}
      >
        <header ref={header} className="detail-header">
          <div className="detail-header-row">
            <div id="detailMeta">
              <button
                id="detailHide"
                type="button"
                className="modal-close"
                aria-label={messages.hideDetail}
                title={messages.hideDetail}
                onClick={onClose}
              >
                <Icon name="chevron-right" />
              </button>
              {row ? (
                <>
                  <span className="detail-type">{label(row.id)}</span>
                  <span className={'detail-status ' + row.status}>{STATUS_NAMES[row.status]}</span>
                </>
              ) : null}
            </div>
            <div className="detail-header-actions">
              {row && !editing ? (
                <button
                  data-variant="secondary"
                  data-size="compact"
                  id="taskEditOpen"
                  type="button"
                  className="task-edit-open action-button"
                  onClick={() => startEditing(row.id)}
                >
                  {messages.edit}
                </button>
              ) : null}
              <button
                id="close"
                style={editing ? { visibility: 'hidden' } : undefined}
                aria-hidden={editing || undefined}
                tabIndex={editing ? -1 : undefined}
                className="modal-close"
                aria-label={messages.closeTaskDetail}
                title={messages.close}
                onClick={onClose}
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
          <div className="detail-title-row">
            {editing ? (
              <div
                id="detailTitle"
                className="detail-title-editor"
                ref={setTitleTarget}
                style={
                  titleSpace?.id === id && titleSpace.height > 0
                    ? { minHeight: titleSpace.height }
                    : undefined
                }
              />
            ) : (
              <h2 id="detailTitle" ref={title}>
                {row?.epic ? (
                  <button
                    id="detailEpicIconOpen"
                    className="epic-icon-trigger"
                    type="button"
                    aria-label={messages.chooseEpicIcon}
                    title={messages.chooseEpicIcon}
                    onClick={() => {
                      setIconRequest(row.id);
                      startEditing(row.id);
                    }}
                  >
                    <WorkGroupIcon epic icon={row.icon} iconColor={row.iconColor} />
                  </button>
                ) : row?.milestone ? (
                  <WorkGroupIcon />
                ) : null}
                <span className="detail-title-text">{row?.name ?? ''}</span>
              </h2>
            )}
            {row ? <TaskTimestamps row={row} /> : null}
          </div>
        </header>
        <div id="detailBody">
          <TaskEditorIconRequestContext.Provider
            value={{
              requested: iconRequest === id && editing,
              consume: () => setIconRequest(null),
            }}
          >
            <TaskEditorTitleContext.Provider value={titleTarget}>
              {editors}
            </TaskEditorTitleContext.Provider>
          </TaskEditorIconRequestContext.Provider>
          {row && model ? (
            <>
              {!editing ? (
                <DetailTabs
                  thread={thread}
                  commentCount={taskComments.filter((comment) => !comment.deleted).length}
                  onChange={(tab) => {
                    thread.tab = tab;
                    comments.update();
                  }}
                />
              ) : null}
              <section
                id="previewInfoPanel"
                role="tabpanel"
                aria-labelledby="previewInfoTab"
                hidden={editing || thread.tab !== 'info'}
              >
                <TaskInfo
                  project={path}
                  row={row}
                  model={model}
                  label={label}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              </section>
              <section
                id="previewCommentsPanel"
                role="tabpanel"
                aria-labelledby="previewCommentsTab"
                hidden={editing || thread.tab !== 'comments'}
              >
                <Comments
                  thread={thread}
                  comments={taskComments}
                  source={source}
                  author={displayName}
                  onSave={onSaveComment}
                  onDelete={onDeleteComment}
                  onOpenSettings={onOpenSettings}
                  onChange={comments.update}
                />
              </section>
            </>
          ) : null}
        </div>
      </Frame>
    </>
  );
}
