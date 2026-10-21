import { messages } from '../../i18n/messages';
import { useDetailDialog } from './use-detail-dialog';
import { Comments } from './Comments';
import { DetailTabs } from './DetailTabs';
import { useCommentThreads } from './use-comment-threads';
import { TaskInfo } from './TaskInfo';
import { Icon } from '../shared/Icon';
import { STATUS_NAMES, TYPE_NAMES, type DetailMode, type WorkModel } from '../../app/types';
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
}: {
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
}) {
  const comments = useCommentThreads();
  const visible = !!model && !!id && !settingsOpen;
  const row = model?.rows.find((item) => item.id === id);
  const thread = comments.get(JSON.stringify([path, id]));
  const { dialog, header, handle, pressedOutside, isBackdrop } = useDetailDialog({
    visible,
    mode,
    path,
    id,
    collapsed,
    onClose,
  });
  return (
    <>
      <div
        ref={handle}
        id="detailResize"
        role="separator"
        aria-label={messages.resizeDetail}
        aria-orientation="vertical"
        aria-controls="detail"
        tabIndex={0}
        title={messages.resizeDetailHint}
      />
      <dialog
        ref={dialog}
        id="detail"
        className={mode === 'sidebar' ? 'sidebar' : ''}
        aria-labelledby="detailTitle"
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
          <div className="detail-heading">
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
                  <span className="detail-type">
                    {row.milestone ? messages.milestone : TYPE_NAMES[row.type]}
                  </span>
                  <span className={'detail-status ' + row.status}>{STATUS_NAMES[row.status]}</span>
                </>
              ) : null}
            </div>
            <h2 id="detailTitle">
              {row ? (row.milestone ? row.name : label(row.id) + ' · ' + row.name) : ''}
            </h2>
          </div>

          {row ? (
            <button
              id="taskEditOpen"
              type="button"
              className="task-edit-open"
              onClick={() => onEdit(row.id)}
            >
              {row.milestone ? messages.editMilestone : messages.editTask}
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
        </header>
        <div id="detailBody">
          {row && model ? (
            <>
              <DetailTabs
                thread={thread}
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
                <TaskInfo row={row} model={model} label={label} onSelect={onSelect} />
              </section>
              <section
                id="previewCommentsPanel"
                role="tabpanel"
                aria-labelledby="previewCommentsTab"
                hidden={thread.tab !== 'comments'}
              >
                <Comments
                  thread={thread}
                  author={comments.author}
                  onAuthor={comments.setAuthor}
                  onChange={comments.update}
                />
              </section>
            </>
          ) : null}
        </div>
        <div className="detail-footer">
          <p>{messages.detailReadOnlyHint}</p>
        </div>
      </dialog>
    </>
  );
}
