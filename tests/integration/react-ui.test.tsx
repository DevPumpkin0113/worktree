import '../helpers/dom-setup';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { App } from '../../src/App';
import { WorkspaceStore } from '../../src/app/workspace-store';
import { emptySession } from '../../src/platform/session-storage';
import { pathKey, parentFolder } from '../../src/domain/project-paths';
import { projectFixture } from '../helpers/project-fixture';
import { parseProject } from '../../src/domain/project-document';
import { readSource, serializeSource } from '../../src/domain/project-source';
import { deleteProjectTask } from '../../src/domain/task-deletion';
import type { Platform } from '../../src/app/types';
const first = 'C:/QA/worktree.json',
  second = 'C:/QB/worktree.json';
async function fixture(options: { sessionFailure?: boolean; language?: 'ko' | 'en' } = {}) {
  const files = new Map([
    [first, projectFixture('첫 프로젝트')],
    [second, projectFixture('둘째 프로젝트')],
  ]);
  let saveFailure = false,
    settingsFailure = false;
  const calls: { command: string; args?: Record<string, unknown> }[] = [];
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
            autoCheckUpdates: false,
          },
          warning: '',
        };
      else if (command === 'save_settings') {
        if (settingsFailure) throw Error('settings write failure');
        result = args?.settings;
      } else if (command === 'load_session') {
        if (options.sessionFailure) throw Error('session failure');
        result = {
          ...emptySession(),
          projects: [
            { path: 'C:/QA', activePath: first },
            { path: 'C:/QB', activePath: second },
          ],
          activeProjectPath: 'C:/QA',
          tabs: [
            { path: first, view: 'tree', ganttUnit: 'day' },
            { path: second, view: 'board', ganttUnit: 'week' },
          ],
          activePath: first,
          recentProjects: ['C:/QA', 'C:/QB'],
        };
      } else if (command === 'scan_project') {
        const path = String(args?.path).replaceAll('\\', '/');
        if (path === 'C:/missing') throw Error('missing folder');
        const root = path.endsWith('/worktree.json') ? parentFolder(path) : path;
        const marker = [...files.keys()].find(
          (file) => pathKey(file) === pathKey(root + '/worktree.json'),
        );
        result = { path: root, files: marker ? [marker] : [], selectedPath: marker ?? null };
      } else if (command === 'read_project') {
        const text = files.get(String(args?.path));
        if (!text) throw Error('missing project');
        result = text;
      } else if (command === 'save_project') {
        if (saveFailure) throw Error('disk failure');
        const path = String(args?.path);
        if (files.get(path) !== args?.expected) result = 'conflict';
        else {
          files.set(path, String(args?.text));
          result = 'saved';
        }
      } else if (command === 'initialize_project') {
        if (saveFailure) throw Error('disk failure');
        const key = String(args?.path) + '/worktree.json';
        if (files.has(key)) throw Error('exists');
        const source = readSource(projectFixture(String(args?.name), String(args?.taskPrefix)));
        const config = JSON.parse(source.files['project.json']);
        config.nextTaskNumber = 1;
        config.nextMilestoneNumber = 1;
        config.useEffort = args?.useEffort;
        config.idSeparator = args?.idSeparator;
        Object.assign(config, args?.rules);
        source.dataDirectory = String(args?.dataDirectory);
        source.files = { 'project.json': JSON.stringify(config) };
        files.set(key, serializeSource(source));
      } else if (command === 'pick_project') result = 'C:/QA';
      else if (command === 'take_open_requests') result = [];
      else if (command === 'get_build_info')
        result = {
          version: '0.24.0',
          builtAt: '1792500000',
          channel: 'development',
          commit: 'abc123',
          platform: 'windows',
        };
      else if (command === 'check_app_update')
        result = { kind: 'latest', version: '0.24.0', notes: '' };
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
      element<HTMLElement>(selector).click();
    });
  const value = async (selector: string, value: string) =>
    act(async () => {
      const node = element<HTMLInputElement | HTMLTextAreaElement>(selector);
      const prototype =
        node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(node, value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
    });
  const addBadge = async (selector: string, text: string) => {
    await value(selector, text);
    await click(selector + '-add');
  };
  const clearBadges = async (selector: string) => {
    while (host.querySelector(selector + '-badges .value-badge > button:not(:disabled)'))
      await click(selector + '-badges .value-badge > button:not(:disabled)');
  };
  const submit = async () =>
    act(async () => {
      element('#taskEditor form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
  return {
    store,
    host,
    files,
    calls,
    platform,
    element,
    click,
    value,
    submit,
    addBadge,
    clearBadges,
    setSaveFailure: (value: boolean) => {
      saveFailure = value;
    },
    setSettingsFailure: (value: boolean) => {
      settingsFailure = value;
    },
    async close() {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}

test('프로젝트 하나에 문서 집합 하나를 표시하며 파일 트리 없이 페이지·프로젝트를 전환한다', async () => {
  const f = await fixture();
  try {
    assert.equal(f.store.getSnapshot().projects.length, 2);
    assert.equal(f.host.querySelector('#projectFiles'), null);
    assert.equal(f.host.querySelector('#projectTreeResize'), null);
    assert.ok(f.host.textContent?.includes('첫 프로젝트'));
    await f.click('[data-workspace-page="tasks"]');
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.getSnapshot().page, 'board');
    assert.equal(f.store.active?.model?.title, '둘째 프로젝트');
    await f.click('[data-workspace-page="analytics"]');
    await act(() => f.store.selectProject('C:/QA'));
    assert.equal(f.store.getSnapshot().page, 'tasks');
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.getSnapshot().page, 'analytics');
    await f.click('#projectManageOpen');
    assert.ok(f.host.textContent?.includes('docs/worktree'));
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    assert.equal(f.host.querySelector('#projectManagement dialog'), null);
    await f.click('#workspaceCollapse');
    assert.ok(document.documentElement.classList.contains('workspace-nav-collapsed'));
  } finally {
    await f.close();
  }
});
test('초기화하지 않은 폴더는 생성 화면을 제공하고 지정 위치·프리픽스를 전달한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    assert.ok(f.host.querySelector('.initialization-steps'));
    assert.equal(f.element('#workspace').getAttribute('data-page'), 'initialize');
    await f.value('#initialization-name', '신규 프로젝트');
    await f.click('#initializationNext');
    await f.value('#initialization-directory', 'docs/custom');
    await f.value('#initialization-prefix', 'DEV');
    await f.click('#initializationNext');
    await act(async () => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(f.store.active?.model?.idPrefix, 'DEV');
    assert.equal(f.store.active?.model?.dataDirectory, 'docs/custom');
    assert.equal(f.store.active?.model?.rows.length, 0);
    assert.ok(f.host.querySelector('#taskAddOpen'));
    assert.equal(f.host.querySelector('#initializationSubmit'), null);
    await f.click('#taskAddOpen');
    assert.equal(f.element<HTMLInputElement>('#taskEditor input[readonly]').value, 'DEV001');
  } finally {
    await f.close();
  }
});
test('초기화 실패 시 입력을 유지하고 재시도한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    await f.value('#initialization-name', '유지할 이름');
    await f.click('#initializationNext');
    await f.click('#initializationNext');
    f.setSaveFailure(true);
    await act(async () => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.match(f.element('[role="alert"]').textContent ?? '', /disk failure/);
    await f.click('.initialization-steps nav button');
    assert.equal(f.element<HTMLInputElement>('#initialization-name').value, '유지할 이름');
    await f.click('#initializationNext');
    await f.click('#initializationNext');
    assert.equal(f.store.active, null);
    f.setSaveFailure(false);
    await act(async () => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(
      f.store.getSnapshot().documents.find((doc) => doc.path === 'C:/NEW/worktree.json')?.model
        ?.title,
      '유지할 이름',
    );
  } finally {
    await f.close();
  }
});
test('작업은 제목만 필수이고 설명·메타데이터·참조를 개별 파일에 저장한다', async () => {
  const f = await fixture();
  try {
    await f.click('#taskAddOpen');
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').required, true);
    assert.equal(f.element<HTMLTextAreaElement>('#taskEditor-description').required, false);
    await f.value('#taskEditor-name', '신규 작업');
    await f.value('#taskEditor-description', '두 줄 설명\n<script>안전한 문자열</script>');
    await f.value('#taskEditor-labels', 'ui, new');
    await f.value('#taskEditor-blockedReason', '외부 확인 대기');
    await f.click('#taskEditor-priority');
    await f.click('#taskEditor-priority-options [role="option"][data-value="high"]');
    await f.click('#taskReference-add');
    await f.value('.task-reference-row input', 'docs/spec.md');
    await f.submit();
    assert.equal(f.host.querySelector('#taskEditor'), null);
    const row = f.store.active!.model!.rows.find((row) => row.id === 'W003')!;
    assert.match(row.description, /두 줄 설명/);
    assert.equal(row.blockedReason, '외부 확인 대기');
    assert.deepEqual(row.labels, ['ui', 'new']);
    assert.ok(row.createdAt);
    assert.ok(readSource(f.files.get(first)!).files['tasks/W003.md']);
    assert.ok(f.host.textContent?.includes('두 줄 설명'));
    assert.equal(f.host.querySelector('#taskDetail script'), null);
  } finally {
    await f.close();
  }
});
test('작업 저장 실패·외부 변경은 입력을 보존하며 취소 시 저장하지 않는다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '변경 초안');
    f.setSaveFailure(true);
    await f.submit();
    assert.match(f.element('#taskEditorError').textContent ?? '', /disk failure/);
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '변경 초안');
    assert.equal(parseProject(f.files.get(first)!).rows[1].name, '댓글 구현');
    f.setSaveFailure(false);
    const external = readSource(f.files.get(first)!);
    external.files['tasks/W002.md'] = external.files['tasks/W002.md'].replace(
      'UI 확인',
      '외부 수정',
    );
    f.files.set(first, serializeSource(external));
    await f.submit();
    assert.match(f.element('#taskEditorError').textContent ?? '', /외부/);
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '변경 초안');
    await f.click('#taskEditorCancel');
    assert.match(f.files.get(first)!, /외부 수정/);
  } finally {
    await f.close();
  }
});
test('제목 변경은 ID·파일명을 유지하고 상세에 설명과 시각을 표시한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '이름만 변경');
    await f.submit();
    assert.equal(f.store.active?.model?.rows.find((r) => r.id === 'W001')?.name, '이름만 변경');
    assert.ok(readSource(f.files.get(first)!).files['tasks/W001.md']);
    assert.ok(f.host.textContent?.includes('생성 시각'));
    assert.ok(f.host.textContent?.includes('수정 시각'));
  } finally {
    await f.close();
  }
});
test('마일스톤 생성은 제목·선택 기간을 사용하며 별도 파일로 저장한다', async () => {
  const f = await fixture();
  try {
    await f.click('#milestoneAddOpen');
    assert.equal(f.host.querySelector('#taskEditor-description'), null);
    await f.value('#taskEditor-name', '다음 출시');
    await f.submit();
    assert.ok(readSource(f.files.get(first)!).files['milestones/MS002.md']);
    assert.equal(f.store.active?.model?.rows.find((r) => r.id === 'MS002')?.name, '다음 출시');
  } finally {
    await f.close();
  }
});
test('작업 삭제는 선행 참조 해제 선택과 실패 보존을 지원한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskDeleteOpen');
    const checks = f.host.querySelectorAll<HTMLInputElement>(
      '#taskDeleteDialog input[type="checkbox"]',
    );
    assert.equal(checks.length, 1);
    assert.ok(f.element<HTMLButtonElement>('#taskDeleteConfirm').disabled);
    await act(() => checks[0].click());
    await f.click('#taskDeleteConfirm');
    assert.ok(!readSource(f.files.get(first)!).files['tasks/W001.md']);
    assert.deepEqual(f.store.active?.model?.rows.find((r) => r.id === 'W002')?.deps, []);
  } finally {
    await f.close();
  }
});
test('외부 갱신은 상세·보기를 유지하고 삭제된 선택만 닫는다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await act(() => f.store.setView('gantt'));
    const source = readSource(f.files.get(first)!);
    source.files['tasks/W001.md'] = source.files['tasks/W001.md'].replace('댓글 구현', '외부 제목');
    f.files.set(first, serializeSource(source));
    await act(() => f.store.poll());
    assert.equal(f.store.getSnapshot().selectedId, 'W001');
    assert.equal(f.store.active?.view, 'gantt');
    assert.equal(f.store.active?.model?.rows.find((r) => r.id === 'W001')?.name, '외부 제목');
    f.files.set(
      first,
      deleteProjectTask(f.files.get(first)!, 'W001', {
        children: 'keep',
        detachPredecessors: true,
      }),
    );
    await act(() => f.store.poll());
    assert.equal(f.store.getSnapshot().selectedId, null);
  } finally {
    await f.close();
  }
});
test('작업 파일 오류는 실제 파일 경로와 필드를 표시하고 정상 파일로 복구한다', async () => {
  const f = await fixture();
  try {
    const original = f.files.get(first)!;
    const bad = readSource(original);
    bad.files['tasks/W001.md'] = bad.files['tasks/W001.md'].replace(
      'status: "doing"',
      'status: "invalid"',
    );
    f.files.set(first, serializeSource(bad));
    await act(() => f.store.poll());
    assert.equal(f.store.active?.model, null);
    await f.click('#error');
    assert.ok(f.host.textContent?.includes('tasks/W001.md'));
    assert.ok(f.host.textContent?.includes('status'));
    f.files.set(first, original);
    await act(() => f.store.poll());
    assert.ok(f.store.active?.model);
    assert.equal(f.store.problems.length, 0);
  } finally {
    await f.close();
  }
});
test('손상된 세션은 저장하지 않고 프로젝트를 직접 열어 복구한다', async () => {
  const f = await fixture({ sessionFailure: true });
  try {
    assert.equal(f.store.active, null);
    await act(() => f.store.open('C:/QA'));
    assert.ok(f.store.getSnapshot().documents[0]?.model);
    assert.ok(!f.calls.some((c) => c.command === 'save_session'));
  } finally {
    await f.close();
  }
});
test('설정 저장·언어 전환과 실패 시 기존 값 유지를 지원한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('language', 'en'));
    assert.ok(f.host.textContent?.includes('Task list'));
    f.setSettingsFailure(true);
    await act(() => f.store.saveSetting('language', 'ko'));
    assert.equal(f.store.getSnapshot().settings.language, 'en');
    f.setSettingsFailure(false);
    await act(() => f.store.saveSetting('language', 'ko'));
    assert.ok(f.host.textContent?.includes('작업 목록'));
  } finally {
    await f.close();
  }
});
test('프로젝트 재정렬·닫기와 세션 저장은 프로젝트당 하나의 보기를 보존한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.reorder('C:/QB', 'C:/QA', false));
    await act(() => f.store.setView('gantt'));
    await act(() => f.store.setGanttUnit('week'));
    const saved = f.calls.filter((c) => c.command === 'save_session').at(-1)?.args?.session as {
      tabs: { path: string; view: string }[];
    };
    assert.equal(saved.tabs.length, 2);
    assert.ok(saved.tabs.some((tab) => tab.path === first && tab.view === 'gantt'));
    await act(() => f.store.closeProject('C:/QB'));
    assert.equal(f.store.getSnapshot().projects.length, 1);
    assert.equal(f.store.getSnapshot().documents.length, 1);
  } finally {
    await f.close();
  }
});
test('검색은 라벨과 설명을 포함하고 필터 드롭다운을 사용한다', async () => {
  const f = await fixture();
  try {
    await f.value('#search', '입력 확인');
    assert.ok(f.host.textContent?.includes('댓글 구현'));
    assert.ok(!f.element('#content').textContent?.includes('UI 확인'));
    await f.value('#search', '');
    await f.click('#status');
    assert.ok(f.host.querySelector('#status-options'));
    await f.click('#status-options [role="option"][data-value="done"]');
    assert.ok(f.element('#content').textContent?.includes('UI 확인'));
    assert.ok(!f.element('#content').textContent?.includes('댓글 구현'));
  } finally {
    await f.close();
  }
});

