import React, { useEffect, useState } from 'react';
import { Check, Copy, Globe, Lock } from 'lucide-react';
import { apiRequest } from '../../api/httpClient.js';

export function PassportControls({ userId }) {
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiRequest('/public/passport/privacy/me')
      .then((res) => setIsPublic(Boolean(res.data?.is_portfolio_public)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function togglePrivacy() {
    const nextValue = !isPublic;
    setIsPublic(nextValue);
    try {
      await apiRequest('/public/passport/privacy', {
        method: 'PATCH',
        body: { is_portfolio_public: nextValue }
      });
    } catch {
      setIsPublic(!nextValue);
    }
  }

  function handleCopyLink() {
    if (!userId) return;
    const url = `${window.location.origin}/passport/${userId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="card no-print"
      style={{
        marginBottom: '1rem',
        padding: '0.85rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {isPublic ? (
          <Globe size={18} style={{ color: 'var(--color-success)' }} />
        ) : (
          <Lock size={18} style={{ color: 'var(--color-muted)' }} />
        )}
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Achievement Passport Privacy: {isPublic ? 'Publicly Shareable' : 'Private'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
            {isPublic
              ? 'Only verified (college-approved) achievements are visible via your shareable passport link.'
              : 'Your passport is private. Enable sharing to generate a public verified profile link.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${isPublic ? 'btn-secondary' : 'btn-primary'}`}
          disabled={loading}
          onClick={togglePrivacy}
        >
          {isPublic ? 'Make Private' : 'Enable Public Link'}
        </button>

        {isPublic && userId && (
          <button type="button" className="btn btn-secondary" onClick={handleCopyLink}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'Link Copied' : 'Copy Share Link'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
