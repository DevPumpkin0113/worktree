import type { OpenDocument } from '../../app/types';
import { messages } from '../../i18n/messages';
import { useDetailDialog } from './use-detail-dialog';
import { Comments } from './Comments';
import { DetailTabs } from './DetailTabs';
import { useCommentThreads } from './use-comment-threads';
import { TaskInfo } from './TaskInfo';
import { TaskTimestamps } from './TaskTimestamps';
import { Icon } from '../shared/Icon';
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
  onDelete: (id: string) => void;
}) {
  const comments = useCommentThreads(documents);
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
        className={mode === 'sidebar' ? 'sidebar' : 'task-detail-tab'}
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
              {row ? (
                <button
                  id="taskEditOpen"
                  type="button"
                  className="task-edit-open"
                  onClick={() => onEdit(row.id)}
                >
                  {messages.edit}
                </button>
              ) : null}
              <button
                id="close"
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
            <h2 id="detailTitle">{row?.name ?? ''}</h2>
            {row ? <TaskTimestamps row={row} /> : null}
          </div>
        </header>
        <div id="detailBody">
          {row && model ? (
            <>
              <DetailTabs
                thread={thread}
                commentCount={taskComments.filter((comment) => !comment.deleted).length}
                onChange={(tab) => {
                  thread.tab = tab;
                  comments.update();
                }}
              />
              <section
                id="previewInfoPanel"
                role="tabpanel"
                aria-labelledby="previewInfoTab"
                hidden={thread.tab !== 'info'}
              >
                <TaskInfo
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
                hidden={thread.tab !== 'comments'}
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
