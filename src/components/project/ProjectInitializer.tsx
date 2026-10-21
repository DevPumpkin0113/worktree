import { useRef, useState } from 'react';
import { messages } from '../../i18n/messages';
import type { WorkspaceStore } from '../../app/workspace-store';
import { ProjectInitialization } from './ProjectInitialization';

export function ProjectInitializer({
  store,
  step,
  onStep,
}: {
  store: WorkspaceStore;
  step: number;
  onStep: (step: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  return (
    <ProjectInitialization
      project={store.activeProject!}
      model={null}
      step={step}
      onStep={onStep}
      busy={busy}
      error={error}
      onInitialize={async (name, directory, prefix, effort) => {
        if (saving.current) return;
        saving.current = true;
        setBusy(true);
        setError('');
        const path = store.activeProject?.path;
        try {
          await store.initializeProject(name, directory, prefix, effort);
          if (store.activeProject?.path === path) store.setPage('board');
        } catch (error) {
          setError(
            messages.initializeFailed + String(error instanceof Error ? error.message : error),
          );
        } finally {
          saving.current = false;
          setBusy(false);
        }
      }}
    />
  );
}
