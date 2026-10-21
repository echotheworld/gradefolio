# GradeView (v1.1)
> **Your grades, clearly presented.**  
> *A privacy-first grade publishing portal for Super Admins, Professors, and Students.*

---

## 🌟 Product Vision

GradeView turns the spreadsheets professors already use into a polished, secure, and easy-to-understand grade portal. Professors continue calculating marks in Excel or CSV, then import, review, and intentionally publish the records students are authorized to see.

### Core Experience Principles
- **Privacy First:** Section Codes identify a course section; they never unlock private records without individual credentials. No leaderboards, public rankings, or score comparisons.
- **Spreadsheet-Native:** Full `.xlsx` and `.csv` import and export workflows without executing risky macros.
- **Intentional Publishing:** Uploaded spreadsheet data is always saved as a **Draft** until the professor verifies and publishes it.
- **Role-Specific UX:** Super Admin, Professor, and Student workspaces are strictly segregated with server-side authorization on every endpoint.

---

## 🚀 Quick Start

### 1. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Pre-Configured Test Accounts & Demo Switcher

The application features an **"Instant Role Switcher"** dropdown in the top-right header, allowing you to switch between roles with a single click. You can also sign in manually using the credentials below:

### 1. Super Admin Workspace
- **URL:** `/auth/login` &rarr; `/admin`
- **Email:** `admin@gradeview.edu`
- **Password:** `AdminPass123!`
- **Capabilities:** Provision & suspend faculty accounts, global section oversight, system configuration, append-only audit trail.

### 2. Professor Workspace
- **URL:** `/auth/login` &rarr; `/professor`
- **Email:** `prof.reyes@gradeview.edu` (Computer Science Department)
- **Password:** `ProfessorPass123!`
- **Capabilities:** Create sections, 6-step Excel/CSV import wizard, spreadsheet-like gradebook, student credential generation, one-time CSV export, publish/unpublish workflow.
- *Alternative Professor:* `prof.santos@gradeview.edu` / `ProfessorPass123!` (Mathematics Department)

### 3. Student Portal (Zero Registration Required)
- **URL:** `/` &rarr; Enter Section Code &rarr; `View My Grades`
- **Section Code:** `CS101-2026A`
- **Student ID:** `2024-00101`
- **Access Password:** `GV-2024-PASS1`
- *Other student accounts enrolled in CS101:*
  - `2024-00102` / `GV-2024-PASS2` (Maria Clara Santos)
  - `2024-00103` / `GV-2024-PASS3` (Crisostomo Ibarra)
  - `2024-00104` / `GV-2024-PASS4` (Basilio Rizal - Provisional)

---

## 📊 Testing the 6-Step Excel/CSV Import Wizard

Sample spreadsheets are bundled in `public/samples/` and can be loaded directly from the wizard interface:

1. Sign in as **Prof. Alan Reyes**.
2. Open section **CS101-A** (or create a new section) and click **"Import Sheet"** (`/professor/sections/[id]/import`).
3. In **Step 1 (Upload)**, you can upload your own file or click:
   - **"Load Clean Gradebook"** (`sample_cs101_gradebook.xlsx`) to test a perfect import with 8 students.
   - **"Load Gradebook with Errors"** (`sample_with_validation_errors.xlsx`) to test the validation engine detecting duplicate IDs, missing numbers, and score limits!
4. **Step 2 (Select Sheet & Header):** Preview the first 10 rows and click any row to set it as the header row.
5. **Step 3 (Map Columns):** Smart auto-detection maps Student ID, Student Name, Assessment items, and Final Grade.
6. **Step 4 (Validate):** Detects errors/warnings and lets you download a Validation Report CSV.
7. **Step 5 (Review Changes):** Inspect diff summary before saving.
8. **Step 6 (Save as Draft):** Confirms draft creation and provides direct navigation back to the section gradebook.

---

## 🔒 Security Architecture Highlights

| Mechanism | Implementation |
|---|---|
| **Server-Side Authorization** | Every single API endpoint checks session role and section ownership. |
| **Cross-Professor Isolation** | Professors can only view and mutate sections where `ownerProfessorId === session.id`. |
| **Student Privacy** | Zero data leakage: Student endpoints query ONLY the authenticated student's row. Classmates are never loaded into the client bundle. |
| **Credential Cryptography** | High-entropy random passwords are stored as salted bcrypt hashes in the database. Plain-text passwords are never stored. |
| **Brute-Force Rate Limiting** | Student authentication endpoint enforces automatic lockout after 5 consecutive failed attempts per section & student ID. |
| **Append-Only Audit Log** | All publications, unpublications, credential generations, and administrative actions are permanently logged in `AuditLog`. |

---

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router, React 19, Server Components & Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Lucide Icons (Warm neutral background, deep navy/indigo, restrained teal accent)
- **Database & ORM:** Prisma ORM with SQLite (`dev.db`, zero-configuration local database)
- **Spreadsheet Processing:** `xlsx` (SheetJS) for `.xlsx` and `.csv` parsing
- **Authentication:** Salted bcrypt hashing + signed JSON Web Tokens (JWT) in secure HTTP-only cookies
