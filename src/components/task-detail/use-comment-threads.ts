import { useRef, useState } from 'react';
import type { Thread } from './comment-types';
export function useCommentThreads() {
  const threads = useRef(new Map<string, Thread>());
  const [author, setAuthor] = useState('박대호');
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
              author: '박대호',
              text: '이 작업은 구현 결과를 먼저 보고 완료 여부를 확인하면 좋겠습니다.',
              time: '예시',
              sample: true,
            },
            {
              author: 'codex',
              text: '확인할 수 있는 화면과 검증 결과를 함께 정리하겠습니다.',
              time: '예시',
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