test('설정 파일이 있지만 읽기에 실패한 프로젝트에는 초기화를 제안하지 않는다', async () => {
  const f = await fixture();
  try {
    f.files.set(first, '');
    await act(() => f.store.refreshProject());
    assert.equal(f.store.active, null);
    assert.equal(f.host.querySelector('#projectInit-submit'), null);
    assert.ok(f.store.problems.length);
  } finally {
    await f.close();
  }
});
test('댓글 미리보기는 프로젝트·작업별로 초안을 분리하고 문자열을 안전하게 표시한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#previewCommentsTab');
    await f.value('#previewAuthor', '박대호');
    await f.value('#previewComment', '<script>실행하지 않음</script>');
    await act(async () => {
      f.element('.preview-comment-form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.ok(f.element('#detail').textContent?.includes('<script>실행하지 않음</script>'));
    assert.equal(f.host.querySelector('#detail script'), null);
    await act(() => f.store.selectProject('C:/QB'));
    await act(() => f.store.selectWork('W001'));
    await f.click('#previewCommentsTab');
    assert.ok(!f.element('#detail').textContent?.includes('<script>실행하지 않음</script>'));
    await act(() => f.store.selectProject('C:/QA'));
    await act(() => f.store.selectWork('W001'));
    assert.ok(f.element('#detail').textContent?.includes('<script>실행하지 않음</script>'));
  } finally {
    await f.close();
  }
});
test('프로젝트 문서 집합에서도 간트 7일·5주와 단위별 스크롤 복원을 유지한다', async () => {
  const f = await fixture();
  try {
    const data = readSource(f.files.get(first)!);
    data.files['tasks/W001.md'] = data.files['tasks/W001.md']
      .replace('start: "-"', 'start: "2026-10-01"')
      .replace('end: "-"', 'end: "2026-10-10"');
    data.files['tasks/W002.md'] = data.files['tasks/W002.md']
      .replace('start: "-"', 'start: "2026-10-11"')
      .replace('end: "-"', 'end: "2026-12-20"');
    f.files.set(first, serializeSource(data));
    await act(() => f.store.poll());
    await act(() => f.store.setView('gantt'));
    assert.equal(f.element<HTMLElement>('.gantt-scroll').dataset.visibleDays, '7');
    await act(() => {
      const scroll = f.element<HTMLElement>('.gantt-scroll');
      scroll.scrollLeft += 75;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    const saved = Number(f.element<HTMLElement>('.gantt-scroll').dataset.windowStart);
    await act(() => f.store.setGanttUnit('week'));
    assert.equal(f.element<HTMLElement>('.gantt-scroll').dataset.visibleDays, '35');
    await act(() => f.store.setGanttUnit('day'));
    assert.ok(
      Math.abs(Number(f.element<HTMLElement>('.gantt-scroll').dataset.windowStart) - saved) < 1,
    );
    await act(() => f.store.setView('tree'));
    await act(() => f.store.setView('gantt'));
    assert.ok(
      Math.abs(Number(f.element<HTMLElement>('.gantt-scroll').dataset.windowStart) - saved) < 1,
    );
  } finally {
    await f.close();
  }
});

test('프로젝트 관리는 조회·수정의 항목 순서를 유지하고 고정 값만 비활성화한다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    assert.ok(f.host.textContent?.includes('기본 정보'));
    const overviewFields = [...f.host.querySelectorAll('#projectManagement dt')].map(
      (node) => node.textContent,
    );
    await f.click('#projectInitializePreview');
    assert.ok(f.host.querySelector('.initialization-steps'));
    await f.click('#initializationNext');
    assert.ok(f.host.querySelector('#initialization-directory'));
    await f.click('#initializationNext');
    assert.ok(f.element<HTMLButtonElement>('#initializationSubmit').disabled);
    await f.click('#initializationCancel');
    assert.ok(
      !f.calls.some(
        (call) => call.command === 'initialize_project' || call.command === 'save_project',
      ),
    );
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    await f.click('#projectEditOpen');
    assert.deepEqual(
      [...f.host.querySelectorAll('#projectManagement dt')].map((node) => node.textContent),
      overviewFields,
    );
    assert.equal(f.host.querySelector('.project-fixed-settings'), null);
    assert.equal(f.element<HTMLButtonElement>('#projectSettings-save').disabled, true);
    for (let i = 0; i < 4; i++) {
      assert.ok(f.element<HTMLInputElement>('#projectFixed-' + i).disabled);
      assert.ok(f.element('#projectFixed-' + i).matches(':disabled'));
    }
    await f.value('#projectSettings-name', '프로젝트 변경');
    await f.addBadge('#projectSettings-taskTypes', '운영');
    await f.addBadge('#projectSettings-labels', 'backend');
    await f.click('#projectSettings-useEffort');
    await act(async () => {
      const form = f.element('#projectSettingsForm');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(f.calls.filter((call) => call.command === 'save_project').length, 1);
    assert.equal(f.store.active?.model?.title, '프로젝트 변경');
    assert.equal(f.store.active?.model?.useEffort, true);
    assert.ok(f.store.active?.model?.taskTypes?.includes('운영'));
    assert.ok(f.host.textContent?.includes('프로젝트 설정을 저장했습니다.'));
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    await f.click('[data-workspace-page="tasks"]');
    await f.click('#taskAddOpen');
    await f.click('#taskEditor-taskType');
    assert.ok(f.host.textContent?.includes('운영'));
  } finally {
    await f.close();
  }
});
test('프로젝트 설정의 저장 실패와 사용 중인 유형 제거는 입력과 원본을 보존한다', async () => {
  const f = await fixture();
  try {
    const original = f.files.get(first);
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.value('#projectSettings-name', '저장할 이름');
    f.setSaveFailure(true);
    await f.click('#projectSettings-save');
    assert.match(f.element('#projectSettings-error').textContent ?? '', /disk failure/);
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '저장할 이름');
    assert.equal(f.files.get(first), original);
    f.setSaveFailure(false);
    assert.equal(
      f.element<HTMLButtonElement>(
        '#projectSettings-taskTypes-badges [data-value="feature"] .value-badge > button',
      ).disabled,
      true,
    );
    await f.click('#projectSettings-taskTypes-badges [data-value="feature"] .value-badge > button');
    assert.ok(f.host.querySelector('#projectSettings-taskTypes-badges [data-value="feature"]'));
    assert.equal(f.files.get(first), original);
    await f.click('#projectSettings-reset');
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    await f.click('#projectEditOpen');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '첫 프로젝트');
    assert.equal(f.host.querySelector('#projectSettings-error'), null);
  } finally {
    await f.close();
  }
});
test('설정 편집 중 외부 변경은 초안을 유지하고 충돌 후 변경 취소로 최신 설정을 불러온다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.value('#projectSettings-name', '내 초안');
    const data = readSource(f.files.get(first)!);
    const config = JSON.parse(data.files['project.json']);
    config.name = '외부 이름';
    data.files['project.json'] = JSON.stringify(config);
    f.files.set(first, serializeSource(data));
    await act(() => f.store.poll());
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '내 초안');
    await f.click('#projectSettings-save');
    assert.match(f.element('#projectSettings-error').textContent ?? '', /외부/);
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '내 초안');
    await f.click('#projectSettings-reset');
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    await f.click('#projectEditOpen');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '외부 이름');
    assert.equal(f.element<HTMLButtonElement>('#projectSettings-save').disabled, true);
  } finally {
    await f.close();
  }
});
test('읽기 오류 중에도 프로젝트 설정 초안을 유지하고 프로젝트 전환 시 서로 섞지 않는다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.value('#projectSettings-name', '보존할 초안');
    const data = readSource(f.files.get(first)!);
    data.files['tasks/W001.md'] = data.files['tasks/W001.md'].replace(
      'status: "doing"',
      'status: "invalid"',
    );
    f.files.set(first, serializeSource(data));
    await act(() => f.store.poll());
    assert.equal(f.store.active?.model, null);
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '보존할 초안');
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    assert.equal(f.store.getSnapshot().page, 'board');
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '둘째 프로젝트');
  } finally {
    await f.close();
  }
});

