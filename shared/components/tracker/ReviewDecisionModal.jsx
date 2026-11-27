import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../Modal.jsx';

const DEFAULT_DECISIONS = [
  { value: 'under_review', label: 'Mark Under Review' },
  { value: 'college_approved', label: 'College Approve & Lock Official Score' },
  { value: 'changes_requested', label: 'Request Changes (Return to Submitter)' },
  { value: 'rejected', label: 'Reject Submission' }
];

export function ReviewDecisionModal({
  isOpen,
  achievementTitle = '',
  availableDecisions = DEFAULT_DECISIONS,
  onClose,
  onSubmitDecision
}) {
  const options = availableDecisions.length > 0 ? availableDecisions : DEFAULT_DECISIONS;
  const [decision, setDecision] = useState(options[0].value);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const preferred =
      options.find((o) => o.value === 'college_approved' || o.value === 'department_approved') ||
      options[0];
    setDecision(preferred.value);
    setRemarks('');
    setError('');
  }, [isOpen]);

  const requiresRemarks = decision === 'rejected' || decision === 'changes_requested';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (requiresRemarks && remarks.trim().length < 5) {
      setError('Please enter clear remarks (minimum 5 characters) when returning or rejecting.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitDecision({ decision, remarks: remarks.trim() });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record review decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Review & Verification Decision"
      onClose={() => !submitting && onClose()}
      maxWidth={480}
    >
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <p style={{ marginTop: 0, fontSize: 13.5, color: 'var(--color-text-secondary)' }}>
        Submission: <strong>{achievementTitle}</strong>
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="rd-decision">
            Workflow Action
          </label>
          <select
            id="rd-decision"
            className="form-select"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="rd-remarks">
            Reviewer Comments {requiresRemarks ? '(Required)' : '(Optional)'}
          </label>
          <textarea
            id="rd-remarks"
            className="form-textarea"
            rows={4}
            placeholder="Enter verification notes, missing evidence feedback, or approval comments..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            required={requiresRemarks}
          />
        </div>

        <div className="modal-footer" style={{ margin: '0 -22px -22px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`btn ${decision === 'rejected' ? 'btn-danger' : 'btn-primary'}`}
            disabled={submitting}
          >
            <CheckCircle2 size={15} />
            <span>{submitting ? 'Submitting...' : 'Confirm Decision'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
