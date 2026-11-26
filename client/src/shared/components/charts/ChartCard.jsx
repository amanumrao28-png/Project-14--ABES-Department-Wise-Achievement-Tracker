import { AlertCircle } from 'lucide-react';

export function ChartCard({
  title,
  subtitle = '',
  loading = false,
  error = '',
  isEmpty = false,
  emptyMessage = 'No data available for the selected filters.',
  headerRight = null,
  children
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <strong style={{ fontSize: 15 }}>{title}</strong>
          {subtitle && <div className="form-hint">{subtitle}</div>}
        </div>
        {headerRight}
      </div>
      <div className="card-body">
        {loading ? (
          <div className="chart-skeleton" role="status" aria-label={`Loading ${title}`}>
            <div className="spinner" />
            <span>Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="alert alert-error" style={{ marginBottom: 0 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : isEmpty ? (
          <div className="chart-empty">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
