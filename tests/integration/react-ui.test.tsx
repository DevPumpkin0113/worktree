import '../helpers/dom-setup';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathKey, parentFolder, withinProject } from '../../src/domain/project-paths';
import { App } from '../../src/App';
import { WorkspaceStore } from '../../src/app/workspace-store';
import type { Platform } from '../../src/app/types';
const header =
  '## 작업 목록\n| ID | 상위 ID | 유형 | 작업명 | 산출물 / 완료 기준 | 담당자 | 상태 | 시작일 | 종료일 | 예상 공수(h) | 선행 작업 |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
const source =
  '---\nschema_version: 2\nid_prefix: OBS\nuse_effort: false\n---\n' +
  header +
  '| W001 | - | milestone | 화면 작업 | 확인 | - | auto | - | - | - | - |\n| W002 | W001 | task | 댓글 구현 | 입력 확인 | codex | doing | 2026-10-20 | 2026-10-21 | - | - |\n| W003 | W001 | task | UI 확인 | 인수 확인 | 박대호 | done | 2026-10-22 | 2026-10-23 | 2 | W002 |\n';
const first = 'C:\\QA\\first.wbs',
  second = 'C:\\QB\\second.wbs';
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
  let documentSaveFailure = false;
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
      } else if (command === 'save_document') {
        if (documentSaveFailure) throw Error('디스크 쓰기 오류');
        const path = String(args?.path);
        if (files.get(path) !== args?.expected) result = 'conflict';
        else {
          files.set(path, String(args?.text));
          result = 'saved';
        }
      } else if (command === 'scan_project') {
        const path = String(args?.path).replaceAll('/', '\\');
        const selectedPath = /\.(wbs|md|markdown)$/i.test(path) ? path : null;
        if (selectedPath && !files.has(selectedPath)) throw Error('파일 없음');
        const folder = selectedPath ? parentFolder(selectedPath).replaceAll('/', '\\') : path;
        result = {
          path: folder,
          files: [...files.keys()].filter(
            (file) =>
              withinProject(file, folder) && (/\.wbs$/i.test(file) || file === selectedPath),
          ),
          selectedPath,
        };
      } else if (command === 'pick_project') result = 'C:\\QA';
      else if (command === 'take_open_requests') result = [];
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
    setDocumentSaveFailure(value: boolean) {
      documentSaveFailure = value;
    },
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

