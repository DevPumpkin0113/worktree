export interface Comment {
  author: string;
  text: string;
  time: string;
  sample: boolean;
}
export interface Thread {
  tab: 'info' | 'comments';
  draft: string;
  comments: Comment[];
  feedback: string;
}
