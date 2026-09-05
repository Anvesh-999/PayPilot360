# PeoplePay360 — Next-Gen HR & Automated Payroll Platform


<p align="center">
  <strong>An enterprise-grade, full-stack Human Resource Management & Automated Payroll Engine built with modern pastel aesthetics, dynamic mathematical formula evaluation, multi-level leave approvals, real-time shift punch tracking, and automated PDF payslip generation.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%206-6366f1?style=flat-square" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%205-10b981?style=flat-square" alt="Backend" />
  <img src="https://img.shields.io/badge/Database-MySQL%20%7C%20Prisma%20ORM-0ea5e9?style=flat-square" alt="Database" />
  <img src="https://img.shields.io/badge/Formulas-Math.js%20Rule%20Engine-f59e0b?style=flat-square" alt="Engine" />
  <img src="https://img.shields.io/badge/Currency-Indian%20Rupee%20(%E2%82%B9)-ec4899?style=flat-square" alt="Currency" />
  <img src="https://img.shields.io/badge/Security-JWT%20%7C%20RBAC%20%7C%20Zod-8b5cf6?style=flat-square" alt="Security" />
</p>

---

## 🌟 Executive Summary

**PeoplePay360** bridges workforce operations and complex payroll computation into an intuitive, responsive, and visually stunning web application. Built without heavy CSS utility frameworks, it features a handcrafted **light pastel design system** with smooth micro-animations, glassmorphism containers, and high-contrast typography.

The platform includes a **Turing-complete salary rule sandbox**, allowing HR teams to formulate customizable earnings, tax brackets, and loss-of-pay deductions using dynamic mathematical expressions, evaluated transactional payroll runs, and instant downloadable PDF payslips formatted in Indian Rupee (`₹`).

---

## 🚀 Key Feature Modules

### 1. 📊 Executive KPI Dashboard
- **Real-Time Workforce Metrics**: Instant tracking of Total Active Staff, Monthly Payroll Expenditure, Active Shift Clock-In Rates, and Pending Leave Requests.
- **Interactive Recharts Visuals**:
  - 6-month historical payroll spending trend line with gradient area fills.
  - Departmental workforce distribution donut chart with custom hover tooltips.
- **Recent Payrun Cycles**: Quick glance status badges (`PAID`, `APPROVED`, `DRAFT`) with formatted Indian Rupee totals.

### 2. 👥 Workforce & Employee Directory
- **Staff Records**: Comprehensive employee profiles including Code, Full Name, Work Email, Contact Phone, Department, Job Position, Date of Joining, and Active/Terminated status.
- **Live Search & Department Filters**: Instant search by name or ID, alongside quick department filter pills (`All Units`, `Engineering`, `Sales`, `HR & Admin`).
- **Full CRUD Management**: Modal-based employee onboarding, profile editing, and safe termination workflows.

### 3. 📜 Contracts & Working Schedules
- **Flexible Compensation Models**: Supports `MONTHLY`, `WEEKLY`, and `HOURLY` compensation types with base wage configuration.
- **Working Schedules**: Multi-day shift configuration (start time, end time, scheduled work hours/week) linked to employment agreements.
- **Salary Structure Binding**: Direct mapping between contracts and customizable salary calculation templates.

### 4. ⏱️ Attendance & Real-Time Punch Tracker
- **Quick Clock-In / Clock-Out**: Single-click shift punching from the global navigation topbar with live pulse indicator and shift timer.
- **Automatic Shift Duration**: Computes total hours worked, overtime, and punctuality flags (`ON_TIME`, `LATE`, `HALF_DAY`, `ABSENT`).
- **Audit & Manual Corrections**: HR staff can manually record and adjust daily attendance logs.

### 5. 🌴 Leave Entitlements & Approvals
- **Leave Types**: Configurable categories (Paid Annual Leave, Sick Leave, Casual Leave, Maternity/Paternity Leave, Unpaid Loss of Pay).
- **Balance Tracking**: Employee entitlement balances showing Allocated, Utilized, and Available days.
- **Approval Workflow**: Employees submit leave requests; HR and Managers review with one-click `Approve` or `Reject` actions.

### 6. 🧮 Salary Structure & Math.js Rule Engine
- **Formula-Driven Components**: Build custom earnings and deductions using dynamic expressions (e.g., `BASIC * 0.40` for HRA, `BASIC * 0.12` for PF, or progressive TDS tax tiers).
- **Dependency Graph Resolution**: Salary components calculate in sequence based on component dependencies.
- **Interactive Rule Sandbox**: Real-time evaluator to test formulas with sample inputs before committing to company-wide structures.

### 7. 💳 Automated Payroll Batch Engine
- **5-Stage State Machine**: `DRAFT` ➔ `VALIDATING` ➔ `COMPUTED` ➔ `APPROVED` ➔ `PAID`.
- **Batch Processing**: Computes basic pay, allowances, LOP attendance deductions, PF, and statutory tax for every active employee in a single transaction.
- **Audit & Disbursal**: Detailed cost summaries (Gross Salary Base, Statutory Deductions, Net Disbursed Funds).

