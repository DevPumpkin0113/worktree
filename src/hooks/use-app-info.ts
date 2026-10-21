import { messages, getLanguage } from '../i18n/messages';
import { useEffect, useRef, useState } from 'react';
import type { DownloadEvent, Platform, SettingsStorage } from '../app/types';
interface Build {
  version: string;
  channel: string;
  builtAt: string;
  commit: string;
  platform: string;
}
interface Update {
  kind: string;
  version: string;
  notes?: string;
}
export function useAppInfo(platform: Platform, storage: SettingsStorage) {
  const [build, setBuild] = useState<Build | null>(null),
    [notification, setNotification] = useState<() => [string, string]>(() => () => [
      messages.updateIdle,
      messages.updateIdleHint,
    ]),
    [busy, setBusy] = useState(false),
    [update, setUpdate] = useState<Update | null>(null),
    [progress, setProgress] = useState<number | null | undefined>(undefined),
    [checkedTime, setCheckedTime] = useState<Date | null>(null),
    [auto, setAuto] = useState(true),
    [preferenceError, setPreferenceError] = useState(''),
    [preferenceBusy, setPreferenceBusy] = useState(false),
    [feedback, setFeedback] = useState(''),
    [buildError, setBuildError] = useState(''),
    [reporting, setReporting] = useState(false);
  const locked = useRef(false),
    alive = useRef(true);
  function message(create: () => [string, string]) {
    if (alive.current) {
      setNotification(() => create);
    }
  }
  async function check() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setUpdate(null);
    setProgress(undefined);
    message(() => [messages.updateChecking, messages.updateCheckingHint]);
    try {
      const result = await platform.invoke<Update>('check_app_update');
      const updateMessages: Record<string, () => [string, string]> = {
        latest: () => [messages.updateLatest, messages.currentVersion(result.version)],
        ahead: () => [messages.updateAhead, messages.aheadVersion(result.version)],
        'no-release': () => [messages.noRelease, messages.noReleaseHint],
        manual: () => [messages.availableVersion(result.version), messages.manualUpdateHint],
        available: () => [messages.availableVersion(result.version), messages.installUpdateHint],
      };
      if (!updateMessages[result.kind]) throw Error(messages.invalidUpdateResponse);
      if (alive.current) {
        setUpdate(result);
        message(() => updateMessages[result.kind]());
        setCheckedTime(new Date());
      }
    } catch (error) {
      message(() => [messages.updateCheckFailed, String(error)]);
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function install() {
    if (locked.current || update?.kind !== 'available') return;
    locked.current = true;
    setBusy(true);
    message(() => [messages.installConfirm, messages.installConfirmHint]);
    try {
      const handler = (event: DownloadEvent) => {
        if (!alive.current) return;
        if (event.phase === 'installing') {
          setProgress(100);
          message(() => [messages.installStarting, messages.installStartingHint]);
        } else {
          const percent = event.total
            ? Math.min(100, Math.round((event.downloaded / event.total) * 100))
            : null;
          setProgress(percent);
          message(() => [
            messages.updateDownloading,
            percent === null
              ? messages.downloadedMegabytes((event.downloaded / 1048576).toFixed(1))
              : messages.downloadPercent(percent),
          ]);
        }
      };
      const installed = await platform.invoke<boolean>('install_app_update', {
        onProgress: platform.channel?.(handler),
      });
      if (!installed) {
        setProgress(undefined);
        message(() => [messages.installCancelled, messages.installCancelledHint]);
      }
    } catch (error) {
      setProgress(undefined);
      message(() => [messages.installFailed, String(error)]);
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void (async () => {
      try {
        const info = await platform.invoke<Build>('get_build_info');
        if (alive.current) setBuild(info);
      } catch {
        if (alive.current) setBuildError(messages.buildInfoFailed);
      }
      try {
        await storage.ready;
        const enabled = storage.getItem('worktree.autoCheckUpdates') !== 'false';
        if (alive.current) setAuto(enabled);
        if (enabled && alive.current) await check();
      } catch {
        if (alive.current) {
          setPreferenceError(messages.autoCheckLoadFailed);
          setAuto(false);
        }
      }
    })();
    return () => {
      alive.current = false;
    };
  }, [platform, storage]);
  async function changeAuto(value: boolean) {
    if (preferenceBusy) return;
    setPreferenceBusy(true);
    try {
      await storage.setItem('worktree.autoCheckUpdates', String(value));
      setAuto(value);
      setPreferenceError('');
    } catch {
      setPreferenceError(messages.autoCheckSaveFailed);
    } finally {
      setPreferenceBusy(false);
    }
  }
  async function report() {
    if (reporting) return;
    setReporting(true);
    setFeedback('');
    try {
      await platform.invoke('open_issue_report');
      setFeedback(messages.issueOpenedHint);
    } catch (error) {
      setFeedback(String(error));
    } finally {
      setReporting(false);
    }
  }
  async function releases() {
    try {
      await platform.invoke('open_releases');
    } catch (error) {
      message(() => [messages.browserOpenFailed, String(error)]);
    }
  }
  const [title, description] = notification();
  const checkedAt = checkedTime
    ? messages.lastCheckedPrefix +
      checkedTime.toLocaleString(getLanguage() === 'ko' ? 'ko-KR' : 'en-US')
    : '';
  return {
    build,
    buildError,
    title,
    description,
    busy,
    update,
    progress,
    checkedAt,
    auto,
    preferenceError,
    preferenceBusy,
    feedback,
    reporting,
    check,
    install,
    changeAuto,
    report,
    releases,
  };
}
