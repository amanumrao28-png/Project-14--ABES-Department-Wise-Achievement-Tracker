import { ROLE_LABELS } from '../constants/roles.js';

export function RoleBadge({ role }) {
  return <span className={`badge badge-${role}`}>{ROLE_LABELS[role] || role}</span>;
}

export function AccountStatusBadge({ isActive }) {
  return (
    <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
