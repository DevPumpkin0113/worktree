import { validDisplayName } from '@worktree/core/display-name';
import { messages, isLanguage, type Language } from '../i18n/messages';
import type { Platform, SettingsStorage } from '../app/types';
interface SavedSettings {
  displayName: string;
  language: Language;
  schemaVersion: number;
  idSeparator: 'none' | 'hyphen';
  detailMode: 'sidebar' | 'tabs';
  autoCheckUpdates: boolean;
}
type Field = Exclude<keyof SavedSettings, 'schemaVersion'>;
const keys: Record<string, Field> = {
  'worktree.language': 'language',
  'worktree.display-name': 'displayName',
  'worktree.id-separator': 'idSeparator',
  'worktree.detail-mode': 'detailMode',
  'worktree.autoCheckUpdates': 'autoCheckUpdates',
};
const defaults = (): SavedSettings => ({
  schemaVersion: 2,
  displayName: '',
  language: 'ko',
  idSeparator: 'none',
  detailMode: 'tabs',
  autoCheckUpdates: true,
});
function valueFor(field: Field, value: string) {
  if (field === 'displayName' && validDisplayName(value, true)) return value;
  if (field === 'language' && isLanguage(value)) return value;
  if (field === 'idSeparator' && ['none', 'hyphen'].includes(value))
    return value as SavedSettings[Field];
  if (field === 'detailMode' && value === 'modal') return 'tabs';
  if (field === 'detailMode' && ['tabs', 'sidebar'].includes(value))
    return value as SavedSettings[Field];
  if (field === 'autoCheckUpdates' && ['true', 'false'].includes(value)) return value === 'true';
  throw Error(messages.invalidSetting);
}

export function createSettingsStorage({
  invoke,
  legacyStorage,
}: {
  invoke: Platform['invoke'];
  legacyStorage: () => Pick<Storage, 'getItem'>;
}): SettingsStorage {
  let settings = defaults(),
    failure: unknown = null,
    queue = Promise.resolve();
  const storage: SettingsStorage = {
    ready: Promise.resolve(),
    warning: '',
    getItem: (key) => (keys[key] ? String(settings[keys[key]]) : null),
    setItem(key, value) {
      const field = keys[key];
      if (!field) return Promise.reject(Error(messages.unknownSetting));
      const operation = queue
        .catch(() => {})
        .then(async () => {
          await storage.ready;
          if (failure) throw failure;
          const next = { ...settings, [field]: valueFor(field, value) };
          settings = await invoke<SavedSettings>('save_settings', { settings: next });
        });
      queue = operation;
      return operation;
    },
  };
  storage.ready = (async () => {
    try {
      const result = await invoke<{ settings: SavedSettings | null; warning?: string }>(
        'load_settings',
      );
      storage.warning = result.warning || '';
      if (result.settings) {
        settings = {
          ...defaults(),
          ...result.settings,
          schemaVersion: 2,
          detailMode: valueFor(
            'detailMode',
            result.settings.detailMode ?? 'tabs',
          ) as SavedSettings['detailMode'],
        };
        return;
      }
      const migrated = defaults();
      // The first native window reuses the old WebView profile; no LevelDB parsing or profile copy.
      try {
        const legacy = legacyStorage();
        for (const [key, field] of Object.entries(keys)) {
          if (field === 'language' || field === 'displayName') continue;
          const value = legacy.getItem(key);
          if (value !== null && value !== undefined) {
            try {
              Object.assign(migrated, { [field]: valueFor(field, value) });
            } catch {}
          }
        }
      } catch {
        throw Error(messages.legacySettingsFailed);
      }
      settings = await invoke<SavedSettings>('initialize_settings', { settings: migrated });
    } catch (error) {
      failure = error;
      throw error;
    }
  })();
  return storage;
}