### 8. 📄 Automated PDF Payslips
- **One-Click Generation**: On-the-fly PDF generation using **PDFKit**.
- **Formatted Salary Slips**: Professional corporate layout with earnings breakdown, deductions breakdown, net payout highlight, and company seal.
- **Unicode-Safe Currency Notation**: Uses standard `Rs.` notation in PDF output for flawless font rendering, and `₹` with `en-IN` number formatting across the web UI.

### 9. 👤 Employee Self-Service Portal
- **Personalized Workspace**: Dedicated portal for staff to view their monthly salary statements, attendance logs, leave balances, and download PDF payslips directly.

---

## 🛠️ Architecture & Tech Stack

```
PeoplePay360/
├── client/                     # Vite + React 19 Single Page Application
│   ├── src/
│   │   ├── components/         # Layout (Navbar, Sidebar), Common (DataTable, StatCard)
│   │   ├── contexts/           # AuthContext (JWT State, Login, Logout)
│   │   ├── pages/              # Dashboard, Employees, Contracts, Attendance, Leave, Payroll, Payslips, Portal, Salary
│   │   ├── services/           # Axios API Client with Auto-Refresh Interceptors
│   │   └── index.css           # Handcrafted Pastel Light Design Tokens & Micro-Animations
│   └── vite.config.js
│
├── server/                     # Node.js + Express 5 REST API Server
│   ├── prisma/
│   │   ├── schema.prisma       # 20+ Normalized Models & Relations
│   │   └── seed.js             # Comprehensive Database Seeder (Roles, Users, Employees, Payruns)
│   ├── scripts/
│   │   └── check-db.js         # Interactive MySQL Health & Diagnostic Utility
│   ├── src/
│   │   ├── config/             # Environment, Database, Prisma Client
│   │   ├── controllers/        # Express Request Handlers
│   │   ├── middleware/         # JWT Authenticate, RBAC Authorize, Audit Logger, Zod Error Handler
│   │   ├── routes/             # API Route Definitions
│   │   ├── services/           # Business Logic (Payroll Engine, Mathjs Rule Engine, PDFKit)
│   │   └── validators/         # Zod Request Schemas
│   └── src/app.js              # Express Application Entrypoint
```

### Technology Matrix

| Layer | Technologies |
|---|---|
| **Client** | React 19, Vite 6, React Router v7, Lucide React, Recharts, React Hot Toast, Axios |
| **Server** | Node.js (v18+), Express 5, Prisma ORM 6, PDFKit, Math.js, Bcrypt.js, Cookie Parser |
| **Database** | MySQL 8.0+ |
| **Security** | JWT (Access & Refresh Tokens), HTTP-Only Cookies, Helmet, Rate Limiting, CORS, Zod Schema Validation |
| **Design** | Handcrafted Pastel Palette (`#f8fafc`, `#ecfdf5`, `#eef2ff`, `#fff1f2`), Glassmorphic Cards, Responsive Tables |

---

## 🔐 Role-Based Access Control (RBAC)

The system enforces strict permission boundaries across 6 standard user roles:

| Role | Permissions |
|---|---|
| **`SUPER_ADMIN`** | Full platform authority, system settings, user creation, audit log access, emergency overrides. |
| **`HR_MANAGER`** | Employee onboarding, contract configuration, leave approvals, attendance adjustments. |
| **`HR_STAFF`** | View employee directory, verify daily attendance punches, assist with leave requests. |
| **`PAYROLL_MANAGER`**| Create salary structures, define mathematical rules, trigger payroll computations, approve batches, generate payslips. |
| **`PAYROLL_USER`** | View computed payruns, inspect salary components, export financial summaries. |
| **`EMPLOYEE`** | Self-service portal, view own attendance punches, submit leave requests, download personal payslips. |

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL Server** (v8.0 or higher) installed and running locally, or accessible via Docker.
- **npm** or **yarn**

### 2. Clone the Repository
```bash
git clone https://github.com/Anvesh-999/PayPilot360.git
cd PeoplePay360
```

### 3. Server Configuration & Database Setup
Navigate to the `server/` directory:
```bash
cd server
npm install
```

Create or verify the `.env` file in `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MySQL Connection URL (Update with your MySQL user and password)
DATABASE_URL="mysql://root:your_password@localhost:3306/peoplepay360"

# JWT Secrets
JWT_ACCESS_SECRET="your_super_secret_access_jwt_key_360"
JWT_REFRESH_SECRET="your_super_secret_refresh_jwt_key_360"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

Run database migrations and seed default data:
```bash
# Push schema to MySQL database
npx prisma db push

