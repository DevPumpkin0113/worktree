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
    [title, setTitle] = useState('업데이트 확인 전'),
    [description, setDescription] = useState('새 버전이 있으면 이곳에 안내합니다.'),
    [busy, setBusy] = useState(false),
    [update, setUpdate] = useState<Update | null>(null),
    [progress, setProgress] = useState<number | null | undefined>(undefined),
    [checkedAt, setCheckedAt] = useState(''),
    [auto, setAuto] = useState(true),
    [preferenceError, setPreferenceError] = useState(''),
    [preferenceBusy, setPreferenceBusy] = useState(false),
    [feedback, setFeedback] = useState(''),
    [buildError, setBuildError] = useState(''),
    [reporting, setReporting] = useState(false);
  const locked = useRef(false),
    alive = useRef(true);
  function message(title: string, description: string) {
    if (alive.current) {
      setTitle(title);
      setDescription(description);
    }
  }
  async function check() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setUpdate(null);
    setProgress(undefined);
    message('업데이트 확인 중', 'GitHub 정식 릴리즈를 확인하고 있습니다.');
    try {
      const result = await platform.invoke<Update>('check_app_update');
      const messages: Record<string, [string, string]> = {
        latest: ['최신 버전입니다', `현재 버전 ${result.version}을 사용 중입니다.`],
        ahead: [
          '개발 버전을 사용 중입니다',
          `현재 앱은 최신 정식 버전 ${result.version}보다 앞서 있습니다.`,
        ],
        'no-release': ['공개된 릴리즈가 없습니다', '정식 릴리즈가 등록되면 안내합니다.'],
        manual: [
          `새 버전 ${result.version}이 있습니다`,
          '이 릴리즈는 앱 내 설치를 지원하지 않습니다. 릴리즈에서 설치 파일을 받아주세요.',
        ],
        available: [
          `새 버전 ${result.version}이 있습니다`,
          '다운로드 후 서명을 검증합니다. 설치를 시작하면 앱이 종료됩니다.',
        ],
      };
      if (!messages[result.kind]) throw Error('올바르지 않은 업데이트 응답입니다.');
      if (alive.current) {
        setUpdate(result);
        message(...messages[result.kind]);
        setCheckedAt('마지막 확인: ' + new Date().toLocaleString('ko-KR'));
      }
    } catch (error) {
      message('업데이트 확인에 실패했습니다', String(error));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function install() {
    if (locked.current || update?.kind !== 'available') return;
    locked.current = true;
    setBusy(true);
    message('설치 확인 대기', '확인 창에서 설치 여부를 선택하세요.');
    try {
      const handler = (event: DownloadEvent) => {
        if (!alive.current) return;
        if (event.phase === 'installing') {
          setProgress(100);
          message(
            '설치 시작 중',
            '서명 검증을 마쳤습니다. 설치 프로그램이 실행되면 앱이 종료됩니다.',
          );
        } else {
          const percent = event.total
            ? Math.min(100, Math.round((event.downloaded / event.total) * 100))
            : null;
          setProgress(percent);
          message(
            '업데이트 다운로드 중',
            percent === null
              ? `${(event.downloaded / 1048576).toFixed(1)} MB 다운로드됨`
              : `${percent}% · 다운로드 후 서명을 검증합니다.`,
          );
        }
      };
      const installed = await platform.invoke<boolean>('install_app_update', {
        onProgress: platform.channel?.(handler),
      });
      if (!installed) {
        setProgress(undefined);
        message('설치를 취소했습니다', '다운로드 및 설치 버튼으로 다시 시작할 수 있습니다.');
      }
    } catch (error) {
      setProgress(undefined);
      message('업데이트를 설치하지 못했습니다', String(error));
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
        if (alive.current) setBuildError('빌드 정보를 불러오지 못했습니다.');
      }
      try {
        await storage.ready;
        const enabled = storage.getItem('worktree.autoCheckUpdates') !== 'false';
        if (alive.current) setAuto(enabled);
        if (enabled && alive.current) await check();
      } catch {
        if (alive.current) {
          setPreferenceError('설정을 불러오지 못해 자동 확인을 중지했습니다.');
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
      setPreferenceError('자동 확인 설정을 저장하지 못했습니다.');
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
      setFeedback('브라우저에서 내용을 작성한 후 제출하세요.');
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
      message('브라우저를 열지 못했습니다', String(error));
    }
  }
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
