import { ROLES, WORKFLOW_STATUSES } from '../../config/env.js';
import { AppError } from '../../core/middleware/errorHandler.js';

const FIRST_STAGE_FROM = [WORKFLOW_STATUSES.SUBMITTED, WORKFLOW_STATUSES.UNDER_REVIEW];
const COLLEGE_STAGE_FROM = [
  WORKFLOW_STATUSES.SUBMITTED,
  WORKFLOW_STATUSES.UNDER_REVIEW,
  WORKFLOW_STATUSES.DEPARTMENT_APPROVED
];

/**
 * Independent Faculty Achievement Approval Workflow.
 * Stage 1: Assigned HOD reviews within their department -> `department_approved`.
 * Stage 2: Authorized College Management (`super_admin`) finalizes -> `college_approved`.
 */
export function resolveFacultyTransition({
  actor,
  record,
  decision,
  overrideSelfApproval = false
}) {
  if (!actor || ![ROLES.HOD, ROLES.SUPER_ADMIN].includes(actor.role)) {
    throw new AppError(
      403,
      'INSUFFICIENT_APPROVAL_AUTHORITY',
      'Only assigned HOD or college management may review faculty achievements.'
    );
  }

  if (actor.role === ROLES.HOD && record.department_id !== actor.department_id) {
    throw new AppError(
      403,
      'DEPARTMENT_ACCESS_DENIED',
      'HODs may only review faculty achievements within their assigned department.'
    );
  }

  if (record.owner_user_id === actor.id && !(actor.role === ROLES.SUPER_ADMIN && overrideSelfApproval)) {
    throw new AppError(
      403,
      'SELF_APPROVAL_BLOCKED',
      'Separation of duties prevents approving or reviewing your own faculty submission.'
    );
  }

  if (decision === WORKFLOW_STATUSES.UNDER_REVIEW) {
    if (![WORKFLOW_STATUSES.SUBMITTED, WORKFLOW_STATUSES.DEPARTMENT_APPROVED].includes(record.workflow_status)) {
      throw new AppError(409, 'INVALID_TRANSITION', 'Record is not awaiting review.');
    }
    if (record.workflow_status === WORKFLOW_STATUSES.DEPARTMENT_APPROVED && actor.role !== ROLES.SUPER_ADMIN) {
      throw new AppError(
        403,
        'INSUFFICIENT_APPROVAL_AUTHORITY',
        'Only college management may review department-approved faculty achievements.'
      );
    }
    return { nextStatus: WORKFLOW_STATUSES.UNDER_REVIEW, isFinalVerified: false, clearScore: false };
  }

  if (decision === WORKFLOW_STATUSES.DEPARTMENT_APPROVED) {
    if (!FIRST_STAGE_FROM.includes(record.workflow_status)) {
      throw new AppError(
        409,
        'INVALID_TRANSITION',
        `Cannot grant department approval from "${record.workflow_status}" status.`
      );
    }
    return {
      nextStatus: WORKFLOW_STATUSES.DEPARTMENT_APPROVED,
      isDepartmentApproved: true,
      isFinalVerified: false,
      clearScore: false
    };
  }

  if (decision === WORKFLOW_STATUSES.COLLEGE_APPROVED) {
    if (actor.role !== ROLES.SUPER_ADMIN) {
      throw new AppError(
        403,
        'INSUFFICIENT_APPROVAL_AUTHORITY',
        'Only authorized college management may grant final college approval for faculty achievements.'
      );
    }
    if (!COLLEGE_STAGE_FROM.includes(record.workflow_status)) {
      throw new AppError(
        409,
        'INVALID_TRANSITION',
        `Cannot grant college approval from "${record.workflow_status}" status.`
      );
    }
    return {
      nextStatus: WORKFLOW_STATUSES.COLLEGE_APPROVED,
      isDepartmentApproved: !record.department_approved_at,
      isFinalVerified: true,
      clearScore: false
    };
  }

  if (decision === WORKFLOW_STATUSES.CHANGES_REQUESTED || decision === WORKFLOW_STATUSES.REJECTED) {
    if (record.workflow_status === WORKFLOW_STATUSES.DEPARTMENT_APPROVED && actor.role !== ROLES.SUPER_ADMIN) {
      throw new AppError(
        403,
        'INSUFFICIENT_APPROVAL_AUTHORITY',
        'Department-approved faculty achievements can only be returned or rejected by college management.'
      );
    }
    if (!COLLEGE_STAGE_FROM.includes(record.workflow_status)) {
      throw new AppError(
        409,
        'INVALID_TRANSITION',
        `Cannot transition from "${record.workflow_status}" to "${decision}".`
      );
    }
    return { nextStatus: decision, isFinalVerified: false, clearScore: true };
  }

  throw new AppError(400, 'INVALID_WORKFLOW_DECISION', `Unsupported decision "${decision}".`);
}