# Seed roles, departments, employees, contracts, rules, and demo users
npm run seed
```

Verify database connectivity:
```bash
npm run db:check
```

Start the backend API server:
```bash
npm run dev
# Server will run on http://localhost:5000
```

### 4. Client Setup
Open a new terminal and navigate to the `client/` directory:
```bash
cd client
npm install
npm run dev
# Frontend will launch on http://localhost:5173
```

---

## 🔑 Demo Login Credentials

The database seed provides ready-to-test accounts across multiple roles with password **`Password@123`**:

| Role | Email Address | Password | Focus Area |
|---|---|---|---|
| **Super Admin** | `admin@peoplepay360.com` | `Password@123` | Full administrative control & system overview |
| **HR Manager** | `hr.manager@peoplepay360.com` | `Password@123` | Staff directory, onboarding, leave approvals |
| **Payroll Manager** | `payroll.manager@peoplepay360.com` | `Password@123` | Salary rules, payrun computation, payslip dispatch |
| **Payroll User** | `payroll.user@peoplepay360.com` | `Password@123` | Payroll auditing & cycle inspection |
| **Staff Employee** | `aisha.verma@peoplepay360.com` | `Password@123` | Self-service portal, clock in/out, personal payslips |

---

## 📡 REST API Reference Overview

All API endpoints are prefixed with `/api` and protected by JWT authentication (except `/auth/login` and `/health`).

### Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticate user and issue access/refresh tokens.
- `POST /api/auth/refresh` — Refresh expired access token.
- `GET  /api/auth/me` — Retrieve authenticated user profile and permissions.
- `POST /api/auth/logout` — Invalidate session tokens.

### Employees (`/api/employees`)
- `GET    /api/employees` — List employees with search, department filters, pagination.
- `POST   /api/employees` — Onboard new employee with auto-generated code.
- `GET    /api/employees/:id` — Retrieve full employee dossier.
- `PUT    /api/employees/:id` — Update employee details.
- `DELETE /api/employees/:id` — Terminate employee record.

### Attendance (`/api/attendance`)
- `POST /api/attendance/check-in` — Quick shift check-in for the day.
- `POST /api/attendance/check-out` — Shift check-out with automatic hours calculation.
- `GET  /api/attendance/my-today` — Real-time punch status for the current session.
- `GET  /api/attendance` — Attendance history and shift logs.

### Leaves (`/api/leave` & `/api/leaves`)
- `GET   /api/leave/types` — List configured leave categories.
- `GET   /api/leave/balances/my` — Fetch current user's available leave balance.
- `GET   /api/leave/requests` — View all employee leave applications.
- `POST  /api/leave/requests` — Submit a new leave request.
- `PATCH /api/leave/requests/:id/approve` — Approve leave request.
- `PATCH /api/leave/requests/:id/reject` — Reject leave request.

### Salary Rules & Structures (`/api/salary`)
- `GET  /api/salary/structures` — List defined salary structures.
- `POST /api/salary/structures` — Create new salary structure template.
- `GET  /api/salary/rules` — List dynamic mathematical calculation rules.
- `POST /api/salary/evaluate` — Sandbox testbed for evaluating Math.js formulas.

### Payroll Engine (`/api/payroll`)
- `GET  /api/payroll/payruns` — List monthly payrun cycles and batch statuses.
- `POST /api/payroll/payruns` — Initialize a new payroll run cycle.
- `POST /api/payroll/payruns/:id/compute` — Trigger batch calculation for all active employees.
- `POST /api/payroll/payruns/:id/approve` — Approve computed payrun batch.
- `POST /api/payroll/payruns/:id/pay` — Mark batch as paid and finalize disbursement.

### Payslips (`/api/payslips`)
- `GET /api/payslips` — List payslips (scoped to employee for self-service).
- `GET /api/payslips/:id` — Detailed component breakdown (Basic, HRA, Allowances, PF, TDS, LOP, Net).
- `GET /api/payslips/:id/pdf` — Stream downloadable formatted PDF salary slip.

### Dashboard & Analytics (`/api/dashboard`)
- `GET /api/dashboard/stats` — Executive KPI summary metrics.
- `GET /api/dashboard/trends` — 6-month payroll expenditure trends.
- `GET /api/dashboard/distribution` — Headcount breakdown by department.

---

## 🛠️ Database Tools & Utilities

The platform includes built-in scripts to inspect and manage your local MySQL database:

```bash
# 1. Automated Health & Schema Diagnostic
# Checks MySQL connection, verifies table migrations, counts active records, and reports sample credentials
npm run db:check

# 2. Prisma Studio
# Launches a visual database GUI in your browser
npm run db:studio
```

---

## 🇮🇳 Currency & Localization

PeoplePay360 is tailored for the Indian financial and corporate ecosystem:
- **UI Currency**: Formatted with the Unicode Indian Rupee symbol (`₹`) and standard Indian numbering system (`en-IN`, e.g., `₹3,96,800.00`).
- **PDF Compatibility**: Payslip PDFs use standard WinAnsi-compatible currency notation (`Rs.`) to guarantee clean, uncorrupted document rendering across any printer or PDF viewer.

---

## 📄 License

This project is licensed under the **ISC License**. Free for educational, evaluation, and commercial deployment.
