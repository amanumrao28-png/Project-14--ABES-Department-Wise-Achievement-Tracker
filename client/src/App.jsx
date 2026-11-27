import { Component } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/auth/AuthContext.jsx';
import { ProtectedRoute } from './core/auth/ProtectedRoute.jsx';
import { PublicOnlyRoute } from './core/auth/PublicOnlyRoute.jsx';
import { ROLES, getHomeRouteForRole } from './core/constants/roles.js';
import { canAccessUserManagement } from './core/rbac/permissions.js';
import { AppShell } from './shared/components/AppShell.jsx';

import { LandingPage } from './modules/landing/pages/LandingPage.jsx';
import { PublicPassportPage } from './modules/landing/pages/PublicPassportPage.jsx';
import { LoginPage } from './modules/auth/pages/LoginPage.jsx';
import { ForgotPasswordPage } from './modules/auth/pages/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './modules/auth/pages/ResetPasswordPage.jsx';
import { UnauthorizedPage } from './modules/auth/pages/UnauthorizedPage.jsx';
import { AccessDeniedPage } from './modules/auth/pages/AccessDeniedPage.jsx';

import { CollegeDashboardPage } from './modules/dashboards/pages/CollegeDashboardPage.jsx';
import { DepartmentDashboardPage } from './modules/dashboards/pages/DepartmentDashboardPage.jsx';
import { FacultyDashboardPage } from './modules/dashboards/pages/FacultyDashboardPage.jsx';
import { StudentDashboardPage } from './modules/dashboards/pages/StudentDashboardPage.jsx';

import { UsersManagementPage } from './modules/admin/pages/UsersManagementPage.jsx';
import { DepartmentsPage } from './modules/admin/pages/DepartmentsPage.jsx';

import { DeptAchievementsListPage } from './modules/department-tracker/pages/DeptAchievementsListPage.jsx';
import { DeptAchievementFormPage } from './modules/department-tracker/pages/DeptAchievementFormPage.jsx';
import { DeptAchievementDetailPage } from './modules/department-tracker/pages/DeptAchievementDetailPage.jsx';

import { FacultyAchievementsListPage } from './modules/faculty-tracker/pages/FacultyAchievementsListPage.jsx';
import { FacultyAchievementFormPage } from './modules/faculty-tracker/pages/FacultyAchievementFormPage.jsx';
import { FacultyAchievementDetailPage } from './modules/faculty-tracker/pages/FacultyAchievementDetailPage.jsx';
import { FacultyPortfolioPage } from './modules/faculty-tracker/pages/FacultyPortfolioPage.jsx';

import { StudentAchievementsListPage } from './modules/student-tracker/pages/StudentAchievementsListPage.jsx';
import { StudentAchievementFormPage } from './modules/student-tracker/pages/StudentAchievementFormPage.jsx';
import { StudentAchievementDetailPage } from './modules/student-tracker/pages/StudentAchievementDetailPage.jsx';
import { StudentPortfolioPage } from './modules/student-tracker/pages/StudentPortfolioPage.jsx';
import LeaderboardsPage from './modules/leaderboards/pages/LeaderboardsPage.jsx';
import ReportsPage from './modules/reports/pages/ReportsPage.jsx';
import InsightsPage from './modules/insights/pages/InsightsPage.jsx';

