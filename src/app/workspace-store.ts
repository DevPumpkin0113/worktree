import { saveProjectComment, deleteProjectComment } from '../domain/comment-editing';
import {
  projectRuleValues,
  type ProjectInitializationDraft,
} from '../domain/project-initialization';
import { updateProjectSettings, type ProjectSettingsDraft } from '../domain/project-settings';
import { deleteProjectTask } from '../domain/task-deletion';
import type { DeleteOptions } from '../domain/task-deletion';
import { updateProjectTask, type ProjectTaskDraft } from '../domain/task-editing';
import { serializeSource, readSource } from '../domain/project-source';
import { parseProject } from '../domain/project-document';
import { pathKey, folderName } from '../domain/project-paths';
import { projectSession } from './project-session';
import type { Session } from '../platform/session-storage';
import { messages, setLanguage, isLanguage } from '../i18n/messages';
import { ko } from '../i18n/ko';
import { readDetailMode, saveDetailMode } from '../domain/detail-settings';
import { describeDocumentErrors } from '../domain/document-errors';
import { createSettingsStorage } from '../platform/settings-storage';
import {
  createSessionStorage,
  emptySession,
  MAX_RECENT_FILES,
  MAX_SESSION_TABS,
} from '../platform/session-storage';
import { reorderDocumentTabs } from '../interactions/document-tabs';
import type {
  OpenDocument,
  OpenProject,
  ScannedProject,
  Page,
  Platform,
  Problem,
  SettingsStorage,
  View,
  WorkModel,
  WorkspaceSnapshot,
} from './types';

