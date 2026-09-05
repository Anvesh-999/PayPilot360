# PeoplePay360 — Product Requirements Document
### An Integrated HR & Payroll Operations Platform
**Stack:** React.js · Node.js · Express.js · MySQL · Prisma ORM · JWT · bcrypt · Zod · Recharts
**Document status:** Implementation-ready v1.0
**Source of truth:** Attached "PeoplePay360: HR & Payroll" hackathon problem statement (all business requirements in this PRD are traceable to it; anything added for buildability is explicitly marked **[Technical Decision]** or **[Stretch]**).

---

## Table of Contents
A. Executive Summary
B. Problem Statement
C. Product Vision & Goals
D. Users & Roles
E. Functional Requirements
F. System Architecture
G. MySQL Database Design
H. Prisma Schema
I. REST API Specification
J. Authentication & Security
K. UI/UX Specification
L. Salary Rule Engine
M. Payroll Engine
N. Payslip System
O. Employee Portal
P. Dashboard & Reporting
Q. Notifications & Automation
R. Business Rules & Validation
S. Audit & Compliance
T. Sample Data
U. Demo Scenario
V. MVP vs Stretch
W. Development Roadmap
X. Testing Strategy
Y. Edge Cases
Z. Deployment
AA. Developer Checklist

---

## A. Executive Summary

PeoplePay360 is a full-stack HR and Payroll web application that unifies employee master data, contracts, working schedules, attendance, leave/time-off, configurable salary rules, and payroll processing into one connected system — instead of the disconnected spreadsheets or basic CRUD tools most small-to-mid organizations use today.

The system's centerpiece is a **configurable Salary Rule Engine**: HR/Payroll admins define how pay is calculated (basic pay, allowances, deductions, taxes) as data — rules with sequence, type, formula, and conditions stored in MySQL — rather than as code the engineering team has to redeploy every time a policy changes. A Payroll Manager builds a payslip that automatically pulls the *correct* contract for the pay period, factors in attendance and approved leave, runs the configured rules in sequence, and produces a validated, downloadable, emailable payslip.

Built with React + Tailwind on the frontend, Node.js/Express + Prisma/MySQL on the backend, secured with JWT + bcrypt + RBAC, and validated end-to-end with Zod, PeoplePay360 is designed to be buildable by a small student/hackathon team within a multi-day sprint while still reflecting real payroll-system architecture (period-based contract resolution, rule sequencing, leave-balance consumption, and payroll status locking).

## B. Problem Statement

Most HR tools store employee, attendance, leave, and salary information as separate, weakly-connected records. In practice:

- An employee can hold **multiple contracts over time** (e.g., a raise, a role change, a conversion from contract-to-permanent), but payroll must always use the contract **valid for the specific pay period** being run — not just "the latest" contract.
- Working hours originate from an **assigned schedule**; attendance records exceptions against that schedule (late arrivals, missed checkouts, overtime).
- Leave balances depend on **allocations** (grants) and **approved requests**, and only *approved, payroll-integrated* leave types should affect pay.
- Salary computation must be **transparent and configurable** — earnings and deductions expressed as rules (fixed amount / percentage / formula) evaluated in a defined sequence, not hardcoded `if/else` chains.
- Payroll must run as a **two-step batch process** (define scope/period → select employees), surface **validation warnings** (missing bank info, duplicate payslips) before finalization, and preserve **historical, immutable** records once paid.
- Reporting needs to reflect **live, aggregated data** across all of the above, not static mockups.

PeoplePay360 solves this by modeling the Employee as the central hub of a connected data graph (Contracts, Schedule, Attendance, Time Off, Payslips) and by driving all salary math through a rule engine that HR configures without code changes.

## C. Product Vision & Goals

**Vision:** A single operational system where every day-to-day HR action (attendance, leave, contract change) automatically flows into an accurate, auditable, self-explanatory payroll run.

**Who uses it:** Super Admins/Admins (system owners), HR Managers (people ops), Payroll Managers/Payroll Users (compensation), HR Staff (day-to-day data entry/approvals), and Employees (self-service).

**Why organizations need it:** Reduces payroll errors from stale contract data, removes "ask engineering to change the tax formula" bottlenecks, gives employees self-service visibility, and gives leadership a live dashboard instead of a monthly spreadsheet reconciliation.

**What makes it different from basic HR CRUD:** (1) period-aware contract resolution, (2) a data-driven salary rule engine with sequencing and dependencies, (3) a payroll state machine with validation warnings and locking, (4) full audit trail, (5) a live analytics dashboard fed by real operational data.

### Goals by area

| Area | Goal |
|---|---|
| Employee management | Single source of truth for identity, org placement, and employment status |
| Contract management | Multiple historical contracts per employee; payroll always resolves the period-correct one |
| Attendance | Capture check-in/out, compute worked hours, flag exceptions for correction |
| Leave/time-off | Configurable leave types, allocations, approval workflow, payroll-integrated deductions |
| Salary structures | Reusable, named bundles of ordered salary rules |
| Salary rule engine | No-code rule configuration: fixed/percentage/formula, conditions, sequence |
| Payroll calculation | Deterministic, re-runnable, auditable computation per employee per period |
| Payslip generation | Rule-line breakdown, PDF export, email delivery, history |
| Payroll validation | Pre-finalization warnings (missing bank info, duplicates, contract gaps) |
| Employee self-service | View-only + leave request submission, restricted to own data |
| Reporting | Live dashboard: headcount, cost, attendance, leave, payroll trend |
| Notifications | In-app + email for leave/payroll/payslip/contract lifecycle events |
| Auditability | Every create/update/approve/finalize logged with before/after values |
| Automation | Contract selection, leave deduction, rule evaluation, payslip generation, notifications all automatic |

MVP prioritization is detailed in Section V.

## D. Users & Roles

