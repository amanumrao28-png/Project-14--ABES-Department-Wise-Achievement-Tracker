# ABES Department-Wise Achievement Tracker — Development & Audit Log

## Completed Work

### Phase 1: Security, Authentication & RBAC Foundation
- Implemented JWT access/refresh authentication with bcrypt password hashing, account activation/deactivation, forgot/reset password tokens, and login/reset rate limiters.
- Enforced role-based authorization (`super_admin`, `hod`, `faculty`, `student`) and strict department isolation (`departmentScope.js`, `ownershipGuard.js`, `authorize.js`).
- Built user & department management APIs and React UI with delegated HOD user management (`can_manage_dept_users`).

### Phase 2: Three Independent Achievement Trackers & Multi-Stage Workflows
- Built strictly isolated database tables, scoring engines, validators, controllers, and routes for Department (`dept_*`), Faculty (`faculty_*`), and Student (`student_*`) achievements.
- Implemented multi-stage approval workflows (`draft`, `submitted`, `under_review`, `changes_requested`, `department_approved`, `college_approved`, `rejected`) with maker-checker separation of duties (`requireSelfApprovalBlock`), approval history logs, and in-app notifications.
- Implemented private disk evidence storage (`privateStorage.js`) with magic-byte validation, SHA-256 hashing, and authenticated download streaming.

### Phase 3: Role-Specific Dashboards & Enterprise UI/UX Redesign
- Built four role-tailored dashboards (College, Department, Faculty, Student) with Bar, Line, Donut, and Calendar Heatmap SVG charts.
- Applied enterprise SaaS design system (`tokens.css`, `global.css`, `auth.css`, `dashboard.css`, `landing.css`) with responsive dark navy sidebar, glass popovers, breadcrumbs, sortable tables, URL-synced search/year filters, and a public showcase landing page (`/`).

### Phase 4: Progressive AI & Innovation Features
1. **Certificate OCR (Advisory Pre-fill):** `POST /api/v1/ocr/extract` + `CertificateOcrUpload.jsx` integrated into all 3 tracker submission forms with explicit non-authenticity disclaimers.
2. **Duplicate Detection:** `POST /api/v1/duplicates/check` + `DuplicateWarning.jsx` checking SHA-256 hash, certificate number, user ID, organization, title, and date within each isolated tracker.
3. **Achievement Passport:** `users.is_portfolio_public` migration (`20241101000007_portfolio_privacy.js`), `PassportControls.jsx`, `PublicPassportPage.jsx` (`/passport/:userId`), and PDF print export.
4. **Independent Leaderboards:** `/api/v1/leaderboards/{departments,faculty,students}` + `LeaderboardsPage.jsx` using verified-only (`college_approved`) records without combining scores.
5. **Automated Reports:** `/api/v1/reports/{department,faculty,student,college-consolidated}` + `ReportsPage.jsx` with print/PDF export.
6. **AI Insights:** `/api/v1/insights/{department,faculty,student,college}` + `InsightsPage.jsx` generating data-grounded growth, category, impact, and department insights from verified database records.

### Phase 5: Post-Implementation QA, Security & Code Quality Audit
- Fixed `ownerColumn` mismatch in `duplicates.service.js` (`created_by_user_id` for `dept_achievements`).
- Hardened UUID validation and department query-parameter enforcement (`403 DEPARTMENT_ACCESS_DENIED` on tampered `?department_id=`) in `leaderboards.routes.js`, `reports.routes.js`, and `public.routes.js`.
- Added missing `FileBarChart` and `Sparkles` icon mappings in `AppShell.jsx` and aligned CSS classes (`.alert-error`, `.table-scroll`, `.form-textarea`, `.alert-warning`, `.page-content`) across newly created frontend modules.
- Added comprehensive authorization, scoring isolation, magic-byte file upload, and navigation/route wiring tests in `server/tests/security/audit_suite.test.js`.

## Pending Tasks / Environment Setup Required for Live Deployment
1. **PostgreSQL Instance & `.env` Configuration:** Create `server/.env` from `server/.env.example`, start PostgreSQL, and execute `npm run migrate` and `npm run seed` in `server/`.
2. **Live Database End-to-End Integration Execution:** Execute live login, CRUD, file upload, workflow transition, and UI browser smoke tests against the seeded PostgreSQL database once `.env` and PostgreSQL credentials are provisioned.
3. **Optional Future Enhancements:** Integrate an external/local OCR engine (e.g., Tesseract worker) for scanned image-only certificates without embedded PDF text streams.


---

## Multi-Portal Restructuring (4 Independent Role-Based Portals)

- **Architecture:** Split the frontend into 4 independent Vite/React applications under npm workspaces (`apps/student-portal` on `:5173`, `apps/faculty-portal` on `:5174`, `apps/hod-portal` on `:5175`, `apps/super-admin-portal` on `:5176`) sharing common primitives in `shared/`, all backed by the single Express API (`server/` on `:5000`) and single PostgreSQL database (`docker-compose.yml` on `:5432`).
- **Backend Portal Isolation:** Added optional `portal` parameter to `POST /api/v1/auth/login` (`server/core/auth/auth.validators.js` & `server/core/auth/auth.controller.js`) enforcing `isRoleAllowedOnPortal(role, portal)` (HTTP `403 PORTAL_ACCESS_DENIED` + `PORTAL_LOGIN_DENIED` audit log for mismatched logins; `super_admin` permitted across all 4 portals), and updated `CORS_ORIGIN` for all 4 local origins.
- **Verification:**
  - `server`: `npm test` passed 30/30 security & unit tests (including `server/tests/security/portal_auth.test.js`).
  - All 4 portal production builds (`apps/student-portal`, `apps/faculty-portal`, `apps/hod-portal`, `apps/super-admin-portal`) succeeded via `vite build`.
  - Verified live 4x4 login matrix against `:5000` and browser UI verification across `:5173`, `:5174`, `:5175`, and `:5176`.
- **Deployment Guide:** See [PORTALS_DEPLOYMENT_GUIDE.md](./PORTALS_DEPLOYMENT_GUIDE.md).
