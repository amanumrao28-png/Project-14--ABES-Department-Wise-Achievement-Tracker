import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Lock,
  Send,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { ROLES } from '../../../core/constants/roles.js';
import { studentTrackerApi } from '../../../core/api/studentTrackerApi.js';
import { AchievementStatusBadge } from '../../../shared/components/tracker/AchievementStatusBadge.jsx';
import { ApprovalTimeline } from '../../../shared/components/tracker/ApprovalTimeline.jsx';
import { EvidenceDocumentsPanel } from '../../../shared/components/tracker/EvidenceDocumentsPanel.jsx';
import { ReviewDecisionModal } from '../../../shared/components/tracker/ReviewDecisionModal.jsx';

export function StudentAchievementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isStudent = user?.role === ROLES.STUDENT;
  const isFaculty = user?.role === ROLES.FACULTY;
  const basePath = isStudent
    ? '/student/achievements'
    : isFaculty
      ? '/faculty/department-students'
      : user?.role === ROLES.SUPER_ADMIN
        ? '/college/student-tracker'
        : '/department/student-tracker';

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await studentTrackerApi.getById(id);
      setRecord(data);
    } catch (err) {
      setError(err.message || 'Failed to load student achievement details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSubmit = async () => {
    setError('');
    setFeedback('');
    try {
      await studentTrackerApi.submit(id);
      setFeedback('Student achievement submitted for department approval.');
      loadDetail();
    } catch (err) {
      setError(err.message || 'Unable to submit achievement.');
    }
  };

  const handleDelete = async () => {
    try {
      await studentTrackerApi.remove(id);
      navigate(basePath, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to delete draft.');
    }
  };

  const handleReviewDecision = async ({ decision, remarks }) => {
    await studentTrackerApi.review(id, { decision, remarks });
    setFeedback(`Review decision "${decision}" recorded.`);
    loadDetail();
  };

  if (loading) {
    return <div className="card card-body">Loading student achievement details...</div>;
  }

  if (error && !record) {
    return (
      <div className="alert alert-error">
        <AlertCircle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  const isOwner = record?.owner_user_id === user?.id;
  const isEditableState =
    record?.workflow_status === 'draft' || record?.workflow_status === 'changes_requested';
  const isCoordinator =
    isFaculty && user?.can_coordinate_student_approvals === true;
  const canEdit = !isFaculty && (isOwner || user?.role === ROLES.SUPER_ADMIN) && isEditableState;

  const isCoordReviewable =
    isCoordinator &&
    (record?.workflow_status === 'submitted' || record?.workflow_status === 'under_review');
  const isHodReviewable =
    user?.role === ROLES.HOD &&
    ['submitted', 'under_review', 'department_approved'].includes(record?.workflow_status);
  const isAdminReviewable =
    user?.role === ROLES.SUPER_ADMIN &&
    ['submitted', 'under_review', 'department_approved'].includes(record?.workflow_status);
  const canReview = (isCoordReviewable || isHodReviewable || isAdminReviewable) && !isOwner;

  const availableDecisions = [];
  if (
    record?.workflow_status === 'submitted' ||
    ((user?.role === ROLES.HOD || user?.role === ROLES.SUPER_ADMIN) &&
      record?.workflow_status === 'department_approved')
  ) {
    availableDecisions.push({ value: 'under_review', label: 'Mark Under Review' });
  }
  if (
    record?.workflow_status === 'submitted' ||
    record?.workflow_status === 'under_review'
  ) {
    availableDecisions.push({
      value: 'department_approved',
      label: 'Department Approve'
    });
  }
  if (
    user?.role === ROLES.SUPER_ADMIN ||
    (user?.role === ROLES.HOD && !user?.department?.student_requires_college_approval)
  ) {
    availableDecisions.push({
      value: 'college_approved',
      label: 'Final Verify & Lock Official Score'
    });
  }
  availableDecisions.push(
    { value: 'changes_requested', label: 'Request Changes (Return to Student)' },
    { value: 'rejected', label: 'Reject Submission' }
  );

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
            <span>Back to Student Achievements</span>
          </Link>
          <h1 className="page-title">{record.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <AchievementStatusBadge status={record.workflow_status} />
            <span className="dept-pill">
              {record.department_code} • {record.owner_name} ({record.owner_roll_no})
            </span>
            <span className="badge badge-student">{record.category_name}</span>
            {isFaculty && (
              <span className="badge badge-inactive">
                <Lock size={12} />
                Read-Only
              </span>
            )}
          </div>
        </div>

        <div className="table-actions">
          {canEdit && (
            <>
              <Link to={`${basePath}/${record.id}/edit`} className="btn btn-secondary">
                <Edit3 size={15} />
                <span>Edit</span>
              </Link>
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
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
            <button type="button" className="btn btn-primary" onClick={() => setReviewOpen(true)}>
              <ShieldCheck size={15} />
              <span>Review &amp; Approve</span>
            </button>
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

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-header">
              <strong>Student Achievement Overview</strong>
              {record.computed_score != null && (
                <span className="badge badge-active">
                  Student Score: {Number(record.computed_score).toFixed(1)} (v{record.scoring_rule_version})
                </span>
              )}
            </div>
            <div className="card-body">
              <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{record.description}</p>

              <div className="kv-grid">
                <div className="kv-item">
                  <div className="kv-label">Organization / Company</div>
                  <div className="kv-value">{record.organization}</div>
                </div>
                <div className="kv-item">
                  <div className="kv-label">Level</div>
                  <div className="kv-value" style={{ textTransform: 'capitalize' }}>
                    {record.achievement_level}
                  </div>
                </div>
                <div className="kv-item">
                  <div className="kv-label">Date</div>
                  <div className="kv-value">{String(record.achieved_on).slice(0, 10)}</div>
                </div>
                <div className="kv-item">
                  <div className="kv-label">Academic Year</div>
                  <div className="kv-value">{record.academic_year}</div>
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
                    Category Metadata
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
                    Team Members / Collaborators
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
            title="Certificates & Offer Proofs"
            documents={record.evidence_documents || []}
            canModify={canEdit}
            onUpload={async (file) => {
              await studentTrackerApi.uploadDocument(record.id, file);
              setFeedback('Certificate uploaded.');
              loadDetail();
            }}
            onDownload={(doc) =>
              studentTrackerApi.downloadDocument(record.id, doc.id, doc.original_filename)
            }
            onDelete={async (doc) => {
              await studentTrackerApi.deleteDocument(record.id, doc.id);
              setFeedback('Certificate removed.');
              loadDetail();
            }}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <strong>Approval Timeline</strong>
          </div>
          <div className="card-body">
            {record.review_remarks && (
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                <div>
                  <strong>Review Remarks:</strong> {record.review_remarks}
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
