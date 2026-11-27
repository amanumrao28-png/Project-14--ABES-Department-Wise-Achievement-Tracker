import { useState } from 'react';
import { AlertCircle, Download, FileText, Trash2, Upload } from 'lucide-react';

function formatBytes(bytes) {
  const num = Number(bytes || 0);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Pure visual evidence/certificate panel. Calls tracker-specific upload/download/delete callbacks.
 */
export function EvidenceDocumentsPanel({
  documents = [],
  canModify = false,
  title = 'Evidence Documents & Certificates',
  onUpload,
  onDownload,
  onDelete
}) {
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpload) return;

    setError('');
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message || 'Failed to upload evidence file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadClick = async (doc) => {
    if (!onDownload) return;
    setError('');
    setDownloadingId(doc.id);
    try {
      await onDownload(doc);
    } catch (err) {
      setError(err.message || 'Failed to download file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteClick = async (doc) => {
    if (!onDelete) return;
    setError('');
    try {
      await onDelete(doc);
    } catch (err) {
      setError(err.message || 'Failed to remove evidence.');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <strong style={{ fontSize: 15 }}>{title}</strong>
          <div className="form-hint">Allowed formats: PDF, PNG, JPG, WEBP (max 10 MB)</div>
        </div>

        {canModify && onUpload && (
          <label className="btn btn-primary btn-sm" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
            <Upload size={14} />
            <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      <div className="card-body">
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {uploading && (
          <div className="upload-progress-track" role="progressbar" aria-label="Uploading evidence file">
            <div className="upload-progress-fill" />
          </div>
        )}

        {documents.length === 0 ? (
          <div className="form-hint">
            No evidence files attached yet.
            {canModify ? ' Upload supporting certificate or official proof before submitting.' : ''}
          </div>
        ) : (
          <div className="evidence-list">
            {documents.map((doc) => (
              <div key={doc.id} className="evidence-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <FileText size={18} color="var(--color-primary)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, wordBreak: 'break-word' }}>
                      {doc.original_filename}
                    </div>
                    <div className="form-hint">
                      {doc.mime_type} • {formatBytes(doc.file_size_bytes)} •{' '}
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="table-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDownloadClick(doc)}
                    disabled={downloadingId === doc.id}
                  >
                    <Download size={13} />
                    <span>{downloadingId === doc.id ? 'Downloading...' : 'Download'}</span>
                  </button>

                  {canModify && onDelete && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDeleteClick(doc)}
                      aria-label={`Remove ${doc.original_filename}`}
                    >
                      <Trash2 size={14} color="var(--color-danger)" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
