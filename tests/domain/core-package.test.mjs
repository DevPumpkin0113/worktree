import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseProject } from '@worktree/core/project-document';
import { defaultPriorities } from '@worktree/core/project-priorities';
import { getLanguage, setLanguage } from '@worktree/core/i18n/messages';
import { projectFixture } from '../helpers/project-fixture.ts';

test('core는 데스크톱 없이 패키지 경로로 문서 처리와 언어 선택을 제공한다', () => {
  const before = getLanguage();
  try {
    setLanguage('en');
    assert.deepEqual(defaultPriorities().map(item => item.name), ['High', 'Medium', 'Low']);
    const model = parseProject(projectFixture());
    assert.equal(model.title, 'Test project');
    setLanguage('ko');
    assert.deepEqual(defaultPriorities().map(item => item.name), ['상', '중', '하']);
  } finally {
    setLanguage(before);
  }
});

test('core의 패키지 의존성은 데스크톱과 UI 런타임을 포함하지 않는다', () => {
  const core = JSON.parse(fs.readFileSync('packages/core/package.json', 'utf8'));
  assert.deepEqual(core.dependencies ?? {}, {});
  for (const file of fs.readdirSync('packages/core/src', { recursive: true })) {
    if (!file.endsWith('.ts')) continue;
    const source = fs.readFileSync('packages/core/src/' + file, 'utf8');
    assert.doesNotMatch(source, /(?:from\s*|import\s*\()['"][^'"]*(?:apps\/desktop|@worktree\/desktop|@tauri-apps|react(?:['"/]))/, file);
  }
});
