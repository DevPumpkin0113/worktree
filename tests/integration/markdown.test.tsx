import '../helpers/dom-setup';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MarkdownContent,
  markdownUrl,
} from '../../apps/desktop/src/components/task-detail/MarkdownContent';
import { MarkdownDescriptionEditor } from '../../apps/desktop/src/components/task-detail/MarkdownDescriptionEditor';

test('설명은 제목·목록·체크리스트·표·코드·인용을 Markdown으로 표시한다', () => {
  const text =
    '# 제목\n\n- [x] 완료\n- [ ] 대기\n\n> 인용\n\n| A | B |\n| - | - |\n| 값 | Value |\n\n```js\nconst a = 1;\n```\n\n**강조** [문서](https://example.com)';
  const html = renderToStaticMarkup(<MarkdownContent text={text} />);
  for (const fragment of [
    '<h1>제목</h1>',
    'type="checkbox"',
    'disabled',
    '<blockquote>',
    '<table>',
    'language-js',
    '<strong>강조</strong>',
    'href="https://example.com/"',
  ])
    assert.ok(html.includes(fragment), fragment);
});
test('HTML·위험한 URL·이미지 로딩은 차단하고 일반 텍스트와 빈 내용을 보존한다', () => {
  const html = renderToStaticMarkup(
    <MarkdownContent
      text={
        '<script>alert(1)</script>\n\n[위험](javascript:alert) ![이미지](https://example.com/pixel.png)\n\n<img src=x onerror=alert(1)>'
      }
    />,
  );
  assert.doesNotMatch(html, /<script|<img|href=|onerror=/);
  assert.match(html, /이미지/);
  for (const url of [
    'file:///C:/x',
    'data:text/html,x',
    '//example.com',
    '/relative',
    'javascript:alert(1)',
  ])
    assert.equal(markdownUrl(url), '');
  assert.equal(markdownUrl('https://example.com'), 'https://example.com/');
  assert.match(
    renderToStaticMarkup(<MarkdownContent text={'한국어\nEnglish < &'} />),
    /한국어\nEnglish &lt; &amp;/,
  );
  assert.ok(renderToStaticMarkup(<MarkdownContent text="" />).length);
});
test('미리보기 전환은 원문과 작성 중 값을 보존하고 저장을 유발하지 않는다', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const source = '# 원문\n\n- [ ] 확인';
  const changes: string[] = [];
  const render = (value: string) =>
    root.render(
      <MarkdownDescriptionEditor
        value={value}
        disabled={false}
        invalid={false}
        onChange={(value) => changes.push(value)}
      />,
    );
  try {
    await act(() => render(source));
    assert.equal(host.querySelector('textarea')!.value, source);
    const buttons = host.querySelectorAll('button');
    assert.ok([...buttons].every((button) => button.type === 'button'));
    await act(() => buttons[1].click());
    assert.equal(host.querySelector('h1')!.textContent, '원문');
    await act(() => render(source + '\n\n**새 내용**'));
    assert.equal(host.querySelector('strong')!.textContent, '새 내용');
    await act(() => host.querySelectorAll('button')[0].click());
    assert.equal(host.querySelector('textarea')!.value, source + '\n\n**새 내용**');
    assert.deepEqual(changes, []);
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});
