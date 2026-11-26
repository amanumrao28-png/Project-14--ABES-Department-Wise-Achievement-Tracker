import { ROLES, WORKFLOW_STATUSES } from '../../config/env.js';
import { AppError } from '../../core/middleware/errorHandler.js';

const FIRST_STAGE_FROM = [WORKFLOW_STATUSES.SUBMITTED, WORKFLOW_STATUSES.UNDER_REVIEW];
const FINAL_STAGE_FROM = [
  WORKFLOW_STATUSES.SUBMITTED,
  WORKFLOW_STATUSES.UNDER_REVIEW,
  WORKFLOW_STATUSES.DEPARTMENT_APPROVED
];

/**
 * Independent Student Achievement Approval Workflow.
 * Reviewed by an authorized Faculty Coordinator (same dept) and/or HOD (same dept),
 * with optional College Management finalization when configured per department.
 */
export function resolveStudentTransition({
  actor,
  record,
  decision,
  departmentConfig = null,
  overrideSelfApproval = false
}) {
  const isFacultyCoordinator =
    actor?.role === ROLES.FACULTY && actor?.can_coordinate_student_approvals === true;
  const isHod = actor?.role === ROLES.HOD;
  const isSuperAdmin = actor?.role === ROLES.SUPER_ADMIN;

  if (!actor || (!isFacultyCoordinator && !isHod && !isSuperAdmin)) {
    throw new AppError(
      403,
      'INSUFFICIENT_APPROVAL_AUTHORITY',
      'Only an authorized faculty coordinator, HOD, or college management may review student achievements.'
    );
  }

  if (!isSuperAdmin && record.department_id !== actor.department_id) {
    throw new AppError(
      403,
      'DEPARTMENT_ACCESS_DENIED',
      'Reviewers may only review student achievements within their assigned department.'
    );
  }

  if (record.owner_user_id === actor.id && !(isSuperAdmin && overrideSelfApproval)) {
    throw new AppError(
      403,
      'SELF_APPROVAL_BLOCKED',
      'Separation of duties prevents approving your own submission.'
    );
  }

  if (decision === WORKFLOW_STATUSES.UNDER_REVIEW) {
    if (![WORKFLOW_STATUSES.SUBMITTED, WORKFLOW_STATUSES.DEPARTMENT_APPROVED].includes(record.workflow_status)) {
      throw new AppError(409, 'INVALID_TRANSITION', 'Record is not awaiting review.');
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
    if (isFacultyCoordinator) {
      throw new AppError(
        403,
        'INSUFFICIENT_APPROVAL_AUTHORITY',
        'Faculty coordinators may approve up to department level; final verification requires HOD or college management.'
      );
    }

    const requiresCollegeMgmt = Boolean(departmentConfig?.student_requires_college_approval);
    if (isHod && requiresCollegeMgmt) {
      throw new AppError(
        403,
        'COLLEGE_APPROVAL_REQUIRED',
        'Your department workflow requires authorized college management for final verification.'
      );
    }

    if (!FINAL_STAGE_FROM.includes(record.workflow_status)) {
      throw new AppError(
        409,
        'INVALID_TRANSITION',
        `Cannot grant final verification from "${record.workflow_status}" status.`
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
    if (!FINAL_STAGE_FROM.includes(record.workflow_status)) {
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