test('타이틀바 좌측은 패널 접힘에 따라 아이콘만 숨기고 새로고침·창 제어를 유지한다', async () => {
  const f = await fixture();
  try {
    assert.ok(f.host.querySelector('.titlebar-workspace .app-mark'));
    assert.ok(f.host.querySelector('.titlebar-workspace #reload'));
    assert.equal(f.host.querySelector('.titlebar-workspace #settingsOpen'), null);
    await f.click('#workspaceCollapse');
    assert.equal(f.host.querySelector('.titlebar .app-mark'), null);
    assert.ok(f.host.querySelector('.titlebar-workspace #reload'));
    const before = f.calls.filter((call) => call.command === 'scan_project').length;
    await f.click('#reload');
    assert.equal(f.calls.filter((call) => call.command === 'scan_project').length, before + 1);
    const controls: string[] = [];
    f.platform.control = async (action) => {
      controls.push(action);
    };
    await f.click('#windowMinimize');
    await f.click('#windowMaximize');
    await f.click('#windowClose');
    await act(() => {
      f.element('.titlebar-workspace').dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0, detail: 1 }),
      );
    });
    assert.deepEqual(controls, ['minimize', 'maximize', 'close', 'drag']);
    await f.click('#settingsOpen');
    assert.equal(f.store.getSnapshot().settingsOpen, true);
    await f.click('#settingsOpen');
    await f.click('#workspaceCollapse');
    assert.ok(f.host.querySelector('.titlebar-workspace .app-mark'));
  } finally {
    await f.close();
  }
});

