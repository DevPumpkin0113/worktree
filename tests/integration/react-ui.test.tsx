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
    assert.equal(f.store.getSnapshot().page, 'tasks');
    assert.equal(f.store.active?.model?.title, '둘째 프로젝트');
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
    assert.ok(f.host.querySelector('#projectInit-submit'));
    await f.value('#projectInit-name', '신규 프로젝트');
    await f.value('#projectInit-directory', 'docs/custom');
    await f.value('#projectInit-prefix', 'DEV');
    await act(async () => {
      f.element('.project-initializer form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(f.store.active?.model?.idPrefix, 'DEV');
    assert.equal(f.store.active?.model?.dataDirectory, 'docs/custom');
    assert.equal(f.store.active?.model?.rows.length, 0);
    assert.ok(f.host.querySelector('#taskAddOpen'));
    assert.equal(f.host.querySelector('#projectInit-submit'), null);
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
    await f.value('#projectInit-name', '유지할 이름');
    f.setSaveFailure(true);
    await act(async () => {
      f.element('.project-initializer form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.match(f.element('[role="alert"]').textContent ?? '', /disk failure/);
    assert.equal(f.element<HTMLInputElement>('#projectInit-name').value, '유지할 이름');
    assert.equal(f.store.active, null);
    f.setSaveFailure(false);
    await act(async () => {
      f.element('.project-initializer form').dispatchEvent(
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
    await f.value('#projectSettings-taskTypes', 'feature, bug, improvement, task, 운영');
    await f.value('#projectSettings-labels', 'ui, backend');
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
    await f.value('#projectSettings-taskTypes', 'bug');
    await f.click('#projectSettings-save');
    assert.match(f.element('#projectSettings-error').textContent ?? '', /feature/);
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
    await f.click('#projectEditOpen');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '둘째 프로젝트');
  } finally {
    await f.close();
  }
});
