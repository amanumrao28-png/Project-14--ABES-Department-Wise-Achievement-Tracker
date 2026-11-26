import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  Briefcase,
  Building2,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  FileBarChart,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext.jsx';
import { notificationsApi } from '../../core/api/notificationsApi.js';
import { getNavigationForUser } from '../../core/rbac/navigationConfig.js';
import { ROLES, ROLE_LABELS, getHomeRouteForRole } from '../../core/constants/roles.js';
import { RoleBadge } from './StatusBadge.jsx';
import { ACADEMIC_YEAR_OPTIONS } from './tracker/AchievementStatusBadge.jsx';
import { ChangePasswordModal } from './ChangePasswordModal.jsx';

const ICON_MAP = {
  'layout-dashboard': LayoutDashboard,
  users: Users,
  building: Building2,
  award: Award,
  'graduation-cap': GraduationCap,
  'plus-circle': PlusCircle,
  briefcase: Briefcase,
  trophy: Trophy,
  'file-bar-chart': FileBarChart,
  sparkles: Sparkles,
  'file-text': FileText
};

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getSearchTargetForRole(role) {
  if (role === ROLES.SUPER_ADMIN) return '/college/users';
  if (role === ROLES.HOD) return '/department/faculty-tracker';
  if (role === ROLES.FACULTY) return '/faculty/achievements';
  if (role === ROLES.STUDENT) return '/student/achievements';
  return null;
}

