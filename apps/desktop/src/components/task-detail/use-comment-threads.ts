import { useEffect, useRef, useState } from 'react';
import type { OpenDocument } from '../../app/types';
import type { Thread } from './comment-types';
export function useCommentThreads(documents: OpenDocument[]) {
  const threads = useRef(new Map<string, Thread>());
  const [, refresh] = useState(0);
  useEffect(() => {
    const paths = new Set(documents.map((doc) => doc.path));
    for (const key of threads.current.keys()) {
      if (!paths.has(JSON.parse(key)[0])) threads.current.delete(key);
    }
  }, [documents]);
  return {
    get(path: string | null, id: string | null) {
      const key = JSON.stringify([path, id]);
      if (!threads.current.has(key))
        threads.current.set(key, {
          tab: 'info',
          draft: '',
          feedback: '',
          error: false,
          busy: false,
        });
      return threads.current.get(key)!;
    },
    update() {
      refresh((value) => value + 1);
    },
  };
}