test('프로젝트별 페이지는 갱신·탭 닫기에도 해당 프로젝트의 마지막 위치를 따른다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.setPage('project'));
    await act(() => f.store.refreshProject());
    assert.equal(f.store.getSnapshot().page, 'project');
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.getSnapshot().page, 'board');
    await act(() => f.store.setPage('analytics'));
    await act(() => f.store.selectProject('C:/QA'));
    assert.equal(f.store.getSnapshot().page, 'project');
    await act(() => f.store.closeProject('C:/QA'));
    assert.equal(f.store.getSnapshot().page, 'analytics');
    await act(() => f.store.closeProject('C:/QB'));
    assert.equal(f.store.getSnapshot().page, 'board');
    await act(() => f.store.open('C:/QA'));
    assert.equal(f.store.getSnapshot().page, 'board');
  } finally {
    await f.close();
  }
});

test('하이픈 표시는 프로젝트에 저장하며 전환·재열기 시 분리하고 앱 설정에는 표시하지 않는다', async () => {
  const f = await fixture();
  try {
    const before = readSource(f.files.get(first)!);
    await f.click('#settingsOpen');
    assert.equal(f.host.querySelector('#idSeparator'), null);
    await f.click('#settingsOpen');
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.click('#projectSettings-idSeparator');
    await f.click('#projectSettings-idSeparator-option-1');
    await f.click('#projectSettings-save');
    assert.equal(f.store.active?.model?.idSeparator, 'hyphen');
    assert.equal(
      JSON.parse(readSource(f.files.get(first)!).files['project.json']).idSeparator,
      'hyphen',
    );
    for (const [file, content] of Object.entries(before.files))
      if (file !== 'project.json')
        assert.equal(readSource(f.files.get(first)!).files[file], content);
    await f.click('[data-workspace-page="tasks"]');
    assert.ok(f.element('.all-tasks').textContent?.includes('W-001'));
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.active?.model?.idSeparator, 'none');
    await act(() => f.store.closeProject('C:/QA'));
    await act(() => f.store.open('C:/QA'));
    assert.equal(f.store.active?.model?.idSeparator, 'hyphen');
    assert.ok(!f.calls.some((call) => call.command === 'save_settings'));
  } finally {
    await f.close();
  }
});

