import { messages } from '../i18n/messages';
import type { Platform, View } from '../app/types';
import { parentFolder, pathKey, withinProject } from '../domain/project-paths';
export interface Session {
  schemaVersion: 2;
  recentFiles: string[];
  tabs: { path: string; view: View; ganttUnit: 'day' | 'week' }[];
  activePath: string | null;
  projects: { path: string; activePath: string | null }[];
  activeProjectPath: string | null;
  recentProjects: string[];
}
export const MAX_RECENT_FILES = 12;
export const MAX_SESSION_TABS = 40;
export const emptySession = (): Session => ({
  schemaVersion: 2,
  recentFiles: [],
  tabs: [],
  activePath: null,
  projects: [],
  activeProjectPath: null,
  recentProjects: [],
});
const validFolder = (path: unknown): path is string =>
  typeof path === 'string' &&
  path.length > 0 &&
  path.length <= 32767 &&
  !path.includes('\0') &&
  /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(path) &&
  !path.split(/[\\/]/).includes('..');
const validPath = (path: unknown): path is string =>
  validFolder(path) && /\.(?:wbs|md|markdown|json)$/i.test(path);
const unique = (paths: string[]) => new Set(paths.map(pathKey)).size === paths.length;

export function validateSession(input: unknown): Session {
  const value = input as Session & { schemaVersion: number };
  if (
    !value ||
    ![1, 2].includes(value.schemaVersion) ||
    !Array.isArray(value.recentFiles) ||
    !Array.isArray(value.tabs) ||
    value.recentFiles.length > MAX_RECENT_FILES ||
    value.tabs.length > MAX_SESSION_TABS ||
    !value.recentFiles.every(validPath) ||
    !value.tabs.every(
      (tab) =>
        tab &&
        validPath(tab.path) &&
        ['tree', 'board', 'flow', 'gantt'].includes(tab.view) &&
        ['day', 'week'].includes(tab.ganttUnit),
    ) ||
    !unique(value.recentFiles) ||
    !unique(value.tabs.map((tab) => tab.path)) ||
    !(value.activePath === null || value.tabs.some((tab) => tab.path === value.activePath))
  )
    throw Error(messages.invalidSession);
  let projects = value.projects,
    recentProjects = value.recentProjects,
    activeProjectPath = value.activeProjectPath;
  if (Number(value.schemaVersion) === 1) {
    projects = [];
    for (const tab of value.tabs) {
      const path = parentFolder(tab.path);
      let project = projects.find((project) => pathKey(project.path) === pathKey(path));
      if (!project) {
        project = { path, activePath: tab.path };
        projects.push(project);
      }
      if (tab.path === value.activePath) project.activePath = tab.path;
    }
    activeProjectPath = value.activePath
      ? (projects.find(
          (project) => pathKey(parentFolder(value.activePath!)) === pathKey(project.path),
        )?.path ?? null)
      : (projects.at(-1)?.path ?? null);
    recentProjects = [
      ...new Map(
        value.recentFiles.map((file) => [pathKey(parentFolder(file)), parentFolder(file)]),
      ).values(),
    ];
  }
  if (
    !Array.isArray(projects) ||
    projects.length > MAX_SESSION_TABS ||
    !projects.every(
      (project) =>
        project &&
        validFolder(project.path) &&
        (project.activePath === null ||
          (validPath(project.activePath) &&
            withinProject(project.activePath, project.path) &&
            value.tabs.some((tab) => tab.path === project.activePath))),
    ) ||
    !unique(projects.map((project) => project.path)) ||
    !Array.isArray(recentProjects) ||
    recentProjects.length > MAX_RECENT_FILES ||
    !recentProjects.every(validFolder) ||
    !unique(recentProjects) ||
    !(
      activeProjectPath === null || projects.some((project) => project.path === activeProjectPath)
    ) ||
    value.tabs.some((tab) => !projects.some((project) => withinProject(tab.path, project.path))) ||
    (value.activePath !== null &&
      !projects.some(
        (project) => project.path === activeProjectPath && project.activePath === value.activePath,
      ))
  )
    throw Error(messages.invalidSession);
  return {
    schemaVersion: 2,
    recentFiles: [...value.recentFiles],
    tabs: value.tabs.map((tab) => ({ ...tab })),
    activePath: value.activePath,
    projects: projects.map((project) => ({ ...project })),
    recentProjects: [...recentProjects],
    activeProjectPath,
  };
}

export function createSessionStorage(invoke: Platform['invoke']) {
  let queue: Promise<unknown> = Promise.resolve(),
    failed = false;
  return {
    async load() {
      try {
        return validateSession(await invoke('load_session'));
      } catch (error) {
        failed = true;
        throw error;
      }
    },
    save(value: Session) {
      if (failed) return Promise.resolve(false);
      const snapshot = validateSession(value);
      const operation = queue
        .catch(() => {})
        .then(() => invoke('save_session', { session: snapshot }));
      queue = operation;
      return operation.then(() => true);
    },
  };
}
