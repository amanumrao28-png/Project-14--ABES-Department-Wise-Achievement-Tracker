import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { duplicatesApi } from '../../../core/api/duplicatesApi.js';

export function DuplicateWarning({
  trackerDomain,
  title,
  organization,
  achievedOn,
  certificateNumber,
  sha256Hash,
  excludeAchievementId = null
}) {
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const hasSignal =
      (title && title.trim().length >= 4) ||
      (certificateNumber && certificateNumber.trim().length >= 3) ||
      Boolean(sha256Hash);

    if (!trackerDomain || !hasSignal) {
      setResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const data = await duplicatesApi.check({
          tracker_domain: trackerDomain,
          title: title || '',
          organization: organization || '',
          achieved_on: achievedOn || '',
          certificate_number: certificateNumber || '',
          sha256_hash: sha256Hash || '',
          exclude_achievement_id: excludeAchievementId || undefined
        });
        setResult(data);
      } catch {
        // Silent fallback so form usability is never blocked
      } finally {
        setChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [trackerDomain, title, organization, achievedOn, certificateNumber, sha256Hash, excludeAchievementId]);

  if (checking || !result?.has_potential_duplicates) {
    return null;
  }

  return (
    <div
      className="alert alert-warning"
      role="status"
      style={{ flexDirection: 'column', alignItems: 'stretch' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.4rem' }}>
        <ShieldAlert size={18} />
        Potential Duplicate Detected — Flagged for Manual Review ({result.match_count} match{result.match_count > 1 ? 'es' : ''})
      </div>
      <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.25rem' }}>
        {result.matches.map((m) => (
          <li key={m.achievement_id} style={{ marginBottom: '0.25rem' }}>
            <strong>{m.title}</strong> ({m.organization || 'N/A'}, {String(m.achieved_on || '').slice(0, 10)}) —{' '}
            <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
              {m.workflow_status}
            </span>
            <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <AlertTriangle size={12} />
              Matched on: {m.match_reasons.join('; ')}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