test('프로젝트 날짜·시간 형식 저장 후 상세 시각에 적용하고 다른 프로젝트와 분리한다', async () => {
  const f = await fixture();
  try {
    const original = readSource(f.files.get(first)!);
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.click('#projectSettings-format-date-separator');
    await f.click('#projectSettings-format-date-separator-option-1');
    await f.click('#projectSettings-format-time');
    await f.click('#projectSettings-format-time-option-1');
    await f.click('#projectSettings-save');
    assert.equal(f.store.active?.model?.dateFormat, 'yyyy.MM.dd');
    assert.equal(f.store.active?.model?.timeFormat, '12h');
    await act(() => f.store.selectWork('W001'));
    const shown = f.element('#detail [title="2026-10-21T00:00:00.000Z"]').textContent ?? '';
    assert.match(shown, /\d{4}\.\d{2}\.\d{2}/);
    assert.match(shown, /오전|오후|AM|PM/);
    for (const [file, text] of Object.entries(original.files))
      if (file !== 'project.json') assert.equal(readSource(f.files.get(first)!).files[file], text);
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.active?.model?.dateFormat, 'yyyy-MM-dd');
    assert.equal(f.store.active?.model?.timeFormat, '24h');
  } finally {
    await f.close();
  }
});

test('날짜 순서와 구분기호는 독립 변경하고 시간 형식과 다른 선택을 유지한다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.click('#projectSettings-format-date-order');
    await f.click('#projectSettings-format-date-order-option-1');
    await f.click('#projectSettings-format-date-separator');
    await f.click('#projectSettings-format-date-separator-option-1');
    assert.ok(f.element('.date-time-format-input small').textContent?.includes('21.10.2026'));
    await f.click('#projectSettings-format-time');
    await f.click('#projectSettings-format-time-option-1');
    await f.click('#projectSettings-format-date-order');
    await f.click('#projectSettings-format-date-order-option-2');
    assert.equal(
      f.element('#projectSettings-format-date-separator').textContent?.includes('.'),
      true,
    );
    await f.click('#projectSettings-save');
    assert.equal(f.store.active?.model?.dateFormat, 'MM.dd.yyyy');
    assert.equal(f.store.active?.model?.timeFormat, '12h');
    await f.click('#projectEditOpen');
    assert.ok(f.element('#projectSettings-format-date-order').textContent?.includes('MM dd yyyy'));
    assert.ok(f.element('#projectSettings-format-date-separator').textContent?.includes('.'));
  } finally {
    await f.close();
  }
});

