import { useEffect, useState } from 'react';
import type { OpenDocument } from '../app/types';
import type { TaskEditorSession } from '../components/task-detail/TaskEditor';

export function useTaskEditSessions(documents: OpenDocument[]) {
  const [sessions, setSessions] = useState<TaskEditorSession[]>([]);
  useEffect(() => {
    setSessions((current) => {
      const next = current.filter((session) => documents.some((doc) => doc.path === session.path));
      return next.length === current.length ? current : next;
    });
  }, [documents]);
  return {
    sessions,
    open: (session: TaskEditorSession) =>
      setSessions((current) =>
        current.some((item) => item.path === session.path && item.id === session.id)
          ? current
          : [...current, session],
      ),
    closeTask: (path: string, id: string) =>
      setSessions((current) =>
        current.filter((session) => session.path !== path || session.id !== id),
      ),
    close: (session: TaskEditorSession) =>
      setSessions((current) => current.filter((item) => item !== session)),
  };
}
