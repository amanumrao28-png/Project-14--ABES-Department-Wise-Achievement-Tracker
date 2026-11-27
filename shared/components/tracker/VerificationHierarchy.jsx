import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';

function findLatestLog(logs = [], predicate) {
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    if (predicate(logs[i])) return logs[i];
  }
  return null;
}

function buildSteps(domain, record) {
  const logs = Array.isArray(record?.approval_logs) ? record.approval_logs : [];
  const status = record?.workflow_status || 'draft';
  const isRejected = status === 'rejected';
  const isChangesRequested = status === 'changes_requested';

  const submittedLog = findLatestLog(logs, (l) => l.to_status === 'submitted');
  const facultyLog = findLatestLog(
    logs,
    (l) => l.actor_role === 'faculty' && (l.to_status === 'department_approved' || l.to_status === 'under_review')
  );
  const hodLog = findLatestLog(
    logs,
    (l) => l.actor_role === 'hod' && ['department_approved', 'college_approved'].includes(l.to_status)
  );
  const adminLog = findLatestLog(
    logs,
    (l) => l.actor_role === 'super_admin' && l.to_status === 'college_approved'
  );

  const isSubmitted = status !== 'draft';
  const isDeptApprovedOrHigher = ['department_approved', 'college_approved'].includes(status);
  const isCollegeApproved = status === 'college_approved';

  if (domain === 'student') {
    const facultyDone = Boolean(facultyLog) || isDeptApprovedOrHigher;
    const hodDone = Boolean(hodLog) || isCollegeApproved;
    const adminDone = isCollegeApproved;

    return [
      {
        key: 'submit',
        level: 'Level 1 • Student',
        title: 'Submitted by Student',
        state: isSubmitted ? 'done' : 'pending',
        actor: record?.owner_name || 'Student',
        time: submittedLog?.acted_at || (isSubmitted ? record?.created_at : null),
        note: isSubmitted ? 'Submission received' : 'Saved as draft'
      },
      {
        key: 'faculty',
        level: 'Level 2 • Faculty',
        title: 'Faculty Verification',
        state: facultyLog
          ? 'done'
          : isDeptApprovedOrHigher
            ? 'done'
            : isRejected || isChangesRequested
              ? 'blocked'
              : isSubmitted
                ? 'current'
                : 'waiting',
        actor: facultyLog?.actor_name || (isDeptApprovedOrHigher ? 'Verified at Higher Stage' : 'Awaiting Faculty'),
        time: facultyLog?.acted_at || null,
        note: facultyLog
          ? 'Faculty verified'
          : isDeptApprovedOrHigher
            ? 'Bypassed / Direct approval'
            : 'Faculty can open & verify'
      },
      {
        key: 'hod',
        level: 'Level 3 • HOD',
        title: 'HOD Approval',
        state: hodLog
          ? 'done'
          : isCollegeApproved
            ? 'done'
            : isRejected || isChangesRequested
              ? 'blocked'
              : isDeptApprovedOrHigher || isSubmitted
                ? facultyDone
                  ? 'current'
                  : 'waiting'
                : 'waiting',
        actor:
          hodLog?.actor_name ||
          (isCollegeApproved ? 'Verified by College Admin' : 'Awaiting HOD'),
        time: hodLog?.acted_at || null,
        note: hodLog
          ? 'HOD approved'
          : isCollegeApproved
            ? 'Finalized by Super Admin'
            : 'HOD can approve'
      },
      {
        key: 'admin',
        level: 'Level 4 • Super Admin',
        title: 'Final Verify & Score Lock',
        state: adminDone
          ? 'done'
          : isRejected || isChangesRequested
            ? 'blocked'
            : isDeptApprovedOrHigher
              ? 'current'
              : 'waiting',
        actor:
          adminLog?.actor_name ||
          record?.approved_by_name ||
          (adminDone ? 'Verified' : 'Awaiting Final Verification'),
        time: adminLog?.acted_at || record?.approved_at || null,
        note: adminDone
          ? `Score locked: ${Number(record?.computed_score || 0).toFixed(1)} pts`
          : 'Unlocks Student & Leaderboard score'
      }
    ];
  }

  if (domain === 'faculty') {
    const hodDone = Boolean(hodLog) || isDeptApprovedOrHigher;
    const adminDone = isCollegeApproved;

    return [
      {
        key: 'submit',
        level: 'Level 1 • Faculty',
        title: 'Submitted by Faculty',
        state: isSubmitted ? 'done' : 'pending',
        actor: record?.owner_name || 'Faculty Member',
        time: submittedLog?.acted_at || (isSubmitted ? record?.created_at : null),
        note: isSubmitted ? 'Submission received' : 'Saved as draft'
      },
      {
        key: 'hod',
        level: 'Level 2 • HOD',
        title: 'HOD Department Approval',
        state: hodDone
          ? 'done'
          : isRejected || isChangesRequested
            ? 'blocked'
            : isSubmitted
              ? 'current'
              : 'waiting',
        actor: hodLog?.actor_name || (hodDone ? 'Approved' : 'Awaiting HOD'),
        time: hodLog?.acted_at || record?.department_approved_at || null,
        note: hodDone ? 'Department verified' : 'HOD can open & verify'
      },
      {
        key: 'admin',
        level: 'Level 3 • Super Admin',
        title: 'Final Verify & Score Lock',
        state: adminDone
          ? 'done'
          : isRejected || isChangesRequested
            ? 'blocked'
            : hodDone
              ? 'current'
              : 'waiting',
        actor: adminLog?.actor_name || record?.approved_by_name || (adminDone ? 'Verified' : 'Awaiting Super Admin'),
        time: adminLog?.acted_at || record?.approved_at || null,
        note: adminDone
          ? `Score locked: ${Number(record?.computed_score || 0).toFixed(1)} pts`
          : 'Unlocks Faculty & Leaderboard score'
      }
    ];
  }

  return [
    {
      key: 'submit',
      level: 'Level 1 • Department',
      title: 'Submitted by Department',
      state: isSubmitted ? 'done' : 'pending',
      actor: record?.created_by_name || 'HOD / Admin',
      time: submittedLog?.acted_at || (isSubmitted ? record?.created_at : null),
      note: isSubmitted ? 'Submission received' : 'Saved as draft'
    },
    {
      key: 'admin',
      level: 'Level 2 • Super Admin',
      title: 'College Final Verify & Score Lock',
      state: isCollegeApproved
        ? 'done'
        : isRejected || isChangesRequested
          ? 'blocked'
          : isSubmitted
            ? 'current'
            : 'waiting',
      actor: adminLog?.actor_name || record?.approved_by_name || (isCollegeApproved ? 'Verified' : 'Awaiting Super Admin'),
      time: adminLog?.acted_at || record?.approved_at || null,
      note: isCollegeApproved
        ? `Score locked: ${Number(record?.computed_score || 0).toFixed(1)} pts`
        : 'Unlocks Department & Leaderboard score'
    }
  ];
}

