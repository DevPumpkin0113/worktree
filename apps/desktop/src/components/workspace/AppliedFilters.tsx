import { legacyPriorities } from '@worktree/core/project-priorities';
import { STATUS_NAMES, type WorkModel, type WorkspaceSnapshot } from '../../app/types';
import { messages } from '../../i18n/messages';
import { Icon } from '../shared/Icon';

type FilterKey = 'priority' | 'taskType' | 'owner' | 'status';
export function AppliedFilters({
  state,
  model,
  onRemove,
}: {
  state: Pick<WorkspaceSnapshot, FilterKey>;
  model: WorkModel | null;
  onRemove: (key: FilterKey) => void;
}) {
  const owner = state.owner.slice('owner:'.length);
  const filters = [
    {
      key: 'status',
      label: messages.status,
      value: STATUS_NAMES[state.status as keyof typeof STATUS_NAMES] ?? state.status,
    },
    {
      key: 'priority',
      label: messages.priority,
      value:
        (model?.priorities ?? legacyPriorities()).find((p) => 'priority:' + p.id === state.priority)
          ?.name ?? messages.unassignedPriority,
    },
    { key: 'taskType', label: messages.taskType, value: state.taskType.slice('type:'.length) },
    { key: 'owner', label: messages.owner, value: owner === '-' ? messages.unassigned : owner },
  ] satisfies { key: FilterKey; label: string; value: string }[];
  const applied = filters.filter((filter) => state[filter.key] !== 'all');
  if (!applied.length) return null;
  return (
    <div className="applied-filters" role="group" aria-label={messages.appliedFilters}>
      <span className="applied-filters-label">{messages.appliedFilters}</span>
      {applied.map((filter) => (
        <button
          key={filter.key}
          type="button"
          data-remove-filter={filter.key}
          className="applied-filter"
          onClick={() => onRemove(filter.key)}
          aria-label={`${filter.label}: ${filter.value} · ${messages.removeFilter}`}
        >
          <span>
            {filter.label}: {filter.value}
          </span>
          <Icon name="close" />
        </button>
      ))}
    </div>
  );
}
