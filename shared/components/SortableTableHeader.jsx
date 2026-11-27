import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export function SortableTableHeader({
  label,
  sortKey,
  currentSort,
  onSort
}) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.dir : null;

  return (
    <button
      type="button"
      className="sort-btn"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      {!isActive ? (
        <ArrowUpDown size={12} />
      ) : direction === 'asc' ? (
        <ArrowUp size={12} />
      ) : (
        <ArrowDown size={12} />
      )}
    </button>
  );
}

export function sortRows(rows = [], sortState) {
  if (!sortState?.key) return rows;
  const { key, dir } = sortState;
  const factor = dir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const valA = a?.[key];
    const valB = b?.[key];
    if (valA == null && valB == null) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;

    const numA = Number(valA);
    const numB = Number(valB);
    if (!Number.isNaN(numA) && !Number.isNaN(numB) && valA !== '' && valB !== '') {
      return (numA - numB) * factor;
    }

    return String(valA).localeCompare(String(valB)) * factor;
  });
}
