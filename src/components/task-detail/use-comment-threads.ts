import { messages } from '../../i18n/messages';
import { useRef, useState } from 'react';
import type { Thread } from './comment-types';
export function useCommentThreads() {
  const threads = useRef(new Map<string, Thread>());
  const [author, setAuthor] = useState(messages.sampleAuthor);
  const [, refresh] = useState(0);
  return {
    author,
    setAuthor,
    get(key: string) {
      if (!threads.current.has(key))
        threads.current.set(key, {
          tab: 'info',
          draft: '',
          feedback: '',
          comments: [
            {
              author: messages.sampleAuthor,
              text: messages.sampleReviewComment,
              time: messages.sample,
              sample: true,
            },
            {
              author: 'codex',
              text: messages.sampleAgentComment,
              time: messages.sample,
              sample: true,
            },
          ],
        });
      return threads.current.get(key)!;
    },
    update() {
      refresh((value) => value + 1);
    },
  };
}