test('프로젝트 탭 키보드 재정렬과 최근 프로젝트 열기는 세션 순서를 보존한다', async () => {
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
    assert.equal(pathKey(f.store.getSnapshot().projects[0].path), pathKey(parentFolder(second)));
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

test('프로젝트 파일 목록은 접기와 선택을 지원하며 콘텐츠 화면과 프로젝트 탭을 유지한다', async () => {
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
    assert.equal(f.store.getSnapshot().page, 'project');
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

test('폴더 하나는 프로젝트 탭 하나이며 하위 WBS 선택·보기·프로젝트 복귀와 세션 복원을 지원한다', async () => {
  const f = await fixture();
  const nested = 'C:\\QA\\planning\\next.wbs';
  try {
    f.files.set(nested, source.replace('댓글 구현', '후속 작업'));
    await f.click('#dockOpen');
    assert.equal(f.element('#projectDock .dock-label').textContent, '프로젝트');
    assert.equal(f.store.getSnapshot().projects.length, 2);
    assert.equal(f.host.querySelectorAll('#projectFiles button').length, 2);
    assert.equal(f.element('#projectTreeToggle .project-entry-title').textContent, 'QA');
    assert.equal(f.element('#projectFiles .project-folder-label span').textContent, 'planning');
    assert.equal(
      f.element('#projectFiles button[aria-label="planning/next.wbs"]').textContent,
      'next.wbs',
    );
    await f.click('#projectFiles .project-folder-label');
    assert.equal(
      f.element<HTMLDetailsElement>('#projectFiles .project-folder details').open,
      false,
    );
    assert.equal(f.store.getSnapshot().activePath, first);
    await f.click('#projectFiles .project-folder-label');
    assert.equal(f.element<HTMLDetailsElement>('#projectFiles .project-folder details').open, true);
    await f.click('#projectFiles button[aria-label="planning/next.wbs"]');
    assert.equal(f.store.getSnapshot().activePath, nested);
    assert.match(f.element('#content').textContent!, /후속 작업/);
    assert.equal(f.store.getSnapshot().projects.length, 2);
    await f.click('[data-view="gantt"]');
    await f.click('[data-tab="1"]');
    assert.equal(f.store.getSnapshot().activePath, second);
    await f.click('[data-tab="0"]');
    assert.equal(f.store.getSnapshot().activePath, nested);
    assert.equal(f.store.active?.view, 'gantt');
    await new Promise((resolve) => setTimeout(resolve, 5));
    const saved = f.calls.filter((call) => call.command === 'save_session').at(-1)?.args?.session;
    assert.ok(saved);
    const restored = new WorkspaceStore({
      ...f.store.platform,
      async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
        return command === 'load_session'
          ? (structuredClone(saved) as T)
          : f.store.platform.invoke<T>(command, args);
      },
    });
    await restored.initialize();
    assert.equal(restored.getSnapshot().projects.length, 2);
    assert.equal(restored.getSnapshot().activePath, nested);
    assert.equal(restored.active?.view, 'gantt');
    assert.equal(restored.getSnapshot().operationProblems.length, 0);
  } finally {
    await f.close();
  }
});

test('빈 프로젝트의 추가·삭제된 WBS는 새로고침으로 반영하고 닫으면 해당 프로젝트만 제거한다', async () => {
  const f = await fixture();
  try {
    await act(async () => f.store.open('C:\\empty'));
    assert.equal(f.store.getSnapshot().activePath, null);
    assert.match(f.element('#content').textContent!, /WBS 파일이 없습니다/);
    assert.equal(f.element<HTMLButtonElement>('#reload').disabled, false);
    await f.click('#projectManageOpen');
    assert.match(f.element('#projectManagement').textContent!, /empty/);
    await f.click('[data-workspace-page="board"]');
    const file = 'C:\\empty\\plan.wbs';
    f.files.set(file, source);
    await f.click('#reload');
    assert.equal(f.store.getSnapshot().activePath, file);
    f.files.delete(file);
    await f.click('#reload');
    assert.equal(f.store.getSnapshot().activePath, null);
    assert.equal(f.host.querySelectorAll('#projectFiles button').length, 0);
    await f.click('[data-close-tab="2"]');
    assert.equal(f.store.getSnapshot().projects.length, 2);
    assert.equal(f.store.getSnapshot().activePath, second);
  } finally {
    await f.close();
  }
});

test('프로젝트 검색 실패와 지연된 파일 선택은 기존 프로젝트를 덮어쓰지 않는다', async () => {
  const f = await fixture();
  const invoke = f.store.platform.invoke.bind(f.store.platform);
  try {
    f.store.platform.invoke = async <T,>(
      command: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      if (command === 'scan_project' && args?.path === 'C:\\missing') throw Error('폴더 없음');
      return invoke<T>(command, args);
    };
    await act(async () => f.store.open('C:\\missing'));
    assert.equal(f.store.getSnapshot().activePath, first);
    assert.match(f.element('#error').textContent!, /프로젝트 읽기 오류/);
    let finish: ((text: string) => void) | undefined;
    f.store.platform.invoke = async <T,>(
      command: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      if (command === 'read_document' && args?.path === first)
        return new Promise<string>((resolve) => {
          finish = resolve;
        }) as Promise<T>;
      return invoke<T>(command, args);
    };
    await act(async () => {
      const pending = f.store.selectDocument(first);
      assert.ok(finish);
      f.store.closeProject(f.store.activeProject!.path);
      finish(source);
      await pending;
    });
    assert.equal(f.store.getSnapshot().activePath, second);
    assert.equal(f.store.getSnapshot().projects.length, 1);
  } finally {
    f.store.platform.invoke = invoke;
    await f.close();
  }
});

test('직접 연 기존 Markdown도 프로젝트 새로고침과 v2 세션 복원에서 유지한다', async () => {
  const f = await fixture();
  const legacy = 'C:\\QA\\legacy.md';
  try {
    f.files.set(legacy, source);
    await act(async () => f.store.open(legacy));
    await f.click('#reload');
    assert.equal(f.store.getSnapshot().activePath, legacy);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const saved = f.calls.filter((call) => call.command === 'save_session').at(-1)?.args?.session;
    const restored = new WorkspaceStore({
      ...f.store.platform,
      async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
        return command === 'load_session'
          ? (structuredClone(saved) as T)
          : f.store.platform.invoke<T>(command, args);
      },
    });
    await restored.initialize();
    assert.equal(restored.getSnapshot().activePath, legacy);
    assert.ok(restored.active?.model);
  } finally {
    await f.close();
  }
});

test('프로젝트 탐색기 높이는 드래그·취소·키보드와 창 크기 제한을 지원한다', async () => {
  const f = await fixture();
  try {
    const handle = f.element<HTMLElement>('#projectTreeResize');
    const area = f.element<HTMLElement>('.project-files-scroll');
    const height = () => Number.parseFloat(area.style.height);
    const pointer = async (type: string, y: number) =>
      act(async () => {
        const event = new MouseEvent(type, {
          button: 0,
          clientY: y,
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(event, 'pointerId', { value: 7 });
        handle.dispatchEvent(event);
      });
    const key = async (key: string) =>
      act(async () => {
        handle.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
      });
    assert.equal(height(), 220);
    await pointer('pointerdown', 100);
    await pointer('pointermove', 200);
    await pointer('pointerup', 200);
    assert.equal(height(), 320);
    await pointer('pointerdown', 100);
    await pointer('pointermove', 10000);
    assert.equal(height(), 480);
    await key('Escape');
    assert.equal(height(), 320);
    assert.equal(document.documentElement.classList.contains('resizing-project-tree'), false);
    await key('Home');
    assert.equal(height(), 80);
    await key('ArrowDown');
    assert.equal(height(), 96);
    await key('End');
    assert.equal(height(), 480);
    await f.click('#projectTreeToggle');
    assert.equal(handle.hidden, true);
    await f.click('#projectTreeToggle');
    assert.equal(height(), 480);
    const nav = f.element('#workspaceNav');
    Object.defineProperty(nav, 'clientHeight', { configurable: true, value: 180 });
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
    });
    assert.ok(height() < 480);
    assert.equal(height(), Number(handle.getAttribute('aria-valuemax')));
    Object.defineProperty(nav, 'clientHeight', { configurable: true, value: 1000 });
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
    });
    assert.equal(height(), 480);
    await f.click('#workspaceCollapse');
    assert.equal(handle.hidden, true);
    await f.click('#workspaceCollapse');
    assert.equal(handle.hidden, false);
    assert.equal(height(), 480);
  } finally {
    await f.close();
  }
});

