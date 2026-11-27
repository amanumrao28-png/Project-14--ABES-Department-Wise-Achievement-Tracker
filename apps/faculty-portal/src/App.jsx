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

import { FacultyLayout } from './layouts/FacultyLayout.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { PublicPassportPage } from './pages/PublicPassportPage.jsx';
import { FacultyDashboardPage } from './pages/FacultyDashboardPage.jsx';
import { FacultyPortfolioPage } from './pages/FacultyPortfolioPage.jsx';
import { FacultyAchievementsListPage } from './pages/FacultyAchievementsListPage.jsx';
import { FacultyAchievementFormPage } from './pages/FacultyAchievementFormPage.jsx';
import { FacultyAchievementDetailPage } from './pages/FacultyAchievementDetailPage.jsx';
import { StudentAchievementsListPage } from './pages/StudentAchievementsListPage.jsx';
import { StudentAchievementDetailPage } from './pages/StudentAchievementDetailPage.jsx';
import LeaderboardsPage from './pages/LeaderboardsPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import { PendingApprovalsPage } from './pages/PendingApprovalsPage.jsx';

const ALLOWED_ROLES = [ROLES.FACULTY, ROLES.SUPER_ADMIN];

function FacultyShellRoute({ children }) {
  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
      <FacultyLayout>{children}</FacultyLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider portal="faculty">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/passport/:userId" element={<PublicPassportPage />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute redirectTo="/dashboard">
                <LoginPage
                  portalTitle="Faculty Portal Sign In"
                  portalSubtitle="Sign in with your ABES faculty credentials to manage publications, patents, FDPs, and mentored student achievements."
                  brandSubtitle="ABES Faculty Achievement Portal"
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
              <FacultyShellRoute>
                <FacultyDashboardPage />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <FacultyShellRoute>
                <FacultyPortfolioPage />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/my-achievements"
            element={
              <FacultyShellRoute>
                <FacultyAchievementsListPage />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/my-achievements/new"
            element={
              <FacultyShellRoute>
                <FacultyAchievementFormPage mode="create" />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/my-achievements/:id"
            element={
              <FacultyShellRoute>
                <FacultyAchievementDetailPage />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/my-achievements/:id/edit"
            element={
              <FacultyShellRoute>
                <FacultyAchievementFormPage mode="edit" />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <FacultyShellRoute>
                <PendingApprovalsPage portalType="faculty" />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/student-achievements"
            element={
              <FacultyShellRoute>
                <StudentAchievementsListPage />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/student-achievements/:id"
            element={
              <FacultyShellRoute>
                <StudentAchievementDetailPage />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <FacultyShellRoute>
                <LeaderboardsPage />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <FacultyShellRoute>
                <InsightsPage />
              </FacultyShellRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <FacultyShellRoute>
                <ReportsPage />
              </FacultyShellRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
