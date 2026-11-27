import {
  Building2,
  CheckSquare,
  ExternalLink,
  FileDown,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Settings,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { PortalShell } from '@shared/components/PortalShell.jsx';

const NAV_SECTIONS = [
  {
    title: 'Institutional Overview',
    items: [
      { to: '/dashboard', label: 'College Dashboard', icon: LayoutDashboard, end: true },
      { to: '/departments', label: 'Departments', icon: Landmark },
      { to: '/users', label: 'User Directory', icon: Users },
    ],
  },
  {
    title: 'All Achievement Trackers',
    items: [
      { to: '/achievements', label: 'Department Tracker', icon: Building2 },
      { to: '/faculty', label: 'Faculty Tracker', icon: UserCheck },
      { to: '/students', label: 'Student Tracker', icon: GraduationCap },
      { to: '/approvals', label: 'Final Approvals', icon: CheckSquare },
    ],
  },
  {
    title: 'Analytics & Governance',
    items: [
      { to: '/analytics', label: 'Leaderboards', icon: Trophy },
      { to: '/insights', label: 'AI Insights', icon: Sparkles },
      { to: '/reports', label: 'Institutional Reports', icon: FileDown },
      { to: '/settings', label: 'Portal Settings', icon: Settings },
    ],
  },
];

function resolveNotificationRoute(n) {
  if (n.entity_type === 'department_achievement' && n.entity_id) {
    return `/achievements/${n.entity_id}`;
  }
  if (n.entity_type === 'faculty_achievement' && n.entity_id) {
    return `/faculty/${n.entity_id}`;
  }
  if (n.entity_type === 'student_achievement' && n.entity_id) {
    return `/students/${n.entity_id}`;
  }
  return '/dashboard';
}

const PORTAL_SWITCHER = (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <a
      href={import.meta.env.VITE_STUDENT_PORTAL_URL || 'http://localhost:5173'}
      target="_blank"
      rel="noreferrer"
      className="btn btn-secondary"
      style={{ padding: '4px 10px', fontSize: 12 }}
      title="Open Student Portal"
    >
      <span>Student</span>
      <ExternalLink size={12} />
    </a>
    <a
      href={import.meta.env.VITE_FACULTY_PORTAL_URL || 'http://localhost:5174'}
      target="_blank"
      rel="noreferrer"
      className="btn btn-secondary"
      style={{ padding: '4px 10px', fontSize: 12 }}
      title="Open Faculty Portal"
    >
      <span>Faculty</span>
      <ExternalLink size={12} />
    </a>
    <a
      href={import.meta.env.VITE_HOD_PORTAL_URL || 'http://localhost:5175'}
      target="_blank"
      rel="noreferrer"
      className="btn btn-secondary"
      style={{ padding: '4px 10px', fontSize: 12 }}
      title="Open HOD Portal"
    >
      <span>HOD</span>
      <ExternalLink size={12} />
    </a>
  </div>
);

export function SuperAdminLayout({ children }) {
  return (
    <PortalShell
      portalName="ABES Super Admin"
      portalSubtitle="Institutional Control Center"
      navSections={NAV_SECTIONS}
      homeRoute="/dashboard"
      searchTarget="/achievements"
      resolveNotificationRoute={resolveNotificationRoute}
      topbarExtra={PORTAL_SWITCHER}
    >
      {children}
    </PortalShell>
  );
}
