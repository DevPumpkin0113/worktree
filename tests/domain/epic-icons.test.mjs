import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EPIC_ICONS, LUCIDE_EPIC_ICONS, DEFAULT_EPIC_ICON, DEFAULT_EPIC_EMOJI, EPIC_ICON_EMOJIS, isEpicIcon, isEpicEmoji, isLucideEpicIcon, lucideEpicIconName } from '@worktree/core/epic-icons';
import { projectFixture, timestamp } from '../helpers/project-fixture.ts';
import { parseProject } from '@worktree/core/project-document';
import { readSource, serializeSource } from '@worktree/core/project-source';
import { projectTaskDraft, updateProjectTask } from '@worktree/core/task-editing';
import { readTaskFile, writeTaskFile } from '@worktree/core/task-file';
import { validateTaskDraft } from '@worktree/core/task-draft-validation';

function create(icon) {
  const source = projectFixture();
  const draft = { ...projectTaskDraft(source), type: 'epic', name: 'Epic', ...(icon === undefined ? {} : { icon }) };
  return updateProjectTask(source, draft, undefined, timestamp);
}
function metadata(text) { const file = 'epics/EP001.md'; return readTaskFile(file, readSource(text).files[file]).metadata; }

test('epic icon catalog validates only supported values and legacy drafts default without storing it', () => {
  assert.deepEqual(EPIC_ICONS, ['layers', 'folder', 'desktop', 'terminal', 'tools', 'rocket']);
  assert.equal(DEFAULT_EPIC_ICON, 'lucide:layers');
  assert.equal(DEFAULT_EPIC_EMOJI, '🗂️');
  assert.deepEqual(EPIC_ICON_EMOJIS, { layers: '🗂️', folder: '📁', desktop: '🖥️', terminal: '💻', tools: '🛠️', rocket: '🚀' });
  for (const value of EPIC_ICONS) assert.equal(isEpicIcon(value), true);
  for (const value of ['-', 'unknown', '', 'Layers', null, 1, {}]) assert.equal(isEpicIcon(value), false);
  const legacy = create().text, before = readSource(legacy).files['epics/EP001.md'];
  assert.equal(parseProject(legacy).rows.find(row => row.epic).icon, undefined);
  const draft = projectTaskDraft(legacy, 'EP001'); assert.equal(draft.icon, 'lucide:layers');
  assert.equal(readSource(legacy).files['epics/EP001.md'], before);
  const renamed = updateProjectTask(legacy, { ...draft, name: 'Renamed' }, 'EP001', timestamp).text;
  assert.equal(metadata(renamed).icon, undefined);
  assert.equal(JSON.parse(readSource(renamed).files['project.json']).schemaVersion, 1);
});

test('one complete Unicode emoji accepts composed sequences and rejects surrounding text or multiple emoji', () => {
  const accepted = ['🚀', '🗂️', '👨‍👩‍👧‍👦', '🇰🇷', '👩🏽‍💻', '1️⃣'];
  for (const emoji of accepted) {
    assert.equal(isEpicEmoji(emoji), true, emoji);
    assert.equal(isEpicIcon(emoji), true, emoji);
    const created = create(emoji);
    assert.equal(metadata(created.text).icon, emoji);
    assert.equal(parseProject(created.text).rows.find(row => row.epic).icon, emoji);
    const edited = updateProjectTask(created.text, { ...projectTaskDraft(created.text, 'EP001'), name: 'Renamed emoji' }, 'EP001', timestamp);
    assert.equal(metadata(edited.text).icon, emoji);
  }
  for (const invalid of ['🚀🚀', '👨‍👩‍👧‍👦🇰🇷', 'icon 🚀', '🚀 icon', ' 🚀', '🚀\n', '🚀\0', '👩‍', '🏽', '🦰', '🇰', '\uFE0F', '\u200D', '1', '', 'layers', null]) {
    assert.equal(isEpicEmoji(invalid), false, String(invalid));
    if (invalid !== 'layers') assert.equal(isEpicIcon(invalid), false, String(invalid));
  }
});