function RootRedirect() {
  const { user, initializing, isAuthenticated } = useAuth();
  if (initializing) {
    return (
      <div className="fullscreen-loader" role="status" aria-live="polite">
        <div className="spinner" />
        <span>Loading session...</span>
      </div>
    );
  }
  return (
    <Navigate
      to={isAuthenticated && user ? getHomeRouteForRole(user.role) : '/login'}
      replace
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/passport/:userId" element={<PublicPassportPage />} />

      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Security Error Pages */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />

      {/* Super Admin Routes -> College Dashboard & Governance */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
        <Route
          path="/college/dashboard"
          element={
            <AppShell>
              <CollegeDashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/college/users"
          element={
            <AppShell>
              <UsersManagementPage />
            </AppShell>
          }
        />
        <Route
          path="/college/departments"
          element={
            <AppShell>
              <DepartmentsPage />
            </AppShell>
          }
        />
        <Route
          path="/college/department-tracker"
          element={
            <AppShell>
              <DeptAchievementsListPage />
            </AppShell>
          }
        />
        <Route
          path="/college/department-tracker/new"
          element={
            <AppShell>
              <DeptAchievementFormPage mode="create" />
            </AppShell>
          }
        />
        <Route
          path="/college/department-tracker/:id"
          element={
            <AppShell>
              <DeptAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/college/department-tracker/:id/edit"
          element={
            <AppShell>
              <DeptAchievementFormPage mode="edit" />
            </AppShell>
          }
        />
        <Route
          path="/college/faculty-tracker"
          element={
            <AppShell>
              <FacultyAchievementsListPage />
            </AppShell>
          }
        />
        <Route
          path="/college/faculty-tracker/new"
          element={
            <AppShell>
              <FacultyAchievementFormPage mode="create" />
            </AppShell>
          }
        />
        <Route
          path="/college/faculty-tracker/:id"
          element={
            <AppShell>
              <FacultyAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/college/faculty-tracker/:id/edit"
          element={
            <AppShell>
              <FacultyAchievementFormPage mode="edit" />
            </AppShell>
          }
        />
        <Route
          path="/college/student-tracker"
          element={
            <AppShell>
              <StudentAchievementsListPage />
            </AppShell>
          }
        />
        <Route
          path="/college/student-tracker/:id"
          element={
            <AppShell>
              <StudentAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/college/student-tracker/:id/edit"
          element={
            <AppShell>
              <StudentAchievementFormPage mode="edit" />
            </AppShell>
          }
        />
        <Route
          path="/college/leaderboards"
          element={
            <AppShell>
              <LeaderboardsPage />
            </AppShell>
          }
        />
        <Route
          path="/college/reports"
          element={
            <AppShell>
              <ReportsPage />
            </AppShell>
          }
        />
        <Route
          path="/college/insights"
          element={
            <AppShell>
              <InsightsPage />
            </AppShell>
          }
        />
      </Route>

      {/* HOD Routes -> Department Dashboard, Independent Trackers & Delegated Department User Management */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.HOD]} />}>
        <Route
          path="/department/dashboard"
          element={
            <AppShell>
              <DepartmentDashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/department/department-tracker"
          element={
            <AppShell>
              <DeptAchievementsListPage />
            </AppShell>
          }
        />
        <Route
          path="/department/department-tracker/new"
          element={
            <AppShell>
              <DeptAchievementFormPage mode="create" />
            </AppShell>
          }
        />
        <Route
          path="/department/department-tracker/:id"
          element={
            <AppShell>
              <DeptAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/department/department-tracker/:id/edit"
          element={
            <AppShell>
              <DeptAchievementFormPage mode="edit" />
            </AppShell>
          }
        />
        <Route
          path="/department/faculty-tracker"
          element={
            <AppShell>
              <FacultyAchievementsListPage />
            </AppShell>
          }
        />
        <Route
          path="/department/faculty-tracker/new"
          element={
            <AppShell>
              <FacultyAchievementFormPage mode="create" />
            </AppShell>
          }
        />
        <Route
          path="/department/faculty-tracker/:id"
          element={
            <AppShell>
              <FacultyAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/department/faculty-tracker/:id/edit"
          element={
            <AppShell>
              <FacultyAchievementFormPage mode="edit" />
            </AppShell>
          }
        />
        <Route
          path="/department/student-tracker"
          element={
            <AppShell>
              <StudentAchievementsListPage />
            </AppShell>
          }
        />
        <Route
          path="/department/student-tracker/:id"
          element={
            <AppShell>
              <StudentAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/department/leaderboards"
          element={
            <AppShell>
              <LeaderboardsPage />
            </AppShell>
          }
        />
        <Route
          path="/department/reports"
          element={
            <AppShell>
              <ReportsPage />
            </AppShell>
          }
        />
        <Route
          path="/department/insights"
          element={
            <AppShell>
              <InsightsPage />
            </AppShell>
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.HOD]}
            requirePermission={canAccessUserManagement}
          />
        }
      >
        <Route
          path="/department/users"
          element={
            <AppShell>
              <UsersManagementPage />
            </AppShell>
          }
        />
      </Route>

      {/* Faculty Routes -> Faculty Dashboard, Personal Faculty Tracker & Read-Only Dept Students */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.FACULTY]} />}>
        <Route
          path="/faculty/dashboard"
          element={
            <AppShell>
              <FacultyDashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/faculty/achievements"
          element={
            <AppShell>
              <FacultyAchievementsListPage />
            </AppShell>
          }
        />
        <Route
          path="/faculty/achievements/new"
          element={
            <AppShell>
              <FacultyAchievementFormPage mode="create" />
            </AppShell>
          }
        />
        <Route
          path="/faculty/achievements/:id"
          element={
            <AppShell>
              <FacultyAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/faculty/achievements/:id/edit"
          element={
            <AppShell>
              <FacultyAchievementFormPage mode="edit" />
            </AppShell>
          }
        />
        <Route
          path="/faculty/portfolio"
          element={
            <AppShell>
              <FacultyPortfolioPage />
            </AppShell>
          }
        />
        <Route
          path="/faculty/department-students"
          element={
            <AppShell>
              <StudentAchievementsListPage />
            </AppShell>
          }
        />
        <Route
          path="/faculty/department-students/:id"
          element={
            <AppShell>
              <StudentAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/faculty/leaderboards"
          element={
            <AppShell>
              <LeaderboardsPage />
            </AppShell>
          }
        />
        <Route
          path="/faculty/reports"
          element={
            <AppShell>
              <ReportsPage />
            </AppShell>
          }
        />
        <Route
          path="/faculty/insights"
          element={
            <AppShell>
              <InsightsPage />
            </AppShell>
          }
        />
      </Route>

      {/* Student Routes -> Student Dashboard, Personal Student Tracker Views & Portfolio */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
        <Route
          path="/student/dashboard"
          element={
            <AppShell>
              <StudentDashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/student/achievements"
          element={
            <AppShell>
              <StudentAchievementsListPage initialGroup="all" />
            </AppShell>
          }
        />
        <Route
          path="/student/achievements/new"
          element={
            <AppShell>
              <StudentAchievementFormPage mode="create" />
            </AppShell>
          }
        />
        <Route
          path="/student/achievements/:id"
          element={
            <AppShell>
              <StudentAchievementDetailPage />
            </AppShell>
          }
        />
        <Route
          path="/student/achievements/:id/edit"
          element={
            <AppShell>
              <StudentAchievementFormPage mode="edit" />
            </AppShell>
          }
        />
        <Route
          path="/student/competitions"
          element={
            <AppShell>
              <StudentAchievementsListPage initialGroup="competitions" />
            </AppShell>
          }
        />
        <Route
          path="/student/internships"
          element={
            <AppShell>
              <StudentAchievementsListPage initialGroup="internships" />
            </AppShell>
          }
        />
        <Route
          path="/student/placements"
          element={
            <AppShell>
              <StudentAchievementsListPage initialGroup="placements" />
            </AppShell>
          }
        />
        <Route
          path="/student/portfolio"
          element={
            <AppShell>
              <StudentPortfolioPage />
            </AppShell>
          }
        />
        <Route
          path="/student/reports"
          element={
            <AppShell>
              <ReportsPage />
            </AppShell>
          }
        />
        <Route
          path="/student/insights"
          element={
            <AppShell>
              <InsightsPage />
            </AppShell>
          }
        />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'An unexpected UI error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="status-page">
          <div className="status-card">
            <span className="status-code-pill">UI Recovery</span>
            <h1 className="page-title" style={{ fontSize: 22 }}>Something went wrong</h1>
            <p className="page-subtitle" style={{ marginTop: 8 }}>{this.state.message}</p>
            <div className="status-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.assign('/')}
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
