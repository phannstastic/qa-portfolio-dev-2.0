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
    title: 'Pondok Makan Kang Naryo – Web Development & Katalon UI Testing',
    slug: 'pondok-makan-kang-naryo',
    description:
      'Web application and automated UI testing suite for a food ordering platform. Developed backend business logic and RESTful services with Laravel & MySQL, and engineered end-to-end automated UI test cases for user authentication, checkout workflows, and admin menu management using Katalon Studio. Documented comprehensive test cases and defect tracking in Test Case Pondok Makan.',
    category: 'Automation Testing',
    techStack: 'Katalon Studio, Laravel, PHP, MySQL, Automated UI Testing, Manual Testing, Defect Tracking',
    githubUrl: 'https://github.com/phannstastic/pondok-makan-kang-naryo-ui-testing.git',
    liveDemoUrl: 'https://github.com/phannstastic/Pondok-Makan-Kang-Naryo.git',
    imageUrl: '/images/projects/kang-naryo-katalon.svg',
    isFeatured: true,
    sortOrder: 1,
  },
  {
    title: 'XYZ Bank – Cypress E2E Automation Framework',
    slug: 'xyz-bank-cypress-test',
    description:
      'End-to-End automated testing framework for XYZ Bank web application utilizing Cypress with Page Object Model (POM) architecture. Automated 14 comprehensive test scenarios covering Manager workflows (TC-01-MAN to TC-06-MAN: manager login, valid/invalid customer addition, currency account opening, customer deletion) and Customer workflows (TC-01-CUS to TC-08-CUS: customer login, account deposits, balance validation, insufficient fund withdrawals, transaction history verification, and session logout).',
    category: 'Automation Testing',
    techStack: 'Cypress, JavaScript, Page Object Model (POM), E2E Testing, Mocha, Chai, Test Automation',
    githubUrl: 'https://github.com/phannstastic/xyz-Bank-Cypress-Test.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/xyz-bank-cypress.svg',
    isFeatured: true,
    sortOrder: 2,
  },
  {
    title: 'Swagger Petstore V2 – REST API Automation with Postman',
    slug: 'petstore-v2-swagger-api-testing',
    description:
      'Comprehensive REST API testing suite for the public Swagger Petstore v2 (/pet) service. Formulated automated assertions validating HTTP response status codes (200, 400, 404), response payloads, JSON schemas, and negative boundary scenarios for findByStatus, pet retrieval by ID, pet creation, updates, and deletion. Automated batch execution via Postman Collection Runner and documented defects including weak API input validation behavior.',
    category: 'API Testing',
    techStack: 'Postman, Collection Runner, REST API, JSON Schema Validation, API Automation, Regression Testing',
    githubUrl: 'https://github.com/phannstastic/Petstore-Swagger-V2.git',
    liveDemoUrl: 'https://github.com/phannstastic/Petstore-Swagger-V2-Part-2.git',
    imageUrl: '/images/projects/petstore-test-result.png',
    isFeatured: true,
    sortOrder: 3,
  },
  {
    title: 'OrangeHRM – UI Test Automation with Katalon Studio',
    slug: 'orangehrm-katalon-automation',
    description:
      'Automated UI regression suite for OrangeHRM authentication module using Katalon Studio and Katalon Recorder. Implemented test cases verifying valid credential authorization, invalid username/password combinations, empty input validations, dynamic web locators, and error banner assertions. Documented defect lifecycle and test execution matrices.',
    category: 'Automation Testing',
    techStack: 'Katalon Studio, Katalon Recorder, Web UI Testing, Test Automation, Regression Testing, Defect Lifecycle',
    githubUrl: 'https://github.com/phannstastic/OrangeHRM-Login.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/orangehrm-katalon.svg',
    isFeatured: true,
    sortOrder: 4,
  },
  {
    title: 'Loafy Bakery – E-Commerce System & Manual QA Testing',
    slug: 'loafy-bakery-manual-testing',
    description:
      'Web-based bakery ordering platform featuring custom backend order processing, catalog browsing, shopping cart workflows, and MySQL relational database. Executed rigorous manual exploratory and functional testing across user checkout flows, inventory tracking, role-based admin order updates, and edge-case form validation. Documented test scenarios, edge cases, and defect reports.',
    category: 'Manual Testing',
    techStack: 'PHP, MySQL, Manual Testing, Exploratory Testing, Functional Testing, Test Scenarios, Defect Reporting',
    githubUrl: 'https://github.com/phannstastic/Loafy-Bakery.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/loafy-bakery.svg',
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
      'Participated in Vortex Career Catalyst Batch 4 (SK: 032/SK/VRT/V/2026). Analyzed functional requirement specifications to craft comprehensive test cases and user scenarios. Performed manual functional testing across core user flows, logged and tracked defects, conducted regression testing after bug fixes, and evaluated UI/UX responsiveness and baseline performance.',
    sortOrder: 2,
    certificateUrl: '/docs/certificates/sertifikat-magang-vortex-buana-edumedia.pdf',
    certificateType: 'pdf',
    certificateName: 'Sertifikat Magang QA & SK (Batch 4) - PT Vortex Buana Edumedia',
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
    certificateUrl: '/docs/certificates/sertifikat-magang-len-industri.pdf',
    certificateType: 'pdf',
    certificateName: 'Sertifikat SQA OJT Grade A (91.67) - PT Len Industri (Persero)',
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
