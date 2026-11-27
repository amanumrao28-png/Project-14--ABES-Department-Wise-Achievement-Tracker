import { ROLES, getHomeRouteForRole } from '../constants/roles.js';

const HOD_MANAGEABLE_ROLES = [ROLES.FACULTY, ROLES.STUDENT];

/**
 * Checks whether the current user is allowed to open the User Management interface.
 * Super Admin always has access; HOD only has access when explicitly granted `can_manage_dept_users`.
 */
export function canAccessUserManagement(user) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.role === ROLES.HOD) return user.can_manage_dept_users === true;
  return false;
}

/**
 * Returns the list of roles the actor is allowed to assign when creating/updating accounts.
 */
export function getManageableRolesForActor(actor) {
  if (!actor) return [];
  if (actor.role === ROLES.SUPER_ADMIN) {
    return [ROLES.HOD, ROLES.FACULTY, ROLES.STUDENT, ROLES.SUPER_ADMIN];
  }
  if (actor.role === ROLES.HOD && actor.can_manage_dept_users === true) {
    return HOD_MANAGEABLE_ROLES;
  }
  return [];
}

/**
 * Determines whether the actor may mutate (edit/deactivate/reset access) a specific target row.
 */
export function canMutateTargetUser(actor, targetUser) {
  if (!actor || !targetUser) return false;
  if (actor.role === ROLES.SUPER_ADMIN) return true;
  if (actor.role === ROLES.HOD && actor.can_manage_dept_users === true) {
    return (
      targetUser.department_id === actor.department_id &&
      HOD_MANAGEABLE_ROLES.includes(targetUser.role)
    );
  }
  return false;
}

/**
 * Route-level capability check used to sanitize post-login redirects so users
 * never bounce into /access-denied immediately after authenticating.
 */
export function isPathAllowedForUser(user, pathname) {
  if (!user || !pathname) return false;

  if (pathname.startsWith('/college/')) {
    return user.role === ROLES.SUPER_ADMIN;
  }
  if (pathname === '/department/users') {
    return user.role === ROLES.HOD && user.can_manage_dept_users === true;
  }
  if (pathname.startsWith('/department/')) {
    return user.role === ROLES.HOD;
  }
  if (pathname.startsWith('/faculty/')) {
    return user.role === ROLES.FACULTY;
  }
  if (pathname.startsWith('/student/')) {
    return user.role === ROLES.STUDENT;
  }

  return false;
}

export function getSafePostLoginDestination(user, requestedPath) {
  if (requestedPath && isPathAllowedForUser(user, requestedPath)) {
    return requestedPath;
  }
  return getHomeRouteForRole(user?.role);
}
