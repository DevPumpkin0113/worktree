export interface Thread {
  tab: 'info' | 'comments';
  draft: string;
  feedback: string;
  error: boolean;
  busy: boolean;
  editing?: { id: string; author: string; text: string; expected: string };
  replying?: { id: string; number: number; author: string; text: string };
  deleting?: { id: string; expected: string };
}
