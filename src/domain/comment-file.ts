import { validDisplayName } from './display-name';
import { ProjectValidationError, type ProjectSource } from './project-source';
import { readTaskFile, writeTaskFile } from './task-file';
import { resolveCommentThreads } from './comment-thread';

export const MAX_COMMENT_LENGTH = 2000;
const COMMENT_PATH =
  /^comments\/([A-Z]{1,20}\d{3,})\/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})\.md$/;
export interface ProjectComment {
  id: string;
  number: number;
  taskId: string;
  author: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  rootId?: string;
  replyTo?: string;
  deleted?: boolean;
}
export function commentPath(taskId: string, id: string) {
  const file = `comments/${taskId}/${id}.md`;
  if (!COMMENT_PATH.test(file)) throw new ProjectValidationError(file, 'filename', file);
  return file;
}
export function readCommentFile(file: string, text: string): ProjectComment {
  if (typeof text !== 'string') throw new ProjectValidationError(file, 'content', String(text));
  const path = COMMENT_PATH.exec(file);
  if (!path) throw new ProjectValidationError(file, 'filename', file);
  const { metadata, description, lines } = readTaskFile(file, text);
  const fail = (key: string): never => {
    throw new ProjectValidationError(
      file,
      key,
      JSON.stringify(metadata[key]) ?? '',
      lines.get(key) ?? 0,
    );
  };
  if (metadata.schemaVersion !== 1) fail('schemaVersion');
  if (metadata.taskId !== path[1]) fail('taskId');
  if (metadata.id !== path[2]) fail('id');
  if (
    metadata.number !== undefined &&
    (!Number.isSafeInteger(metadata.number) || Number(metadata.number) < 1)
  )
    fail('number');
  for (const key of ['rootId', 'replyTo']) {
    if (
      metadata[key] !== undefined &&
      (typeof metadata[key] !== 'string' ||
        !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(metadata[key] as string))
    )
      fail(key);
  }
  if (metadata.deleted !== undefined && typeof metadata.deleted !== 'boolean') fail('deleted');
  if (!validDisplayName(metadata.author)) fail('author');
  for (const key of ['createdAt', 'updatedAt']) {
    const value = metadata[key];
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value
    )
      fail(key);
  }
  if (String(metadata.updatedAt) < String(metadata.createdAt)) fail('updatedAt');
  if (
    metadata.deleted
      ? description.trim() !== ''
      : !description.trim() || description.length > MAX_COMMENT_LENGTH
  ) {
    throw new ProjectValidationError(file, 'content', description);
  }
  return {
    id: path[2],
    number: metadata.number === undefined ? 0 : Number(metadata.number),
    taskId: path[1],
    author: metadata.author as string,
    text: description,
    createdAt: metadata.createdAt as string,
    updatedAt: metadata.updatedAt as string,
    ...(metadata.rootId !== undefined ? { rootId: metadata.rootId as string } : {}),
    ...(metadata.replyTo !== undefined ? { replyTo: metadata.replyTo as string } : {}),
    ...(metadata.deleted ? { deleted: true } : {}),
  };
}
export function writeCommentFile(comment: ProjectComment, original?: string) {
  const file = commentPath(comment.taskId, comment.id);
  const metadata = original ? readTaskFile(file, original).metadata : {};
  const { text, ...fields } = comment;
  const result = writeTaskFile({ ...metadata, schemaVersion: 1, ...fields }, text);
  readCommentFile(file, result);
  return result;
}
export function readProjectComments(source: ProjectSource, taskIds: Set<string>) {
  const comments: ProjectComment[] = [];
  for (const [file, text] of Object.entries(source.files)) {
    if (!file.startsWith('comments/')) continue;
    const comment = readCommentFile(file, text);
    if (!taskIds.has(comment.taskId))
      throw new ProjectValidationError(
        file,
        'taskId',
        comment.taskId,
        readTaskFile(file, text).lines.get('taskId') ?? 0,
      );
    comments.push(comment);
  }
  return resolveCommentThreads(comments, source);
}
