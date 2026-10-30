import {
  DEFAULT_EPIC_ICON,
  isEpicIcon,
  lucideEpicIconName,
  type EpicIcon,
} from '@worktree/core/epic-icons';
import { messages } from '../../i18n/messages';
import { epicIconEmoji, epicIconLabel } from '../../views/epic-icon-label';
import { Icon } from './Icon';
import { LucideEpicIcon, lucideIconLabel } from './LucideEpicIcon';

export function WorkGroupIcon({
  epic = false,
  icon,
  iconColor,
}: {
  epic?: boolean;
  icon?: EpicIcon;
  iconColor?: string;
}) {
  const selected = isEpicIcon(icon) ? icon : DEFAULT_EPIC_ICON;
  const lucide = lucideEpicIconName(selected);
  const label = epic
    ? messages.epic + ' · ' + (lucide ? lucideIconLabel(lucide) : epicIconLabel(selected))
    : messages.milestone;
  return (
    <span
      className="work-group-icon"
      style={
        epic && lucide && /^#[0-9a-f]{6}$/i.test(iconColor ?? '') ? { color: iconColor } : undefined
      }
      role="img"
      aria-label={label}
      title={label}
      data-epic-icon={epic ? selected : undefined}
      data-milestone-icon={epic ? undefined : 'diamond'}
    >
      {epic && lucide ? (
        <LucideEpicIcon name={lucide} />
      ) : epic ? (
        <span className="work-group-emoji" aria-hidden="true">
          {epicIconEmoji(selected)}
        </span>
      ) : (
        <Icon name="milestone-diamond" />
      )}
    </span>
  );
}
