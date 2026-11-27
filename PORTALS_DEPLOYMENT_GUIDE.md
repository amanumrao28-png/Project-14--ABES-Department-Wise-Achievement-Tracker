# ABES Department-Wise Achievement Tracker — Multi-Portal Deployment Guide

This application uses a **Four-Portal Frontend + Single Shared Backend + Single PostgreSQL Database** architecture.

## 1. Architecture Overview

| Application | Directory | Local Dev URL | Production Subdomain | Allowed Roles |
|---|---|---|---|---|
| **Student Portal** | `apps/student-portal` | `http://localhost:5173` | `https://student.abes.ac.in` | `student`, `super_admin` |
| **Faculty Portal** | `apps/faculty-portal` | `http://localhost:5174` | `https://faculty.abes.ac.in` | `faculty`, `super_admin` |
| **HOD Portal** | `apps/hod-portal` | `http://localhost:5175` | `https://hod.abes.ac.in` | `hod`, `super_admin` |
| **Super Admin Portal** | `apps/super-admin-portal` | `http://localhost:5176` | `https://admin.abes.ac.in` | `super_admin` |
| **Shared Backend API** | `server` | `http://localhost:5000` | `https://api.abes.ac.in` | All (JWT + RBAC enforced) |
| **Shared PostgreSQL** | `docker-compose.yml` | `localhost:5432` | Managed PostgreSQL | Backend only |

Shared UI primitives, API clients, auth context, and design tokens live in `shared/` and are aliased via `@shared` in each portal's `vite.config.js`.

---

## 2. Environment Variables

### Backend (`server/.env`)

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/abes_achievement_tracker
JWT_ACCESS_SECRET=<64-char-random-secret>
JWT_REFRESH_SECRET=<64-char-random-secret>
CORS_ORIGIN=https://student.abes.ac.in,https://faculty.abes.ac.in,https://hod.abes.ac.in,https://admin.abes.ac.in
```

For local development:
```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176
```

### Frontend Portals (`apps/*/.env.production`)

Each portal can be built independently with:
- `VITE_API_BASE_URL=https://api.abes.ac.in/api/v1`

For `apps/super-admin-portal`, optionally configure the Portal Switcher links:
- `VITE_STUDENT_PORTAL_URL=https://student.abes.ac.in`
- `VITE_FACULTY_PORTAL_URL=https://faculty.abes.ac.in`
- `VITE_HOD_PORTAL_URL=https://hod.abes.ac.in`
- `VITE_ADMIN_PORTAL_URL=https://admin.abes.ac.in`

---

## 3. Local Development Commands

Run from the repository root (`ABES_Dept_Wise_Ahievement_Tracker/`):

```bash
# Install workspace dependencies
npm install

# Start backend API (port 5000)
cd server && npm run dev

# Start individual portals in separate terminals
npm run dev:student   # http://localhost:5173
npm run dev:faculty   # http://localhost:5174
npm run dev:hod       # http://localhost:5175
npm run dev:admin     # http://localhost:5176
```

---

## 4. Independent Production Builds

Build all portals at once:
```bash
npm run build:all
```

Or build each portal independently:
```bash
npm --workspace=apps/student-portal run build     # outputs apps/student-portal/dist
npm --workspace=apps/faculty-portal run build     # outputs apps/faculty-portal/dist
npm --workspace=apps/hod-portal run build         # outputs apps/hod-portal/dist
npm --workspace=apps/super-admin-portal run build # outputs apps/super-admin-portal/dist
```

Each `dist/` directory is a standalone static SPA that can be deployed to Nginx, Vercel, Netlify, S3/CloudFront, or Firebase Hosting with SPA fallback (`try_files $uri $uri/ /index.html;`).

---

## 5. Security & Portal Isolation

1. **Backend Login Enforcement (`POST /api/v1/auth/login`):**
   - Each portal sends `portal: 'student' | 'faculty' | 'hod' | 'super_admin'`.
   - The backend enforces `isRoleAllowedOnPortal(user.role, portal)` and returns HTTP `403 PORTAL_ACCESS_DENIED` (with an audit log entry `PORTAL_LOGIN_DENIED`) for unauthorized cross-portal logins.
   - Only `super_admin` is permitted to authenticate on all four portals.
2. **Route & API Authorization:**
   - Every `/api/v1/*` route remains protected by `authenticate`, `authorize` (`requireRole`, `requireSuperAdmin`, `requireHODOrAbove`, `requireFacultyOrAbove`), `departmentScope`, and `ownershipGuard`.
   - Frontend route guards (`ProtectedRoute`) are UX-only; all security enforcement resides in the Express backend.
