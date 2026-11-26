import { RotateCcw } from 'lucide-react';
import { ACADEMIC_YEAR_OPTIONS } from '../tracker/AchievementStatusBadge.jsx';

export function AnalyticsFilterBar({
  filters,
  onChange,
  categories = [],
  departments = [],
  showDepartmentFilter = false
}) {
  const handleReset = () => {
    onChange({
      academic_year: '',
      category_id: '',
      start_date: '',
      end_date: '',
      departmentId: ''
    });
  };

  const hasFilters = Boolean(
    filters.academic_year ||
      filters.category_id ||
      filters.start_date ||
      filters.end_date ||
      filters.departmentId
  );

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="filters-bar" style={{ borderBottom: 'none' }}>
        <select
          className="form-select"
          aria-label="Filter analytics by academic year"
          value={filters.academic_year}
          onChange={(e) => onChange({ ...filters, academic_year: e.target.value })}
        >
          <option value="">All Academic Years</option>
          {ACADEMIC_YEAR_OPTIONS.map((ay) => (
            <option key={ay} value={ay}>
              AY {ay}
            </option>
          ))}
        </select>

        {categories.length > 0 && (
          <select
            className="form-select"
            aria-label="Filter analytics by category"
            value={filters.category_id}
            onChange={(e) => onChange({ ...filters, category_id: e.target.value })}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}

        {showDepartmentFilter && (
          <select
            className="form-select"
            aria-label="Filter analytics by department"
            value={filters.departmentId}
            onChange={(e) => onChange({ ...filters, departmentId: e.target.value })}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        )}

        <input
          type="date"
          className="form-input"
          aria-label="Start date"
          title="Start date"
          value={filters.start_date}
          onChange={(e) => onChange({ ...filters, start_date: e.target.value })}
        />

        <input
          type="date"
          className="form-input"
          aria-label="End date"
          title="End date"
          value={filters.end_date}
          onChange={(e) => onChange({ ...filters, end_date: e.target.value })}
        />

        {hasFilters && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
