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

import { StudentLayout } from './layouts/StudentLayout.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { PublicPassportPage } from './pages/PublicPassportPage.jsx';
import { StudentDashboardPage } from './pages/StudentDashboardPage.jsx';
import { StudentPortfolioPage } from './pages/StudentPortfolioPage.jsx';
import { StudentAchievementsListPage } from './pages/StudentAchievementsListPage.jsx';
import { StudentAchievementFormPage } from './pages/StudentAchievementFormPage.jsx';
import { StudentAchievementDetailPage } from './pages/StudentAchievementDetailPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import LeaderboardsPage from './pages/LeaderboardsPage.jsx';

const ALLOWED_ROLES = [ROLES.STUDENT, ROLES.SUPER_ADMIN];

function StudentShellRoute({ children }) {
  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
      <StudentLayout>{children}</StudentLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider portal="student">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/passport/:userId" element={<PublicPassportPage />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute redirectTo="/dashboard">
                <LoginPage
                  portalTitle="Student Portal Sign In"
                  portalSubtitle="Sign in with your ABES student credentials to manage achievements, competitions, internships, and placements."
                  brandSubtitle="ABES Student Achievement Portal"
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
              <StudentShellRoute>
                <StudentDashboardPage />
              </StudentShellRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <StudentShellRoute>
                <StudentPortfolioPage />
              </StudentShellRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <StudentShellRoute>
                <StudentAchievementsListPage />
              </StudentShellRoute>
            }
          />
          <Route
            path="/achievements/new"
            element={
              <StudentShellRoute>
                <StudentAchievementFormPage mode="create" />
              </StudentShellRoute>
            }
          />
          <Route
            path="/achievements/:id"
            element={
              <StudentShellRoute>
                <StudentAchievementDetailPage />
              </StudentShellRoute>
            }
          />
          <Route
            path="/achievements/:id/edit"
            element={
              <StudentShellRoute>
                <StudentAchievementFormPage mode="edit" />
              </StudentShellRoute>
            }
          />
          <Route
            path="/competitions"
            element={
              <StudentShellRoute>
                <StudentAchievementsListPage initialGroup="competitions" />
              </StudentShellRoute>
            }
          />
          <Route
            path="/internships"
            element={
              <StudentShellRoute>
                <StudentAchievementsListPage initialGroup="internships" />
              </StudentShellRoute>
            }
          />
          <Route
            path="/placements"
            element={
              <StudentShellRoute>
                <StudentAchievementsListPage initialGroup="placements" />
              </StudentShellRoute>
            }
          />
          <Route
            path="/achievement-history"
            element={
              <StudentShellRoute>
                <StudentAchievementsListPage />
              </StudentShellRoute>
            }
          />
          <Route
            path="/leaderboards"
            element={
              <StudentShellRoute>
                <LeaderboardsPage />
              </StudentShellRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <StudentShellRoute>
                <InsightsPage />
              </StudentShellRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <StudentShellRoute>
                <ReportsPage />
              </StudentShellRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
