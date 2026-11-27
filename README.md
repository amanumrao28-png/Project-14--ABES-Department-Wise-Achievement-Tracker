# ABES Department-Wise Achievement Tracker

**ABES Engineering College, Ghaziabad**  
An enterprise, role-governed institutional platform for tracking, verifying, and analyzing academic, research, and co-curricular achievements across **Departments**, **Faculty**, and **Students** — with strict data isolation, hierarchical multi-stage approvals, and real-time analytics.

---

## Architecture Overview

This project uses a **Four-Portal Frontend + Single Shared Backend + Single PostgreSQL Database** architecture:

| Application | Directory | Local Dev URL | Allowed Roles |
|---|---|---|---|
| **Student Portal** | `apps/student-portal` | `http://localhost:5173` | `student`, `super_admin` |
| **Faculty Portal** | `apps/faculty-portal` | `http://localhost:5174` | `faculty`, `super_admin` |
| **HOD Portal** | `apps/hod-portal` | `http://localhost:5175` | `hod`, `super_admin` |
| **Super Admin Portal** | `apps/super-admin-portal` | `http://localhost:5176` | `super_admin` |
| **Shared Backend API** | `server` | `http://localhost:5000` | Express + Knex + JWT RBAC |
| **Shared Database** | `docker-compose.yml` | `localhost:5432` | PostgreSQL 16 |

Shared UI components, API clients, auth context, RBAC helpers, and design tokens live in `shared/` and are aliased via `@shared` across all four portals.

---

## Key Features

- **Three Strictly Isolated Achievement Trackers:**
  - **Department Tracker:** Accreditations (NBA/NAAC), NIRF rankings, institutional recognitions, MoUs, funded department projects, and organized events.
  - **Faculty Tracker:** Publications, patents, books/chapters, FDPs, certifications, guest lectures, conferences, and research grants.
  - **Student Tracker:** Hackathons, technical competitions, certifications, internships, placements, and sports/cultural achievements.
- **Hierarchical Verification Chain:**
  - **Student Submissions:** `Student Submitted → Faculty Verification → HOD Approval → Super Admin Final Verify & Score Lock`
  - **Faculty Submissions:** `Faculty Submitted → HOD Department Approval → Super Admin Final Verify & Score Lock`
  - **Department Submissions:** `Department Submitted → Super Admin Final Verify & Score Lock`
- **Category-Wise Independent Leaderboards:** Verified-only rankings for Departments, Faculty, and Students with academic year and category filters.
- **Department-Scoped Pending Approval Queues:** Automatic department isolation for Faculty and HODs; institution-wide governance for Super Admin.
- **Shareable Achievement Passports:** Students and Faculty can enable a public verified portfolio link (`/passport/:userId`).
- **Automated Annual Reports & Analytics:** Verified counts, category breakdowns, activity heatmaps, and print/PDF export.
- **Security & Session Management:** JWT access + rotating refresh tokens stored in `sessionStorage` (persists across refreshes, clears on browser/tab close), rate limiting, magic-byte file validation, and audit logging.

---

## Render Deployment Links

| Service | Live URL |
|---|---|
| **Backend API** | https://project-14-abes-department-wise.onrender.com |
| **Student Portal** | https://project-14-abes-department-wise-lx8g.onrender.com/ |
| **Faculty Portal** | https://faculty-portal-acfj.onrender.com/ |
| **HOD Portal** | https://hod-portal.onrender.com/ |
| **Super Admin Portal** | https://admin-portal-wn69.onrender.com/ |

---

## Demo Login Credentials (All Roles)

| Role | Portal Access | Email (Username) | Password |
|---|---|---|---|
| **Super Admin** | All 4 Portals (`:5173`–`:5176`) | `admin@abes.ac.in` | `Admin@123` |
| **HOD (CS)** | HOD Portal (`:5175`) | `hod.cs@abes.ac.in` | `Hod@1234` |
| **Faculty (CS)** | Faculty Portal (`:5174`) | `faculty.cs@abes.ac.in` | `Faculty@123` |
| **Student (CS)** | Student Portal (`:5173`) | `student.cs@abes.ac.in` | `Student@123` |

> **Admin Username:** `admin@abes.ac.in` | **Admin Password:** `Admin@123`  
> **Student Username:** `student.cs@abes.ac.in` | **Student Password:** `Student@123`

---

## Local Setup & Run Commands

### 1. Start PostgreSQL
```powershell
docker compose up -d
```

### 2. Install Dependencies & Setup Database
```powershell
# Install root workspace dependencies
npm install

# Install backend dependencies, run migrations & seed initial users
cd server
npm install
npx knex migrate:latest
npx knex seed:run
```

### 3. Start Backend & All Four Portals (Separate Terminals)
```powershell
# Terminal 1 — Shared Backend API (http://localhost:5000)
cd server
npm run dev

# Terminal 2 — Student Portal (http://localhost:5173)
npm run dev:student

# Terminal 3 — Faculty Portal (http://localhost:5174)
npm run dev:faculty

# Terminal 4 — HOD Portal (http://localhost:5175)
npm run dev:hod

# Terminal 5 — Super Admin Portal (http://localhost:5176)
npm run dev:admin
```

### 4. Build & Test
```powershell
# Build all 4 portals for production
npm run build:all

# Run backend security & unit test suite
cd server
npm test
```

---

## Developed & Maintained By

**Aman Umrao** • **Aman Pal**  
Department of **Computer Science and Engineering**  
**Full Stack Development Team** — ABES Engineering College, Ghaziabad

© 2026 ABESEC Ghaziabad. All Rights Reserved.
