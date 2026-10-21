import { deleteTaskSource, type DeleteOptions } from '../domain/task-deletion';
import { updateTaskSource, type TaskDraft } from '../domain/task-editing';
import { pathKey, folderName, withinProject } from '../domain/project-paths';
import { projectSession } from './project-session';
import type { Session } from '../platform/session-storage';
import { messages, setLanguage, isLanguage } from '../i18n/messages';
import { ko } from '../i18n/ko';
import { readSeparator, saveSeparator } from '../domain/id-display';
import { readDetailMode, saveDetailMode } from '../domain/detail-settings';
import { parseWbs } from '../domain/model';
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
      separator: 'none',
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
          separator: readSeparator(this.storage),
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
      const model = parseWbs(text);
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
        for (const tab of saved.tabs) {
          if (
            /\.(md|markdown)$/i.test(tab.path) &&
            withinProject(tab.path, scanned.path) &&
            !scanned.files.some((file) => pathKey(file) === pathKey(tab.path))
          )
            scanned.files.push(tab.path);
        }
        if (projects.some((project) => pathKey(project.path) === pathKey(scanned.path))) continue;
        const project: OpenProject = { path: scanned.path, files: scanned.files, activePath: null };
        for (const tab of saved.tabs.filter((tab) =>
          scanned.files.some((file) => pathKey(file) === pathKey(tab.path)),
        )) {
          if (documents.some((doc) => pathKey(doc.path) === pathKey(tab.path))) continue;
          try {
            const path = scanned.files.find((file) => pathKey(file) === pathKey(tab.path))!;
            const text = await this.platform.invoke<string>('read_document', { path });
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
                await this.platform.invoke<string>('read_document', { path: selected }),
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
    this.platform.setTitle(this.activeProject ? folderName(this.activeProject.path) : 'Worktree');
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
      for (const file of previous?.files ?? []) {
        if (/\.(md|markdown)$/i.test(file) && !scanned.files.includes(file))
          scanned.files.push(file);
      }
      if (!previous && this.state.projects.length >= MAX_SESSION_TABS)
        throw Error(messages.projectTabLimit);
      const selected =
        scanned.selectedPath ??
        scanned.files.find((file) => pathKey(file) === pathKey(previous?.activePath ?? '')) ??
        scanned.files[0] ??
        null;
      const project: OpenProject = { path: scanned.path, files: scanned.files, activePath: null };
      let document: OpenDocument | undefined;
      let errors: Problem[] = [];
      if (selected) {
        try {
          document = this.document(
            selected,
            await this.platform.invoke<string>('read_document', { path: selected }),
            this.state.documents.find((doc) => doc.path === selected),
          );
        } catch (error) {
          errors = describeDocumentErrors(error, '', selected, ko.fileReadError);
        }
      }
      if (revision !== this.openRevision) return;
      project.activePath = document?.path ?? null;
      const same = project.activePath === this.state.activePath;
      this.patch({
        projects: previous
          ? this.state.projects.map((item) => (item === previous ? project : item))
          : [...this.state.projects, project],
        documents: document
          ? [...this.state.documents.filter((doc) => doc.path !== document.path), document]
          : this.state.documents,
        activeProjectPath: project.path,
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
  async selectDocument(path: string) {
    const project = this.activeProject;
    if (!project?.files.includes(path)) return;
    const revision = ++this.openRevision;
    try {
      const next = this.document(
        path,
        await this.platform.invoke<string>('read_document', { path }),
        this.state.documents.find((doc) => doc.path === path),
      );
      if (revision !== this.openRevision || this.state.activeProjectPath !== project.path) return;
      this.patch({
        documents: [...this.state.documents.filter((doc) => doc.path !== path), next],
        projects: this.state.projects.map((item) =>
          item.path === project.path ? { ...item, activePath: path } : item,
        ),
        activePath: path,
        selectedId: null,
        owner: 'all',
        operationProblems: [],
        problemsOpen: false,
      });
      this.saveSession();
    } catch (error) {
      if (revision === this.openRevision) this.report(error, path, ko.fileReadError);
    }
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
    this.patch({ page, selectedId: null });
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
  async saveTask(path: string, expected: string, draft: TaskDraft, id?: string) {
    const update = updateTaskSource(expected, draft, id);
    await this.saveTaskSource(path, expected, update.text, update.id);
    return update.id;
  }
  async deleteTask(path: string, expected: string, id: string, options: DeleteOptions) {
    const text = deleteTaskSource(expected, id, options);
    await this.saveTaskSource(path, expected, text, null, messages.deleteConflict);
  }
  private async saveTaskSource(
    path: string,
    expected: string,
    text: string,
    selectedId: string | null,
    conflictMessage = messages.taskSaveConflict,
  ) {
    const result = await this.platform.invoke<'saved' | 'conflict'>('save_document', {
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
  async saveSetting(key: 'separator' | 'detailMode' | 'language', value: string) {
    if (this.state.settings.saving) return;
    this.patch({ settings: { ...this.state.settings, saving: true, error: '' } });
    try {
      if (key === 'language') {
        if (!isLanguage(value)) throw Error(messages.invalidSetting);
        await this.storage.setItem('worktree.language', value);
        setLanguage(value);
      } else if (key === 'separator') await saveSeparator(this.storage, value);
      else await saveDetailMode(this.storage, value);
      this.patch({ settings: { ...this.state.settings, [key]: value, saving: false } });
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
        const text = await this.platform.invoke<string>('read_document', { path });
        if (this.state.activePath !== path) return;
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
