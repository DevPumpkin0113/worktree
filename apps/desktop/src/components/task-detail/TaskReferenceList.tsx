import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { File, FileText, Folder, Globe, ExternalLink, Copy } from 'lucide-react';
import type { TaskReference } from '@worktree/core/project-source';
import { referenceDisplayName, referenceWebUrl } from '@worktree/core/task-references';
import { copyText } from '../../platform/clipboard';
import { messages } from '../../i18n/messages';
function ReferenceItem({
  reference,
  project,
}: {
  reference: TaskReference;
  project?: string | null;
}) {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const url =
    reference.type === 'web' || reference.type === 'text'
      ? referenceWebUrl(reference.value)
      : undefined;
  const local = reference.type === 'file' || reference.type === 'folder';
  const Icon = url
    ? Globe
    : reference.type === 'file'
      ? File
      : reference.type === 'folder'
        ? Folder
        : FileText;
  const name = referenceDisplayName(reference);
  async function open() {
    setFeedback('');
    setBusy(true);
    try {
      if (url) await invoke('open_markdown_link', { url });
      else if (local && project)
        await invoke('open_task_reference', {
          project,
          value: reference.value,
          kind: reference.type,
        });
      else throw Error('Unavailable');
    } catch {
      setFeedback(messages.referenceOpenFailed);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await copyText(reference.value);
      setFeedback(messages.referenceCopied);
    } catch {
      setFeedback(messages.clipboardFailed);
    }
  }
  return (
    <li className="detail-reference-item">
      <div className="detail-reference-main">
        <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
        <div className="detail-reference-text">
          <span className="detail-reference-name" title={name}>
            {name}
          </span>
          <span className="detail-reference-path" title={reference.value}>
            {reference.value}
          </span>
        </div>
        {url || local ? (
          <button
            type="button"
            className="action-button"
            data-variant="secondary"
            title={messages.referenceOpen}
            aria-label={messages.referenceOpen + ': ' + name}
            disabled={busy || (local && !project)}
            onClick={() => void open()}
          >
            <ExternalLink size={14} aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className="action-button"
          data-variant="secondary"
          title={messages.referenceCopy}
          aria-label={messages.referenceCopy + ': ' + name}
          onClick={() => void copy()}
        >
          <Copy size={14} aria-hidden="true" />
        </button>
      </div>
      {feedback ? (
        <p className="detail-reference-feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </li>
  );
}
export function TaskReferenceList({
  references,
  project,
}: {
  references: TaskReference[];
  project?: string | null;
}) {
  return (
    <ul className="detail-reference-list">
      {references.map((reference, index) => (
        <ReferenceItem
          key={index + ':' + reference.type + ':' + reference.value + ':' + (reference.name ?? '')}
          reference={reference}
          project={project}
        />
      ))}
    </ul>
  );
}
