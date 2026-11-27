import {
  Award,
  CheckSquare,
  FileDown,
  GraduationCap,
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  Trophy,
  UserCircle2,
} from 'lucide-react';
import { PortalShell } from '@shared/components/PortalShell.jsx';

const NAV_SECTIONS = [
  {
    title: 'Faculty Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/profile', label: 'My Portfolio', icon: UserCircle2 },
    ],
  },
  {
    title: 'My Achievements',
    items: [
      { to: '/my-achievements', label: 'All Submissions', icon: Award },
      { to: '/my-achievements/new', label: 'Submit Achievement', icon: PlusCircle },
    ],
  },
  {
    title: 'Department & Analytics',
    items: [
      { to: '/approvals', label: 'Pending Verifications', icon: CheckSquare },
      { to: '/student-achievements', label: 'Dept Students', icon: GraduationCap },
      { to: '/analytics', label: 'Leaderboards', icon: Trophy },
      { to: '/insights', label: 'AI Insights', icon: Sparkles },
      { to: '/reports', label: 'Reports & Export', icon: FileDown },
    ],
  },
];

function resolveNotificationRoute(n) {
  if (n.entity_type === 'faculty_achievement' && n.entity_id) {
    return `/my-achievements/${n.entity_id}`;
  }
  if (n.entity_type === 'student_achievement' && n.entity_id) {
    return `/student-achievements/${n.entity_id}`;
  }
  return '/my-achievements';
}

export function FacultyLayout({ children }) {
  return (
    <PortalShell
      portalName="ABES Faculty Portal"
      portalSubtitle="Faculty Research & Mentorship"
      navSections={NAV_SECTIONS}
      homeRoute="/dashboard"
      searchTarget="/my-achievements"
      resolveNotificationRoute={resolveNotificationRoute}
    >
      {children}
    </PortalShell>
  );
}
