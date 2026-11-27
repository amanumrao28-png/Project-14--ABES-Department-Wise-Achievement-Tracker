import { Clock } from 'lucide-react';
import { AchievementStatusBadge } from './AchievementStatusBadge.jsx';

export function ApprovalTimeline({ logs = [] }) {
  if (!logs.length) {
    return <p className="form-hint">No workflow history recorded yet.</p>;
  }

  return (
    <div className="timeline-list">
      {logs.map((entry) => (
        <div key={entry.id} className="timeline-item">
          <div className="timeline-item-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <AchievementStatusBadge status={entry.to_status} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {entry.actor_name || 'System'}
              </span>
              {entry.actor_role && (
                <span className="form-hint">({entry.actor_role})</span>
              )}
            </div>
            <span className="form-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />
              {new Date(entry.acted_at).toLocaleString()}
            </span>
          </div>
          {entry.remarks && <p className="timeline-remarks">{entry.remarks}</p>}
        </div>
      ))}
    </div>
  );
}
