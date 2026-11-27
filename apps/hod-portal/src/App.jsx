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

import { HODLayout } from './layouts/HODLayout.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { PublicPassportPage } from './pages/PublicPassportPage.jsx';
import { DepartmentDashboardPage } from './pages/DepartmentDashboardPage.jsx';
import { DeptAchievementsListPage } from './pages/DeptAchievementsListPage.jsx';
import { DeptAchievementFormPage } from './pages/DeptAchievementFormPage.jsx';
import { DeptAchievementDetailPage } from './pages/DeptAchievementDetailPage.jsx';
import { FacultyAchievementsListPage } from './pages/FacultyAchievementsListPage.jsx';
import { FacultyAchievementFormPage } from './pages/FacultyAchievementFormPage.jsx';
import { FacultyAchievementDetailPage } from './pages/FacultyAchievementDetailPage.jsx';
import { StudentAchievementsListPage } from './pages/StudentAchievementsListPage.jsx';
import { StudentAchievementDetailPage } from './pages/StudentAchievementDetailPage.jsx';
import { UsersManagementPage } from './pages/UsersManagementPage.jsx';
import LeaderboardsPage from './pages/LeaderboardsPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import { PendingApprovalsPage } from './pages/PendingApprovalsPage.jsx';

const ALLOWED_ROLES = [ROLES.HOD, ROLES.SUPER_ADMIN];

function HODShellRoute({ children, requirePermission = null }) {
  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES} requirePermission={requirePermission}>
      <HODLayout>{children}</HODLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider portal="hod">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/passport/:userId" element={<PublicPassportPage />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute redirectTo="/dashboard">
                <LoginPage
                  portalTitle="HOD Portal Sign In"
                  portalSubtitle="Sign in with your ABES Head of Department credentials to oversee department metrics, faculty & student approvals, and reports."
                  brandSubtitle="ABES Department Leadership Portal"
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
              <HODShellRoute>
                <DepartmentDashboardPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <HODShellRoute>
                <PendingApprovalsPage portalType="hod" />
              </HODShellRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <HODShellRoute>
                <DeptAchievementsListPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/achievements/new"
            element={
              <HODShellRoute>
                <DeptAchievementFormPage mode="create" />
              </HODShellRoute>
            }
          />
          <Route
            path="/achievements/:id"
            element={
              <HODShellRoute>
                <DeptAchievementDetailPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/achievements/:id/edit"
            element={
              <HODShellRoute>
                <DeptAchievementFormPage mode="edit" />
              </HODShellRoute>
            }
          />
          <Route
            path="/faculty"
            element={
              <HODShellRoute>
                <FacultyAchievementsListPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/faculty/new"
            element={
              <HODShellRoute>
                <FacultyAchievementFormPage mode="create" />
              </HODShellRoute>
            }
          />
          <Route
            path="/faculty/:id"
            element={
              <HODShellRoute>
                <FacultyAchievementDetailPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/faculty/:id/edit"
            element={
              <HODShellRoute>
                <FacultyAchievementFormPage mode="edit" />
              </HODShellRoute>
            }
          />
          <Route
            path="/students"
            element={
              <HODShellRoute>
                <StudentAchievementsListPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <HODShellRoute>
                <StudentAchievementDetailPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <HODShellRoute>
                <LeaderboardsPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <HODShellRoute>
                <InsightsPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <HODShellRoute>
                <ReportsPage />
              </HODShellRoute>
            }
          />
          <Route
            path="/users"
            element={
              <HODShellRoute requirePermission="can_manage_dept_users">
                <UsersManagementPage />
              </HODShellRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
