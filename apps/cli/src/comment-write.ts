import { errorMessage } from './i18n/error-messages';
import fs from 'node:fs';
import { hasCommentReplies } from '@worktree/core/comment-thread';
import { saveProjectComment, deleteProjectComment } from '@worktree/core/comment-editing';
import { parseProject } from '@worktree/core/project-document';
import type { ProjectComment } from '@worktree/core/comment-file';
import type { Options } from './arguments';
import type { readProject } from './project-reader';
import { CliError } from './errors';
function commentId(comments: ProjectComment[], value: string | undefined) {
  const target = comments.find(
    (c) => c.id === value || '#' + String(c.number).padStart(3, '0') === value,
  );
  if (!target) throw new CliError('COMMENT_NOT_FOUND', errorMessage('commentNotFound', [value]));
  return target.id;
}
function author(explicit?: string) {
  if (explicit !== undefined) return explicit;
  const file = process.env.LOCALAPPDATA
    ? process.env.LOCALAPPDATA + '/Worktree/settings.json'
    : undefined;
  if (file && fs.existsSync(file)) {
    const settings = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      schemaVersion?: number;
      displayName?: string;
    };
    if (settings.schemaVersion !== 1 && settings.schemaVersion !== 2)
      throw new CliError('AUTHOR_REQUIRED', errorMessage('unsupportedAppSettingsPassAuthorName'));
    if (typeof settings.displayName === 'string' && settings.displayName.trim())
      return settings.displayName;
  }
  throw new CliError('AUTHOR_REQUIRED', errorMessage('configureTheAppDisplayNameOrPassAuthorName'));
}
export function planComment(options: Options, project: ReturnType<typeof readProject>) {
  const { model, snapshot } = project;
  const values = options.values;
  let id = options.id ?? '',
    text = snapshot;
  const target = model.rows.find((row) => row.id === id);
  const comments = model.comments?.filter((c) => c.taskId === id) ?? [];
  if (!target || target.milestone)
    throw new CliError('TASK_NOT_FOUND', errorMessage('taskNotFound', [id]));
  if (options.command === 'comment-add') {
    const before = new Set(comments.map((c) => c.id));
    text = saveProjectComment(
      snapshot,
      id,
      author(values.author),
      values.text ?? '',
      undefined,
      undefined,
      values['reply-to'] ? commentId(comments, values['reply-to']) : undefined,
    );
    id = parseProject(text).comments!.find((c) => c.taskId === options.id && !before.has(c.id))!.id;
  } else {
    const comment = commentId(comments, options.commentId);
    if (options.command === 'comment-delete') {
      if (!options.yes && !options.dryRun)
        throw new CliError('CONFIRMATION_REQUIRED', errorMessage('passYesToDelete'));
      text = deleteProjectComment(snapshot, id, comment);
    } else {
      if (hasCommentReplies(comments, comment))
        throw new CliError('COMMENT_HAS_REPLIES', errorMessage('cannotEditACommentWithReplies'));
      text = saveProjectComment(snapshot, id, '', values.text ?? '', comment);
    }
    id = comment;
  }
  return { id, text };
}
