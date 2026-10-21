import '../helpers/dom-setup';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { App } from '../../src/App';
import { WorkspaceStore } from '../../src/app/workspace-store';
import type { Platform } from '../../src/app/types';
const header =
  '## 작업 목록\n| ID | 상위 ID | 유형 | 작업명 | 산출물 / 완료 기준 | 담당자 | 상태 | 시작일 | 종료일 | 예상 공수(h) | 선행 작업 |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
const source =
  '---\nid_prefix: OBS\nuse_effort: false\n---\n' +
  header +
  '| W001 | - | group | 화면 작업 | 확인 | - | auto | - | - | - | - |\n| W002 | W001 | task | 댓글 구현 | 입력 확인 | codex | doing | 2026-10-20 | 2026-10-21 | - | - |\n| W003 | W001 | task | UI 확인 | 인수 확인 | 박대호 | done | 2026-10-22 | 2026-10-23 | 2 | W002 |\n';
const first = 'C:\\QA\\first.wbs',
  second = 'C:\\QA\\second.wbs';
async function fixture(
  options: {
    language?: 'ko' | 'en';
    sessionFailure?: boolean;
    saveFailure?: boolean;
    updateKind?: string;
    auto?: boolean;
    installFailure?: boolean;
  } = {},
) {
  const files = new Map([
    [first, source],
    [second, source.replace('댓글 구현', '다른 문서 작업')],
  ]);
  const calls: { command: string; args?: Record<string, unknown> }[] = [];
  let saveFailure = options.saveFailure ?? false;
  let updateKind = options.updateKind ?? 'latest';
  const platform: Platform = {
    setTitle() {},
    async control() {},
    channel: (handler) => handler,
    async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
      calls.push({ command, args });
      let result: unknown;
      if (command === 'load_settings')
        result = {
          settings: {
            schemaVersion: 2,
            language: options.language ?? 'ko',
            idSeparator: 'none',
            detailMode: 'sidebar',
            autoCheckUpdates: options.auto ?? false,
          },
          warning: '',
        };
      else if (command === 'save_settings') {
        if (saveFailure) throw Error('디스크 오류');
        result = args?.settings;
      } else if (command === 'load_session') {
        if (options.sessionFailure) throw Error('손상된 세션');
        result = {
          schemaVersion: 1,
          recentFiles: [first, second],
          tabs: [
            { path: first, view: 'tree', ganttUnit: 'day' },
            { path: second, view: 'board', ganttUnit: 'week' },
          ],
          activePath: first,
        };
      } else if (command === 'read_document') {
        const path = String(args?.path);
        if (!files.has(path)) throw Error('파일 없음');
        result = files.get(path);
      } else if (command === 'take_open_requests') result = [];
      else if (command === 'pick_document') result = first;
      else if (command === 'get_build_info')
        result = {
          version: '0.15.0',
          builtAt: '1792500000',
          channel: 'development',
          commit: 'abc123',
          platform: 'windows',
        };
      else if (command === 'check_app_update') {
        if (updateKind === 'failure') throw Error('네트워크 오류');
        result = { kind: updateKind, version: '0.16.0', notes: '업데이트 안내' };
      } else if (command === 'install_app_update') {
        if (options.installFailure) throw Error('서명 검증 실패');
        result = false;
      }
      return result as T;
    },
  };
  const store = new WorkspaceStore(platform);
  await store.initialize();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<App store={store} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const element = <T extends Element = HTMLElement>(selector: string) => {
    const node = host.querySelector<T>(selector);
    assert.ok(node, selector);
    return node;
  };
  const click = async (selector: string) =>
    act(async () => {
      const node = element<HTMLElement>(selector);
      if (typeof node.click === 'function') node.click();
      else node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  const value = async (selector: string, value: string) =>
    act(async () => {
      const node = element<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector);
      const prototype =
        node.tagName === 'SELECT'
          ? HTMLSelectElement.prototype
          : node.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(node, value);
      node.dispatchEvent(
        new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
      );
    });
  return {
    store,
    host,
    files,
    calls,
    element,
    click,
    value,
    setSaveFailure(value: boolean) {
      saveFailure = value;
    },
    setUpdateKind(value: string) {
      updateKind = value;
    },
    async close() {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}

test('React 워크스페이스는 세션·페이지·필터·ID 설정과 상세 표시를 연결한다', async () => {
  const f = await fixture();
  try {
    assert.match(f.element('#content').textContent!, /OBS002/);
    assert.equal(f.host.querySelector('#metrics'), null);
    assert.match(f.element('.compact-progress').textContent!, /50%/);
    assert.match(f.element('.compact-progress').textContent!, /1\/2 완료/);
    await f.click('[data-workspace-page="tasks"]');
    assert.equal(f.host.querySelectorAll('.all-task-link').length, 2);
    await f.value('#search', '댓글');
    assert.equal(f.host.querySelectorAll('.all-task-link').length, 1);
    await f.value('#search', '');
    await f.click('#owner');
    await f.click('#owner-options [data-value="owner:박대호"]');
    assert.equal(f.host.querySelectorAll('.all-task-link').length, 1);
    assert.match(f.element('#content').textContent!, /UI 확인/);
    await f.click('#owner');
    await f.click('#owner-option-0');
    await f.click('.all-task-link[data-id="W002"]');
    assert.ok(f.element<HTMLDialogElement>('#detail').open);
    await f.click('#settingsOpen');
    assert.ok(f.element('#workspace').hasAttribute('inert'));
    await f.value('#idSeparator', 'hyphen');
    assert.match(f.element('#content').textContent!, /OBS-002/);
    await f.value('#detailMode', 'modal');
    await f.click('#settingsClose');
    assert.ok(f.element<HTMLDialogElement>('#detail').open);
    assert.equal(f.element('#detail').getAttribute('data-modal'), 'true');
    await f.click('#close');
    await f.click('[data-workspace-page="analytics"]');
    assert.equal(f.host.querySelectorAll('.analytics-card').length, 3);
    assert.equal(f.element('#content #metrics').textContent!.includes('공수'), false);
    assert.equal(f.host.querySelector('.compact-progress'), null);
    assert.equal(f.host.querySelector('.workspace-page-chip'), null);
    await f.click('#workspaceCollapse');
    assert.ok(document.documentElement.classList.contains('workspace-nav-collapsed'));
    await f.click('[data-workspace-page="board"]');
    for (const view of ['board', 'flow', 'gantt', 'tree']) {
      await f.click(`[data-view="${view}"]`);
      assert.ok(f.element('#content').textContent!.length);
    }
    assert.equal(f.store.getSnapshot().documents[1].ganttUnit, 'week');
  } finally {
    await f.close();
  }
});

test('React 댓글은 작업·문서별로 분리하고 초안·작성 당시 이름·안전한 문자를 유지한다', async () => {
  const f = await fixture();
  try {
    await f.click('.task[data-id="W002"]');
    await f.click('#previewCommentsTab');
    await f.value('#previewAuthor', '검토자');
    await f.value('#previewComment', '<img src=x onerror=alert(1)>');
    await act(async () =>
      f.element('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
    assert.equal(f.host.querySelectorAll('.preview-comment').length, 3);
    assert.equal(f.host.querySelector('.preview-thread img'), null);
    await f.value('#previewComment', '작성 중인 초안');
    await f.click('.task[data-id="W003"]');
    await f.click('#previewCommentsTab');
    assert.equal(f.host.querySelectorAll('.preview-comment').length, 2);
    await f.click('.task[data-id="W002"]');
    assert.equal(f.element<HTMLTextAreaElement>('#previewComment').value, '작성 중인 초안');
    assert.match(f.element('.preview-thread').textContent!, /검토자/);
    await f.click('[data-tab="1"]');
    assert.ok(!f.element<HTMLDialogElement>('#detail').open);
    await f.click('.task[data-id="W002"]');
    await f.click('#previewCommentsTab');
    assert.equal(f.host.querySelectorAll('.preview-comment').length, 2);
    assert.equal(
      f.calls.some((call) => /comment/.test(call.command)),
      false,
    );
  } finally {
    await f.close();
  }
});

test('동일 파일 외부 갱신은 상세·스크롤을 유지하고 선택 작업 삭제·다른 문서 전환을 처리한다', async () => {
  const f = await fixture();
  try {
    await f.click('.task[data-id="W002"]');
    f.element<HTMLDialogElement>('#detail').scrollTop = 120;
    const content = f.element<HTMLElement>('#content');
    content.scrollTop = 80;
    await act(async () => content.dispatchEvent(new Event('scroll', { bubbles: true })));
    f.files.set(first, source.replace('입력 확인', '수정된 완료 기준'));
    await act(async () => f.store.poll());
    assert.ok(f.element<HTMLDialogElement>('#detail').open);
    assert.equal(f.element('#detail').scrollTop, 120);
    assert.match(f.element('#detailBody').textContent!, /수정된 완료 기준/);
    assert.equal(f.element('#content').scrollTop, 80);
    f.files.set(
      first,
      source
        .split('\n')
        .filter((line) => !line.includes('| W002 |'))
        .join('\n')
        .replace('2 | W002 |', '2 | - |'),
    );
    await act(async () => f.store.poll());
    assert.equal(f.store.getSnapshot().selectedId, null);
    assert.ok(!f.element<HTMLDialogElement>('#detail').open);
  } finally {
    await f.close();
  }
});

test('설정 저장 실패는 기존 표시를 유지하고 오류 후 재시도한다', async () => {
  const f = await fixture({ saveFailure: true });
  try {
    await f.click('#settingsOpen');
    await f.value('#idSeparator', 'hyphen');
    assert.equal(f.element<HTMLSelectElement>('#idSeparator').value, 'none');
    assert.match(f.element('#settingsError').textContent!, /저장하지 못했습니다/);
    f.setSaveFailure(false);
    await f.value('#idSeparator', 'hyphen');
    assert.equal(f.element<HTMLSelectElement>('#idSeparator').value, 'hyphen');
  } finally {
    await f.close();
  }
});

test('손상된 세션은 덮어쓰지 않고 파일 열기로 복구하며 문서 오류를 React로 표시한다', async () => {
  const f = await fixture({ sessionFailure: true });
  try {
    assert.match(f.element('#error').textContent!, /세션 읽기 오류/);
    await f.click('#dockOpen');
    assert.equal(
      f.calls.some((call) => call.command === 'save_session'),
      false,
    );
    f.files.set(first, source.replace('2 | W002 |', '2 | W999 |'));
    await act(async () => f.store.open(first));
    await f.click('#error');
    assert.match(f.element('#problemsBody').textContent!, /W999/);
    assert.ok(f.element('#documentProblems').hidden === false);
    f.files.set(first, source);
    await act(async () => f.store.poll());
    assert.ok(f.element('#documentProblems').hidden);
    assert.ok(f.element('#content').textContent!.includes('댓글 구현'));
  } finally {
    await f.close();
  }
});

test('업데이트 자동 확인 끄기·수동 확인·실패 후 재시도와 명시적 설치만 허용한다', async () => {
  const f = await fixture({ updateKind: 'available' });
  try {
    assert.equal(
      f.calls.some((call) => call.command === 'check_app_update'),
      false,
    );
    assert.equal(
      f.calls.some((call) => call.command === 'install_app_update'),
      false,
    );
    await f.click('#settingsOpen');
    await f.click('#settingsAboutTab');
    await f.click('#checkUpdates');
    assert.match(f.element('#updateTitle').textContent!, /새 버전/);
    assert.ok(!f.element<HTMLButtonElement>('#installUpdate').disabled);
    await f.click('#installUpdate');
    assert.match(f.element('#updateTitle').textContent!, /취소/);
    assert.equal(f.calls.filter((call) => call.command === 'install_app_update').length, 1);
    f.setUpdateKind('failure');
    await f.click('#checkUpdates');
    assert.match(f.element('#updateTitle').textContent!, /실패/);
    assert.ok(f.element<HTMLButtonElement>('#installUpdate').disabled);
    f.setUpdateKind('latest');
    await f.click('#checkUpdates');
    assert.match(f.element('#updateTitle').textContent!, /최신/);
    await f.click('#reportIssue');
    assert.equal(f.calls.filter((call) => call.command === 'open_issue_report').length, 1);
  } finally {
    await f.close();
  }
});

test('탭 키보드 재정렬과 최근 파일 열기는 세션 순서를 보존한다', async () => {
  const f = await fixture();
  try {
    await act(async () => {
      f.element('[data-tab="0"]').dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          altKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    assert.equal(f.store.getSnapshot().documents[0].path, second);
    assert.equal(f.store.getSnapshot().activePath, first);
    await f.click('[data-close-tab="1"]');
    assert.equal(f.store.getSnapshot().activePath, second);
    await f.click('#recentOpen');
    await f.click('#recentFiles button');
    assert.equal(f.store.getSnapshot().activePath, first);
    assert.ok(f.calls.some((call) => call.command === 'save_session'));
  } finally {
    await f.close();
  }
});

test('그룹 접힘·그래프 선택·중첩 차트 스크롤은 보기 전환과 파일 갱신에서 복원한다', async () => {
  const f = await fixture();
  try {
    const group = f.element<HTMLDetailsElement>('details.group');
    await act(async () => {
      group.open = false;
      group.dispatchEvent(new Event('toggle'));
    });
    await f.click('[data-view="board"]');
    await f.click('[data-view="tree"]');
    assert.equal(f.element<HTMLDetailsElement>('details.group').open, false);
    await f.click('[data-view="flow"]');
    await f.click('[data-select="W002"]');
    assert.equal(f.store.active?.graphFocus, 'W002');
    const scroll = f.element<HTMLElement>('.diagram-scroll');
    scroll.scrollLeft = 44;
    scroll.scrollTop = 75;
    await act(async () => scroll.dispatchEvent(new Event('scroll', { bubbles: true })));
    f.files.set(first, source.replace('입력 확인', '외부 변경 확인'));
    await act(async () => f.store.poll());
    assert.equal(f.element('.diagram-scroll').scrollLeft, 44);
    assert.equal(f.element('.diagram-scroll').scrollTop, 75);
    await f.click('[data-view="board"]');
    await f.click('[data-view="flow"]');
    assert.equal(f.store.active?.graphFocus, 'W002');
    assert.equal(f.element('.diagram-scroll').scrollLeft, 44);
  } finally {
    await f.close();
  }
});

test('설정 메뉴 키보드 이동·패널 숨기기·펼치기와 선택 강조를 유지한다', async () => {
  const f = await fixture();
  try {
    await f.click('.task[data-id="W002"]');
    assert.ok(f.element('.task[data-id="W002"]').classList.contains('detail-selected'));
    await f.click('#detailHide');
    assert.ok(!f.element<HTMLDialogElement>('#detail').open);
    assert.ok(!f.element('.task[data-id="W002"]').classList.contains('detail-selected'));
    await f.click('.task[data-id="W002"]');
    await act(async () =>
      f
        .element('#detailResize')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
        ),
    );
    assert.equal(document.documentElement.style.getPropertyValue('--detail-panel-width'), '280px');
    await act(async () =>
      f
        .element('#detailResize')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        ),
    );
    assert.equal(f.store.getSnapshot().selectedId, null);
    await f.click('#settingsOpen');
    await act(async () =>
      f
        .element('#settingsGeneralTab')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
        ),
    );
    assert.equal(f.element('#settingsAboutTab').getAttribute('aria-selected'), 'true');
    assert.equal(document.activeElement, f.element('#settingsAboutTab'));
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    );
    assert.ok(!f.element<HTMLDialogElement>('#settings').open);
  } finally {
    await f.close();
    document.documentElement.style.removeProperty('--detail-panel-width');
  }
});

test('자동 업데이트 확인은 시작 시 한 번이며 서명 실패는 설치 성공으로 표시하지 않는다', async () => {
  const f = await fixture({ auto: true, updateKind: 'available', installFailure: true });
  try {
    assert.equal(f.calls.filter((call) => call.command === 'check_app_update').length, 1);
    await f.click('#settingsOpen');
    await f.click('#settingsAboutTab');
    assert.equal(f.calls.filter((call) => call.command === 'install_app_update').length, 0);
    await f.click('#installUpdate');
    assert.match(f.element('#updateTitle').textContent!, /설치하지 못했습니다/);
    assert.match(f.element('#updateDescription').textContent!, /서명 검증 실패/);
    assert.equal(f.calls.filter((call) => call.command === 'check_app_update').length, 1);
  } finally {
    await f.close();
  }
});

test('커스텀 필터는 키보드 선택·취소·바깥 클릭과 선택 표시를 지원한다', async () => {
  const f = await fixture();
  const key = async (value: string) =>
    act(async () => {
      f.element('#status').dispatchEvent(
        new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
      );
    });
  try {
    await f.click('#status');
    assert.equal(f.element('#status').getAttribute('aria-expanded'), 'true');
    await key('End');
    await key('Enter');
    assert.equal(f.store.getSnapshot().status, 'done');
    assert.equal(f.element('#status').getAttribute('aria-expanded'), 'false');
    await f.click('#status');
    assert.equal(f.element('#status-options [aria-selected="true"]').textContent, '완료✓');
    await key('Home');
    await key('Escape');
    assert.equal(f.store.getSnapshot().status, 'done');
    assert.equal(f.element('#status').getAttribute('aria-expanded'), 'false');
    await f.click('#status');
    await act(async () => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    assert.equal(f.element('#status').getAttribute('aria-expanded'), 'false');
    await key('ArrowDown');
    await key('Home');
    await key('Enter');
    assert.equal(f.store.getSnapshot().status, 'all');
  } finally {
    await f.close();
  }
});

test('앱 설정과 프로젝트 관리는 진입점·내용을 분리하고 프로젝트 조회는 파일을 저장하지 않는다', async () => {
  const f = await fixture();
  try {
    assert.equal(f.element('#settingsOpen').getAttribute('aria-label'), '앱 설정');
    const saves = f.calls.filter((call) => call.command === 'save_settings').length;
    await f.click('#projectManageOpen');
    assert.ok(f.element('#content #projectManagement'));
    assert.equal(f.host.querySelector('dialog#projectManagement'), null);
    assert.equal(f.element('#workspacePageTitle').textContent, '프로젝트 관리');
    assert.match(f.element('.project-overview').textContent!, /OBS/);
    assert.match(f.element('.project-overview').textContent!, /사용 안 함/);
    assert.equal(
      f.host.querySelectorAll('#projectManagement input,#projectManagement select').length,
      0,
    );
    await f.click('[data-workspace-page="board"]');
    assert.equal(f.host.querySelector('#projectManagement'), null);
    await f.click('#settingsOpen');
    assert.equal(f.element('#settingsTitle').textContent, '앱 설정');
    assert.equal(f.host.querySelector('#projectManagement'), null);
    await f.click('#settingsClose');
    await f.click('#projectManageOpen');
    await f.click('#settingsOpen');
    await f.click('#settingsClose');
    assert.ok(f.element('#content #projectManagement'));
    await f.click('[data-workspace-page="tasks"]');
    assert.equal(f.host.querySelector('#projectManagement'), null);
    assert.equal(f.calls.filter((call) => call.command === 'save_settings').length, saves);
  } finally {
    await f.close();
  }
});

test('프로젝트 파일 트리 시안은 현재 WBS 표시·접기·작업 보드 이동을 지원하고 문서 탭을 유지한다', async () => {
  const f = await fixture();
  try {
    assert.equal(f.element('#projectFiles .project-file').textContent, 'first.wbs');
    assert.equal(f.element('#projectTreeToggle').getAttribute('aria-expanded'), 'true');
    await f.click('#projectTreeToggle');
    assert.equal(f.element('#projectTreeToggle').getAttribute('aria-expanded'), 'false');
    assert.ok(f.element('#projectFiles').parentElement?.hidden);
    await f.click('#projectTreeToggle');
    await f.click('#projectManageOpen');
    await f.click('#projectFiles .project-file');
    assert.equal(f.store.getSnapshot().page, 'board');
    assert.equal(f.store.getSnapshot().activePath, first);
    assert.equal(f.host.querySelectorAll('[data-tab-index]').length, 2);
  } finally {
    await f.close();
  }
});

test('일반 메뉴의 언어 설정은 즉시 전환하고 저장 실패 시 기존 언어를 유지한다', async () => {
  const f = await fixture();
  try {
    await f.click('#settingsOpen');
    assert.equal(f.element('#settingsGeneralTab').textContent, '일반');
    await f.click('#language');
    await f.click('#language-options [data-value="en"]');
    assert.equal(f.store.getSnapshot().settings.language, 'en');
    assert.equal(f.element('#settingsGeneralTab').textContent, 'General');
    assert.equal(f.element('#settingsTitle').textContent, 'App settings');
    assert.equal(document.documentElement.lang, 'en');
    await f.click('#settingsAboutTab');
    assert.equal(f.element('#updateTitle').textContent, 'Updates have not been checked');
    await f.click('#settingsClose');
    assert.equal(f.element('#workspacePageTitle').textContent, 'Task board');
    assert.match(f.element('#content').textContent!, /In progress/);
    assert.match(f.element('#content').textContent!, /댓글 구현/);
    await f.click('[data-view="flow"]');
    assert.match(f.element('.chart-adapter').textContent!, /Dependency stage/);
    assert.doesNotMatch(f.element('.chart-adapter').textContent!, /선행 단계/);
    await f.click('#settingsOpen');
    f.setSaveFailure(true);
    await f.click('#language');
    await f.click('#language-options [data-value="ko"]');
    assert.equal(f.store.getSnapshot().settings.language, 'en');
    assert.match(f.element('#settingsError').textContent!, /Could not save settings/);
    f.setSaveFailure(false);
    await f.click('#language');
    await f.click('#language-options [data-value="ko"]');
    assert.equal(f.element('#settingsGeneralTab').textContent, '일반');
    assert.equal(document.documentElement.lang, 'ko');
  } finally {
    await f.close();
  }
});

test('문서 오류는 선택 언어로 표시하고 언어 전환 후에도 원본 위치를 유지한다', async () => {
  const f = await fixture({ language: 'en' });
  try {
    assert.equal(f.element('#workspacePageTitle').textContent, 'Task board');
    f.files.set(first, source.replace(' | doing |', ' | invalid |'));
    await act(async () => f.store.poll());
    assert.ok(f.store.problems.length);
    assert.equal(f.store.problems[0].field, 'Status');
    assert.equal(f.store.problems[0].reason, 'invalid status');
    const positions = f.store.problems[0].positions;
    await f.click('#error');
    assert.match(f.element('#problemsBody').textContent!, /invalid status/);
    assert.match(f.element('#error').textContent!, /invalid status/);
    assert.ok(f.store.problems[0].positions.length);
    await f.click('#settingsOpen');
    await f.click('#language');
    await f.click('#language-options [data-value="ko"]');
    assert.equal(f.store.problems[0].field, '상태');
    assert.equal(f.store.problems[0].reason, '상태 오류');
    assert.deepEqual(f.store.problems[0].positions, positions);
    await f.click('#settingsClose');
    assert.match(f.element('#problemsBody').textContent!, /상태 오류/);
    assert.match(f.element('#error').textContent!, /상태 오류/);
  } finally {
    await f.close();
  }
});
