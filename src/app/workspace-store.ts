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
    let saved: {
      schemaVersion: number;
      recentFiles: string[];
      tabs: { path: string; view: View; ganttUnit: 'day' | 'week' }[];
      activePath: string | null;
    } = emptySession();
    const failures: Problem[] = [];
    try {
      saved = await this.session.load();
    } catch (error) {
      failures.push(...(describeDocumentErrors(error, '', '', ko.sessionReadError) as Problem[]));
    }
    const documents: OpenDocument[] = [];
    for (const tab of saved.tabs as { path: string; view: View; ganttUnit: 'day' | 'week' }[]) {
      try {
        const text = await this.platform.invoke<string>('read_document', { path: tab.path });
        documents.push(this.document(tab.path, text, { ...tab } as OpenDocument));
      } catch (error) {
        failures.push(
          ...(describeDocumentErrors(error, '', tab.path, ko.fileReadError) as Problem[]),
        );
      }
    }
    const activePath = documents.some((doc) => doc.path === saved.activePath)
      ? saved.activePath
      : (documents.at(-1)?.path ?? null);
    this.patch({
      documents,
      activePath,
      recent: saved.recentFiles,
      ready: true,
      operationProblems: failures,
    });
    this.title();
    await this.poll();
  }
  private title() {
    this.platform.setTitle(
      this.active?.model?.title ?? (this.state.activePath?.split(/[\\/]/).pop() || 'Worktree'),
    );
  }
  private saveSession() {
    if (!this.state.ready) return;
    const documents = this.state.documents.slice(-MAX_SESSION_TABS);
    const selected = this.active;
    if (selected && !documents.includes(selected)) documents.splice(0, 1, selected);
    void this.session
      .save({
        schemaVersion: 1,
        recentFiles: this.state.recent.slice(0, MAX_RECENT_FILES),
        tabs: documents.map(({ path, view, ganttUnit }) => ({ path, view, ganttUnit })),
        activePath: this.state.activePath,
      })
      .catch((error: unknown) => this.report(error, '', ko.sessionSaveError));
  }
  async open(path: string) {
    try {
      const text = await this.platform.invoke<string>('read_document', { path });
      const previous = this.state.documents.find((doc) => doc.path === path);
      const next = this.document(path, text, previous);
      const documents = previous
        ? this.state.documents.map((doc) => (doc.path === path ? next : doc))
        : [...this.state.documents, next];
      this.patch({
        documents,
        activePath: path,
        selectedId: path === this.state.activePath ? this.validSelection(next.model) : null,
        owner: path === this.state.activePath ? this.state.owner : 'all',
        recent: [path, ...this.state.recent.filter((item) => item !== path)].slice(
          0,
          MAX_RECENT_FILES,
        ),
        operationProblems: [],
        problemsOpen: false,
      });
      this.title();
      this.saveSession();
    } catch (error) {
      this.report(error, path, ko.fileReadError);
    }
  }
  async pick() {
    try {
      const path = await this.platform.invoke<string | null>('pick_document');
      if (path) await this.open(path);
    } catch (error) {
      this.report(error);
    }
  }
  selectDocument(path: string) {
    if (!this.state.documents.some((doc) => doc.path === path)) return;
    this.patch({
      activePath: path,
      selectedId: null,
      owner: 'all',
      operationProblems: [],
      problemsOpen: false,
    });
    this.title();
    this.saveSession();
  }
  closeDocument(path: string) {
    const documents = this.state.documents.filter((doc) => doc.path !== path);
    const changed = path === this.state.activePath;
    this.patch({
      documents,
      ...(changed
        ? {
            activePath: documents.at(-1)?.path ?? null,
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
      this.state.documents.map((doc) => doc.path),
      source,
      target,
      after,
    );
    this.patch({
      documents: paths.map((path: string) =>
        this.state.documents.find((doc) => doc.path === path)!,
      ),
    });
    this.saveSession();
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