test('문서를 전환해도 관리·작업 목록·인사이트 화면을 유지하고 선택 문서의 정보를 표시한다', async () => {
  const f = await fixture();
  const next = 'C:\\QA\\next.wbs';
  try {
    f.files.set(
      next,
      source
        .replace('id_prefix: OBS', 'id_prefix: NEXT')
        .replace('use_effort: false', 'use_effort: true')
        .replace('댓글 구현', 'B 문서 작업'),
    );
    await act(async () => f.store.open('C:\\QA'));
    await f.click('#projectManageOpen');
    await f.click('#projectFiles button[aria-label="next.wbs"]');
    assert.equal(f.store.getSnapshot().page, 'project');
    assert.match(f.element('#projectManagement').textContent!, /NEXT/);
    assert.ok(f.element('#projectManagement').textContent!.includes(next));
    assert.doesNotMatch(f.element('#projectManagement').textContent!, /OBS/);
    await f.click('#projectFiles button[aria-label="first.wbs"]');
    assert.equal(f.store.getSnapshot().page, 'project');
    assert.match(f.element('#projectManagement').textContent!, /OBS/);
    assert.ok(f.element('#projectManagement').textContent!.includes(first));
    for (const page of ['tasks', 'analytics'] as const) {
      await f.click(`[data-workspace-page="${page}"]`);
      await f.click('#projectFiles button[aria-label="next.wbs"]');
      assert.equal(f.store.getSnapshot().page, page);
      assert.ok(f.host.querySelector(page === 'tasks' ? '.all-tasks' : '.analytics-intro'));
      if (page === 'tasks') assert.match(f.element('.all-tasks').textContent!, /B 문서 작업/);
      await f.click('#projectFiles button[aria-label="first.wbs"]');
      assert.equal(f.store.getSnapshot().page, page);
    }
  } finally {
    await f.close();
  }
});

