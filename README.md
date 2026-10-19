# qa-portfolio-elysia

Personal portfolio website with REST API and admin CMS, serving as the System Under Test (SUT) for manual testing, API testing, and Selenium + Cucumber automation testing.

---

## Tech Stack
- **Runtime & Package Manager**: [Bun](https://bun.sh/) (v1.4+)
- **Backend Framework**: [ElysiaJS](https://elysiajs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: MySQL
- **Validation**: TypeBox (Elysia native)
- **API Documentation**: OpenAPI / Swagger (`@elysiajs/swagger`)
- **Authentication**: JWT (to be implemented in subsequent tasks)
- **Frontend**: HTML, Tailwind CSS, JavaScript (in `public/`)
- **Testing**: Bun Test, Postman, Selenium, Cucumber

---

## Project Structure
```text
qa-portfolio-elysia/
├── drizzle/                # Generated SQL migration files
├── public/                 # Static frontend assets (HTML, CSS, JS)
├── src/
│   ├── db/                 # Drizzle ORM database connection, schema, and migrations
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── routes/             # Elysia modular route handlers
│   │   └── health.ts
│   └── index.ts            # Elysia application entrypoint
├── tests/
│   ├── api/                # API tests (Bun Test / HTTP integration)
│   │   └── health.test.ts
│   └── e2e/                # Selenium & Cucumber E2E test suites
├── .env.example            # Environment template without credentials
├── .gitignore              # Ignored files (node_modules, .env, dist)
├── drizzle.config.ts       # Drizzle Kit configuration for MySQL
├── package.json            # Scripts and dependencies
├── tsconfig.json           # TypeScript configuration for Bun
└── README.md               # Documentation and execution instructions
```

---

## Prerequisites
1. **Bun**: Make sure Bun v1.4+ is installed. Check with:
   ```bash
   bun --version
   ```
2. **MySQL / MariaDB**: MySQL 8.0+ or MariaDB 10.4+ running locally (e.g. via XAMPP) or remotely.

---

## Setup & Getting Started

1. **Clone & Install Dependencies**:
   ```bash
   bun install
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Configure your environment variables in `.env` as needed:
   ```env
   NODE_ENV=development
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=qa_portfolio
   JWT_SECRET=your_jwt_secret_min_32_chars_placeholder

   # Seeding Configuration (Required before executing bun run db:seed)
   ADMIN_EMAIL=admin@qa-portfolio.local
   SEED_ADMIN_PASSWORD=your_strong_admin_password_here
   ```

3. **Database Migration & Seeding**:
   Apply SQL migrations and seed initial data:
   ```bash
   # Apply migrations to database
   bun run db:migrate

   # Seed initial data (requires SEED_ADMIN_PASSWORD in .env)
   bun run db:seed
   ```

4. **Run the Development Server**:
   ```bash
   bun run dev
   ```

5. **Verify Endpoints**:
   - Public Website: [http://localhost:3000/](http://localhost:3000/)
   - Admin Login Portal: [http://localhost:3000/login](http://localhost:3000/login)
   - Admin CMS Dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)
   - Health check: [http://localhost:3000/health](http://localhost:3000/health)
   - Swagger OpenAPI Docs: [http://localhost:3000/swagger](http://localhost:3000/swagger)

---

## Testing & Quality Assurance Suite

QA-PORTFOLIO features a multi-tiered Quality Assurance architecture designed for manual, automated API, and browser-driven end-to-end verification.

### 1. Unit, Integration & Security Tests (Bun Test)
To execute all 168 automated unit and API integration tests:
```bash
bun test
```
The test suite covers:
- System health checks and Swagger documentation.
- Database seeder idempotency and security isolation.
- Authentication endpoints, credential verification, and uniform error responses.
- Public API data endpoints (profile, skills, projects, experiences, contacts).
- Admin CRUD APIs with JWT Bearer validation and RBAC privilege checks.
- Admin dashboard summary statistics and status workflow transitions.
- Security & boundary tests: JWT signature tampering, token expiration, SQL injection safety, XSS escaping, and role privilege escalation protection (`tests/api/security-regression.test.ts`).

### 2. Browser End-to-End Automation (Selenium WebDriver + Cucumber)
The project includes automated browser testing using real **Google Chrome** (Headless) with **Selenium WebDriver 4** and **Cucumber 13**:
```bash
bun test:e2e
```
> [!NOTE]
> E2E tests run against a dedicated isolated test database (`qa_portfolio_e2e_test` by default) with automated migration, seeding, and cleanup. A strict fail-fast guard prevents any destructive operations on development databases (`qa_portfolio_dev`, `qa_playground_db`).
Gherkin feature scenarios (`tests/e2e/features/`):
- `auth.feature`:
  - Admin login with valid credentials (stores session token, redirects to `/admin`).
  - Admin login failure with invalid credentials (error banner displayed, no redirect).
  - Unauthenticated access guard (direct access to `/admin` redirects to `/login`).
- `projects.feature`:
  - Visitor filters projects by category pill.
  - Visitor opens project detail modal dialog.
  - Visitor searches projects dynamically via keyword search input.
  - Admin creates a new project via CMS modal form.
  - Admin deletes a project with explicit confirmation dialog.
- `contact.feature`:
  - Visitor submits valid contact inquiry.
  - Visitor submits message shorter than 10 characters (validation error).
  - Visitor submits invalid email format (validation error).
  - Admin filters received messages and updates inquiry status (`unread` -> `read`).

### 3. Postman API Collection
Importable Postman v2.1 collections are located in `postman/`:
- **Collection**: `postman/QA_Portfolio_API.postman_collection.json`
- **Environment**: `postman/QA_Portfolio_Dev.postman_environment.json`

**How to use with Postman**:
1. Import both the collection and environment files into Postman.
2. Select the `QA Portfolio Dev Environment`.
3. Set the `adminPassword` variable to your local development admin password (left as placeholder by default to prevent secret leakage).
4. Run the `Authentication > Login` request; a test script automatically captures the returned JWT token into the `{{adminToken}}` environment variable for subsequent protected admin requests.
5. Execute requests sequentially or via the Postman Collection Runner.

---

## Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `bun run dev` | `bun --watch src/index.ts` | Runs the server in watch/reload mode |
| `bun start` | `bun src/index.ts` | Starts the production server |
| `bun run build` | `bun build src/index.ts --outdir ./dist --target bun` | Bundles the application into `dist/` |
| `bun run typecheck` | `tsc --noEmit` | Runs TypeScript static type checking |
| `bun test` | `bun test` | Executes the 168-test unit & API test suite |
| `bun run test:e2e` | `bun tests/e2e/run-e2e.ts tests/e2e/features/**/*.feature` | Runs real browser Selenium + Cucumber automation |
| `bun run db:generate` | `drizzle-kit generate` | Generates SQL migrations from schema |
| `bun run db:migrate` | `bun src/db/migrate.ts` | Applies SQL migrations to the database |
| `bun run db:seed` | `bun src/db/seed.ts` | Seeds initial data (admin, projects, experiences) |

---

## Status & Scope
- **Task 1 (Completed)**: Project initialization, folder layout, Elysia server, Swagger, health endpoint, environment configuration, typecheck, and test integration.
- **Task 2 (Completed)**: Drizzle ORM schema for MySQL/MariaDB (`users`, `projects`, `experiences`, `contacts`), migration execution via Drizzle migrator.
- **Task 3 (Completed)**: Safe, idempotent seed execution with environment guards.
- **Task 4 (Completed)**: Authentication API with JWT (`POST /api/auth/login`), secure password verification, and uniform error rejection.
- **Task 5 (Completed)**: Public Portfolio REST API (`/api/profile`, `/api/skills`, `/api/projects`, `/api/experiences`, `/api/contacts`).
- **Task 6 (Completed)**: Admin CRUD APIs with JWT authentication and role-based access control.
- **Task 7 (Completed)**: Public Portfolio responsive website (`public/index.html`, `/css/style.css`, `/js/app.js`).
- **Task 8 (Completed)**: Admin Dashboard & Authentication Portal (`/login`, `/admin`, `public/css/admin.css`, `public/js/admin.js`) with stats aggregation, projects CRUD, experiences CRUD, contact messages management, status filters, and security controls.
- **Task 9 (Completed)**: Comprehensive QA, API Regression & Security Testing (15 security test cases, 168 pass), Postman Collection & Environment setup, real browser Selenium WebDriver + Cucumber automation (11 Gherkin scenarios, 110 steps pass in Headless Google Chrome), bug defect audit and resolution, and final production validation (`bun test`, `bun run typecheck`, `bun run build`).
