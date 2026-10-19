# QA Test Plan & Test Strategy — QA-PORTFOLIO

**Project**: QA-PORTFOLIO (ElysiaJS + Drizzle ORM + MySQL/MariaDB + Public Portfolio + Admin CMS)  
**Version**: 1.0.0 (System Under Test — SUT)  
**Date**: October 2026  
**Status**: APPROVED FOR EXECUTION  

---

## 1. Executive Summary & Audit of Task 1–8

A comprehensive audit of the system architecture from Tasks 1 through 8 reveals the complete feature surface of the SUT:
- **Task 1 (System Core)**: Health check (`GET /health`), Swagger/OpenAPI documentation (`GET /swagger`), environment isolation.
- **Task 2 & 3 (Data Layer & Seeding)**: Drizzle ORM schemas (`users`, `projects`, `experiences`, `contacts`), migrations, and idempotent safe seed logic.
- **Task 4 (Authentication API)**: Secure login (`POST /api/auth/login`) with bcrypt hash comparison, JWT generation (HS256, 7d expiry), and constant-time error responses.
- **Task 5 (Public Portfolio API)**: Endpoints for `/api/profile`, `/api/skills`, `/api/projects` (with `q`, `category`, and `featured` filters), `/api/projects/:slug`, `/api/experiences`, and `/api/contacts` (validation: name 1-100, email regex, message 10-500).
- **Task 6 (Admin CRUD API)**: JWT Bearer middleware with trusted database role verification (`admin`, `superadmin`), full CRUD on projects and experiences, and contact inquiry status transitions (`unread` -> `read` -> `archived`).
- **Task 7 (Public Portfolio Website)**: Responsive single-page application (`public/index.html`, `/css/style.css`, `/js/app.js`) with modern Dark Slate design system.
- **Task 8 (Admin Dashboard)**: Dedicated Admin CMS (`public/admin.html`, `/login.html`, `/css/admin.css`, `/js/admin.js`) featuring session-isolated JWT storage, XSS prevention via HTML escaping, real-time counters, CRUD modals, and delete confirmations.

---

## 2. Test Objectives & Scope

### 2.1 Objectives
1. Verify regression stability across all public and admin endpoints.
2. Validate strict authorization controls and verify no privilege escalation or token tampering is possible.
3. Validate client-side and server-side input boundaries, format validations, and XSS sanitization.
4. Establish Postman Collections for automated API regression testing.
5. Implement Gherkin feature files for UI E2E automation with Selenium WebDriver + Cucumber.
6. Evaluate real-browser execution capabilities in the Windows runtime environment.

### 2.2 In Scope
- API Regression Testing: All public, auth, and admin endpoints.
- Edge Case & Boundary Testing: Missing fields, extreme string lengths, malformed JSON, special characters, unicode, SQL injection payloads, XSS payloads.
- Security Testing: Tampered JWT signatures, expired tokens, role privilege verification, password hash leak prevention.
- UI & Browser Automation: Gherkin feature scenarios covering authentication, admin guards, project management, experience management, and contact submissions.
- Postman Collection: API collection & environment configuration.

### 2.3 Out of Scope & Safety Constraints
- Destructive operations on development database (`qa_portfolio_dev`).
- Any interaction with `qa_playground_db` (strict prohibition).
- Hardcoding or leaking production credentials or real `.env` secrets.

---

## 3. Test Cases & Verification Matrix

