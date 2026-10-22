import { hasCommentReplies } from './comment-thread';
import { messages } from '../i18n/messages';
import { parseProject } from './project-document';
import { readSource, serializeSource } from './project-source';
import { readTaskFile } from './task-file';
import type { ProjectComment } from './comment-file';
import type { ProjectSource } from './project-source';
import { commentPath, writeCommentFile } from './comment-file';

export function saveProjectComment(
  text: string,
  taskId: string,
  author: string,
  content: string,
  existingId?: string,
  now = new Date().toISOString(),
  replyTo?: string,
) {
  const model = parseProject(text);
  if (!model.rows.some((row) => row.id === taskId)) throw Error(messages.editTaskMissing);
  const id = existingId ?? crypto.randomUUID();
  const source = readSource(text),
    file = commentPath(taskId, id);
  const previous = model.comments?.find(
    (comment) => comment.id === id && comment.taskId === taskId,
  );
  if (existingId && (!previous || previous.deleted)) throw Error(messages.commentMissing);
  const comments = model.comments?.filter((comment) => comment.taskId === taskId) ?? [];
  if (existingId && hasCommentReplies(comments, existingId))
    throw Error(messages.commentEditHasReplies);
  const target = replyTo
    ? comments.find((comment) => comment.id === replyTo && !comment.deleted)
    : undefined;
  if (replyTo && !target) throw Error(messages.commentMissing);
  persistNumbers(source, comments);
  source.files[file] = writeCommentFile(
    {
      id,
      number: previous?.number ?? Math.max(0, ...comments.map((comment) => comment.number)) + 1,
      ...(previous?.rootId
        ? { rootId: previous.rootId, replyTo: previous.replyTo }
        : !previous && target
          ? { rootId: target.rootId ?? target.id, replyTo: target.id }
          : {}),
      taskId,
      author: previous?.author ?? author.trim(),
      text: content.trim(),
      createdAt: previous?.createdAt ?? now,
      updatedAt: previous && previous.updatedAt > now ? previous.updatedAt : now,
    },
    source.files[file],
  );
  const result = serializeSource(source);
  parseProject(result);
  return result;
}
export function deleteProjectComment(text: string, taskId: string, id: string) {
  const model = parseProject(text),
    source = readSource(text);
  const comment = model.comments?.find(
    (comment) => comment.taskId === taskId && comment.id === id && !comment.deleted,
  );
  if (!comment) throw Error(messages.commentMissing);
  persistNumbers(source, model.comments?.filter((item) => item.taskId === taskId) ?? []);
  const file = commentPath(taskId, id);
  const now = new Date().toISOString();
  source.files[file] = writeCommentFile(
    {
      ...comment,
      text: '',
      deleted: true,
      updatedAt: comment.updatedAt > now ? comment.updatedAt : now,
    },
    source.files[file],
  );
  const result = serializeSource(source);
  parseProject(result);
  return result;
}

function persistNumbers(source: ProjectSource, comments: ProjectComment[]) {
  for (const comment of comments) {
    const file = commentPath(comment.taskId, comment.id);
    if (readTaskFile(file, source.files[file]).metadata.number === undefined)
      source.files[file] = writeCommentFile(comment, source.files[file]);
  }
}
