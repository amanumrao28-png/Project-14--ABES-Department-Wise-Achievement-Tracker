import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Send,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { deptTrackerApi } from '@shared/api/deptTrackerApi.js';
import { AchievementStatusBadge } from '@shared/components/tracker/AchievementStatusBadge.jsx';
import { ApprovalTimeline } from '@shared/components/tracker/ApprovalTimeline.jsx';
import { EvidenceDocumentsPanel } from '@shared/components/tracker/EvidenceDocumentsPanel.jsx';
import { ReviewDecisionModal } from '@shared/components/tracker/ReviewDecisionModal.jsx';
import { VerificationHierarchy } from '@shared/components/tracker/VerificationHierarchy.jsx';

export function DeptAchievementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const basePath = isSuperAdmin ? '/achievements' : '/achievements';

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await deptTrackerApi.getById(id);
      setRecord(data);
    } catch (err) {
      setError(err.message || 'Failed to load department achievement details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSubmitForReview = async () => {
    setError('');
    setFeedback('');
    try {
      await deptTrackerApi.submit(id);
      setFeedback('Department achievement submitted for Super Admin approval.');
      loadDetail();
    } catch (err) {
      setError(err.message || 'Unable to submit achievement.');
    }
  };

  const handleDelete = async () => {
    try {
      await deptTrackerApi.remove(id);
      navigate(basePath, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to delete achievement.');
    }
  };

  const handleReviewDecision = async ({ decision, remarks }) => {
    await deptTrackerApi.review(id, { decision, remarks });
    setFeedback(`Review decision "${decision}" recorded.`);
    loadDetail();
  };

  if (loading) {
    return <div className="card card-body">Loading department achievement details...</div>;
  }

  if (error && !record) {
    return (
      <div className="alert alert-error">
        <AlertCircle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  const canEdit =
    record?.workflow_status === 'draft' || record?.workflow_status === 'changes_requested';
  const canReview =
    isSuperAdmin &&
    (record?.workflow_status === 'submitted' || record?.workflow_status === 'under_review') &&
    record?.created_by_user_id !== user?.id;

  const availableDecisions = [
    ...(record?.workflow_status === 'submitted'
      ? [{ value: 'under_review', label: 'Mark Under Review' }]
      : []),
    { value: 'college_approved', label: 'College Approve & Lock Official Score' },
    { value: 'changes_requested', label: 'Request Changes (Return to Department)' },
    { value: 'rejected', label: 'Reject Submission' }
  ];

  const detailEntries = Object.entries(record?.details_json || {}).filter(
    ([, val]) => val !== '' && val !== null && val !== undefined
  );
  const collaborators = Array.isArray(record?.collaborators_json)
    ? record.collaborators_json
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <Link to={basePath} className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
            <ArrowLeft size={15} />
            <span>Back to Department Achievements</span>
          </Link>
          <h1 className="page-title">{record.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <AchievementStatusBadge status={record.workflow_status} />
            <span className="dept-pill">
              {record.department_code} — {record.department_name}
            </span>
            <span className="badge badge-hod">{record.category_name}</span>
          </div>
        </div>

        <div className="table-actions">
          {canEdit && (
            <>
              <Link to={`${basePath}/${record.id}/edit`} className="btn btn-secondary">
                <Edit3 size={15} />
                <span>Edit</span>
              </Link>
              <button type="button" className="btn btn-primary" onClick={handleSubmitForReview}>
                <Send size={15} />
                <span>Submit for Approval</span>
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={15} />
                <span>Delete Draft</span>
              </button>
            </>
          )}

          {canReview && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  handleReviewDecision({
                    decision: 'college_approved',
                    remarks: 'Verified and official score locked.'
                  })
                }
              >
                <CheckCircle2 size={15} />
                <span>Final Verify &amp; Lock Score</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setReviewOpen(true)}>
                <ShieldCheck size={15} />
                <span>Review Options</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      <VerificationHierarchy domain="department" record={record} />

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <strong>Achievement Overview</strong>
              {record.computed_score != null && (
                <span className="badge badge-active">
                  Dept Score: {Number(record.computed_score).toFixed(1)} (v{record.scoring_rule_version})
                </span>
              )}
            </div>
            <div className="card-body">
              <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{record.description}</p>

              <div className="kv-grid">
                <div className="kv-item">
                  <div className="kv-label">Organization</div>
                  <div className="kv-value">{record.organization}</div>
                </div>
                <div className="kv-item">
                  <div className="kv-label">Level</div>
                  <div className="kv-value" style={{ textTransform: 'capitalize' }}>
                    {record.achievement_level}
                  </div>
                </div>
                <div className="kv-item">
                  <div className="kv-label">Achievement Date</div>
                  <div className="kv-value">{String(record.achieved_on).slice(0, 10)}</div>
                </div>
                <div className="kv-item">
                  <div className="kv-label">Academic Year</div>
                  <div className="kv-value">{record.academic_year}</div>
                </div>
                <div className="kv-item">
                  <div className="kv-label">Submitted By</div>
                  <div className="kv-value">{record.created_by_name}</div>
                </div>
                {record.approved_by_name && (
                  <div className="kv-item">
                    <div className="kv-label">Approved By</div>
                    <div className="kv-value">{record.approved_by_name}</div>
                  </div>
                )}
              </div>

              {detailEntries.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    Category-Specific Details
                  </div>
                  <div className="kv-grid">
                    {detailEntries.map(([k, v]) => (
                      <div key={k} className="kv-item">
                        <div className="kv-label">{k.replaceAll('_', ' ')}</div>
                        <div className="kv-value">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {collaborators.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    Collaborating Partners / Units
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {collaborators.map((c, idx) => (
                      <li key={idx}>
                        <strong>{c.name}</strong>
                        {c.role ? ` — ${c.role}` : ''}
                        {c.identifier ? ` (${c.identifier})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <EvidenceDocumentsPanel
            documents={record.evidence_documents || []}
            canModify={canEdit}
            onUpload={async (file) => {
              await deptTrackerApi.uploadDocument(record.id, file);
              setFeedback('Evidence document uploaded.');
              loadDetail();
            }}
            onDownload={(doc) =>
              deptTrackerApi.downloadDocument(record.id, doc.id, doc.original_filename)
            }
            onDelete={async (doc) => {
              await deptTrackerApi.deleteDocument(record.id, doc.id);
              setFeedback('Evidence document removed.');
              loadDetail();
            }}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <strong>Approval History &amp; Status</strong>
          </div>
          <div className="card-body">
            {record.review_remarks && (
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                <div>
                  <strong>Latest Review Remarks:</strong> {record.review_remarks}
                </div>
              </div>
            )}
            <ApprovalTimeline logs={record.approval_logs || []} />
          </div>
        </div>
      </div>

      <ReviewDecisionModal
        isOpen={reviewOpen}
        achievementTitle={record.title}
        availableDecisions={availableDecisions}
        onClose={() => setReviewOpen(false)}
        onSubmitDecision={handleReviewDecision}
      />
    </div>
  );
}