test('공용 필터 목록은 상위 표시 레이어에 떠서 위치를 보정하고 키보드·바깥 클릭으로 닫힌다', async () => {
  const f = await fixture();
  const prototype = HTMLElement.prototype;
  const originalShow = Object.getOwnPropertyDescriptor(prototype, 'showPopover');
  const originalHide = Object.getOwnPropertyDescriptor(prototype, 'hidePopover');
  let shown = 0;
  Object.defineProperty(prototype, 'showPopover', {
    configurable: true,
    value() {
      shown++;
    },
  });
  Object.defineProperty(prototype, 'hidePopover', { configurable: true, value() {} });
  try {
    const trigger = f.element<HTMLButtonElement>('#status');
    let top = 600;
    trigger.getBoundingClientRect = () =>
      ({
        left: 100,
        top,
        bottom: top + 40,
        right: 242,
        width: 142,
        height: 40,
        x: 100,
        y: top,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    await f.click('#status');
    const popup = f.element<HTMLElement>('#status-options');
    assert.equal(popup.getAttribute('popover'), 'manual');
    assert.equal(shown, 1);
    assert.equal(popup.style.top, '354px');
    top = 100;
    await act(() => window.dispatchEvent(new Event('resize')));
    assert.equal(popup.style.top, '146px');
    await act(() =>
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
      ),
    );
    await act(() =>
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      ),
    );
    assert.equal(f.store.getSnapshot().status, 'done');
    assert.equal(f.host.querySelector('#status-options'), null);
    assert.equal(document.activeElement, trigger);
    await f.click('#status');
    await act(() => document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })));
    assert.equal(f.host.querySelector('#status-options'), null);
    await f.click('#status');
    await act(() =>
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    );
    assert.equal(f.host.querySelector('#status-options'), null);
  } finally {
    await f.close();
    if (originalShow) Object.defineProperty(prototype, 'showPopover', originalShow);
    else Reflect.deleteProperty(prototype, 'showPopover');
    if (originalHide) Object.defineProperty(prototype, 'hidePopover', originalHide);
    else Reflect.deleteProperty(prototype, 'hidePopover');
  }
});

