import type { ProjectComment } from './comment-file';
import { ProjectValidationError, type ProjectSource } from './project-source';
import { readTaskFile } from './task-file';

export function commentLabel(comment: Pick<ProjectComment, 'number'>) {
  return '#' + String(comment.number).padStart(3, '0');
}

export function resolveCommentThreads(input: ProjectComment[], source: ProjectSource) {
  const comments = input
    .map((comment) => ({ ...comment }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const tasks = new Map<string, ProjectComment[]>();
  const fail = (comment: ProjectComment, field: keyof ProjectComment): never => {
    const file = `comments/${comment.taskId}/${comment.id}.md`;
    throw new ProjectValidationError(
      file,
      field,
      String(comment[field]),
      readTaskFile(file, source.files[file]).lines.get(field) ?? 0,
    );
  };
  for (const comment of comments) {
    const group = tasks.get(comment.taskId) ?? [];
    group.push(comment);
    tasks.set(comment.taskId, group);
  }
  for (const group of tasks.values()) {
    const numbers = new Set<number>();
    let next = 1;
    for (const comment of group) {
      if (!comment.number) continue;
      if (numbers.has(comment.number)) fail(comment, 'number');
      numbers.add(comment.number);
      next = Math.max(next, comment.number + 1);
    }
    for (const comment of group) {
      if (comment.number) continue;
      if (!Number.isSafeInteger(next)) fail(comment, 'number');
      comment.number = next++;
    }
    const byId = new Map(group.map((comment) => [comment.id, comment]));
    for (const comment of group) {
      if (!comment.rootId && !comment.replyTo) continue;
      const root = comment.rootId ? byId.get(comment.rootId) : undefined;
      const target = comment.replyTo ? byId.get(comment.replyTo) : undefined;
      if (!root || root.rootId || root.replyTo || root.id === comment.id) fail(comment, 'rootId');
      if (
        !target ||
        target.number >= comment.number ||
        (target.id !== root?.id && target.rootId !== root?.id)
      )
        fail(comment, 'replyTo');
    }
  }
  return comments;
}

export function commentThreads(comments: ProjectComment[]) {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const visible = new Set(
    comments.filter((comment) => !comment.deleted).map((comment) => comment.id),
  );
  const pending = [...visible];
  while (pending.length) {
    const comment = byId.get(pending.pop()!);
    for (const id of [comment?.rootId, comment?.replyTo]) {
      if (id && !visible.has(id) && byId.has(id)) {
        visible.add(id);
        pending.push(id);
      }
    }
  }
  return comments
    .filter((comment) => !comment.rootId && visible.has(comment.id))
    .sort((a, b) => a.number - b.number)
    .map((root) => ({
      root,
      replies: comments
        .filter((comment) => comment.rootId === root.id && visible.has(comment.id))
        .sort((a, b) => a.number - b.number),
    }));
}

export function hasCommentReplies(comments: ProjectComment[], id: string) {
  return comments.some((comment) => comment.rootId === id || comment.replyTo === id);
}