export class WorkspaceStore {
  private state: WorkspaceSnapshot = {
    projects: [],
    activeProjectPath: null,
    documents: [],
    activePath: null,
    recent: [],
    ready: false,
    page: 'board',
    query: '',
    owner: 'all',
    status: 'all',
    selectedId: null,
    settingsOpen: false,
    problemsOpen: false,
    operationProblems: [],
    settings: {
      language: 'ko',
      displayName: '',
      detailMode: 'sidebar',
      ready: false,
      error: '',
      saving: false,
    },
  };
  private listeners = new Set<() => void>();
  private initialized: Promise<void> | null = null;
  private polling = false;
  private openRevision = 0;
  private session;
  readonly storage: SettingsStorage;
  constructor(
    readonly platform: Platform,
    legacyStorage: () => Storage = () => window.localStorage,
  ) {
    this.storage = createSettingsStorage({
      invoke: platform.invoke.bind(platform),
      legacyStorage,
    });
    this.session = createSessionStorage(platform.invoke.bind(platform));
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private patch(change: Partial<WorkspaceSnapshot>) {
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener();
  }
  get active() {
    return this.state.documents.find((doc) => doc.path === this.state.activePath) ?? null;
  }
  get activeProject() {
    return (
      this.state.projects.find((project) => project.path === this.state.activeProjectPath) ?? null
    );
  }
  get problems() {
    return [...(this.active?.problems ?? []), ...this.state.operationProblems];
  }
  report(error: unknown, path = '', kind = ko.appError) {
    this.patch({ operationProblems: describeDocumentErrors(error, '', path, kind) as Problem[] });
  }
  initialize() {
    return (this.initialized ??= (async () => {
      await Promise.all([this.initializeSettings(), this.restoreSession()]);
    })());
  }
  private async initializeSettings() {
    try {
      await this.storage.ready;
      const savedLanguage = this.storage.getItem('worktree.language') ?? 'ko';
      const language = isLanguage(savedLanguage) ? savedLanguage : 'ko';
      setLanguage(language);
      this.patch({
        settings: {
          language,
          displayName: this.storage.getItem('worktree.display-name') ?? '',
          detailMode: readDetailMode(this.storage),
          ready: true,
          error: this.storage.warning,
          saving: false,
        },
      });
    } catch (error) {
      this.patch({
        settings: {
          ...this.state.settings,
          error: messages.settingsLoadFailedPrefix + String(error),
        },
      });
    }
  }
  private document(path: string, text: string, previous?: OpenDocument): OpenDocument {
    try {
      text = serializeSource(readSource(text));
      const model = parseProject(text);
      return {
        path,
        text,
        model,
        problems: [],
        view: previous?.view ?? 'tree',
        ganttUnit: previous?.ganttUnit ?? 'day',
        graphFocus: model.rows.some((row) => row.id === previous?.graphFocus)
          ? previous!.graphFocus
          : null,
      };
    } catch (error) {
      return {
        path,
        text,
        model: null,
        problems: describeDocumentErrors(error, text, path) as Problem[],
        view: previous?.view ?? 'tree',
        ganttUnit: previous?.ganttUnit ?? 'day',
        graphFocus: previous?.graphFocus ?? null,
      };
    }
  }
  private async restoreSession() {
    let saved: Session = emptySession();
    const failures: Problem[] = [];
    try {
      saved = await this.session.load();
    } catch (error) {
      failures.push(...(describeDocumentErrors(error, '', '', ko.sessionReadError) as Problem[]));
    }
    const documents: OpenDocument[] = [];
    const projects: OpenProject[] = [];
    for (const savedProject of saved.projects) {
      try {
        const scanned = await this.platform.invoke<ScannedProject>('scan_project', {
          path: savedProject.path,
        });
        if (projects.some((project) => pathKey(project.path) === pathKey(scanned.path))) continue;
        const project: OpenProject = {
          path: scanned.path,
          files: scanned.files,
          activePath: null,
          page: 'board',
        };
        for (const tab of saved.tabs.filter((tab) =>
          scanned.files.some((file) => pathKey(file) === pathKey(tab.path)),
        )) {
          if (documents.some((doc) => pathKey(doc.path) === pathKey(tab.path))) continue;
          try {
            const path = scanned.files.find((file) => pathKey(file) === pathKey(tab.path))!;
            const text = await this.platform.invoke<string>('read_project', { path });
            documents.push(this.document(path, text, { ...tab } as OpenDocument));
          } catch (error) {
            failures.push(...describeDocumentErrors(error, '', tab.path, ko.fileReadError));
          }
        }
        const selected =
          scanned.files.find((file) => pathKey(file) === pathKey(savedProject.activePath ?? '')) ??
          scanned.files[0];
        if (selected) {
          let document = documents.find((doc) => doc.path === selected);
          if (!document) {
            try {
              document = this.document(
                selected,
                await this.platform.invoke<string>('read_project', { path: selected }),
              );
              documents.push(document);
            } catch (error) {
              failures.push(...describeDocumentErrors(error, '', selected, ko.fileReadError));
            }
          }
          project.activePath = document?.path ?? null;
        }
        projects.push(project);
      } catch (error) {
        failures.push(...describeDocumentErrors(error, '', savedProject.path, ko.projectReadError));
      }
    }
    const project =
      projects.find(
        (project) => pathKey(project.path) === pathKey(saved.activeProjectPath ?? ''),
      ) ?? projects.at(-1);
    this.patch({
      projects,
      documents,
      activeProjectPath: project?.path ?? null,
      activePath: project?.activePath ?? null,
      recent: saved.recentProjects,
      ready: true,
      operationProblems: failures,
    });
    this.title();
    await this.poll();
  }
  private title() {
    this.platform.setTitle(
      this.activeProject
        ? (this.active?.model?.title ?? folderName(this.activeProject.path))
        : 'Worktree',
    );
  }
  private saveSession() {
    if (!this.state.ready) return;
    void this.session
      .save(projectSession(this.state))
      .catch((error: unknown) => this.report(error, '', ko.sessionSaveError));
  }
  async open(path: string) {
    const revision = ++this.openRevision;
    try {
      const scanned = await this.platform.invoke<ScannedProject>('scan_project', { path });
      if (revision !== this.openRevision) return;
      const previous = this.state.projects.find(
        (project) => pathKey(project.path) === pathKey(scanned.path),
      );
      if (!previous && this.state.projects.length >= MAX_SESSION_TABS)
        throw Error(messages.projectTabLimit);
      const selected =
        scanned.selectedPath ??
        scanned.files.find((file) => pathKey(file) === pathKey(previous?.activePath ?? '')) ??
        scanned.files[0] ??
        null;
      const project: OpenProject = {
        path: scanned.path,
        files: scanned.files,
        activePath: null,
        page: 'board',
      };
      let document: OpenDocument | undefined;
      let errors: Problem[] = [];
      if (selected) {
        try {
          document = this.document(
            selected,
            await this.platform.invoke<string>('read_project', { path: selected }),
            this.state.documents.find((doc) => doc.path === selected),
          );
        } catch (error) {
          errors = describeDocumentErrors(error, '', selected, ko.fileReadError);
        }
      }
      if (revision !== this.openRevision) return;
      project.activePath = document?.path ?? null;
      project.page =
        this.state.projects.find((item) => pathKey(item.path) === pathKey(project.path))?.page ??
        'board';
      const same = project.activePath === this.state.activePath;
      this.patch({
        projects: previous
          ? this.state.projects.map((item) =>
              pathKey(item.path) === pathKey(project.path) ? project : item,
            )
          : [...this.state.projects, project],
        documents: document
          ? [...this.state.documents.filter((doc) => doc.path !== document.path), document]
          : this.state.documents,
        activeProjectPath: project.path,
        page: project.page,
        activePath: project.activePath,
        selectedId: same ? this.validSelection(document?.model ?? null) : null,
        owner: same ? this.state.owner : 'all',
        recent: [
          project.path,
          ...this.state.recent.filter((item) => pathKey(item) !== pathKey(project.path)),
        ].slice(0, MAX_RECENT_FILES),
        operationProblems: errors,
        problemsOpen: false,
      });
      this.title();
      this.saveSession();
    } catch (error) {
      if (revision === this.openRevision) this.report(error, path, ko.projectReadError);
    }
  }
  async pick() {
    try {
      const path = await this.platform.invoke<string | null>('pick_project');
      if (path) await this.open(path);
    } catch (error) {
      this.report(error);
    }
  }
  async initializeProject(draft: ProjectInitializationDraft) {
    const project = this.activeProject;
    if (!project) return;
    await this.platform.invoke('initialize_project', {
      path: project.path,
      name: draft.name,
      dataDirectory: draft.directory,
      taskPrefix: draft.prefix,
      useEffort: draft.useEffort,
      idSeparator: draft.idSeparator,
      rules: {
        dateFormat: draft.dateFormat,
        timeFormat: draft.timeFormat,
        taskTypes: projectRuleValues(draft.taskTypes),
        taskTypeColors: draft.taskTypeColors,
        priorities: draft.priorities,
        assignees: projectRuleValues(draft.assignees),
        labels: projectRuleValues(draft.labels),
      },
    });
    if (this.state.activeProjectPath === project.path) await this.open(project.path);
  }
  async resetProject(path: string, expected: string, confirmation: string) {
    const project = this.state.projects.find((item) => item.path === path);
    if (!project) throw Error(messages.documentUnavailable);
    const result = await this.platform.invoke<'reset' | 'conflict'>('reset_project', {
      path,
      expected,
      confirmation,
    });
    if (result === 'conflict') throw Error(messages.projectResetConflict);
    if (result !== 'reset') throw Error(messages.invalidUpdateResponse);
    ++this.openRevision;
    const active = this.state.activeProjectPath === path;
    this.patch({
      projects: this.state.projects.map((item) =>
        item.path === path ? { ...item, files: [], activePath: null, page: 'initialize' } : item,
      ),
      documents: this.state.documents.filter((doc) => !project.files.includes(doc.path)),
      ...(active
        ? {
            activePath: null,
            page: 'initialize',
            selectedId: null,
            owner: 'all',
            query: '',
            status: 'all',
            operationProblems: [],
            problemsOpen: false,
          }
        : {}),
    });
    this.title();
    this.saveSession();
  }
  selectProject(path: string) {
    return this.open(path);
  }
  closeProject(path: string) {
    ++this.openRevision;
    const projects = this.state.projects.filter((project) => project.path !== path);
    const changed = path === this.state.activeProjectPath;
    const selected = changed ? projects.at(-1) : this.activeProject;
    this.patch({
      projects,
      documents: this.state.documents.filter((doc) =>
        projects.some((project) => project.files.includes(doc.path)),
      ),
      ...(changed
        ? {
            activeProjectPath: selected?.path ?? null,
            activePath: selected?.activePath ?? null,
            page: selected?.page ?? 'board',
            selectedId: null,
            owner: 'all',
            operationProblems: [],
            problemsOpen: false,
          }
        : {}),
    });
    this.title();
    this.saveSession();
  }
  reorder(source: string, target: string, after: boolean) {
    const paths = reorderDocumentTabs(
      this.state.projects.map((project) => project.path),
      source,
      target,
      after,
    );
    this.patch({
      projects: paths.map((path) => this.state.projects.find((project) => project.path === path)!),
    });
    this.saveSession();
  }
  async refreshProject() {
    if (this.activeProject) await this.open(this.activeProject.path);
  }
  setView(view: View) {
    this.patch({
      documents: this.state.documents.map((doc) =>
        doc.path === this.state.activePath ? { ...doc, view } : doc,
      ),
    });
    this.saveSession();
  }
  setGraphFocus(graphFocus: string | null) {
    this.patch({
      documents: this.state.documents.map((doc) =>
        doc.path === this.state.activePath ? { ...doc, graphFocus } : doc,
      ),
    });
  }
  setGanttUnit(ganttUnit: 'day' | 'week') {
    this.patch({
      documents: this.state.documents.map((doc) =>
        doc.path === this.state.activePath ? { ...doc, ganttUnit } : doc,
      ),
    });
    this.saveSession();
  }
  setPage(page: Page) {
    this.patch({
      page,
      selectedId: null,
      projects: this.state.projects.map((project) =>
        project.path === this.state.activeProjectPath ? { ...project, page } : project,
      ),
    });
  }
  setFilters(filters: Partial<Pick<WorkspaceSnapshot, 'query' | 'owner' | 'status'>>) {
    this.patch(filters);
  }
  selectWork(selectedId: string | null) {
    if (selectedId && !this.active?.model?.rows.some((row) => row.id === selectedId)) return;
    this.patch({ selectedId });
  }
  toggleSettings() {
    this.patch({ settingsOpen: !this.state.settingsOpen });
  }
  closeSettings() {
    this.patch({ settingsOpen: false });
  }
  toggleProblems() {
    this.patch({ problemsOpen: !this.state.problemsOpen });
  }
  closeProblems() {
    this.patch({ problemsOpen: false });
  }
  private validSelection(model: WorkModel | null) {
    return model?.rows.some((row) => row.id === this.state.selectedId)
      ? this.state.selectedId
      : null;
  }
  async saveProjectSettings(path: string, expected: string, draft: ProjectSettingsDraft) {
    const text = updateProjectSettings(expected, draft);
    await this.saveProjectSource(path, expected, text, null, messages.projectSettingsConflict);
    this.title();
    return text;
  }
  async saveTask(path: string, expected: string, draft: ProjectTaskDraft, id?: string) {
    const update = updateProjectTask(expected, draft, id);
    await this.saveProjectSource(path, expected, update.text, update.id);
    return update.id;
  }
  async saveComment(
    path: string,
    expected: string,
    taskId: string,
    content: string,
    id?: string,
    replyTo?: string,
  ) {
    const text = saveProjectComment(
      expected,
      taskId,
      this.state.settings.displayName,
      content,
      id,
      undefined,
      replyTo,
    );
    await this.saveProjectSource(path, expected, text, taskId, messages.commentConflict);
  }
  async deleteComment(path: string, expected: string, taskId: string, id: string) {
    const text = deleteProjectComment(expected, taskId, id);
    await this.saveProjectSource(path, expected, text, taskId, messages.commentConflict);
  }
  async deleteTask(path: string, expected: string, id: string, options: DeleteOptions) {
    const text = deleteProjectTask(expected, id, options);
    await this.saveProjectSource(path, expected, text, null, messages.deleteConflict);
  }
  private async saveProjectSource(
    path: string,
    expected: string,
    text: string,
    selectedId: string | null,
    conflictMessage = messages.taskSaveConflict,
  ) {
    const result = await this.platform.invoke<'saved' | 'conflict'>('save_project', {
      path,
      expected,
      text,
    });
    if (result === 'conflict') throw Error(conflictMessage);
    if (result !== 'saved') throw Error(messages.invalidUpdateResponse);
    const previous = this.state.documents.find((doc) => doc.path === path);
    if (previous) {
      const next = this.document(path, text, previous);
      this.patch({
        documents: this.state.documents.map((doc) => (doc.path === path ? next : doc)),
        ...(this.state.activePath === path
          ? { selectedId, operationProblems: [], problemsOpen: false }
          : {}),
      });
    }
  }
  async saveSetting(key: 'detailMode' | 'language' | 'displayName', value: string) {
    if (this.state.settings.saving) return;
    this.patch({ settings: { ...this.state.settings, saving: true, error: '' } });
    try {
      if (key === 'language') {
        if (!isLanguage(value)) throw Error(messages.invalidSetting);
        await this.storage.setItem('worktree.language', value);
        setLanguage(value);
      } else if (key === 'displayName') await this.storage.setItem('worktree.display-name', value);
      else await saveDetailMode(this.storage, value);
      this.patch({ settings: { ...this.state.settings, [key]: value, saving: false } });
      return true;
    } catch (error) {
      this.patch({
        settings: {
          ...this.state.settings,
          saving: false,
          error: messages.settingsSaveFailedPrefix + String(error),
        },
      });
    }
  }
  async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      const paths = await this.platform.invoke<string[]>('take_open_requests');
      for (const path of paths) await this.open(path);
      const path = this.state.activePath;
      if (!path) return;
      try {
        const startedText = this.active?.text;
        const text = serializeSource(
          readSource(await this.platform.invoke<string>('read_project', { path })),
        );
        if (this.state.activePath !== path || this.active?.text !== startedText) return;
        const previous = this.active;
        if (previous && text !== previous.text) {
          const next = this.document(path, text, previous);
          const owner =
            this.state.owner === 'all' ||
            next.model?.rows.some((row) => 'owner:' + row.owner === this.state.owner)
              ? this.state.owner
              : 'all';
          this.patch({
            documents: this.state.documents.map((doc) => (doc.path === path ? next : doc)),
            selectedId: this.validSelection(next.model),
            owner,
            operationProblems: [],
            problemsOpen: next.problems.length ? this.state.problemsOpen : false,
          });
          this.title();
        } else if (
          this.state.operationProblems.some(
            (problem) => problem.category === 'fileReadError' && problem.source === path,
          )
        )
          this.patch({ operationProblems: [] });
      } catch (error) {
        if (this.state.activePath === path) this.report(error, path, ko.fileReadError);
      }
    } catch (error) {
      this.report(error);
    } finally {
      this.polling = false;
    }
  }
}
