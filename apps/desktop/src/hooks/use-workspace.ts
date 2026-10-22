import { useEffect, useSyncExternalStore } from 'react';
import type { WorkspaceStore } from '../app/workspace-store';
export function useWorkspace(store: WorkspaceStore) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    void store.initialize();
    const timer = setInterval(() => void store.poll(), 1500);
    return () => clearInterval(timer);
  }, [store]);
  return state;
}