Five roles per the problem statement (mapped 1:1 to the assignment's "at least 5 roles" requirement):

| Role (assignment) | Role (RBAC code) | Summary |
|---|---|---|
| Admin | `SUPER_ADMIN` | Full system access, user/role management |
| HR Payroll Manager | `PAYROLL_MANAGER` | Full CRUD on payroll: structures, rules, payruns, payslips |
| HR Payroll User | `PAYROLL_USER` (maps to "HR Staff" for payroll-adjacent work) | Create/Read/Update payruns & payslips; read-only salary config |
| HR Manager | `HR_MANAGER` | Full CRUD on Employees, Contracts, Attendance, Schedules, Time Off; approves leave; no payroll access |
| Employee | `EMPLOYEE` | Self-service only: own profile, attendance, leave, payslips |

> **[Technical Decision]** We also expose an `HR_STAFF` role as a lighter-weight variant of `HR_MANAGER` (create/edit but not delete, no approval rights) to satisfy the PRD-authoring instructions' 5-role list literally while staying faithful to the source problem statement's 5 roles. If the team wants exactly the 5 source roles, `HR_STAFF` can be removed without affecting the data model.

### RBAC Matrix

Legend: V=View, C=Create, E=Edit, D=Delete, Ap=Approve, Val=Validate, G=Generate, X=Export

| Module | SUPER_ADMIN | PAYROLL_MANAGER | PAYROLL_USER | HR_MANAGER | HR_STAFF | EMPLOYEE |
|---|---|---|---|---|---|---|
| Users & Roles | V/C/E/D | – | – | – | – | – |
| Employees | V/C/E/D | V | V | V/C/E/D | V/C/E | V (self only) |
| Departments / Positions | V/C/E/D | V | V | V/C/E/D | V/C/E | V |
| Contracts | V/C/E/D | V | V | V/C/E/D | V/C/E | V (self only) |
| Working Schedules | V/C/E/D | V | V | V/C/E/D | V/C/E | V (self only) |
| Attendance | V/C/E/D | V | V | V/C/E/D | V/C/E | V/C (self only) |
| Time Off Types & Allocations | V/C/E/D | V | V | V/C/E/D | V/C/E | V (self balance only) |
| Time Off Requests | V/C/E/D/Ap | V | V | V/C/E/D/Ap | V/Ap | V/C (self only) |
| Salary Structures | V/C/E/D | V/C/E/D | V | V (read-only) | – | – |
| Salary Rules | V/C/E/D | V/C/E/D | V | – | – | – |
| Payruns | V/C/E/D/Val | V/C/E/D/Val | V/C/E | – | – | – |
| Payslips | V/C/E/D/G/X | V/C/E/D/G/X | V/C/E/G | – | – | V (self only, X own PDF) |
| Dashboard/Reports | V/X | V/X | V/X | V/X (HR metrics only) | V (limited) | – |
| Notifications | V (all) | V (own) | V (own) | V (own) | V (own) | V (own) |
| Audit Logs | V/X | V (payroll-scoped) | – | V (HR-scoped) | – | – |

## E. Functional Requirements

Requirements are grouped by module. Each module below follows: What it does · Why it exists · User flow · Frontend requirements · Backend requirements · Database requirements · API requirements · Validation · Business rules · Edge cases (cross-referenced to Section Y where detailed).

### E1. Employee Management

**What/Why:** Central hub record; every other module (contracts, attendance, leave, payslips) hangs off `employees`.

**Fields:** employee code (unique, auto-generated e.g. `EMP-0001`), first/last name, work email (unique), personal phone, department, job position, manager (self-referencing FK), joining date, employment status (`ACTIVE`, `ON_LEAVE`, `SUSPENDED`, `TERMINATED`), employment type (`FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN`), assigned working schedule, bank account name/number/IFSC (for payment), profile photo URL, date of birth, gender (optional), address (optional).

**Views:** Kanban (grouped by department/status), List (sortable/filterable/searchable by name, department, status, position), Form (tabbed: Overview / Contracts / Attendance / Time Off / Payroll).

**User flow:** HR creates employee → system auto-generates employee code + login user (role `EMPLOYEE`) → HR assigns department/manager/schedule → HR creates first Contract (required before payroll eligibility).

**Backend requirements:** CRUD service with soft-delete (status = `TERMINATED`, not row deletion, to preserve payroll history); search/filter/sort via query params; smart-button aggregation endpoints returning related-record counts.

**Validation (Zod):** email format + uniqueness; phone format; joining date not in future; manager cannot equal self; bank account number numeric, 9–18 digits; IFSC matches `^[A-Z]{4}0[A-Z0-9]{6}$` when provided.

**Business rules:** Employee code immutable after creation. Cannot hard-delete an employee with existing payslips — must terminate instead. Terminated employees are excluded from active payroll runs by default.

**API:** see Section I.

### E2. Contract Management

**What/Why:** Employment terms (salary, wage type, schedule, dept/position, structure) change over time; payroll must use the period-correct contract.

**Fields:** employee (FK), start date, end date (nullable = open-ended), wage/salary amount, wage type (`MONTHLY`, `HOURLY`, `DAILY`), department, job position, working schedule, assigned salary structure, status (`DRAFT`, `ACTIVE`, `EXPIRED`, `CANCELLED`), contract document reference (optional).

**Contract resolution rule (critical):** For a payroll period `[periodStart, periodEnd]`, the system selects the contract where `contract.startDate <= periodEnd AND (contract.endDate IS NULL OR contract.endDate >= periodStart) AND contract.status = 'ACTIVE'`. If more than one contract matches (overlap), the one with the **latest startDate** wins, and an audit warning is logged. If **no** contract matches, the employee is excluded from that payrun with a warning line ("No active contract for period").

**Worked example (from spec):**
```
Employee: Aisha Verma
Contract A: Jan 1 – Jun 30  (Basic ₹25,000)
Contract B: Jul 1 – Dec 31  (Basic ₹30,000)

Payroll period = July 2026 (Jul 1 – Jul 31)
  → periodStart=Jul 1 <= B.end(Dec 31)  ✔
  → periodEnd=Jul 31 >= B.start(Jul 1)  ✔
  → Contract B selected. Basic used = ₹30,000.
```

**Overlapping/expired handling:** On contract Create/Edit, backend validates no two `ACTIVE` contracts for the same employee have overlapping date ranges (409 error if violated) — this prevents the ambiguous case at the source. Expired contracts (`endDate < today`) are auto-flagged `EXPIRED` by a nightly job (or on-read lazily) and excluded from "current contract" views but remain in history and remain selectable by payroll for back-dated runs.

**Frontend:** List view highlights the currently active contract per employee (badge); Form view captures all fields above; Employee Form has a "Contracts" smart button showing count + link to filtered list.

**Business rules:** `endDate` (if set) must be `> startDate`. A contract cannot be edited once referenced by a `FINALIZED` payslip (must create a new contract instead) — protects payroll history integrity.

### E3. Working Schedule

**Fields:** name, type (`STANDARD`, `SHIFT`, `FLEXIBLE`), per-day rows (day of week, start time, end time, break minutes), computed `totalWeeklyHours` (auto-calculated, not manually entered), overtime threshold (hours/day or /week after which extra hours count as overtime) **[Stretch: overtime pay multiplier config]**.

**Computation:** `totalWeeklyHours = Σ over days [(endTime - startTime) - breakMinutes]`, recalculated server-side whenever schedule rows change.

**Interaction with attendance/payroll:** Attendance's "expected hours" for a day comes from the schedule row for that weekday of the employee's contract-assigned schedule. Payroll's LOP (loss-of-pay) and overtime rule inputs read `workedHours` vs `expectedHours` from attendance, aggregated over the period.

### E4. Attendance Management

**Fields:** employee (FK), date, check-in timestamp, check-out timestamp, worked hours (computed), status (`PRESENT`, `LATE`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`, `HOLIDAY`), late-arrival flag, early-departure flag, overtime hours (computed), source (`SELF_CHECKIN`, `MANUAL_CORRECTION`), corrected-by (FK to user, nullable).

**Computation:** `workedHours = checkOut - checkIn` (minus configured break, if schedule defines one); `late = checkIn > scheduleStart + gracePeriod`; `earlyDeparture = checkOut < scheduleEnd`; `overtime = max(0, workedHours - expectedHours)`.

**Validation & edge cases:**
- **Missing checkout:** if no checkout by end of day, status auto-flagged `INCOMPLETE`, worked hours = null, surfaced to HR for manual correction; excluded from payroll worked-hours totals until corrected.
- **Duplicate check-in:** a second check-in on the same date without an intervening check-out is rejected (400) — "Already checked in."
- **Invalid timestamps:** check-out before check-in on the same record is rejected by Zod + a DB check.
- **Overnight shifts:** if check-out date > check-in date and the assigned schedule is `SHIFT` type, worked hours span midnight; the record is still keyed to the check-in date for reporting, and worked hours = `checkOut - checkIn` regardless of date rollover.

**Effect on payroll:** Full-month absence with no approved leave → those days are treated as unpaid (LOP) by the `LOP` salary rule. Attendance is one of the salary-rule engine's available **input variables** (see Section L).

### E5. Leave / Time-Off Management

**Entities:** `leave_types` (name, unit `DAYS`/`HOURS`, requires allocation Y/N, paid Y/N, requires approval Y/N, affects payroll Y/N), `leave_balances`/`allocations` (employee, leave type, allocated, taken, remaining, valid from/to), `leave_requests` (employee, leave type, start date, end date, half-day flag, reason, status `PENDING`/`APPROVED`/`REJECTED`/`CANCELLED`, approver, decided-at).

**Flow:** Employee submits request → system checks remaining balance (if `requiresAllocation`) → HR/Manager approves/rejects → on approval, balance is decremented and attendance days in range are marked `ON_LEAVE`.

**Payroll effect (per spec example):** Only `APPROVED` leave affects payroll. If a leave type has `paid = false` (unpaid), the days fall through to the LOP salary rule as deductible days: *"If an employee has 2 unpaid leave days, the payroll engine calculates the deduction using the configured salary rules"* — e.g. `LOP_DEDUCTION = (Basic / workingDaysInMonth) × unpaidLeaveDays`. Paid leave types do not reduce pay.

**Half-day:** `isHalfDay = true` counts as 0.5 day against balance and against LOP calc.

### E6. Salary Structure

A **Salary Structure** is a named, reusable container of ordered Salary Rules (e.g., "Regular Salary – Full Time", "Regular Salary – Intern"), assigned to a Contract and selected on a Payrun. Structure fields: name, code, description, active flag, list of rule assignments with per-structure sequence override (optional).

**Composition example (from spec):**
```
Basic Salary
+ Housing Allowance (HRA)
+ Transport Allowance
+ Bonus
= Gross Salary
- Tax
- Insurance
- Loss of Pay (LOP)
= Net Salary
```

### E7. Employee Portal — see Section O.
### E8. Dashboard — see Section P.
### E9. Notifications — see Section Q.
### E10. Audit — see Section S.

## F. System Architecture

```
┌───────────────────────────────────────────────────────────┐
│  React SPA (Vite) + Tailwind CSS + Recharts                │
│  - Auth context, protected routes, role-based UI gating    │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTPS / JSON (REST)
┌───────────────────────────▼──────────────────────────────┐
│  Express.js REST API                                       │
│  - Routes → Controllers → Validators (Zod) → Services       │
│  - Middleware: authenticateJWT, authorizeRole, auditLogger  │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  Business Logic / Service Layer                            │
│  - ContractResolverService, AttendanceService,              │
│    LeaveService, SalaryRuleEngineService, PayrollService,   │
│    PayslipPdfService, NotificationService, AuditService     │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  Prisma ORM (type-safe query builder, migrations)           │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  MySQL 8 (InnoDB, transactional payroll writes)              │
└───────────────────────────────────────────────────────────┘

Supporting services (called from the service layer, not separate microservices):
  - PDF generation (pdf-lib / pdfkit) for payslips
  - Nodemailer (SMTP) for email notifications & bulk payslip delivery
```

**Layer responsibilities:**
- **Frontend:** rendering, client-side validation (mirrors Zod schemas), calling REST APIs, role-based route/component gating, charts.
- **Backend routes/controllers:** HTTP concerns only — parse request, call validator, call service, shape response.
- **Validation:** Zod schemas shared conceptually between client and server (server is source of truth; never trust client validation alone).
- **Business logic/services:** all domain rules (contract resolution, rule engine, payroll state machine) live here, framework-agnostic where possible, unit-testable in isolation.
- **Prisma/MySQL:** persistence, relations, transactions (critical for payroll: calculating a payrun and writing all payslip lines happens inside a single Prisma `$transaction`).
- **Auth:** JWT issued at login, verified per-request; RBAC middleware checks role against route's required permission.
- **PDF/Email:** invoked by PayrollService/PayslipService, isolated behind an interface so they can be swapped/mocked in tests.

**[Technical Decision]** Modular monolith, not microservices — per design principle #2/#3. All modules are separate Express routers + service files within one deployable Node process, keeping the hackathon build simple while preserving clean separation.

## G. MySQL Database Design

All tables use `id` (CHAR(36) UUID or BIGINT AUTO_INCREMENT — we use **CUID/UUID strings** to match Prisma's default `@default(uuid())`), `createdAt`, `updatedAt` timestamps, InnoDB engine, `utf8mb4` charset.

| Table | Purpose |
|---|---|
| `users` | Login credentials + role linkage (1:1 with employees for EMPLOYEE role users) |
| `roles` | Role definitions (SUPER_ADMIN, PAYROLL_MANAGER, PAYROLL_USER, HR_MANAGER, HR_STAFF, EMPLOYEE) |
| `employees` | Core employee master data |
| `departments` | Org departments |
| `job_positions` | Job titles/positions |
| `contracts` | Historical + active employment contracts |
| `working_schedules` | Named weekly schedule templates |
| `schedule_days` | Per-weekday rows of a schedule (day, start, end, break) |
| `attendance` | Daily check-in/out records |
| `leave_types` | Configurable leave policies |
| `leave_balances` | Per-employee, per-type allocations & remaining balance |
| `leave_requests` | Individual time-off requests |
| `salary_structures` | Named bundles of salary rules |
| `salary_structure_rules` | Join table: structure ↔ rule with sequence override |
| `salary_rules` | Configurable rule definitions (the rule engine's data) |
| `payruns` | A payroll batch for a period + structure |
| `payslips` | One per employee per payrun |
| `payslip_lines` | One row per salary rule evaluated for a payslip |
| `notifications` | In-app notification feed |
| `audit_logs` | Change history across the system |

### Key columns & relationships (representative — full DDL implied by Prisma schema in Section H)

**employees**
| Column | Type | Notes |
|---|---|---|
| id | CHAR(36) PK | |
| employeeCode | VARCHAR(20) UNIQUE | e.g. EMP-0001 |
| firstName, lastName | VARCHAR(100) | |
| email | VARCHAR(150) UNIQUE | |
| phone | VARCHAR(20) | |
| departmentId | CHAR(36) FK → departments.id | |
| jobPositionId | CHAR(36) FK → job_positions.id | |
| managerId | CHAR(36) FK → employees.id (nullable, self-ref) | |
| workingScheduleId | CHAR(36) FK → working_schedules.id | default schedule |
| joiningDate | DATE | |
| employmentStatus | ENUM | ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED |
| employmentType | ENUM | FULL_TIME, PART_TIME, CONTRACT, INTERN |
| bankAccountName, bankAccountNumber, bankIfsc | VARCHAR | for payments |
| userId | CHAR(36) FK → users.id UNIQUE (nullable) | portal login |

**contracts**
| Column | Type | Notes |
|---|---|---|
| id | PK | |
| employeeId | FK → employees.id | ON DELETE RESTRICT |
| startDate | DATE NOT NULL | |
| endDate | DATE NULL | open-ended if null |
| wageType | ENUM(MONTHLY,HOURLY,DAILY) | |
| basicWage | DECIMAL(12,2) | |
| departmentId, jobPositionId, workingScheduleId | FK | snapshot terms |
| salaryStructureId | FK → salary_structures.id | |
| status | ENUM(DRAFT,ACTIVE,EXPIRED,CANCELLED) | |
| Index | (employeeId, startDate, endDate) | speeds period resolution query |

**attendance**
| id PK; employeeId FK; date DATE; checkIn DATETIME; checkOut DATETIME NULL; workedHours DECIMAL(5,2) NULL; status ENUM; isLate BOOLEAN; isEarlyDeparture BOOLEAN; overtimeHours DECIMAL(5,2) DEFAULT 0; source ENUM(SELF,MANUAL); correctedBy FK→users.id NULL; UNIQUE(employeeId, date) |

**leave_requests**
| id PK; employeeId FK; leaveTypeId FK; startDate; endDate; isHalfDay BOOLEAN; durationDays DECIMAL(4,1); status ENUM(PENDING,APPROVED,REJECTED,CANCELLED); approvedBy FK→users.id NULL; decidedAt DATETIME NULL; reason TEXT |

**salary_rules**
| id PK; name VARCHAR(100); code VARCHAR(30) UNIQUE; sequence INT; category ENUM(BASIC,ALLOWANCE,GROSS,DEDUCTION,NET,CONTRIBUTION); computationType ENUM(FIXED,PERCENTAGE,FORMULA); fixedAmount DECIMAL(12,2) NULL; percentageOf VARCHAR(30) NULL (code of base rule); percentageValue DECIMAL(5,2) NULL; formula TEXT NULL; conditionExpression TEXT NULL; isDeduction BOOLEAN; active BOOLEAN |

**payruns**
| id PK; name VARCHAR; periodStart DATE; periodEnd DATE; salaryStructureId FK; status ENUM(DRAFT,CALCULATING,CALCULATED,REVIEW,APPROVED,FINALIZED,PAID); createdBy FK→users.id; approvedBy FK→users.id NULL; finalizedAt DATETIME NULL |

**payslips**
| id PK; payrunId FK; employeeId FK; contractId FK (resolved contract); grossSalary DECIMAL(12,2); totalDeductions DECIMAL(12,2); netSalary DECIMAL(12,2); workedDays DECIMAL(5,1); status ENUM(DRAFT,CALCULATED,VALIDATED,PAID); warnings JSON NULL; UNIQUE(payrunId, employeeId) |

**payslip_lines**
| id PK; payslipId FK; salaryRuleId FK; ruleCode VARCHAR; label VARCHAR; amount DECIMAL(12,2); sequence INT; category ENUM |

**Relationships (ASCII):**
```
employees 1───* contracts
employees 1───* attendance
employees 1───* leave_requests
employees 1───* leave_balances
employees 1───* payslips
employees 1───1 users            (portal login, nullable)
departments 1───* employees
job_positions 1───* employees
working_schedules 1───* schedule_days
working_schedules 1───* contracts
salary_structures 1───* salary_structure_rules ───* salary_rules
payruns 1───* payslips
payslips 1───* payslip_lines
leave_types 1───* leave_balances
leave_types 1───* leave_requests
users 1───* audit_logs
users 1───* notifications
```

**Important constraints:** unique `employeeCode`, unique `email`, unique `(payrunId, employeeId)` on payslips, unique `(employeeId, date)` on attendance, foreign keys `ON DELETE RESTRICT` for anything referenced by finalized payroll (contracts, employees, salary_rules once used in a payslip_line), `ON DELETE CASCADE` for pure children (schedule_days under working_schedules, payslip_lines under payslips).

## H. Prisma Schema (schema.prisma — implementation-ready specification)

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum RoleName {
  SUPER_ADMIN
  PAYROLL_MANAGER
  PAYROLL_USER
  HR_MANAGER
  HR_STAFF
  EMPLOYEE
}

model Role {
  id    String   @id @default(uuid())
  name  RoleName @unique
  users User[]
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  roleId       String
  role         Role      @relation(fields: [roleId], references: [id])
  employee     Employee?
  notifications Notification[]
  auditLogs    AuditLog[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

enum EmploymentStatus { ACTIVE ON_LEAVE SUSPENDED TERMINATED }
enum EmploymentType   { FULL_TIME PART_TIME CONTRACT INTERN }

model Employee {
  id                 String   @id @default(uuid())
  employeeCode       String   @unique
  firstName          String
  lastName           String
  email              String   @unique
  phone              String?
  departmentId       String?
  department         Department? @relation(fields: [departmentId], references: [id])
  jobPositionId      String?
  jobPosition        JobPosition? @relation(fields: [jobPositionId], references: [id])
  managerId          String?
  manager            Employee?   @relation("EmployeeManager", fields: [managerId], references: [id])
  subordinates       Employee[]  @relation("EmployeeManager")
  workingScheduleId  String?
  workingSchedule    WorkingSchedule? @relation(fields: [workingScheduleId], references: [id])
  joiningDate        DateTime
  employmentStatus   EmploymentStatus @default(ACTIVE)
  employmentType     EmploymentType   @default(FULL_TIME)
  bankAccountName    String?
  bankAccountNumber  String?
  bankIfsc           String?
  userId             String?  @unique
  user               User?    @relation(fields: [userId], references: [id])
  contracts          Contract[]
  attendance         Attendance[]
  leaveBalances      LeaveBalance[]
  leaveRequests      LeaveRequest[]
  payslips           Payslip[]
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([departmentId])
  @@index([employmentStatus])
}

model Department {
  id        String     @id @default(uuid())
  name      String     @unique
  employees Employee[]
  contracts Contract[]
}

model JobPosition {
  id        String     @id @default(uuid())
  title     String     @unique
  employees Employee[]
  contracts Contract[]
}

model WorkingSchedule {
  id               String        @id @default(uuid())
  name             String
  type             String        @default("STANDARD") // STANDARD | SHIFT | FLEXIBLE
  totalWeeklyHours Decimal       @default(0) @db.Decimal(5,2)
  scheduleDays     ScheduleDay[]
  employees        Employee[]
  contracts        Contract[]
}

model ScheduleDay {
  id                String          @id @default(uuid())
  workingScheduleId String
  workingSchedule   WorkingSchedule @relation(fields: [workingScheduleId], references: [id], onDelete: Cascade)
  dayOfWeek         Int             // 0=Sun .. 6=Sat
  startTime         String          // "09:00"
  endTime           String          // "18:00"
  breakMinutes      Int             @default(0)

  @@unique([workingScheduleId, dayOfWeek])
}

enum WageType { MONTHLY HOURLY DAILY }
enum ContractStatus { DRAFT ACTIVE EXPIRED CANCELLED }

model Contract {
  id                String          @id @default(uuid())
  employeeId        String
  employee          Employee        @relation(fields: [employeeId], references: [id], onDelete: Restrict)
  startDate         DateTime
  endDate           DateTime?
  wageType          WageType        @default(MONTHLY)
  basicWage         Decimal         @db.Decimal(12,2)
  departmentId      String?
  department        Department?     @relation(fields: [departmentId], references: [id])
  jobPositionId     String?
  jobPosition       JobPosition?    @relation(fields: [jobPositionId], references: [id])
  workingScheduleId String?
  workingSchedule   WorkingSchedule? @relation(fields: [workingScheduleId], references: [id])
  salaryStructureId String?
  salaryStructure   SalaryStructure? @relation(fields: [salaryStructureId], references: [id])
  status            ContractStatus  @default(DRAFT)
  payslips          Payslip[]
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([employeeId, startDate, endDate])
}

enum AttendanceStatus { PRESENT LATE ABSENT HALF_DAY ON_LEAVE HOLIDAY INCOMPLETE }
enum AttendanceSource { SELF_CHECKIN MANUAL_CORRECTION }

model Attendance {
  id               String           @id @default(uuid())
  employeeId       String
  employee         Employee         @relation(fields: [employeeId], references: [id])
  date             DateTime         @db.Date
  checkIn          DateTime?
  checkOut         DateTime?
  workedHours      Decimal?         @db.Decimal(5,2)
  status           AttendanceStatus @default(PRESENT)
  isLate           Boolean          @default(false)
  isEarlyDeparture Boolean          @default(false)
  overtimeHours    Decimal          @default(0) @db.Decimal(5,2)
  source           AttendanceSource @default(SELF_CHECKIN)
  correctedById    String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@unique([employeeId, date])
}

model LeaveType {
  id                 String   @id @default(uuid())
  name               String   @unique
  unit               String   @default("DAYS") // DAYS | HOURS
  requiresAllocation Boolean  @default(true)
  isPaid             Boolean  @default(true)
  requiresApproval   Boolean  @default(true)
  affectsPayroll     Boolean  @default(true)
  balances           LeaveBalance[]
  requests           LeaveRequest[]
}

model LeaveBalance {
  id           String    @id @default(uuid())
  employeeId   String
  employee     Employee  @relation(fields: [employeeId], references: [id])
  leaveTypeId  String
  leaveType    LeaveType @relation(fields: [leaveTypeId], references: [id])
  allocated    Decimal   @db.Decimal(5,1)
  taken        Decimal   @default(0) @db.Decimal(5,1)
  remaining    Decimal   @db.Decimal(5,1)
  validFrom    DateTime
  validTo      DateTime?

  @@unique([employeeId, leaveTypeId, validFrom])
}

enum LeaveStatus { PENDING APPROVED REJECTED CANCELLED }

model LeaveRequest {
  id           String      @id @default(uuid())
  employeeId   String
  employee     Employee    @relation(fields: [employeeId], references: [id])
  leaveTypeId  String
  leaveType    LeaveType   @relation(fields: [leaveTypeId], references: [id])
  startDate    DateTime
  endDate      DateTime
  isHalfDay    Boolean     @default(false)
  durationDays Decimal     @db.Decimal(4,1)
  status       LeaveStatus @default(PENDING)
  reason       String?
  approvedById String?
  decidedAt    DateTime?
  createdAt    DateTime    @default(now())
}

model SalaryStructure {
  id        String @id @default(uuid())
  name      String @unique
  code      String @unique
  active    Boolean @default(true)
  rules     SalaryStructureRule[]
  contracts Contract[]
  payruns   Payrun[]
}

model SalaryStructureRule {
  id                String          @id @default(uuid())
  salaryStructureId String
  salaryStructure   SalaryStructure @relation(fields: [salaryStructureId], references: [id], onDelete: Cascade)
  salaryRuleId      String
  salaryRule        SalaryRule      @relation(fields: [salaryRuleId], references: [id])
  sequenceOverride  Int?

  @@unique([salaryStructureId, salaryRuleId])
}

enum RuleCategory { BASIC ALLOWANCE GROSS DEDUCTION NET CONTRIBUTION }
enum ComputationType { FIXED PERCENTAGE FORMULA }

model SalaryRule {
  id               String              @id @default(uuid())
  name             String
  code             String              @unique   // e.g. BASIC, HRA, TRANSPORT, TAX, LOP
  sequence         Int
  category         RuleCategory
  computationType  ComputationType
  fixedAmount      Decimal?            @db.Decimal(12,2)
  percentageOfCode String?             // references another rule's `code`
  percentageValue  Decimal?            @db.Decimal(5,2)
  formula          String?             @db.Text  // safe-evaluated expression, see Section L
  conditionExpr    String?             @db.Text  // e.g. "employee.employmentType == 'FULL_TIME'"
  isDeduction      Boolean             @default(false)
  active           Boolean             @default(true)
  structures       SalaryStructureRule[]
  payslipLines     PayslipLine[]
}

enum PayrunStatus { DRAFT CALCULATING CALCULATED REVIEW APPROVED FINALIZED PAID }

model Payrun {
  id                String          @id @default(uuid())
  name              String
  periodStart       DateTime        @db.Date
  periodEnd         DateTime        @db.Date
  salaryStructureId String
  salaryStructure   SalaryStructure @relation(fields: [salaryStructureId], references: [id])
  status            PayrunStatus    @default(DRAFT)
  createdById       String
  approvedById      String?
  finalizedAt       DateTime?
  payslips          Payslip[]
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
}

enum PayslipStatus { DRAFT CALCULATED VALIDATED PAID }

model Payslip {
  id               String        @id @default(uuid())
  payrunId         String
  payrun           Payrun        @relation(fields: [payrunId], references: [id])
  employeeId       String
  employee         Employee      @relation(fields: [employeeId], references: [id])
  contractId       String
  contract         Contract      @relation(fields: [contractId], references: [id])
  grossSalary      Decimal       @db.Decimal(12,2)
  totalDeductions  Decimal       @db.Decimal(12,2)
  netSalary        Decimal       @db.Decimal(12,2)
  workedDays       Decimal       @db.Decimal(5,1)
  status           PayslipStatus @default(DRAFT)
  warnings         Json?
  lines            PayslipLine[]
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@unique([payrunId, employeeId])
}

model PayslipLine {
  id           String       @id @default(uuid())
  payslipId    String
  payslip      Payslip      @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  salaryRuleId String
  salaryRule   SalaryRule   @relation(fields: [salaryRuleId], references: [id])
  ruleCode     String
  label        String
  amount       Decimal      @db.Decimal(12,2)
  sequence     Int
  category     RuleCategory
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String
  title     String
  message   String
  isRead    Boolean  @default(false)
  emailSent Boolean  @default(false)
  createdAt DateTime @default(now())
}

model AuditLog {
  id           String   @id @default(uuid())
  userId       String?
  user         User?    @relation(fields: [userId], references: [id])
  action       String   // CREATE | UPDATE | DELETE | APPROVE | FINALIZE | GENERATE
  entity       String   // "Employee" | "Contract" | "Payrun" ...
  entityId     String
  previousValue Json?
  newValue     Json?
  createdAt    DateTime @default(now())

  @@index([entity, entityId])
}
```

## I. REST API Specification

Base path: `/api`. All responses JSON. Protected routes require `Authorization: Bearer <JWT>`.

### Auth
| Method | Endpoint | Purpose | Body | Role |
|---|---|---|---|---|
| POST | `/auth/login` | Authenticate, issue JWT | `{email, password}` | Public |
| POST | `/auth/refresh` | Refresh access token | `{refreshToken}` | Public |
| GET | `/auth/me` | Current user profile | – | Any authenticated |
| POST | `/auth/logout` | Invalidate refresh token | – | Any authenticated |

### Employees
| Method | Endpoint | Purpose | Role |
|---|---|---|---|
| GET | `/employees?search=&department=&status=&sort=&page=` | List/search/filter/sort | HR_MANAGER+, PAYROLL (read) |
| POST | `/employees` | Create employee | HR_MANAGER, SUPER_ADMIN |
| GET | `/employees/:id` | Detail | HR_MANAGER+, self (Employee) |
| PUT | `/employees/:id` | Update | HR_MANAGER, SUPER_ADMIN |
| DELETE | `/employees/:id` | Terminate (soft) | SUPER_ADMIN |
| GET | `/employees/:id/summary` | Related counts (contracts, leave, attendance) | HR_MANAGER+ |

### Contracts
| Method | Endpoint | Purpose | Role |
|---|---|---|---|
| GET | `/contracts?employeeId=` | List | HR_MANAGER+ |
| POST | `/contracts` | Create | HR_MANAGER, SUPER_ADMIN |
| GET | `/contracts/:id` | Detail | HR_MANAGER+, self |
| PUT | `/contracts/:id` | Update (blocked if finalized-payslip-linked) | HR_MANAGER, SUPER_ADMIN |
| DELETE | `/contracts/:id` | Delete (only DRAFT) | SUPER_ADMIN |
| GET | `/contracts/resolve?employeeId=&date=` | Resolve period-correct contract | Internal/PAYROLL |

### Working Schedules
`GET/POST /working-schedules`, `GET/PUT/DELETE /working-schedules/:id` — HR_MANAGER+.

### Attendance
| Method | Endpoint | Purpose | Role |
|---|---|---|---|
| POST | `/attendance/check-in` | Self check-in | EMPLOYEE+ |
| POST | `/attendance/check-out` | Self check-out | EMPLOYEE+ |
| GET | `/attendance?employeeId=&from=&to=` | List | HR_MANAGER+, self |
| PUT | `/attendance/:id` | Manual correction | HR_MANAGER, SUPER_ADMIN |

### Leave / Time Off
| Method | Endpoint | Purpose | Role |
|---|---|---|---|
| GET/POST | `/leave-types` | Manage leave types | HR_MANAGER, SUPER_ADMIN |
| GET/POST | `/leave-balances` | View/allocate balances | HR_MANAGER+, self (view) |
| GET | `/leave-requests?employeeId=&status=` | List | HR_MANAGER+, self |
| POST | `/leave-requests` | Submit request | EMPLOYEE+ |
| PUT | `/leave-requests/:id/approve` | Approve | HR_MANAGER, HR_STAFF, SUPER_ADMIN |
| PUT | `/leave-requests/:id/reject` | Reject | HR_MANAGER, HR_STAFF, SUPER_ADMIN |

### Salary Structures & Rules
| Method | Endpoint | Purpose | Role |
|---|---|---|---|
| GET | `/salary-structures` | List | PAYROLL_USER+ (read), HR_MANAGER (read) |
| POST/PUT/DELETE | `/salary-structures/:id` | Manage | PAYROLL_MANAGER, SUPER_ADMIN |
| GET | `/salary-rules` | List | PAYROLL_USER+ |
| POST | `/salary-rules` | Create rule | PAYROLL_MANAGER, SUPER_ADMIN |
| PUT | `/salary-rules/:id` | Update rule | PAYROLL_MANAGER, SUPER_ADMIN |
| DELETE | `/salary-rules/:id` | Deactivate (soft) | PAYROLL_MANAGER, SUPER_ADMIN |
| POST | `/salary-rules/test` | Dry-run a rule against sample inputs | PAYROLL_MANAGER, SUPER_ADMIN |

### Payroll
| Method | Endpoint | Purpose | Body | Role |
|---|---|---|---|---|
| POST | `/payroll/payruns` | Create payrun (Step 1: scope+period) | `{name, periodStart, periodEnd, salaryStructureId}` | PAYROLL_USER+ |
| GET | `/payroll/payruns/:id/eligible-employees` | Step 2: list eligible employees | – | PAYROLL_USER+ |
| POST | `/payroll/payruns/:id/select-employees` | Finalize batch membership | `{employeeIds[]}` | PAYROLL_USER+ |
| POST | `/payroll/payruns/:id/calculate` | Run calculation for all payslips | – | PAYROLL_USER+ |
| GET | `/payroll/payruns/:id` | Detail + payslip summaries | – | PAYROLL_USER+ |
| POST | `/payroll/payruns/:id/validate` | Run validation, produce warnings | – | PAYROLL_MANAGER, PAYROLL_USER |
| POST | `/payroll/payruns/:id/approve` | Approve (locks further edits) | – | PAYROLL_MANAGER |
| POST | `/payroll/payruns/:id/finalize` | Finalize (immutable) | – | PAYROLL_MANAGER |
| POST | `/payroll/payruns/:id/mark-paid` | Mark paid | – | PAYROLL_MANAGER |
| POST | `/payroll/payruns/:id/send-payslips` | Bulk email payslips | – | PAYROLL_MANAGER, PAYROLL_USER |

### Payslips
| Method | Endpoint | Purpose | Role |
|---|---|---|---|
| GET | `/payslips?employeeId=&payrunId=` | List | PAYROLL_USER+, self |
| GET | `/payslips/:id` | Detail with line items | PAYROLL_USER+, self (own only) |
| GET | `/payslips/:id/pdf` | Download PDF | PAYROLL_USER+, self (own only) |
| POST | `/payslips/:id/email` | Email single payslip | PAYROLL_MANAGER, PAYROLL_USER |

### Dashboard
`GET /dashboard/summary?period=&department=&employeeType=` → KPIs + chart series. Role: HR_MANAGER+, PAYROLL_USER+ (scoped fields per role).

### Notifications & Audit
`GET /notifications` (self), `PUT /notifications/:id/read`. `GET /audit-logs?entity=&entityId=&userId=` (SUPER_ADMIN full, others scoped to their module).

Every response follows `{ success: boolean, data?: ..., error?: { code, message } }`. List endpoints return `{ items, page, pageSize, total }`.

## J. Authentication & Security

**Login flow:** `POST /auth/login` → verify email exists → `bcrypt.compare(password, user.passwordHash)` → on success issue short-lived JWT access token (15 min) carrying `{userId, roleName, employeeId}` + a longer-lived refresh token (7 days, stored hashed in DB) → client stores access token in memory, refresh token in httpOnly cookie.

**Protecting routes:** `authenticateJWT` middleware verifies signature/expiry and attaches `req.user`. `authorizeRole(['HR_MANAGER','SUPER_ADMIN'])` middleware checks `req.user.roleName` against an allow-list per route.

**Preventing employee-to-employee data leaks:** every Employee-portal-facing controller (attendance, leave, payslips) additionally checks `if (req.user.roleName === 'EMPLOYEE' && resource.employeeId !== req.user.employeeId) return 403`. This check happens **server-side on every request**, never inferred from the URL alone — a malicious client cannot bypass it by changing an `:id` param, because the ownership check re-queries the DB row and compares.

## K. UI/UX Specification (page inventory)

| Group | Pages |
|---|---|
| Auth | Login |
| Dashboards | HR Dashboard, Payroll Dashboard |
| Employees | List, Details, Create, Edit |
| Contracts | List, Details, Create |
| Attendance | Attendance Dashboard, Attendance Records |
| Leave | Leave Dashboard, Leave Requests, Leave Approval |
| Salary | Salary Structures, Salary Rules, Rule Builder |
| Payroll | Payrun List, Create Payrun (wizard), Payroll Calculation, Payroll Review, Payroll Approval |
| Payslips | Payslip List, Payslip Details, PDF Preview |
| Employee Portal | My Profile, My Attendance, My Leave, My Payslips |

**Payrun Creation Wizard (per source spec):** Step 1 — scope (Salary Structure + Period). "Continue" moves to Step 2 without creating a DB row yet (kept in client/session state). Step 2 — filter and explicitly select eligible employees. "Create Payrun" persists the batch + selected employees and opens the processing screen (Compute / Validate / Mark Paid / Send Payslips actions).

## L. Salary Rule Engine

This is the core differentiator (Section 33 of the authoring brief). Rules are **data**, evaluated by a generic engine — never hardcoded per-company logic.

**Rule model fields:** name, code (unique symbol used in formulas, e.g. `BASIC`, `HRA`), sequence (execution order), category (BASIC/ALLOWANCE/GROSS/DEDUCTION/NET/CONTRIBUTION), computationType (FIXED/PERCENTAGE/FORMULA), fixedAmount, percentageOfCode + percentageValue, formula (safe expression string), conditionExpr (boolean expression gating whether the rule fires), isDeduction, active.

**Evaluation algorithm:**
1. Load the Payrun's `salaryStructure` → its ordered `SalaryStructureRule[]` (sorted by `sequenceOverride ?? salaryRule.sequence`).
2. Build an evaluation **context** per employee/payslip: `{ BASIC: contract.basicWage, employee, contract, attendance: {workedDays, expectedDays, overtimeHours}, leave: {unpaidDays, paidDays}, ...previouslyComputedRuleCodes }`.
3. For each rule in sequence:
   a. If `conditionExpr` present, evaluate it against context; skip the rule (amount = 0, not written) if false.
   b. Compute `amount` based on `computationType`:
      - `FIXED` → `amount = fixedAmount`
      - `PERCENTAGE` → `amount = context[percentageOfCode] * (percentageValue / 100)`
      - `FORMULA` → `amount = safeEval(formula, context)` (sandboxed expression evaluator — e.g. `mathjs.evaluate` with a restricted scope; **never** `eval()`/`Function()` on user input)
   c. Store `amount` into context under the rule's `code` so later rules can reference it (this is how `TAX` can reference `GROSS`, which itself referenced `BASIC` + `HRA` + `TRANSPORT`).
   d. Persist a `PayslipLine` row.
4. Sum lines by category: `Gross = Σ(BASIC + ALLOWANCE)`, `Deductions = Σ(DEDUCTION)`, `Net = Gross - Deductions (+/- CONTRIBUTION per policy)`.
5. Dependency safety: before running, the engine topologically checks that every `percentageOfCode`/formula reference points to a rule with a **strictly earlier** sequence number; a forward or self reference is rejected at rule-save time (see Edge Cases — circular dependency) and at run time as a defensive re-check.

**Worked example (matches source & authoring brief numbers):**
```
BASIC        (FIXED)                = ₹30,000
HRA          (PERCENTAGE of BASIC, 20%)  = ₹6,000
TRANSPORT    (FIXED)                 = ₹2,000
GROSS        (FORMULA: BASIC+HRA+TRANSPORT) = ₹38,000
TAX          (PERCENTAGE of GROSS, 10%)     = ₹3,800
LOP          (FORMULA, see below)           = ₹0 (no unpaid leave this period)
NET          (FORMULA: GROSS - TAX - LOP)   = ₹34,200
```

**Rule Builder UI:** form with Name, Code, Category dropdown, Sequence (auto-suggested next number, editable), Computation Type selector switching visible fields (Fixed→amount input; Percentage→"Based on" rule-code dropdown + percentage input; Formula→expression textbox with an inline variable picker listing available codes), Condition builder (simple `field operator value` rows, e.g. `employee.employmentType = FULL_TIME`, ANDed together and compiled to `conditionExpr`), Active toggle, and a **"Test Rule"** panel where the admin enters sample context values and sees the computed amount before saving (`POST /salary-rules/test`).

**Backend logic:** `SalaryRuleEngineService.evaluate(structureId, context)` is a pure function (no DB writes) called by `PayrollService`; kept side-effect-free for unit testing. Validation at save-time (Zod + custom refinement): `percentageOfCode` must reference an existing, earlier-sequence, active rule; `formula` must reference only known codes and parse successfully against a dry-run context; `conditionExpr` must reference known context fields.

## M. Payroll Engine

**Full flow:** Employee → Contract (resolved for period) → Working Schedule → Attendance (aggregated) → Approved Leave (aggregated) → Salary Structure → Salary Rules (engine) → Payroll Calculation → Payslip → Validation → Final Payroll.

**Status state machine:**
```
DRAFT → CALCULATING → CALCULATED → REVIEW → APPROVED → FINALIZED → PAID
```
| Status | Meaning | Triggered by | What happens |
|---|---|---|---|
| DRAFT | Scope + period chosen, employees selected | `POST /payruns` + `/select-employees` | Empty payslip shells created, one per selected employee |
| CALCULATING | Calculation job running | `POST /calculate` | Server iterates employees; per employee wrapped in a Prisma `$transaction`: resolve contract → aggregate attendance/leave → run rule engine → write payslip + lines |
| CALCULATED | All payslips computed | Calculation completes | Totals available; still editable (can recalculate) |
| REVIEW | Under human review | `POST /validate` | Warnings computed (missing bank info, duplicate payslip, no-contract gaps, negative net) and attached to `payslip.warnings` |
| APPROVED | Manager sign-off | `POST /approve` | Requires `PAYROLL_MANAGER`; blocks further employee-selection edits |
| FINALIZED | Locked | `POST /finalize` | Payslips become immutable (enforced at the service layer + DB check: no UPDATE allowed once `payrun.status='FINALIZED'`); referenced contracts/rules become immutable too |
| PAID | Payment recorded | `POST /mark-paid` | Timestamps payment; triggers "payslip generated"/email notifications |

**Recalculation:** allowed any time before `APPROVED`; re-running `/calculate` deletes and rewrites that payrun's `payslip_lines` inside a transaction (never partial writes). If source data (attendance/leave/contract) changes after `CALCULATED`, the UI flags the payrun as "stale — recalculate recommended."

**Error handling:** if calculation fails for one employee (e.g., missing contract), that employee's payslip is marked with a warning and calculation continues for others — a single bad record must not abort the whole batch.

## N. Payslip System

Each Payslip holds: employee snapshot, payroll period, resolved contract reference, ordered `payslip_lines` (from the rule engine), gross/deductions/net totals, worked days, attendance summary, leave summary, and status.

**Capabilities:** View in-app (grouped by category: Earnings / Deductions / Net), Download PDF (`GET /payslips/:id/pdf`, generated via pdfkit/pdf-lib from the same line data — no re-calculation at PDF time), Email (Nodemailer, single or bulk from the Payrun's "Send Payslips" action), Payslip history (per employee, chronological list across all payruns).

## O. Employee Portal

Restricted views for role `EMPLOYEE`: My Profile (read-only, request-edit flow for changes), My Attendance (own check-in/out history + a self check-in/out action), My Leave (balance cards + request form + history), My Payslips (list + PDF download, own records only). Every query in these controllers is scoped server-side to `req.user.employeeId` (see Section J) — there is no client-supplied employee id that can widen the result set.

## P. Dashboard & Reporting

Built with Recharts. Filters: Period, Department, Employee Type.

**KPI cards:** Total Employees, Active Employees, New Employees (this period), Employees on Leave, Attendance Rate, Total Net Salary Paid / Payroll Total, Gross Salary, Total Deductions, Pending Leave Requests, Pending Payroll Approvals, Average Salary.

**Charts:** Payroll Trend (line, net salary over months), Department Employee Distribution (pie/bar), Attendance Trend (line, presence % over time), Leave Distribution (bar/pie by leave type), Salary Breakdown (stacked bar: earnings vs deductions), Salary Cost by Department (bar).

**Operational alerts panel:** payrun statuses needing action, employees with missing bank details, duplicate payslip warnings, contracts expiring soon.

All figures come from live aggregation queries (Prisma `groupBy`/`aggregate`), never static/mock data.

## Q. Notifications & Automation

| Event | In-app | Email |
|---|---|---|
| Leave request submitted | ✔ (to approver) | – |
| Leave approved/rejected | ✔ (to employee) | ✔ |
| Payroll calculated | ✔ (to payroll team) | – |
| Payroll requires approval | ✔ (to PAYROLL_MANAGER) | – |
| Payroll finalized | ✔ | ✔ (summary to payroll team) |
| Payslip generated | ✔ (to employee) | – |
| Payslip emailed | – | ✔ (to employee, with PDF attached) |
| Contract expiring (≤30 days) | ✔ (to HR_MANAGER) | ✔ |

**Automations:** auto-calc payroll on demand, auto-select active contract per period, auto-compute leave deductions via LOP rule, auto-apply salary rules in sequence, auto-generate payslips on calculation, auto-notify on lifecycle events, nightly job flags expiring/expired contracts, calculation flags negative-net or missing-data payslips automatically as warnings.

## R. Business Rules & Validation

**Core business rules:** employee code unique; work email unique; contract `endDate > startDate` when set; no two ACTIVE contracts for one employee may overlap; payroll always resolves the period-correct ACTIVE contract (Section E2); only APPROVED leave with `affectsPayroll=true` alters pay; a `FINALIZED` payrun's payslips cannot be edited; a payslip's `employeeId` must match the requesting employee for self-service reads; salary rules always execute in ascending sequence; a rule's dependencies (percentageOfCode, formula references) must resolve to earlier-sequence, active rules; a payrun already `CALCULATED` must be recalculated if attendance/leave/contract data changes before it reaches `APPROVED`.

**Zod validation (representative schemas):**
```ts
const employeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9+\-\s]{7,20}$/).optional(),
  departmentId: z.string().uuid(),
  joiningDate: z.coerce.date().max(new Date(), "Joining date cannot be in the future"),
  employmentType: z.enum(["FULL_TIME","PART_TIME","CONTRACT","INTERN"]),
});

const contractSchema = z.object({
  employeeId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  basicWage: z.number().positive(),
  wageType: z.enum(["MONTHLY","HOURLY","DAILY"]),
}).refine(d => !d.endDate || d.endDate > d.startDate, {
  message: "endDate must be after startDate", path: ["endDate"],
});

const leaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isHalfDay: z.boolean().default(false),
  reason: z.string().max(500).optional(),
}).refine(d => d.endDate >= d.startDate, { message: "endDate before startDate" });

const salaryRuleSchema = z.object({
  name: z.string().min(1),
  code: z.string().regex(/^[A-Z_]+$/),
  sequence: z.number().int().positive(),
  category: z.enum(["BASIC","ALLOWANCE","GROSS","DEDUCTION","NET","CONTRIBUTION"]),
  computationType: z.enum(["FIXED","PERCENTAGE","FORMULA"]),
  fixedAmount: z.number().optional(),
  percentageOfCode: z.string().optional(),
  percentageValue: z.number().min(0).max(100).optional(),
  formula: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.computationType === "FIXED" && d.fixedAmount == null)
    ctx.addIssue({ code: "custom", message: "fixedAmount required for FIXED type" });
  if (d.computationType === "PERCENTAGE" && (!d.percentageOfCode || d.percentageValue == null))
    ctx.addIssue({ code: "custom", message: "percentageOfCode & percentageValue required" });
  if (d.computationType === "FORMULA" && !d.formula)
    ctx.addIssue({ code: "custom", message: "formula required for FORMULA type" });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```
**Example invalid inputs → expected behavior:** contract with `endDate` before `startDate` → 400 "endDate must be after startDate"; duplicate employee email → 409 "Email already in use"; leave request with `startDate` after `endDate` → 400; salary rule of type PERCENTAGE missing `percentageOfCode` → 400 with field-level error; login with wrong password → 401 "Invalid credentials" (never reveal whether email exists).

## S. Audit & Compliance

Every mutating action on Employee, Contract, SalaryRule/Structure, Payrun (calculate/approve/finalize), and Payslip (generate) writes an `AuditLog` row: `{userId, action, entity, entityId, previousValue, newValue, createdAt}`. Previous/new values are stored as JSON diffs of changed fields only (not full row dumps) to keep logs compact. Audit logs are append-only — no update/delete endpoint exists for them. SUPER_ADMIN sees all logs; HR_MANAGER sees HR-entity logs; PAYROLL_MANAGER sees payroll-entity logs.

## T. Sample Data

Seed script (`prisma/seed.js`) creates:
- 3 departments: Engineering, Sales, HR & Admin
- 10 employees across departments with realistic Indian names, INR salaries (e.g., ₹25,000–₹60,000 basic)
- Multiple contracts for at least 2 employees (demonstrating the Jan–Jun / Jul–Dec split)
- 1 month of attendance records per employee (including at least one missing-checkout and one late-arrival example)
- Leave types: Casual Leave (paid, allocation 12/yr), Sick Leave (paid, allocation 8/yr), Unpaid Leave (unpaid, no allocation)
- A few pending and approved leave requests
- 1 salary structure ("Regular Salary – Full Time") with rules: BASIC, HRA (20%), TRANSPORT (₹2,000 fixed), BONUS (₹3,000 fixed, conditional), GROSS (formula), TAX (10% of GROSS), LOP (formula), NET (formula)
- 1 completed, finalized Payrun for the prior month with generated Payslips for all 10 employees
- Users: 1 SUPER_ADMIN, 1 HR_MANAGER, 1 PAYROLL_MANAGER, 1 PAYROLL_USER, and 10 EMPLOYEE users (one per seeded employee)

## U. Demo Scenario (5 minutes)

1. Login as HR Manager → HR Dashboard (headcount, attendance rate).
2. Open an employee → show Contracts tab (Contract A Jan–Jun, Contract B Jul–Dec).
3. Show Attendance and Time Off tabs for that employee (approved leave visible).
4. Switch to Payroll Manager login → open Salary Structures → open a Salary Rule → **live-edit** the HRA percentage (e.g., 20%→25%) to show no-code configuration.
5. Create a new Payrun (wizard: Step 1 period + structure, Step 2 select employees).
6. Run Compute → show payslip line breakdown auto-reflecting the rule edit and the period-correct contract.
7. Run Validate → show a warning (e.g., one employee missing bank details).
8. Approve → Finalize → Mark Paid → Send Payslips (bulk email).
9. Open a Payslip → Download PDF.
10. Login as Employee → show My Payslips (own only) and My Leave balance/request.

**Highlight to judges:** the HRA edit propagating automatically into the next calculation (no code change), the automatic Contract B selection for July payroll, the validation-warnings step, and the strict data isolation on the employee login.

## V. MVP vs Stretch

| Priority | Features |
|---|---|
| **MUST HAVE (MVP)** | Auth+RBAC, Employee CRUD, Contract CRUD + period resolution, Working Schedule, Attendance check-in/out + manual correction, Leave types/balances/requests + approval, Salary Structures & Rules (FIXED + PERCENTAGE + FORMULA, sequence, condition), Payrun wizard + Compute + Validate + Approve + Finalize, Payslip view + PDF, Employee Portal (profile/attendance/leave/payslips), HR + Payroll Dashboards with core KPIs/charts, Audit log for core entities |
| **SHOULD HAVE** | Bulk payslip email, contract-expiry notifications, in-app notification center, dashboard alert panel (duplicates/missing data), Rule Builder "Test Rule" sandbox |
| **STRETCH / FUTURE** | Overtime pay-rate configuration, shift/overnight schedule editor UI, multi-currency, statutory-form exports (e.g., PF/ESI forms), mobile app, SSO, configurable approval chains (multi-level), payroll simulation/what-if mode |

## W. Development Roadmap

| Phase | Tasks | Files/Modules | Dependencies | Output |
|---|---|---|---|---|
| 1 | Project scaffolding, MySQL + Prisma init, JWT auth, RBAC middleware | `server/src/config`, `server/prisma/schema.prisma`, `server/src/middleware/auth.js` | MySQL running | Login works, protected routes |
| 2 | Employee + Department + Position CRUD | `controllers/employee.*`, `client/pages/Employees/*` | Phase 1 | Employee module functional |
| 3 | Contracts + Working Schedules + resolution logic | `services/contractResolver.js` | Phase 2 | Contract CRUD + period resolver tested |
| 4 | Attendance + Leave (types/balances/requests/approval) | `services/attendanceService.js`, `services/leaveService.js` | Phase 3 | Attendance & leave flows functional |
| 5 | Salary Structures + Salary Rule Engine + Rule Builder UI | `services/salaryRuleEngine.js`, `client/pages/Salary/RuleBuilder.jsx` | Phase 2 | Engine unit-tested against worked example |
| 6 | Payroll Engine (payrun wizard, state machine, transactions) | `services/payrollService.js`, `controllers/payroll.*` | Phases 3–5 | End-to-end payrun runs |
| 7 | Payslips + PDF + Email | `services/payslipPdfService.js`, `services/notificationService.js` | Phase 6 | PDF/email working |
| 8 | Dashboards + Recharts | `client/pages/Dashboard/*`, `controllers/dashboard.js` | Phases 2–7 | Live charts |
| 9 | Employee Portal | `client/pages/Portal/*` | Phases 2–7 | Self-service functional, access-scoped |
| 10 | Testing, audit log wiring, demo data, demo rehearsal | `tests/*`, `prisma/seed.js` | All | Demo-ready build |

## X. Testing Strategy (≥20 cases)

| # | Area | Case | Expected result |
|---|---|---|---|
| 1 | Auth | Login with correct credentials | 200 + JWT issued |
| 2 | Auth | Login with wrong password | 401, generic message |
| 3 | RBAC | Employee tries to access `/employees` list | 403 |
| 4 | RBAC | HR_MANAGER tries `/payroll/payruns/:id/finalize` | 403 |
| 5 | Employee | Create employee with duplicate email | 409 |
| 6 | Employee | Create employee with future joining date | 400 |
| 7 | Contract | Create overlapping ACTIVE contract for same employee | 409 |
| 8 | Contract | Resolve contract for July when Contract A (Jan–Jun) & B (Jul–Dec) exist | Returns Contract B |
| 9 | Contract | Resolve contract for employee with no contract in period | Returns null / payroll warning |
| 10 | Attendance | Duplicate check-in same day | 400 "Already checked in" |
| 11 | Attendance | Missing checkout at day end | Status → INCOMPLETE, excluded from payroll hours |
| 12 | Attendance | Overnight shift check-out next calendar day | Worked hours computed correctly, keyed to check-in date |
| 13 | Leave | Request exceeding remaining balance | 400 "Insufficient balance" |
| 14 | Leave | Approve request | Balance decremented, attendance marked ON_LEAVE |
| 15 | Leave | Unpaid leave (2 days) affects payroll | LOP line = (Basic/workingDays)×2 |
| 16 | Salary Rule | PERCENTAGE rule referencing later-sequence code | Rejected at save (400) |
| 17 | Salary Rule | FORMULA referencing unknown code | Rejected at save |
| 18 | Salary Rule | Worked example (Basic 30k, HRA 20%, Transport 2k, Tax 10%) | Net = ₹34,200 |
| 19 | Payroll | Calculate payrun with one employee missing contract | That payslip flagged with warning; others calculate normally |
| 20 | Payroll | Recalculate before APPROVED | Old payslip_lines replaced atomically |
| 21 | Payroll | Attempt edit after FINALIZED | 403/409 "Payrun is finalized" |
| 22 | Payslip | Employee A requests Employee B's payslip | 403 |
| 23 | Payslip | Download PDF matches on-screen totals | Byte-identical figures |
| 24 | Dashboard | KPI totals match sum of underlying payslips for period | Equal |
| 25 | Audit | Editing a salary rule writes an AuditLog row with before/after | Row present, diff correct |

## Y. Edge Cases

| Case | Handling |
|---|---|
| Employee with no contract | Excluded from payroll with a warning; profile still viewable |
| Expired contract | Auto-flagged EXPIRED nightly; still usable for back-dated payroll |
| Multiple / overlapping contracts | Creation blocked (409) for overlapping ACTIVE ranges; resolver takes latest start if legacy data has an overlap |
| Missing attendance | Day treated as unmarked; if unresolved by payroll run, surfaced as a warning, not silently zeroed |
| Missing checkout | Status INCOMPLETE, hours excluded until corrected |
| Unpaid leave | Deducted via LOP formula rule |
| Full-month absence | If no leave request exists at all, all working days become LOP-eligible unless attendance is corrected |
| Zero salary component | Rule fires with amount 0; line still recorded for transparency |
| Negative calculation | Engine clamps NET at 0 and raises a payslip warning ("Net salary would be negative") rather than emitting a negative paycheck silently |
| Invalid salary rule | Rejected at save time via Zod + dependency check |
| Circular rule dependency | Detected via sequence-order check (a rule may only reference strictly earlier sequence codes) — rejected at save |
| Payroll recalculation | Fully replaces prior payslip_lines transactionally; disallowed once APPROVED |
| Finalized payroll modification attempt | Blocked at service layer + DB-level guard; must reverse via a new correcting payrun instead |

## Z. Deployment

| Layer | Approach |
|---|---|
| Frontend | Static build (`npm run build`) deployed to Vercel/Netlify |
| Backend | Node/Express deployed to Render/Railway (single Node process) |
| Database | Managed MySQL (PlanetScale / Railway MySQL / AWS RDS MySQL) |
| Env vars | `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_HOST/PORT/USER/PASS`, `CLIENT_URL` |
| Migrations | `npx prisma migrate deploy` run in CI/deploy step before server start |
| Production config | CORS restricted to `CLIENT_URL`, `helmet()` for secure headers, rate limiting on `/auth/*` |

No Docker is required; a Procfile/start script is sufficient for a hackathon deployment.

## AA. Developer Implementation Checklist

```
[ ] Project setup (client + server scaffolding, ESLint/Prettier)
[ ] MySQL database provisioned
[ ] Prisma schema authored + migrated
[ ] Seed script (sample data per Section T)
[ ] JWT authentication (login/refresh/me)
[ ] bcrypt password hashing
[ ] RBAC middleware + role matrix enforced
[ ] Employee CRUD + search/filter/sort
[ ] Department & Job Position CRUD
[ ] Contract CRUD + overlap validation + period resolver service
[ ] Working Schedule CRUD + auto weekly-hours calc
[ ] Attendance check-in/out + manual correction + edge cases
[ ] Leave types/allocations/requests + approval workflow
[ ] Salary Structures CRUD
[ ] Salary Rule Engine (FIXED/PERCENTAGE/FORMULA) + dependency validation
[ ] Rule Builder UI + Test Rule sandbox
[ ] Payrun wizard (2-step) + state machine (Draft→Paid)
[ ] Payroll calculation service (transactional)
[ ] Payroll validation warnings
[ ] Payslip generation + line items
[ ] Payslip PDF generation
[ ] Payslip email delivery (single + bulk)
[ ] Employee Portal (profile/attendance/leave/payslips, scoped)
[ ] HR Dashboard (Recharts)
[ ] Payroll Dashboard (Recharts)
[ ] Notifications (in-app + email triggers)
[ ] Audit logging across core entities
[ ] Zod validation on all mutating endpoints
[ ] Automated tests (≥20 cases from Section X)
[ ] Deployment (frontend, backend, managed MySQL)
[ ] Demo rehearsal (Section U scenario)
```
