import { messages } from '../../i18n/messages';
export function TaskCountProgress({ completed, total }: { completed: number; total: number }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <span className="task-count-progress">
      <span>
        {completed}/{total} · {percent}%
      </span>
      <progress max={100} value={percent} aria-label={messages.taskCompletionRate} />
    </span>
  );
}
