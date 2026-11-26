export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  HOD: 'hod',
  FACULTY: 'faculty',
  STUDENT: 'student'
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.HOD]: 'Head of Department (HOD)',
  [ROLES.FACULTY]: 'Faculty Member',
  [ROLES.STUDENT]: 'Student'
});

/**
 * Exact role-based landing routes executed immediately after successful authentication.
 */
export const ROLE_HOME_ROUTES = Object.freeze({
  [ROLES.SUPER_ADMIN]: '/college/dashboard',
  [ROLES.HOD]: '/department/dashboard',
  [ROLES.FACULTY]: '/faculty/dashboard',
  [ROLES.STUDENT]: '/student/dashboard'
});

export function getHomeRouteForRole(role) {
  return ROLE_HOME_ROUTES[role] || '/unauthorized';
}
