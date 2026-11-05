import { memo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { invoke } from '@tauri-apps/api/core';
import { messages } from '../../i18n/messages';
const plugins = [remarkGfm];
export function markdownUrl(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
export const MarkdownContent = memo(function MarkdownContent({ text }: { text: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="markdown-content">
      <Markdown
        remarkPlugins={plugins}
        skipHtml
        urlTransform={markdownUrl}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  if (!('__TAURI_INTERNALS__' in window)) return;
                  event.preventDefault();
                  setFailed(false);
                  void invoke('open_markdown_link', { url: href }).catch(() => setFailed(true));
                }}
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => <span>{alt}</span>,
          table: ({ children }) => (
            <div className="markdown-table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text || messages.noDescription}
      </Markdown>
      {failed ? <p role="alert">{messages.markdownLinkFailed}</p> : null}
    </div>
  );
});