export function VerificationHierarchy({ domain = 'student', record }) {
  if (!record) return null;
  const steps = buildSteps(domain, record);

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--color-primary)" />
          <div>
            <h2 className="panel-title">Hierarchical Verification Chain</h2>
            <p className="panel-subtitle">
              Multi-level approval progression and score lock status.
            </p>
          </div>
        </div>
      </div>

      <div className="hierarchy-grid" style={{ padding: '0 20px 20px' }}>
        {steps.map((step, idx) => (
          <div key={step.key} className={`hierarchy-step is-${step.state}`}>
            <div className="hierarchy-step-head">
              <span className="hierarchy-level">{step.level}</span>
              {step.state === 'done' && <CheckCircle2 size={16} color="var(--color-success)" />}
              {step.state === 'current' && <Clock size={16} color="var(--color-warning)" />}
              {step.state === 'blocked' && <XCircle size={16} color="var(--color-danger)" />}
              {(step.state === 'waiting' || step.state === 'pending') && (
                <Clock size={16} color="var(--color-text-muted)" />
              )}
            </div>
            <div className="hierarchy-title">{step.title}</div>
            <div className="hierarchy-actor">{step.actor}</div>
            <div className="hierarchy-note">{step.note}</div>
            {step.time && (
              <div className="hierarchy-time">{new Date(step.time).toLocaleString()}</div>
            )}
            {idx < steps.length - 1 && <span className="hierarchy-connector" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}
