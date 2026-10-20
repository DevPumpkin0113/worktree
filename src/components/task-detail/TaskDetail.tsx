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
        aria-label="상세 패널 너비 조절"
        aria-orientation="vertical"
        aria-controls="detail"
        tabIndex={0}
        title="드래그로 너비 조절 · 오른쪽 끝까지 끌어 숨기기"
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
                aria-label="상세 패널 숨기기"
                title="상세 패널 숨기기"
                onClick={onClose}
              >
                <Icon name="chevron-right" />
              </button>
              {row ? (
                <>
                  <span className="detail-type">{TYPE_NAMES[row.type]}</span>
                  <span className={'detail-status ' + row.status}>{STATUS_NAMES[row.status]}</span>
                </>
              ) : null}
            </div>
            <h2 id="detailTitle">{row ? label(row.id) + ' · ' + row.name : ''}</h2>
          </div>

          <button
            id="close"
            className="modal-close"
            aria-label="작업 상세 닫기"
            title="닫기"
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
          <p>작업 정보는 읽기 전용 · 댓글은 UI 미리보기이며 파일에 저장되지 않습니다.</p>
        </div>
      </dialog>
    </>
  );
}
