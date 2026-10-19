import { createDbConnection, closeDbConnection, users, projects, experiences } from './index';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

export interface SeedResult {
  targetDatabase: string;
  adminSeeded: boolean;
  adminSkipped: boolean;
  projectsSeeded: number;
  projectsSkipped: number;
  experiencesSeeded: number;
  experiencesSkipped: number;
}

export const initialProjects = [
  {
    title: 'Pondok Makan Kang Naryo – Functional QA & Katalon UI Testing',
    slug: 'pondok-makan-kang-naryo',
    description:
      'Web application and QA testing suite for a food ordering platform. Designed comprehensive manual test scenarios and functional test cases for user authentication, checkout workflows, and admin menu management, complemented by foundational automated UI regression scripts using Katalon Studio and structured defect tracking.',
    category: 'Manual & UI Testing',
    techStack: 'Manual Testing, Test Case Design, Defect Tracking, Katalon Studio (Basic), Laravel, MySQL',
    githubUrl: 'https://github.com/phannstastic/pondok-makan-kang-naryo-ui-testing.git',
    liveDemoUrl: 'https://github.com/phannstastic/Pondok-Makan-Kang-Naryo.git',
    imageUrl: '/images/projects/kang-naryo-katalon.svg',
    isFeatured: true,
    sortOrder: 1,
  },
  {
    title: 'Loafy Bakery – E-Commerce System & Manual QA Testing',
    slug: 'loafy-bakery-manual-testing',
    description:
      'Web-based bakery ordering platform featuring custom backend order processing, catalog browsing, shopping cart workflows, and MySQL relational database. Executed rigorous manual exploratory and functional testing across user checkout flows, inventory tracking, role-based admin order updates, and edge-case form validation. Documented test scenarios, edge cases, and defect reports.',
    category: 'Manual Testing',
    techStack: 'Manual Testing, Exploratory Testing, Functional Testing, Test Scenarios, Defect Reporting, PHP, MySQL',
    githubUrl: 'https://github.com/phannstastic/Loafy-Bakery.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/loafy-bakery.svg',
    isFeatured: true,
    sortOrder: 2,
  },
  {
    title: 'Swagger Petstore V2 – REST API Testing with Postman',
    slug: 'petstore-v2-swagger-api-testing',
    description:
      'Comprehensive REST API testing suite for the public Swagger Petstore v2 (/pet) service. Formulated positive and negative test cases validating HTTP response status codes (200, 400, 404), response payloads, JSON schemas, and boundary scenarios for pet CRUD endpoints using Postman Collection Runner and documented API validation defects.',
    category: 'API Testing',
    techStack: 'Postman, REST API Testing, Negative & Boundary Testing, JSON Schema Validation, Collection Runner',
    githubUrl: 'https://github.com/phannstastic/Petstore-Swagger-V2.git',
    liveDemoUrl: 'https://github.com/phannstastic/Petstore-Swagger-V2-Part-2.git',
    imageUrl: '/images/projects/petstore-test-result.png',
    isFeatured: true,
    sortOrder: 3,
  },
  {
    title: 'OrangeHRM – Authentication Test Scenarios & Katalon Studio',
    slug: 'orangehrm-katalon-automation',
    description:
      'Functional regression suite for OrangeHRM authentication module. Designed positive and negative test cases verifying valid credential authorization, invalid username/password combinations, empty input validations, and error banner assertions, executed via manual test matrices and basic Katalon Studio playback.',
    category: 'Functional & UI Testing',
    techStack: 'Functional Testing, Negative Testing, Defect Lifecycle, Katalon Studio (Basic), Katalon Recorder',
    githubUrl: 'https://github.com/phannstastic/OrangeHRM-Login.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/orangehrm-katalon.svg',
    isFeatured: true,
    sortOrder: 4,
  },
  {
    title: 'XYZ Bank – E2E Test Scenarios & Foundational Cypress Suite',
    slug: 'xyz-bank-cypress-test',
    description:
      'End-to-End test suite for XYZ Bank web application covering 14 structured test scenarios across Manager workflows (TC-01-MAN to TC-06-MAN: login, valid/invalid customer creation, account opening, deletion) and Customer workflows (TC-01-CUS to TC-08-CUS: login, deposits, balance validation, insufficient funds, and transaction history) explored with Cypress.',
    category: 'E2E & Scenario Testing',
    techStack: 'Test Scenario Design, E2E Testing, Boundary Value Testing, Cypress (Basic), JavaScript',
    githubUrl: 'https://github.com/phannstastic/xyz-Bank-Cypress-Test.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/xyz-bank-cypress.svg',
    isFeatured: false,
    sortOrder: 5,
  },
];

export const initialExperiences = [
  {
    company: 'Noctura Kreasi Sistema',
    role: 'QA / UAT Support (On-Call) Freelance',
    location: 'Remote, Indonesia',
    startDate: '2026-08-01',
    endDate: null,
    isCurrent: true,
    description:
      'Provide on-call User Acceptance Testing (UAT) and QA support. Investigate, reproduce, and document user-reported bugs with detailed steps to reproduce, console logs, and visual evidence. Execute exploratory and regression testing across web features, formulate actionable Jira/issue tickets, and collaborate closely with developers to verify fixes before deployment.',
    sortOrder: 1,
    certificateUrl: null,
    certificateType: null,
    certificateName: null,
  },
  {
    company: 'PT Vortex Buana Edumedia',
    role: 'Quality Assurance Internship',
    location: 'Yogyakarta, Indonesia',
    startDate: '2026-02-28',
    endDate: '2026-05-29',
    isCurrent: false,
    description:
      'Participated in Vortex Career Catalyst Batch 4. Analyzed functional requirement specifications to craft comprehensive test cases and user scenarios. Performed manual functional testing across core user flows, logged and tracked defects, conducted regression testing after bug fixes, and evaluated UI/UX responsiveness and baseline performance.',
    sortOrder: 2,
    certificateUrl: null,
    certificateType: null,
    certificateName: null,
  },
  {
    company: 'PT Len Industri (Persero)',
    role: 'Software Quality Assurance Internship (OJT)',
    location: 'Bandung, West Java, Indonesia',
    startDate: '2025-09-01',
    endDate: '2026-01-02',
    isCurrent: false,
    description:
      'Completed Software Quality Assurance On The Job Training under System Engineering mentor Aria Rahman (Certificate: P43725/LEN/OJT/UH-3/I/2026, Final Score: 91.67 / Grade A - Sangat Baik). Designed structured test scenarios, executed functional & manual regression testing, documented defects, and actively supported Factory Acceptance Testing (FAT) procedures.',
    sortOrder: 3,
    certificateUrl: null,
    certificateType: null,
    certificateName: null,
  },
];