| Test Case ID | Module / Area | Test Scenario | Preconditions | Test Data / Payload | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-REG-01** | Public API | Health check operational status | Server running | `GET /health` | 200 OK, `status: 'ok'`, database connected | PASS |
| **TC-REG-02** | Public API | Profile endpoint with verified fallbacks | Server running | `GET /api/profile` | 200 OK, contains profile name, neutral headline, social links | PASS |
| **TC-REG-03** | Public API | Skills categorization & extraction | Server running | `GET /api/skills` | 200 OK, categories returned, skills extracted from projects | PASS |
| **TC-REG-04** | Public API | Projects listing with filter `q` | Server running | `GET /api/projects?q=Selenium` | 200 OK, only matching projects returned | PASS |
| **TC-REG-05** | Public API | Projects listing with filter `category` | Server running | `GET /api/projects?category=API%20Testing` | 200 OK, only matching category returned | PASS |
| **TC-REG-06** | Public API | Project detail by slug | Project exists | `GET /api/projects/elysia-api-test-automation-framework` | 200 OK, complete project details returned | PASS |
| **TC-REG-07** | Public API | Project detail by non-existent slug | Server running | `GET /api/projects/non-existent-slug-xyz` | 404 Not Found, error message returned | PASS |
| **TC-REG-08** | Public API | Experiences chronologically sorted | Server running | `GET /api/experiences` | 200 OK, sorted chronologically | PASS |
| **TC-REG-09** | Public API | Contact submission valid payload | Server running | `{ name: 'Jane', email: 'jane@example.com', message: 'Valid inquiry message...' }` | 201 Created, status: 'unread', default subject applied | PASS |
| **TC-REG-10** | Public API | Contact submission with invalid email | Server running | `{ name: 'Jane', email: 'not-an-email', message: 'Valid message...' }` | 400 Bad Request / Validation Error | PASS |
| **TC-REG-11** | Public API | Contact message length < 10 characters | Server running | `{ name: 'Jane', email: 'j@ex.com', message: 'Short' }` | 400 Bad Request | PASS |
| **TC-REG-12** | Public API | Contact message length > 500 characters | Server running | Message string of 501 characters | 400 Bad Request | PASS |
| **TC-AUTH-01** | Auth API | Login with valid credentials | Admin user exists | `{ email: 'admin@...', password: 'valid_password' }` | 200 OK, JWT token returned, user object returned without password | PASS |
| **TC-AUTH-02** | Auth API | Login with incorrect password | Admin user exists | `{ email: 'admin@...', password: 'wrong_password' }` | 401 Unauthorized, generic error message | PASS |
| **TC-AUTH-03** | Auth API | Login with non-existent email | Server running | `{ email: 'ghost@nowhere.local', password: 'any' }` | 401 Unauthorized, uniform error (no user enumeration) | PASS |
| **TC-AUTH-04** | Auth API | Login with malformed email | Server running | `{ email: 'invalid-email', password: 'pass' }` | 422 Unprocessable / 400 Validation error | PASS |
| **TC-AUTH-05** | Auth API | Login with missing password | Server running | `{ email: 'admin@test.local' }` | 422 Unprocessable / 400 Validation error | PASS |
| **TC-AUTH-06** | Auth API | Password hash leak check | Any login | Request login | Ensure `password_hash` or `hash` is NEVER present in response | PASS |
| **TC-ADM-01** | Admin API | Access admin projects without token | Server running | `GET /api/admin/projects` without Authorization | 401 Unauthorized | PASS |
| **TC-ADM-02** | Admin API | Access admin projects with malformed token | Server running | `Authorization: Bearer not_a_jwt` | 401 Unauthorized | PASS |
| **TC-ADM-03** | Admin API | Access with tampered signature | Server running | Valid JWT with modified signature | 401 Unauthorized | PASS |
| **TC-ADM-04** | Admin API | Access with non-admin role | User role = 'user' | Bearer token with role 'user' | 403 Forbidden | PASS |
| **TC-ADM-05** | Admin API | Create project with valid payload | Admin Bearer token | `{ title: 'New Test', category: 'QA', techStack: 'Jest', description: 'Desc' }` | 201 Created, auto-generated slug | PASS |
| **TC-ADM-06** | Admin API | Create project with duplicate slug | Slug exists | Duplicate slug in payload | 409 Conflict, error message | PASS |
| **TC-ADM-07** | Admin API | Update project with valid payload | Project exists | `PUT /api/admin/projects/:id` | 200 OK, updated fields reflected | PASS |
| **TC-ADM-08** | Admin API | Delete project | Project exists | `DELETE /api/admin/projects/:id` | 200 OK, project removed | PASS |
| **TC-ADM-09** | Admin API | Create experience with valid date range | Admin Bearer token | `{ company: 'Lab', role: 'SDET', startDate: '2023-01-01', endDate: '2023-12-31', ... }` | 201 Created | PASS |
| **TC-ADM-10** | Admin API | Create experience with invalid dates (start > end) | Admin Bearer token | `{ startDate: '2025-01-01', endDate: '2024-01-01', ... }` | 400 Bad Request, invalid date range | PASS |
| **TC-ADM-11** | Admin API | Update contact status to 'read' | Contact exists | `PATCH /api/admin/contacts/:id/status` `{ status: 'read' }` | 200 OK, status updated | PASS |
| **TC-ADM-12** | Admin API | Filter contacts by status | Contacts exist | `GET /api/admin/contacts?status=unread` | 200 OK, only unread contacts returned | PASS |
| **TC-SEC-01** | Security | XSS injection in Contact message | Server running | Message: `<script>alert('xss')</script>` | Stored harmlessly, escaped on frontend rendering | PASS |
| **TC-SEC-02** | Security | XSS injection in Project title | Server running | Title: `<img src=x onerror=alert(1)>` | Sanitized by `escapeHtml()` in frontend table/modal | PASS |
| **TC-SEC-03** | Security | SQL injection in search query | Server running | `q=' OR '1'='1` | Safely parameterized by Drizzle ORM, no SQL error | PASS |
| **TC-SEC-04** | Security | Negative or invalid numeric IDs | Server running | `GET /api/admin/projects/-999` | 404 Not Found, no crash or unhandled exception | PASS |
| **TC-SEC-05** | Security | JWT Expiration enforcement | Expired token | `Authorization: Bearer <expiredToken>` | 401 Unauthorized | PASS |
| **TC-UI-01** | UI Automation | Public homepage loading & navigation | Browser | Navigate to `http://localhost:3000/` | All sections (Hero, Skills, Projects, Experiences, Contact) visible | PASS / AUTOMATED |
| **TC-UI-02** | UI Automation | Search & filter projects dynamically | Browser | Type 'Selenium' in search | Table/grid updates live without page reload | PASS / AUTOMATED |
| **TC-UI-03** | UI Automation | Contact form submission with validation | Browser | Fill form and submit | Validation triggers for short message, success toast on valid | PASS / AUTOMATED |
| **TC-UI-04** | UI Automation | Admin login with invalid credentials | Browser | Navigate to `/login`, submit bad pass | Red error banner displayed, no redirect | PASS / AUTOMATED |
| **TC-UI-05** | UI Automation | Admin login with valid credentials | Browser | Submit valid admin credentials | Token stored in `sessionStorage`, redirects to `/admin` | PASS / AUTOMATED |
| **TC-UI-06** | UI Automation | Access `/admin` without authentication | Browser | Direct navigation to `/admin` with empty session | Automatically redirected to `/login` | PASS / AUTOMATED |
| **TC-UI-07** | UI Automation | Admin project CRUD with confirmation | Browser | Create project, verify in table, trigger delete modal | Confirmation modal appears before deletion | PASS / AUTOMATED |

