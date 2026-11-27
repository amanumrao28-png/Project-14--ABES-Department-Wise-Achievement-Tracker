import {
  Building2,
  CheckSquare,
  FileDown,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  Trophy,
  Users,
  UserCheck,
} from 'lucide-react';
import { PortalShell } from '@shared/components/PortalShell.jsx';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';

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

export function HODLayout({ children }) {
  const { user } = useAuth();
  const canManageUsers =
    user?.role === ROLES.SUPER_ADMIN || Boolean(user?.can_manage_dept_users);

  const navSections = [
    {
      title: 'Department Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/approvals', label: 'Pending Approvals', icon: CheckSquare },
      ],
    },
    {
      title: 'Achievement Trackers',
      items: [
        { to: '/achievements', label: 'Dept Achievements', icon: Building2 },
        { to: '/faculty', label: 'Faculty Tracker', icon: UserCheck },
        { to: '/students', label: 'Student Tracker', icon: GraduationCap },
      ],
    },
    {
      title: 'Analytics & Administration',
      items: [
        { to: '/analytics', label: 'Leaderboards', icon: Trophy },
        { to: '/insights', label: 'AI Insights', icon: Sparkles },
        { to: '/reports', label: 'Department Reports', icon: FileDown },
        ...(canManageUsers
          ? [{ to: '/users', label: 'Dept Users', icon: Users }]
          : []),
      ],
    },
  ];

  return (
    <PortalShell
      portalName="ABES HOD Portal"
      portalSubtitle="Department Governance & Approvals"
      navSections={navSections}
      homeRoute="/dashboard"
      searchTarget="/achievements"
      resolveNotificationRoute={resolveNotificationRoute}
    >
      {children}
    </PortalShell>
  );
}
