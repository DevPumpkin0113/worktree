import { messages } from '../i18n/messages';
import type { ProjectTaskDraft } from '@worktree/core/task-editing';

export function creationTitle(kind: ProjectTaskDraft['type']) {
  return kind === 'epic'
    ? messages.newEpic
    : kind === 'milestone'
      ? messages.newMilestone
      : messages.newTask;
}

export function editingTitle(kind: ProjectTaskDraft['type']) {
  return kind === 'epic'
    ? messages.editEpic
    : kind === 'milestone'
      ? messages.editMilestone
      : messages.editTask;
}

export function fieldTitle(kind: ProjectTaskDraft['type']) {
  return kind === 'epic'
    ? messages.epicTitle
    : kind === 'milestone'
      ? messages.milestoneTitle
      : messages.taskName;
}