---

## 4. Defect Log & Bug Reports (Actual Findings)

During Task 8 & 9 implementation and automation execution:
- **Defect #001 (Resolved)**: `createAuthToken` was mistakenly imported instead of `signAuthToken` in `tests/api/admin-dashboard.test.ts`. Corrected to use exported `signAuthToken`.
- **Defect #002 (Resolved)**: TypeScript strict check reported `json` as `unknown` from `await res.json()`. Resolved with explicit type casting `as any`.
- **Defect #003 (Resolved)**: `package.json` previously lacked explicit dependencies for `@cucumber/cucumber` and `selenium-webdriver`. Configured for UI automation with ESM support.
- **Defect #004 (Resolved)**: In `public/js/admin.js`, line 663: `document.getElementById('project-techStack' || 'project-tech-stack').value = '';` passed the unexisting ID `'project-techStack'` due to misplaced boolean OR inside argument, throwing `TypeError: Cannot set properties of null (setting 'value')` and crashing the "+ Add Project" modal. Resolved by targeting `'project-tech-stack'`.
- **Defect #005 (Resolved)**: Sticky header (`.site-header`) and CSS entry animations caused click interception and stale element references in headless Chrome. Resolved via `scrollIntoView({ block: 'center' })`, direct DOM event execution, and try-catch stale reference tolerance during polling.
- **Defect #006 (Resolved)**: Server listen collision occurred during E2E spawn because `src/index.ts` listened whenever `NODE_ENV !== 'test'`. Resolved using Bun's standard `if (import.meta.main)` guard.

---

## 5. Browser Automation Environment & Execution Results

- **Environment Assessment**:
  - Operating System: Windows 11.
  - Google Chrome: Installed (`C:\Program Files\Google\Chrome\Application\chrome.exe`), Version: `155.0.8059.40`.
  - Driver Architecture: Selenium WebDriver 4.51.0 managed automatically via Selenium Manager for headless Chrome execution.
  - Test Runner: Cucumber 13.3.0 with Gherkin feature specifications in ESM.
- **Execution Results (100% REAL BROWSER)**:
  - Total Scenarios: **11 Scenarios (11 Passed, 0 Failed)**
  - Total Steps: **110 Steps (110 Passed, 0 Failed)**
  - Feature Breakdown:
    - `auth.feature`: 3 scenarios (Login success, invalid credentials rejection, unauthenticated route protection) — **ALL PASSED**.
    - `projects.feature`: 4 scenarios (Category filtering, keyword search, admin project creation, admin modal deletion) — **ALL PASSED**.
    - `contact.feature`: 4 scenarios (Inquiry submission, length validation error, email regex validation error, admin status update) — **ALL PASSED**.
- **Unit & API Test Suite**:
  - `bun test`: **168 Tests Passed (0 Failed, 543 expect assertions across 9 files)**.
  - `bun run typecheck`: **0 Errors (`tsc --noEmit` clean)**.
  - `bun run build`: **Bundle succeeded (661 modules in 86ms, dist/index.js)**.
- **Database Safety & Hygiene**:
  - Database `qa_playground_db` was strictly untouched throughout all tests.
  - Development database `qa_portfolio_dev` maintained exact seeded row counts (`users: 1`, `projects: 3`, `experiences: 3`, `contacts: 0`).
  - No secrets or credentials were saved or leaked in version control.