function resolvePageHeading(pathname, navSections) {
  for (const group of navSections) {
    for (const item of group.items) {
      if (pathname === item.to) {
        return { section: group.section, title: item.label };
      }
    }
  }
  if (pathname.includes('/department-tracker/')) return { section: 'Department Tracker', title: 'Achievement Details' };
  if (pathname.includes('/faculty-tracker/') || pathname.includes('/faculty/achievements/')) {
    return { section: 'Faculty Tracker', title: 'Achievement Details' };
  }
  if (pathname.includes('/student-tracker/') || pathname.includes('/student/achievements/') || pathname.includes('/department-students/')) {
    return { section: 'Student Tracker', title: 'Achievement Details' };
  }
  if (pathname.endsWith('/leaderboards')) return { section: 'Intelligence & Reports', title: 'Leaderboards' };
  if (pathname.endsWith('/reports')) return { section: 'Intelligence & Reports', title: 'Annual Reports' };
  if (pathname.endsWith('/insights')) return { section: 'Intelligence & Reports', title: 'AI Insights' };
  return { section: 'Workspace', title: 'ABES Achievement Tracker' };
}

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('abes_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const activeAcademicYear = searchParams.get('academic_year') || '';

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const navSections = useMemo(() => getNavigationForUser(user), [user]);
  const homeRoute = getHomeRouteForRole(user?.role);
  const searchTarget = getSearchTargetForRole(user?.role);
  const pageHeading = useMemo(
    () => resolvePageHeading(location.pathname, navSections),
    [location.pathname, navSections]
  );

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSidebarCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('abes_sidebar_collapsed', next ? '1' : '0');
      } catch {
        // Ignore storage restrictions
      }
      return next;
    });
  };

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.list(15);
      setNotifications(data?.items || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      // Ignore transient notification fetch error
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 45000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  const resolveNotificationRoute = (n) => {
    if (n.tracker_domain === 'department') {
      return user?.role === ROLES.SUPER_ADMIN
        ? `/college/department-tracker/${n.achievement_id}`
        : `/department/department-tracker/${n.achievement_id}`;
    }
    if (n.tracker_domain === 'faculty') {
      if (user?.role === ROLES.FACULTY) return `/faculty/achievements/${n.achievement_id}`;
      return user?.role === ROLES.SUPER_ADMIN
        ? `/college/faculty-tracker/${n.achievement_id}`
        : `/department/faculty-tracker/${n.achievement_id}`;
    }
    if (user?.role === ROLES.STUDENT) return `/student/achievements/${n.achievement_id}`;
    if (user?.role === ROLES.FACULTY) return `/faculty/department-students/${n.achievement_id}`;
    return user?.role === ROLES.SUPER_ADMIN
      ? `/college/student-tracker/${n.achievement_id}`
      : `/department/student-tracker/${n.achievement_id}`;
  };

  const handleOpenNotification = async (item) => {
    if (!item.is_read) {
      await notificationsApi.markRead(item.id).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_read: true } : x)));
    }
    setNotifOpen(false);
    navigate(resolveNotificationRoute(item));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setUnreadCount(0);
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTarget) return;
    const next = new URLSearchParams();
    if (searchQuery.trim()) next.set('search', searchQuery.trim());
    if (activeAcademicYear) next.set('academic_year', activeAcademicYear);
    const qs = next.toString();
    navigate(qs ? `${searchTarget}?${qs}` : searchTarget);
  };

  const handleAcademicYearChange = (e) => {
    const val = e.target.value;
    const next = new URLSearchParams(location.search);
    if (val) {
      next.set('academic_year', val);
    } else {
      next.delete('academic_year');
    }
    const qs = next.toString();
    navigate(qs ? `${location.pathname}?${qs}` : location.pathname, { replace: true });
  };

  const scopeLabel =
    user?.role === ROLES.SUPER_ADMIN
      ? 'College-Wide Scope'
      : user?.department
        ? `${user.department.code} — ${user.department.name}`
        : 'Assigned Department';

  const initials = getInitials(user?.full_name);

  return (
    <div className="app-layout">
      {mobileMenuOpen && (
        <div
          className="mobile-sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileMenuOpen ? 'is-mobile-open' : ''}`}
        aria-label="Role-scoped navigation"
      >
        <div className="sidebar-brand">
          <Link to={homeRoute} className="sidebar-brand-link" title="ABES Achievement Tracker">
            <div className="sidebar-brand-badge">ABES</div>
            <div className="sidebar-brand-text">
              <strong>Achievement Tracker</strong>
              <span>Institutional Portal</span>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar-collapse-btn desktop-collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebarCollapsed}
          >
            <PanelLeftClose size={15} />
          </button>

          <button
            type="button"
            className="sidebar-collapse-btn mobile-menu-btn"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={15} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((group) => (
            <div key={group.section} className="sidebar-group">
              <div className="sidebar-section-label">{group.section}</div>
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card" title={`${user?.full_name || ''} • ${ROLE_LABELS[user?.role] || ''}`}>
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-meta">
              <strong>{user?.full_name || 'Authenticated User'}</strong>
              <span>
                {ROLE_LABELS[user?.role] || user?.role}
                {user?.department?.code ? ` • ${user.department.code}` : ''}
              </span>
            </div>
          </div>
          {!collapsed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                padding: '0 6px',
                fontSize: 11,
                color: '#94A3B8'
              }}
            >
              <ShieldCheck size={13} color="#60A5FA" />
              <span>Strict Role Isolation Active</span>
            </div>
          )}
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-nav-btn mobile-menu-btn"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={17} />
            </button>

            {collapsed && (
              <button
                type="button"
                className="topbar-nav-btn desktop-collapse-btn"
                aria-label="Expand sidebar"
                title="Expand sidebar"
                onClick={toggleSidebarCollapsed}
              >
                <PanelLeftOpen size={17} />
              </button>
            )}

            <div className="topbar-heading-group">
              <nav className="breadcrumbs" aria-label="Breadcrumb">
                <Link to={homeRoute}>{ROLE_LABELS[user?.role] || 'Home'}</Link>
                <ChevronRight size={12} />
                <span>{pageHeading.section}</span>
              </nav>
              <div className="topbar-page-title">{pageHeading.title}</div>
            </div>

            <span className="dept-pill">
              <Building2 size={13} />
              {scopeLabel}
            </span>
          </div>

          <div className="topbar-actions">
            {searchTarget && (
              <form className="topbar-search-form" onSubmit={handleGlobalSearchSubmit} role="search">
                <Search size={14} className="topbar-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="topbar-search-input"
                  aria-label="Search accessible records"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            )}

            <select
              className="topbar-ay-select"
              aria-label="Academic year filter"
              value={activeAcademicYear}
              onChange={handleAcademicYearChange}
            >
              <option value="">All Academic Years</option>
              {ACADEMIC_YEAR_OPTIONS.map((yr) => (
                <option key={yr} value={yr}>
                  AY {yr}
                </option>
              ))}
            </select>

            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="topbar-nav-btn"
                style={{ position: 'relative', width: 'auto', padding: '0 10px', gap: 6 }}
                aria-label="Workflow notifications"
                aria-expanded={notifOpen}
                onClick={() => {
                  setProfileOpen(false);
                  setNotifOpen((v) => !v);
                  if (!notifOpen) loadNotifications();
                }}
              >
                <Bell size={16} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="notif-popover glass-panel" role="region" aria-label="Notifications">
                  <div className="notif-popover-header">
                    <strong>Status Notifications</strong>
                    {unreadCount > 0 && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
                        <CheckCheck size={13} />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                  <div className="notif-popover-list">
                    {notifications.length === 0 ? (
                      <div style={{ padding: 16 }} className="form-hint">
                        No workflow notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={`notif-item ${n.is_read ? '' : 'unread'}`}
                          onClick={() => handleOpenNotification(n)}
                        >
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                          <div className="form-hint" style={{ marginTop: 2 }}>{n.message}</div>
                          <div className="form-hint" style={{ marginTop: 4, fontSize: 11 }}>
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="profile-trigger"
                aria-label="User profile menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setNotifOpen(false);
                  setProfileOpen((v) => !v);
                }}
              >
                <span className="profile-avatar-sm">{initials}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                  {user?.full_name?.split(' ')[0] || 'Account'}
                </span>
                <ChevronDown size={14} color="#64748B" />
              </button>

              {profileOpen && (
                <div className="popover-menu profile-popover glass-panel" role="menu" aria-label="User menu">
                  <div className="profile-popover-header">
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
                      {user?.full_name}
                    </div>
                    <div className="form-hint" style={{ marginTop: 2 }}>
                      {user?.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <RoleBadge role={user?.role} />
                      {user?.employee_or_roll_no && (
                        <span className="form-hint">{user.employee_or_roll_no}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    className="profile-popover-item"
                    onClick={() => {
                      setProfileOpen(false);
                      setChangePwOpen(true);
                    }}
                  >
                    <KeyRound size={15} />
                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    className="profile-popover-item danger"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      <ChangePasswordModal isOpen={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </div>
  );
}
