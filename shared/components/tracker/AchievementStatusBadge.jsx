const STATUS_CONFIG = {
  draft: { label: 'Draft', cls: 'badge-inactive' },
  submitted: { label: 'Submitted', cls: 'badge-student' },
  under_review: { label: 'Under Review', cls: 'badge-super_admin' },
  changes_requested: { label: 'Changes Requested', cls: 'badge-hod' },
  department_approved: { label: 'Department Approved', cls: 'badge-faculty' },
  college_approved: { label: 'College Approved', cls: 'badge-active' },
  rejected: { label: 'Rejected', cls: 'badge-rejected' },
  archived: { label: 'Archived', cls: 'badge-inactive' }
};

export function AchievementStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status || 'Unknown', cls: 'badge-inactive' };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

export const WORKFLOW_FILTER_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'department_approved', label: 'Department Approved' },
  { value: 'college_approved', label: 'College Approved (Verified)' },
  { value: 'rejected', label: 'Rejected' }
];

export const ACHIEVEMENT_LEVEL_OPTIONS = [
  { value: 'international', label: 'International' },
  { value: 'national', label: 'National' },
  { value: 'state', label: 'State' },
  { value: 'university', label: 'University' },
  { value: 'institutional', label: 'Institutional' }
];

export const ACADEMIC_YEAR_OPTIONS = [
  '2026-27',
  '2025-26',
  '2024-25',
  '2023-24',
  '2022-23'
];
