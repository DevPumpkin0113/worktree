import { useEffect, useMemo, useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import { projectSettingsDraft, type ProjectSettingsDraft } from '../../domain/project-settings';

export function useProjectSettings(
  text: string,
  onSave: (expected: string, draft: ProjectSettingsDraft) => Promise<string>,
) {
  const [base, setBase] = useState(text);
  const [draft, setDraft] = useState(() => projectSettingsDraft(text));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const baseline = useMemo(() => projectSettingsDraft(base), [base]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => {
    if (!dirty && !saving && base !== text) {
      setBase(text);
      setDraft(projectSettingsDraft(text));
      setError('');
    }
  }, [text, base, dirty, saving]);
  return {
    draft,
    saving,
    error,
    dirty,
    change(change: Partial<ProjectSettingsDraft>) {
      setDraft((current) => ({ ...current, ...change }));
    },
    async save() {
      if (busy.current || !dirty) return false;
      busy.current = true;
      setSaving(true);
      setError('');
      try {
        const updated = await onSave(base, draft);
        setBase(updated);
        setDraft(projectSettingsDraft(updated));
        return true;
      } catch (error) {
        setError(
          messages.projectSaveFailed + String(error instanceof Error ? error.message : error),
        );
        return false;
      } finally {
        busy.current = false;
        setSaving(false);
      }
    },
  };
}