test('작업 수정은 원본 ID·문서 설명을 유지하고 저장 실패 및 외부 변경 시 입력을 보존한다', async () => {
  const f = await fixture();
  try {
    await f.click('[data-id="W002"]');
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-deps', 'W002');
    assert.equal(f.host.querySelector('#taskEditor-deps-options [data-value="W002"]'), null);
    assert.match(f.element('#taskEditor-deps-options').textContent!, /검색 결과가 없습니다/);
    await f.value('#taskEditor-deps', '');
    await f.value('#taskEditor-name', '수정한 작업');
    await f.click('#taskEditorSave');
    assert.equal(f.host.querySelector('#taskEditor'), null);
    assert.equal(f.files.get(first), source.replace('댓글 구현', '수정한 작업'));
    assert.equal(f.store.active?.model?.rows.find((row) => row.id === 'W002')?.name, '수정한 작업');
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '저장 실패 초안');
    f.setDocumentSaveFailure(true);
    await f.click('#taskEditorSave');
    assert.match(f.element('#taskEditorError').textContent!, /디스크 쓰기 오류/);
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '저장 실패 초안');
    f.setDocumentSaveFailure(false);
    f.files.set(first, f.files.get(first)!.replace('수정한 작업', '외부 수정'));
    await f.click('#taskEditorSave');
    assert.match(f.element('#taskEditorError').textContent!, /외부에서 문서가 변경/);
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '저장 실패 초안');
    assert.match(f.files.get(first)!, /외부 수정/);
    await f.click('#taskEditorCancel');
  } finally {
    await f.close();
  }
});

test('작업 추가는 자동 ID로 검증·저장하고 취소는 원본을 변경하지 않는다', async () => {
  const f = await fixture();
  try {
    await f.click('#taskAddOpen');
    await f.value('#taskEditor-name', '새 작업');
    await f.value('#taskEditor-criteria', '완료 확인');
    await f.click('#taskEditorSave');
    const added = f.store.active?.model?.rows.find((row) => row.id === 'OBS004');
    assert.equal(added?.name, '새 작업');
    assert.equal(added?.criteria, '완료 확인');
    assert.equal(f.store.getSnapshot().selectedId, 'OBS004');
    const saved = f.files.get(first);
    await f.click('#taskAddOpen');
    await f.value('#taskEditor-name', '취소할 작업');
    await f.click('#taskEditorCancel');
    assert.equal(f.files.get(first), saved);
  } finally {
    await f.close();
  }
});

