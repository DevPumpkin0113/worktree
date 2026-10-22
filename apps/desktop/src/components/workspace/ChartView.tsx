import { DependencyChart } from './DependencyChart';
import { GanttView } from './GanttView';
import type { View, WorkRow } from '../../app/types';
export function ChartView({
  view,
  rows,
  filtered,
  label,
  selectedId,
  focus,
  onFocus,
  unit,
  onUnit,
  onSelect,
  onScroll,
}: {
  view: View;
  rows: WorkRow[];
  filtered: WorkRow[];
  label: (id: string) => string;
  selectedId: string | null;
  focus: string | null;
  onFocus: (focus: string | null) => void;
  unit: 'day' | 'week';
  onUnit: (unit: 'day' | 'week') => void;
  onSelect: (id: string) => void;
  onScroll: () => void;
}) {
  return view === 'gantt' ? (
    <GanttView
      rows={filtered}
      rangeRows={rows}
      label={label}
      selectedId={selectedId}
      unit={unit}
      onUnit={onUnit}
      onSelect={onSelect}
      onScroll={onScroll}
    />
  ) : (
    <DependencyChart
      rows={rows}
      filtered={filtered}
      label={label}
      selectedId={selectedId}
      focus={focus}
      onFocus={onFocus}
      onSelect={onSelect}
      onScroll={onScroll}
    />
  );
}
