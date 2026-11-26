import { ROLES, WORKFLOW_STATUSES } from '../../config/env.js';
import { AppError } from '../../core/middleware/errorHandler.js';

const REVIEWABLE_FROM = [WORKFLOW_STATUSES.SUBMITTED, WORKFLOW_STATUSES.UNDER_REVIEW];

/**
 * Independent Department Achievement Approval Workflow.
 * Reviewed exclusively by authorized College Management (`super_admin`).
 */
export function resolveDepartmentTransition({
  actor,
  record,
  decision,
  overrideSelfApproval = false
}) {
  if (!actor || actor.role !== ROLES.SUPER_ADMIN) {
    throw new AppError(
      403,
      'INSUFFICIENT_APPROVAL_AUTHORITY',
      'Only authorized college management may review department achievements.'
    );
  }

  if (record.created_by_user_id === actor.id && !overrideSelfApproval) {
    throw new AppError(
      403,
      'SELF_APPROVAL_BLOCKED',
      'Separation of duties prevents approving your own department submission.'
    );
  }

  if (!REVIEWABLE_FROM.includes(record.workflow_status)) {
    throw new AppError(
      409,
      'INVALID_TRANSITION',
      `Department achievement cannot be reviewed from "${record.workflow_status}" status.`
    );
  }

  const allowedDecisions = [
    WORKFLOW_STATUSES.UNDER_REVIEW,
    WORKFLOW_STATUSES.COLLEGE_APPROVED,
    WORKFLOW_STATUSES.CHANGES_REQUESTED,
    WORKFLOW_STATUSES.REJECTED
  ];

  if (!allowedDecisions.includes(decision)) {
    throw new AppError(
      400,
      'INVALID_WORKFLOW_DECISION',
      `Unsupported decision "${decision}" for department achievement workflow.`
    );
  }

  if (decision === WORKFLOW_STATUSES.UNDER_REVIEW && record.workflow_status !== WORKFLOW_STATUSES.SUBMITTED) {
    throw new AppError(409, 'INVALID_TRANSITION', 'Only submitted records can enter under_review.');
  }

  return {
    nextStatus: decision,
    isFinalVerified: decision === WORKFLOW_STATUSES.COLLEGE_APPROVED,
    clearScore:
      decision === WORKFLOW_STATUSES.CHANGES_REQUESTED || decision === WORKFLOW_STATUSES.REJECTED
  };
}
