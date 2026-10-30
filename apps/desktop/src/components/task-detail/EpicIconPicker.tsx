import { EPIC_ICONS, isLucideEpicIcon, type EpicIcon } from '@worktree/core/epic-icons';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { messages } from '../../i18n/messages';
import { useFloatingList } from '../../hooks/use-floating-list';
import { WorkGroupIcon } from '../shared/WorkGroupIcon';
import { EpicLucideCatalog } from './EpicLucideCatalog';
import { TaskEditorIconRequestContext } from './task-editor-title-context';
import { TaskFieldErrorsContext } from './TaskFieldError';

const PICKER_MAX_HEIGHT = 460;
export function EpicIconPicker({
  value,
  color,
  onColorChange,
  disabled,
  onChange,
}: {
  value?: EpicIcon;
  color?: string;
  onColorChange: (color: string) => void;
  disabled: boolean;
  onChange: (icon: EpicIcon) => void;
}) {
  const errors = useContext(TaskFieldErrorsContext);
  const request = useContext(TaskEditorIconRequestContext);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'icons' | 'emoji'>(() =>
    value && !isLucideEpicIcon(value) && !(EPIC_ICONS as readonly string[]).includes(value)
      ? 'emoji'
      : 'icons',
  );
  const [Catalog, setCatalog] = useState<ComponentType<{
    onSelect: (emoji: string) => void;
  }> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const expanded = open && !disabled;
  const position = useFloatingList(
    expanded,
    trigger,
    popup,
    tab === 'icons' ? 1 : 2,
    true,
    'below',
    PICKER_MAX_HEIGHT,
  );
  useEffect(() => {
    if (request?.requested && !disabled) {
      setOpen(true);
      request.consume();
    }
  }, [request, disabled]);
  useEffect(() => {
    if (!expanded || tab !== 'emoji' || Catalog) return;
    let active = true;
    setLoadError(false);
    void import('./EpicEmojiCatalog')
      .then((module) => {
        if (active) setCatalog(() => module.default);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [expanded, tab, Catalog]);
  useLayoutEffect(() => {
    if (expanded)
      popup.current?.querySelector<HTMLInputElement>('input:not([type="color"])')?.focus();
  }, [expanded, Catalog]);
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [expanded]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const choose = (icon: string) => {
    onChange(icon);
  };
  return (
    <div
      id="taskEditor-icon"
      className="epic-icon-picker"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && expanded) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <button
        id="epicIconOpen"
        className="epic-icon-trigger"
        ref={trigger}
        type="button"
        disabled={disabled}
        title={messages.chooseEpicIcon}
        aria-label={messages.chooseEpicIcon}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={expanded ? 'epicIconPopup' : undefined}
        aria-invalid={!!errors.icon}
        aria-describedby={errors.icon ? 'taskEditor-icon-error' : undefined}
        onClick={() => setOpen(!expanded)}
      >
        <WorkGroupIcon epic icon={value} iconColor={color} />
      </button>
      {expanded ? (
        <div
          id="epicIconPopup"
          className="filter-options epic-icon-popup"
          ref={popup}
          popover="manual"
          role="dialog"
          aria-label={messages.chooseEpicIcon}
          style={position}
        >
          <div className="epic-icon-tabs" role="tablist" aria-label={messages.iconPickerTabs}>
            {(['icons', 'emoji'] as const).map((kind) => (
              <button
                type="button"
                role="tab"
                key={kind}
                id={'epicPickerTab-' + kind}
                aria-controls="epicPickerPanel"
                aria-selected={tab === kind}
                tabIndex={tab === kind ? 0 : -1}
                onClick={() => setTab(kind)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'ArrowLeft' ||
                    event.key === 'ArrowRight' ||
                    event.key === 'Home' ||
                    event.key === 'End'
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    const next =
                      event.key === 'Home'
                        ? 'icons'
                        : event.key === 'End'
                          ? 'emoji'
                          : tab === 'icons'
                            ? 'emoji'
                            : 'icons';
                    setTab(next);
                    document.getElementById('epicPickerTab-' + next)?.focus();
                  }
                }}
              >
                {kind === 'icons' ? messages.iconsTab : messages.emojisTab}
              </button>
            ))}
          </div>
          <div id="epicPickerPanel" role="tabpanel" aria-labelledby={'epicPickerTab-' + tab}>
            {tab === 'icons' ? (
              <EpicLucideCatalog
                value={value}
                color={color}
                onColorChange={onColorChange}
                onSelect={choose}
              />
            ) : (
              <>
                {Catalog ? (
                  <Catalog onSelect={choose} />
                ) : (
                  <p role={loadError ? 'alert' : 'status'}>
                    {loadError ? messages.emojiLoadFailed : messages.emojiLoading}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