test('선행 작업은 이름·ID 검색으로 여러 개 선택·해제하고 원본 ID로 저장한다', async () => {
  const f = await fixture();
  try {
    await f.click('#taskAddOpen');
    await f.value('#taskEditor-name', '후속 작업');
    await f.value('#taskEditor-criteria', '완료 확인');
    await f.value('#taskEditor-deps', '댓글');
    assert.equal(f.host.querySelectorAll('#taskEditor-deps-options [role="option"]').length, 1);
    await f.click('#taskEditor-deps-options [data-value="W002"]');
    assert.match(f.element('.search-multi-selected').textContent!, /W002 · 댓글 구현/);
    await f.value('#taskEditor-deps', 'W003');
    await act(async () => {
      f.element('#taskEditor-deps').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      );
      f.element('#taskEditor-deps').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
    });
    assert.equal(f.host.querySelectorAll('.search-multi-selected li').length, 2);
    await act(async () => {
      f.element('#taskEditor-deps').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    assert.equal(f.host.querySelector('#taskEditor-deps-options'), null);
    assert.ok(f.host.querySelector('#taskEditor'));
    await f.click('.search-multi-selected li:first-child button');
    assert.equal(f.host.querySelectorAll('.search-multi-selected li').length, 1);
    await f.value('#taskEditor-deps', 'W001');
    assert.equal(f.host.querySelector('#taskEditor-deps-options [data-value="W001"]'), null);
    await f.value('#taskEditor-deps', 'W002');
    await f.click('#taskEditor-deps-options [data-value="W002"]');
    await f.click('#taskEditorSave');
    const added = f.store.active?.model?.rows.find((row) => row.id === 'OBS004');
    assert.deepEqual(added?.deps, ['W003', 'W002']);
    await f.click('#taskEditOpen');
    assert.equal(f.host.querySelectorAll('.search-multi-selected li').length, 2);
    await f.click('#taskEditorCancel');
  } finally {
    await f.close();
  }
});

test('마일스톤 생성·상세는 제목과 선택 기간을 사용하고 이전 작업 필드를 숨긴다', async () => {
  const f = await fixture();
  try {
    await f.click('#milestoneAddOpen');
    assert.equal(f.host.querySelector('#taskEditor-criteria'), null);
    assert.equal(f.host.querySelector('#taskEditor-status'), null);
    await f.value('#taskEditor-name', '새 목표');
    await f.click('#taskEditorSave');
    assert.match(f.files.get(first)!, /MS001 \| - \| milestone \| 새 목표/);
    const summary = [...f.host.querySelectorAll('summary')].find((node) =>
      node.textContent?.includes('새 목표'),
    )!;
    assert.ok(summary);
    assert.doesNotMatch(summary.textContent!, /MS001/);
    await f.click('.group-detail[data-id="MS001"]');
    assert.equal(f.element('#detailTitle').textContent, '새 목표');
    assert.equal(f.host.querySelector('#detailBody .criteria-section'), null);
    assert.equal(f.host.querySelector('#detailBody .detail-relations'), null);
    assert.equal(f.host.querySelector('#detailBody .detail-identifiers'), null);
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-start', '2026-10-21');
    await f.value('#taskEditor-end', '2026-11-01');
    await f.click('#taskEditorSave');
    assert.match(f.files.get(first)!, /2026-10-21 \| 2026-11-01/);
  } finally {
    await f.close();
  }
});

test('이전 WBS는 변환·저장하지 않고 규격 오류를 표시하며 v2로 복구할 수 있다', async () => {
  const f = await fixture();
  try {
    const legacy = source.replace('schema_version: 2', 'schema_version: 1');
    f.files.set(first, legacy);
    await act(async () => f.store.open(first));
    await f.click('#error');
    assert.match(f.element('#problemsBody').textContent!, /schema_version/);
    assert.equal(f.host.querySelector('#taskAddOpen'), null);
    assert.equal(f.files.get(first), legacy);
    assert.equal(
      f.calls.some((call) => call.command === 'save_document'),
      false,
    );
    f.files.set(first, source);
    await act(async () => f.store.poll());
    assert.match(f.element('#content').textContent!, /댓글 구현/);
    assert.ok(f.element('#documentProblems').hidden);
  } finally {
    await f.close();
  }
});

test('작업 삭제는 취소·참조 해제 선택·저장 오류·외부 충돌을 처리한다', async () => {
  const f = await fixture();
  try {
    await f.click('[data-id="W002"].task');
    await f.click('#taskDeleteOpen');
    assert.equal(f.element<HTMLButtonElement>('#taskDeleteConfirm').disabled, true);
    await f.click('#taskDeleteCancel');
    assert.equal(f.files.get(first), source);
    await f.click('#taskDeleteOpen');
    await f.click('#deleteDetachPredecessors');
    f.setDocumentSaveFailure(true);
    await f.click('#taskDeleteConfirm');
    assert.match(f.element('#taskDeleteError').textContent!, /디스크 쓰기 오류/);
    assert.equal(f.element<HTMLInputElement>('#deleteDetachPredecessors').checked, true);
    assert.equal(f.files.get(first), source);
    f.setDocumentSaveFailure(false);
    f.files.set(first, source.replace('입력 확인', '외부 수정'));
    await f.click('#taskDeleteConfirm');
    assert.match(f.element('#taskDeleteError').textContent!, /외부에서/);
    assert.match(f.files.get(first)!, /외부 수정/);
    await f.click('#taskDeleteCancel');
    await act(async () => f.store.poll());
    await f.click('[data-id="W002"].task');
    await f.click('#taskDeleteOpen');
    await f.click('#deleteDetachPredecessors');
    await f.click('#taskDeleteConfirm');
    assert.equal(f.host.querySelector('#taskDeleteDialog'), null);
    assert.doesNotMatch(f.files.get(first)!, /\| W002 \|/);
    assert.equal(f.store.active?.model?.rows.find((row) => row.id === 'W003')?.deps.length, 0);
  } finally {
    await f.close();
  }
});

test('마일스톤 삭제창의 기본 선택은 하위 작업 유지이며 함께 삭제도 선택할 수 있다', async () => {
  for (const removeChildren of [false, true]) {
    const f = await fixture();
    try {
      await f.click('.group-detail[data-id="W001"]');
      await f.click('#taskDeleteOpen');
      assert.ok(f.element<HTMLInputElement>('input[name="deleteChildren"][value="keep"]').checked);
      if (removeChildren) await f.click('input[name="deleteChildren"][value="delete"]');
      await f.click('#taskDeleteConfirm');
      assert.equal(f.store.active?.model?.rows.length, removeChildren ? 0 : 2);
      assert.ok(f.store.active?.model?.rows.every((row) => row.parent === '-'));
      if (removeChildren) assert.equal(f.host.querySelector('.unassigned-tasks'), null);
      else assert.match(f.element('.unassigned-tasks summary').textContent!, /미지정.*1\/2 · 50%/);
      assert.equal(f.store.active?.model?.rows.filter((row) => row.milestone).length, 0);
    } finally {
      await f.close();
    }
  }
});

test('미지정 묶음은 마일스톤 아래에 표시하고 전체 진행률·필터·접힘을 유지한다', async () => {
  const f = await fixture();
  try {
    assert.equal(f.host.querySelector('.unassigned-tasks'), null);
    const text =
      source +
      '| W004 | - | task | 미소속 구현 | 확인 | codex | todo | - | - | - | - |\n| W005 | - | task | 미소속 검토 | 확인 | 박대호 | done | - | - | - | - |\n';
    f.files.set(first, text);
    await act(async () => f.store.open(first));
    const groups = [...f.host.querySelectorAll('#content > details.group')];
    assert.equal(groups.length, 2);
    assert.ok(groups[1].classList.contains('unassigned-tasks'));
    assert.match(f.element('.unassigned-tasks summary').textContent!, /미지정.*1\/2 · 50%/);
    assert.equal(f.host.querySelector('.unassigned-tasks [data-work-id]'), null);
    assert.equal(f.host.querySelector('.unassigned-tasks .group-detail'), null);
    assert.equal(f.store.active?.model?.rows.filter((row) => row.milestone).length, 1);
    await act(async () => {
      const group = f.element<HTMLDetailsElement>('.unassigned-tasks');
      group.open = false;
      group.dispatchEvent(new Event('toggle'));
    });
    await f.click('[data-view="board"]');
    await f.click('[data-view="tree"]');
    assert.equal(f.element<HTMLDetailsElement>('.unassigned-tasks').open, false);
    await f.value('#search', '댓글');
    assert.equal(f.host.querySelector('.unassigned-tasks'), null);
    await f.value('#search', '미소속 구현');
    assert.equal(f.element<HTMLDetailsElement>('.unassigned-tasks').open, false);
    assert.match(f.element('.unassigned-tasks summary').textContent!, /1\/2 · 50%/);
    assert.equal(f.host.querySelectorAll('.unassigned-tasks .task').length, 1);
    await f.value('#search', '');
    await f.click('.unassigned-tasks .task[data-id="W004"]');
    assert.match(f.element('#detailTitle').textContent!, /미소속 구현/);
    f.files.set(first, text.replace('미소속 구현', '미소속 구현 변경'));
    await act(async () => f.store.poll());
    assert.equal(f.element<HTMLDetailsElement>('.unassigned-tasks').open, false);
    assert.equal(f.files.get(first), text.replace('미소속 구현', '미소속 구현 변경'));
    assert.equal(
      f.calls.some((call) => call.command === 'save_document'),
      false,
    );
  } finally {
    await f.close();
  }
});