test('유형·공통 라벨 뱃지는 추가·중복 차단·삭제하며 유형 색상은 저장 실패와 재열기에도 유지한다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.value('#projectSettings-taskTypes', '검토');
    await act(() =>
      f
        .element('#projectSettings-taskTypes')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        ),
    );
    assert.ok(f.host.querySelector('#projectSettings-taskTypes-badges [data-value="검토"]'));
    await f.addBadge('#projectSettings-labels', 'team');
    await f.addBadge('#projectSettings-labels', 'team');
    assert.ok(f.host.querySelector('#projectSettings-labels-error'));
    assert.equal(
      f.host.querySelectorAll('#projectSettings-labels-badges [data-value="team"]').length,
      1,
    );
    await f.value('#projectSettings-labels', '');
    await f.click('#projectSettings-labels-badges [data-value="team"] button');
    assert.equal(f.host.querySelector('#projectSettings-labels-badges [data-value="team"]'), null);
    await f.click('#projectSettings-taskTypes-badges [data-value="feature"] .badge-color-control');
    await f.value(
      '#projectSettings-taskTypes-badges [data-value="feature"] input[type="color"]',
      '#cc3300',
    );
    const badge = () =>
      f.element<HTMLElement>(
        '#projectSettings-taskTypes-badges [data-value="feature"] .value-badge',
      );
    assert.equal(badge().style.getPropertyValue('--badge-color'), '#cc3300');
    f.setSaveFailure(true);
    await f.click('#projectSettings-save');
    assert.ok(f.host.querySelector('#projectSettingsForm'));
    assert.equal(badge().style.getPropertyValue('--badge-color'), '#cc3300');
    f.setSaveFailure(false);
    await f.click('#projectSettings-save');
    assert.equal(f.store.active?.model?.taskTypeColors?.feature, '#cc3300');
    assert.ok(f.store.active?.model?.taskTypes?.includes('검토'));
    await f.click('[data-workspace-page="tasks"]');
    assert.equal(
      f
        .element<HTMLElement>('.all-task-link[data-id="W001"] .value-badge')
        .style.getPropertyValue('--badge-color'),
      '#cc3300',
    );
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.active?.model?.taskTypeColors?.feature, '#a2eeef');
    await act(() => f.store.closeProject('C:/QA'));
    await act(() => f.store.open('C:/QA'));
    assert.equal(f.store.active?.model?.taskTypeColors?.feature, '#cc3300');
  } finally {
    await f.close();
  }
});

test('프로젝트 우선순위 정렬·이름·추가와 담당자는 저장 실패 후에도 유지되고 작업 선택에 반영된다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    const ids = () =>
      [...f.host.querySelectorAll('#projectSettings-priorities li')].map(
        (node) => (node as HTMLElement).dataset.priorityId,
      );
    assert.deepEqual(ids(), ['high', 'normal', 'low']);
    assert.equal(
      f.host.querySelectorAll(
        '#projectSettings-priorities .priority-unassigned button:not(:disabled)',
      ).length,
      0,
    );
    assert.equal(
      f.element<HTMLButtonElement>(
        '#projectSettings-priorities [data-priority-id="normal"] button:last-child',
      ).disabled,
      true,
    );
    await act(async () => {
      f.element(
        '#projectSettings-priorities [data-priority-id="high"] .priority-drag',
      ).dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    assert.deepEqual(ids(), ['normal', 'high', 'low']);
    await f.value('#projectSettings-priorities [data-priority-id="normal"] input', '기본');
    await f.click('#projectSettings-priorities .priority-add');
    const customId = ids()[3]!;
    await f.value(
      '#projectSettings-priorities [data-priority-id="' + customId + '"] input',
      '긴급 검토',
    );
    await f.addBadge('#projectSettings-assignees', '팀원');
    f.setSaveFailure(true);
    await f.click('#projectSettings-save');
    assert.ok(f.host.querySelector('#projectSettingsForm'));
    assert.equal(
      f.element<HTMLInputElement>('#projectSettings-priorities [data-priority-id="normal"] input')
        .value,
      '기본',
    );
    f.setSaveFailure(false);
    await f.click('#projectSettings-save');
    assert.deepEqual(
      f.store.active?.model?.priorities?.map((p) => p.id),
      ['normal', 'high', 'low', customId],
    );
    assert.deepEqual(f.store.active?.model?.assignees, ['팀원']);
    await f.click('[data-workspace-page="tasks"]');
    await f.click('#taskAddOpen');
    assert.ok(f.element('#taskEditor-priority').textContent?.includes('미지정'));
    await f.click('#taskEditor-priority');
    await f.click('#taskEditor-priority-options [data-value="' + customId + '"]');
    await f.click('#taskEditor-owner');
    await f.click('#taskEditor-owner-options [data-value="팀원"]');
    await f.value('#taskEditor-name', '사용자 우선순위 작업');
    await f.submit();
    const row = f.store.active?.model?.rows.find((r) => r.name === '사용자 우선순위 작업');
    assert.equal(row?.priority, customId);
    assert.equal(row?.owner, '팀원');
    assert.ok(f.host.textContent?.includes('긴급 검토'));
  } finally {
    await f.close();
  }
});

