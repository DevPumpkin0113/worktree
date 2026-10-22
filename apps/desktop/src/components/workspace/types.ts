import type { WorkRow } from '../../app/types';
export interface ListProps {
  rows: WorkRow[];
  label: (id: string) => string;
  onSelect: (id: string) => void;
  selectedId: string | null;
}
