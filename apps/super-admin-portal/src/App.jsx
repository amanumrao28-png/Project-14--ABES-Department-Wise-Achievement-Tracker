import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@shared/auth/AuthContext.jsx';
import { ProtectedRoute } from '@shared/auth/ProtectedRoute.jsx';
import { PublicOnlyRoute } from '@shared/auth/PublicOnlyRoute.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { LoginPage } from '@shared/auth-pages/pages/LoginPage.jsx';
import { ForgotPasswordPage } from '@shared/auth-pages/pages/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from '@shared/auth-pages/pages/ResetPasswordPage.jsx';
import { AccessDeniedPage } from '@shared/auth-pages/pages/AccessDeniedPage.jsx';
import { UnauthorizedPage } from '@shared/auth-pages/pages/UnauthorizedPage.jsx';

import { SuperAdminLayout } from './layouts/SuperAdminLayout.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { PublicPassportPage } from './pages/PublicPassportPage.jsx';
import { CollegeDashboardPage } from './pages/CollegeDashboardPage.jsx';
import { DepartmentsPage } from './pages/DepartmentsPage.jsx';
import { UsersManagementPage } from './pages/UsersManagementPage.jsx';
import { DeptAchievementsListPage } from './pages/DeptAchievementsListPage.jsx';
import { DeptAchievementFormPage } from './pages/DeptAchievementFormPage.jsx';
import { DeptAchievementDetailPage } from './pages/DeptAchievementDetailPage.jsx';
import { FacultyAchievementsListPage } from './pages/FacultyAchievementsListPage.jsx';
import { FacultyAchievementFormPage } from './pages/FacultyAchievementFormPage.jsx';
import { FacultyAchievementDetailPage } from './pages/FacultyAchievementDetailPage.jsx';
import { StudentAchievementsListPage } from './pages/StudentAchievementsListPage.jsx';
import { StudentAchievementFormPage } from './pages/StudentAchievementFormPage.jsx';
import { StudentAchievementDetailPage } from './pages/StudentAchievementDetailPage.jsx';
import LeaderboardsPage from './pages/LeaderboardsPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { PendingApprovalsPage } from './pages/PendingApprovalsPage.jsx';

const ALLOWED_ROLES = [ROLES.SUPER_ADMIN];

function AdminShellRoute({ children }) {
  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
      <SuperAdminLayout>{children}</SuperAdminLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider portal="super_admin">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/passport/:userId" element={<PublicPassportPage />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute redirectTo="/dashboard">
                <LoginPage
                  portalTitle="Super Admin Portal Sign In"
                  portalSubtitle="Sign in with your ABES Super Admin credentials to govern all departments, users, approvals, and institutional analytics."
                  brandSubtitle="ABES Institutional Super Admin Portal"
                  defaultRedirect="/dashboard"
                />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute redirectTo="/dashboard">
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicOnlyRoute redirectTo="/dashboard">
                <ResetPasswordPage />
              </PublicOnlyRoute>
            }
          />

          <Route path="/unauthorized" element={<UnauthorizedPage homeRoute="/dashboard" />} />
          <Route path="/access-denied" element={<AccessDeniedPage homeRoute="/dashboard" />} />

          <Route
            path="/dashboard"
            element={
              <AdminShellRoute>
                <CollegeDashboardPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <AdminShellRoute>
                <DepartmentsPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminShellRoute>
                <UsersManagementPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <AdminShellRoute>
                <DeptAchievementsListPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/achievements/new"
            element={
              <AdminShellRoute>
                <DeptAchievementFormPage mode="create" />
              </AdminShellRoute>
            }
          />
          <Route
            path="/achievements/:id"
            element={
              <AdminShellRoute>
                <DeptAchievementDetailPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/achievements/:id/edit"
            element={
              <AdminShellRoute>
                <DeptAchievementFormPage mode="edit" />
              </AdminShellRoute>
            }
          />
          <Route
            path="/faculty"
            element={
              <AdminShellRoute>
                <FacultyAchievementsListPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/faculty/new"
            element={
              <AdminShellRoute>
                <FacultyAchievementFormPage mode="create" />
              </AdminShellRoute>
            }
          />
          <Route
            path="/faculty/:id"
            element={
              <AdminShellRoute>
                <FacultyAchievementDetailPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/faculty/:id/edit"
            element={
              <AdminShellRoute>
                <FacultyAchievementFormPage mode="edit" />
              </AdminShellRoute>
            }
          />
          <Route
            path="/students"
            element={
              <AdminShellRoute>
                <StudentAchievementsListPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/students/new"
            element={
              <AdminShellRoute>
                <StudentAchievementFormPage mode="create" />
              </AdminShellRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <AdminShellRoute>
                <StudentAchievementDetailPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/students/:id/edit"
            element={
              <AdminShellRoute>
                <StudentAchievementFormPage mode="edit" />
              </AdminShellRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <AdminShellRoute>
                <PendingApprovalsPage portalType="admin" />
              </AdminShellRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <AdminShellRoute>
                <LeaderboardsPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <AdminShellRoute>
                <InsightsPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <AdminShellRoute>
                <ReportsPage />
              </AdminShellRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <AdminShellRoute>
                <SettingsPage />
              </AdminShellRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