test('우선순위 포인터 정렬·취소와 중복 이름 검사·기존 담당자 보존', async () => {
  const f = await fixture();
  const descriptor = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    const ids = () =>
      [...f.host.querySelectorAll('#projectSettings-priorities li')].map(
        (node) => (node as HTMLElement).dataset.priorityId,
      );
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => f.element('#projectSettings-priorities [data-priority-id="low"]'),
    });
    const handle = f.element(
      '#projectSettings-priorities [data-priority-id="high"] .priority-drag',
    );
    await act(async () => {
      handle.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    });
    await act(async () => {
      handle.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true }));
    });
    assert.deepEqual(ids(), ['normal', 'low', 'high']);
    assert.ok(f.host.querySelector('[data-priority-id="high"].priority-item-dragging'));
    assert.equal(f.element('#projectSettings-priorities ol').getAttribute('data-dragging'), 'true');
    await act(async () => {
      handle.dispatchEvent(new window.MouseEvent('pointercancel', { bubbles: true }));
    });
    assert.deepEqual(ids(), ['high', 'normal', 'low']);
    assert.equal(f.host.querySelector('.priority-item-dragging'), null);
    await f.value('#projectSettings-priorities [data-priority-id="low"] input', '중');
    await f.click('#projectSettings-save');
    assert.ok(f.host.querySelector('#projectSettingsForm'));
    await f.value('#projectSettings-priorities [data-priority-id="low"] input', '하');
    await f.click('#projectSettings-save');
    await f.click('[data-workspace-page="tasks"]');
    await f.click('[data-id="W001"]');
    await f.click('#taskEditOpen');
    assert.ok(f.element('#taskEditor-owner').textContent?.includes('codex'));
    await f.click('#taskEditor-owner');
    assert.ok(f.host.querySelector('#taskEditor-owner-options [data-value="codex"]'));
  } finally {
    if (descriptor) Object.defineProperty(document, 'elementFromPoint', descriptor);
    else Reflect.deleteProperty(document, 'elementFromPoint');
    await f.close();
  }
});

test('영어 미지정은 우선순위·담당자·마일스톤 맥락에 맞게 분리한다', async () => {
  const f = await fixture({ language: 'en' });
  try {
    await f.click('#projectManageOpen');
    assert.ok(
      f.element<HTMLInputElement>('.priority-summary .priority-unassigned input').value ===
        'No priority',
    );
    assert.equal(f.host.querySelectorAll('.priority-summary li').length, 3);
    await f.click('#projectEditOpen');
    assert.doesNotMatch(f.element('#projectSettings-priorities').textContent ?? '', /Alt\+/);
    await f.click('#projectSettings-reset');
    await f.click('[data-workspace-page="tasks"]');
    await f.click('#taskAddOpen');
    assert.ok(f.element('#taskEditor-priority').textContent?.includes('No priority'));
    assert.ok(f.element('#taskEditor-owner').textContent?.includes('Unassigned'));
    assert.ok(f.element('#taskEditor-parent').textContent?.includes('No milestone'));
  } finally {
    await f.close();
  }
});

test('우선순위 색상은 이름 대신 순서·개수로 갱신되며 미지정은 색상을 표시하지 않는다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    const color = (id: string) =>
      f
        .element<HTMLElement>('#projectSettings-priorities [data-priority-id="' + id + '"]')
        .style.getPropertyValue('--priority-color');
    assert.equal(color('high'), 'var(--color-priority-high)');
    assert.equal(color('normal'), 'var(--color-priority-middle)');
    assert.equal(color('low'), 'var(--color-priority-low)');
    await f.click('#projectSettings-priorities .priority-add');
    await f.click('#projectSettings-priorities .priority-add');
    assert.equal(color('low'), 'var(--color-priority-middle)');
    assert.match(color('normal'), /high.*50%.*middle/);
    const priorities = f.host.querySelectorAll<HTMLElement>(
      '#projectSettings-priorities [data-priority-id]',
    );
    assert.equal(
      priorities[4].style.getPropertyValue('--priority-color'),
      'var(--color-priority-low)',
    );
    assert.equal(
      f
        .element<HTMLElement>('#projectSettings-priorities .priority-unassigned')
        .style.getPropertyValue('--priority-color'),
      '',
    );
    await f.value('#projectSettings-priorities [data-priority-id="high"] input', '名前');
    assert.equal(color('high'), 'var(--color-priority-high)');
    await act(async () => {
      f.element(
        '#projectSettings-priorities [data-priority-id="high"] .priority-drag',
      ).dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    assert.equal(color('normal'), 'var(--color-priority-high)');
    await f.click('#projectSettings-save');
    await f.click('[data-workspace-page="tasks"]');
    await f.click('#taskAddOpen');
    assert.equal(f.host.querySelector('#taskEditor-priority .value-badge'), null);
    await f.click('#taskEditor-priority');
    assert.equal(
      f.host.querySelector('#taskEditor-priority-options [data-value="-"] .value-badge'),
      null,
    );
    assert.equal(
      f
        .element<HTMLElement>('#taskEditor-priority-options [data-value="normal"] .value-badge')
        .style.getPropertyValue('--badge-color'),
      'var(--color-priority-high)',
    );
  } finally {
    await f.close();
  }
});
