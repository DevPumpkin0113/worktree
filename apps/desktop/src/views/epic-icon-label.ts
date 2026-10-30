import {
  DEFAULT_EPIC_EMOJI,
  EPIC_ICON_EMOJIS,
  type EpicIcon,
  type LegacyEpicIcon,
} from '@worktree/core/epic-icons';
import { messages } from '../i18n/messages';

export function epicIconLabel(icon: EpicIcon): string {
  const labels: Record<string, string> = {
    layers: messages.epicIconLayers,
    folder: messages.epicIconFolder,
    desktop: messages.epicIconDesktop,
    terminal: messages.epicIconTerminal,
    tools: messages.epicIconTools,
    rocket: messages.epicIconRocket,
  };
  return Object.hasOwn(labels, icon) ? labels[icon] : icon;
}
export function epicIconEmoji(icon?: EpicIcon): string {
  if (icon === undefined) return DEFAULT_EPIC_EMOJI;
  return Object.hasOwn(EPIC_ICON_EMOJIS, icon) ? EPIC_ICON_EMOJIS[icon as LegacyEpicIcon] : icon;
}
