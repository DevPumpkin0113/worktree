import { Badge } from './Badge';
import { taskTypeColor, type TaskTypeColors } from '@worktree/core/task-type-colors';
export function BadgeList({
  values,
  colors,
  displayLabel = (value) => value,
}: {
  values: string[];
  colors?: TaskTypeColors;
  displayLabel?: (value: string) => string;
}) {
  return values.length ? (
    <ul className="badge-input-values">
      {values.map((value) => (
        <li key={value}>
          <Badge
            label={displayLabel(value)}
            color={colors ? taskTypeColor(colors, value) : undefined}
          />
        </li>
      ))}
    </ul>
  ) : (
    <>—</>
  );
}
