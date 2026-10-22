import { useEffect, useState } from 'react';
import type { useAppInfo } from './use-app-info';
export function useUpdateNotice(
  update: ReturnType<typeof useAppInfo>['update'],
  settingsOpen: boolean,
) {
  const [seenVersions, setSeenVersions] = useState<string[]>([]);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const version = update && ['available', 'manual'].includes(update.kind) ? update.version : null;
  useEffect(() => {
    if (settingsOpen && version) {
      setSeenVersions((current) => (current.includes(version) ? current : [...current, version]));
    }
  }, [settingsOpen, version]);
  const unread = !!version && !settingsOpen && !seenVersions.includes(version);
  return {
    version,
    unread,
    visible: unread && dismissedVersion !== version,
    dismiss: () => setDismissedVersion(version),
  };
}
