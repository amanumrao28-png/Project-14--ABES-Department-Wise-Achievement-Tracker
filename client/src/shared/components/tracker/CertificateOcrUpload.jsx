import React, { useState } from 'react';
import { FileSearch, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { ocrApi } from '../../../core/api/ocrApi.js';

export function CertificateOcrUpload({ onFieldsExtracted }) {
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [showTextBox, setShowTextBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleExtract() {
    if (!file && !pastedText.trim()) {
      setError('Select a certificate file or paste certificate text to extract fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = file
        ? await ocrApi.extractFromFile(file, pastedText)
        : await ocrApi.extractFromText(pastedText);
      setResult(data);

      if (onFieldsExtracted && data?.extracted) {
        const mapped = {};
        if (data.extracted.achievement_title) mapped.title = data.extracted.achievement_title;
        if (data.extracted.organization) mapped.organization = data.extracted.organization;
        if (data.extracted.achieved_on) mapped.achieved_on = data.extracted.achieved_on;
        if (data.extracted.certificate_number) mapped.certificate_number = data.extracted.certificate_number;
        if (data.extracted.recipient_name) mapped.recipient_name = data.extracted.recipient_name;
        if (data.file_metadata?.sha256_hash) mapped.sha256_hash = data.file_metadata.sha256_hash;
        onFieldsExtracted(mapped, data);
      }
    } catch (err) {
      setError(err.message || 'Failed to extract certificate fields.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        marginBottom: '1.25rem',
        padding: '1rem 1.25rem',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-background)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
              Certificate OCR Auto-Fill (Advisory)
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              Upload a certificate or paste its text to pre-fill title, organization, date, and certificate number.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          onClick={() => setShowTextBox((prev) => !prev)}
        >
          {showTextBox ? 'Hide Text Input' : 'Paste Text Instead'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.85rem', flexWrap: 'wrap' }}>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ fontSize: '0.85rem' }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={handleExtract}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <FileSearch size={15} />
          {loading ? 'Extracting...' : 'Extract & Pre-fill'}
        </button>
      </div>

      {showTextBox && (
        <textarea
          rows={3}
          className="form-textarea"
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste certificate text (e.g. Awarded to John Doe by IEEE on 15 March 2025, Certificate No: CERT-2025-101)..."
          style={{ marginTop: '0.75rem' }}
        />
      )}

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.75rem',
            borderRadius: '6px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            fontSize: '0.82rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />
            Extracted {result.extracted_fields_count} field(s) (Confidence: {result.extraction_confidence})
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', color: 'var(--color-warning)', marginTop: '0.35rem' }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{result.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