/**
 * Pure validation helper: validates environment parameters before executing seed.
 */
export function validateSeedEnvironment(env: Record<string, string | undefined> = process.env): {
  adminPassword: string;
  adminEmail: string;
  expectedDb: string;
} {
  const adminPassword = env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.trim() === '') {
    throw new Error(
      'SEED_ADMIN_PASSWORD environment variable is required but missing or empty. Please provide SEED_ADMIN_PASSWORD in your environment before running seed.'
    );
  }

  const expectedDb = env.DB_NAME || 'qa_portfolio_dev';
  if (expectedDb === 'qa_playground_db') {
    throw new Error(
      'Security violation: Refusing to run seed on protected playground database "qa_playground_db".'
    );
  }

  const adminEmail = env.ADMIN_EMAIL || 'admin@qa-portfolio.local';

  return { adminPassword, adminEmail, expectedDb };
}

/**
 * Idempotent seed script:
 * - Checks existing records before inserting to prevent duplicate entries.
 * - Uses Bun.password.hash for secure bcrypt password hashing (cost 10).
 * - Seeds default admin only if no user with specified admin email exists.
 * - Enforces SEED_ADMIN_PASSWORD from environment.
 * - Verifies connected database session and strictly prohibits qa_playground_db.
 */
export async function runSeed(customDb?: any): Promise<SeedResult> {
  console.log('========================================================');
  console.log('🌱 Starting Safe Database Seeder');
  console.log('========================================================');

  const { adminPassword, adminEmail, expectedDb } = validateSeedEnvironment();
  const db = customDb || createDbConnection();
  const client = (db as any).$client;

  let actualDb = expectedDb;
  if (client?.query) {
    const [[row]] = await client.query('SELECT DATABASE() AS currentDb;');
    actualDb = row?.currentDb;
    console.log(`Connected Database: [${actualDb}]`);

    if (actualDb === 'qa_playground_db') {
      throw new Error(
        'Security violation: Connected session is "qa_playground_db". Seeding is strictly prohibited on this database.'
      );
    }

    if (actualDb !== expectedDb) {
      throw new Error(
        `Database connection mismatch! Target is "${expectedDb}", but connected session is "${actualDb}". Halting immediately.`
      );
    }
  }

  const result: SeedResult = {
    targetDatabase: actualDb,
    adminSeeded: false,
    adminSkipped: false,
    projectsSeeded: 0,
    projectsSkipped: 0,
    experiencesSeeded: 0,
    experiencesSkipped: 0,
  };

  try {
    // 1. Seed Admin User
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length === 0) {
      const passwordHash = await Bun.password.hash(adminPassword, {
        algorithm: 'bcrypt',
        cost: 10,
      });

      await db.insert(users).values({
        name: 'Muhammad Irfan Trinugroho',
        email: adminEmail,
        passwordHash,
        role: 'superadmin',
      });
      result.adminSeeded = true;
      console.log(`✅ Admin user seeded (${adminEmail})`);
    } else {
      result.adminSkipped = true;
      console.log(`ℹ️ Admin user already exists (${adminEmail}), skipping.`);
    }

    // 2. Seed Portfolio Projects
    for (const proj of initialProjects) {
      const existing = await db
        .select()
        .from(projects)
        .where(eq(projects.slug, proj.slug))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(projects).values(proj);
        result.projectsSeeded++;
        console.log(`✅ Seeded project: ${proj.title}`);
      } else {
        result.projectsSkipped++;
        console.log(`ℹ️ Project already exists (${proj.slug}), skipping.`);
      }
    }

    // 3. Seed Experiences
    for (const exp of initialExperiences) {
      const existing = await db
        .select()
        .from(experiences)
        .where(and(eq(experiences.company, exp.company), eq(experiences.role, exp.role)))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(experiences).values(exp);
        result.experiencesSeeded++;
        console.log(`✅ Seeded experience: ${exp.role} at ${exp.company}`);
      } else {
        result.experiencesSkipped++;
        console.log(`ℹ️ Experience at ${exp.company} (${exp.role}) already exists, skipping.`);
      }
    }

    console.log('========================================================');
    console.log('🎉 Seeding completed successfully!');
    console.log(
      `Summary: Admin: ${result.adminSeeded ? 'Seeded' : 'Skipped'}, Projects: ${result.projectsSeeded} new (${result.projectsSkipped} skipped), Experiences: ${result.experiencesSeeded} new (${result.experiencesSkipped} skipped)`
    );
    console.log('========================================================');

    return result;
  } finally {
    if (!customDb) {
      await closeDbConnection();
    }
  }
}

if (import.meta.main) {
  runSeed().catch((err) => {
    console.error('❌ Seeding failed:', err.message || err);
    process.exit(1);
  });
}
