import {
  Award,
  BarChart3,
  Briefcase,
  FileDown,
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  Trophy,
  UserCircle2,
} from 'lucide-react';
import { PortalShell } from '@shared/components/PortalShell.jsx';

const NAV_SECTIONS = [
  {
    title: 'Student Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/profile', label: 'My Portfolio', icon: UserCircle2 },
    ],
  },
  {
    title: 'Achievements',
    items: [
      { to: '/achievements', label: 'All Achievements', icon: Award },
      { to: '/achievements/new', label: 'Submit Achievement', icon: PlusCircle },
      { to: '/competitions', label: 'Competitions', icon: Trophy },
      { to: '/internships', label: 'Internships', icon: Briefcase },
      { to: '/placements', label: 'Placements', icon: Briefcase },
    ],
  },
  {
    title: 'Insights & Reports',
    items: [
      { to: '/leaderboards', label: 'Student Leaderboard', icon: Trophy },
      { to: '/insights', label: 'AI Insights', icon: Sparkles },
      { to: '/reports', label: 'Personal Reports', icon: FileDown },
      { to: '/achievement-history', label: 'Achievement History', icon: BarChart3 },
    ],
  },
];

function resolveNotificationRoute(n) {
  if (n.entity_type === 'student_achievement' && n.entity_id) {
    return `/achievements/${n.entity_id}`;
  }
  return '/achievements';
}

export function StudentLayout({ children }) {
  return (
    <PortalShell
      portalName="ABES Student Portal"
      portalSubtitle="Student Achievement Workspace"
      navSections={NAV_SECTIONS}
      homeRoute="/dashboard"
      searchTarget="/achievements"
      resolveNotificationRoute={resolveNotificationRoute}
    >
      {children}
    </PortalShell>
  );
}
