import { MAX_RECENT_FILES, MAX_SESSION_TABS, type Session } from '../platform/session-storage';
import type { WorkspaceSnapshot } from './types';
export function projectSession(state: WorkspaceSnapshot): Session {
  const required = new Set(
    state.projects.flatMap((project) => (project.activePath ? [project.activePath] : [])),
  );
  const owned = state.documents.filter((doc) =>
    state.projects.some((project) => project.files.includes(doc.path)),
  );
  const documents = [
    ...owned.filter((doc) => required.has(doc.path)),
    ...(required.size < MAX_SESSION_TABS
      ? owned.filter((doc) => !required.has(doc.path)).slice(-(MAX_SESSION_TABS - required.size))
      : []),
  ].slice(0, MAX_SESSION_TABS);
  return {
    schemaVersion: 2,
    recentFiles: [],
    tabs: documents.map(({ path, view, ganttUnit, taskTabs, activeTaskTab }) => ({
      path,
      view,
      ganttUnit,
      taskTabs: [...(taskTabs ?? [])],
      activeTaskTab: activeTaskTab ?? null,
    })),
    activePath: state.activePath,
    projects: state.projects.map(({ path, activePath }) => ({ path, activePath })),
    activeProjectPath: state.activeProjectPath,
    recentProjects: state.recent.slice(0, MAX_RECENT_FILES),
  };
}