test('Lucide values use an explicit namespace and approved catalog while preserving selected names', () => {
  assert.equal(new Set(LUCIDE_EPIC_ICONS).size, LUCIDE_EPIC_ICONS.length);
  for (const name of LUCIDE_EPIC_ICONS) {
    assert.equal(isLucideEpicIcon(`lucide:${name}`), true);
    assert.equal(lucideEpicIconName(`lucide:${name}`), name);
    assert.equal(isEpicIcon(`lucide:${name}`), true);
  }
  for (const value of ['lucide:', 'lucide:bogus', 'lucide:Folder', 'lucide:folder ', 'lucide:folder\n', 'lucide:folder:extra', 'folder', '🚀', '<svg/>', 'https://example.com/icon.svg', null]) {
    assert.equal(isLucideEpicIcon(value), false, String(value));
    assert.equal(lucideEpicIconName(value), undefined, String(value));
  }
  for (const icon of ['lucide:folder', 'lucide:panels-top-left', 'lucide:chart-no-axes-combined']) {
    const created = create(icon);
    assert.equal(metadata(created.text).icon, icon);
    const edited = updateProjectTask(created.text, { ...projectTaskDraft(created.text, 'EP001'), name: 'Updated Lucide' }, 'EP001', timestamp);
    assert.equal(metadata(edited.text).icon, icon);
    assert.equal(parseProject(edited.text).rows.find(row => row.epic).icon, icon);
  }
  const source = create().text;
  for (const id of ['MS001', 'W001']) assert.throws(() => updateProjectTask(source, { ...projectTaskDraft(source, id), icon: 'lucide:folder' }, id, timestamp), error => error.field === 'icon');
  assert.equal(isEpicIcon('lucide:bogus'), false);
});
test('selected icons round trip, survive unrelated edits and reset layers to optional absence', () => {
  for (const icon of EPIC_ICONS.filter(value => value !== DEFAULT_EPIC_ICON)) {
    let text = create(icon).text;
    assert.equal(metadata(text).icon, icon);
    assert.equal(parseProject(text).rows.find(row => row.epic).icon, icon);
    text = updateProjectTask(text, { ...projectTaskDraft(text, 'EP001'), name: 'Updated' }, 'EP001', timestamp).text;
    assert.equal(metadata(text).icon, icon);
    text = updateProjectTask(text, { ...projectTaskDraft(text, 'EP001'), icon: 'lucide:layers' }, 'EP001', timestamp).text;
    assert.equal(metadata(text).icon, undefined);
    assert.equal(projectTaskDraft(text, 'EP001').icon, 'lucide:layers');
  }
});
test('invalid icon metadata and icon fields on issues or milestones are rejected at the boundary', () => {
  const text = create().text;
  for (const [file, icon] of [['epics/EP001.md', 'unknown'], ['epics/EP001.md', null], ['tasks/W001.md', 'folder'], ['milestones/MS001.md', 'folder']]) {
    const source = readSource(text), entry = readTaskFile(file, source.files[file]);
    entry.metadata.icon = icon; source.files[file] = writeTaskFile(entry.metadata, entry.description);
    assert.throws(() => parseProject(serializeSource(source)), error => error.file === file && error.field === 'icon');
  }
  for (const id of ['EP001', 'MS001', 'W001']) {
    const draft = { ...projectTaskDraft(text, id), icon: id === 'EP001' ? 'unknown' : 'folder' };
    assert.throws(() => updateProjectTask(text, draft, id, timestamp), error => error.field === 'icon');
    assert.ok(validateTaskDraft(text, draft, id).icon);
  }
});

 test('epic colors validate, persist on partial edits and clear without changing icons', () => {
  let text = create('lucide:folder').text;
  text = updateProjectTask(text, { ...projectTaskDraft(text, 'EP001'), iconColor: '#EF4444' }, 'EP001', timestamp).text;
  assert.equal(parseProject(text).rows.find(row => row.epic).iconColor, '#ef4444');
  const draft = projectTaskDraft(text, 'EP001'); delete draft.iconColor;
  text = updateProjectTask(text, { ...draft, name: 'Partial' }, 'EP001', timestamp).text;
  assert.equal(metadata(text).iconColor, '#ef4444');
  for (const value of ['red', '#abc', '#1234567', 'url(x)', '#ff0000\n', null]) {
    assert.throws(() => updateProjectTask(text, { ...draft, iconColor: value }, 'EP001', timestamp), error => error.field === 'iconColor');
    const source = readSource(text), file = 'epics/EP001.md', entry = readTaskFile(file, source.files[file]);
    entry.metadata.iconColor = value; source.files[file] = writeTaskFile(entry.metadata, entry.description);
    assert.throws(() => parseProject(serializeSource(source)), error => error.field === 'iconColor');
  }
  for (const id of ['MS001', 'W001']) assert.throws(() => updateProjectTask(text, { ...projectTaskDraft(text, id), iconColor: '#123456' }, id, timestamp), error => error.field === 'iconColor');
  text = updateProjectTask(text, { ...projectTaskDraft(text, 'EP001'), iconColor: '-' }, 'EP001', timestamp).text;
  assert.equal(metadata(text).iconColor, undefined);
  assert.equal(metadata(text).icon, 'lucide:folder');
});
