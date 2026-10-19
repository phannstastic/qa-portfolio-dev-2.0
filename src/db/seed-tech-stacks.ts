import { createDbConnection, closeDbConnection, techStacks } from './index';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

export const initialTechStacks = [
  // 1. QA & Testing Methodologies
  { name: 'Manual Testing', category: 'QA & Testing Methodologies', proficiency: 'Advanced', isLearning: false, sortOrder: 1 },
  { name: 'Functional Testing', category: 'QA & Testing Methodologies', proficiency: 'Advanced', isLearning: false, sortOrder: 2 },
  { name: 'Regression Testing', category: 'QA & Testing Methodologies', proficiency: 'Advanced', isLearning: false, sortOrder: 3 },
  { name: 'UAT (User Acceptance Testing)', category: 'QA & Testing Methodologies', proficiency: 'Advanced', isLearning: false, sortOrder: 4 },
  { name: 'Test Case & Scenario Design', category: 'QA & Testing Methodologies', proficiency: 'Advanced', isLearning: false, sortOrder: 5 },
  { name: 'Defect Tracking & Bug Reporting', category: 'QA & Testing Methodologies', proficiency: 'Advanced', isLearning: false, sortOrder: 6 },
  { name: 'Factory Acceptance Testing (FAT)', category: 'QA & Testing Methodologies', proficiency: 'Proficient', isLearning: false, sortOrder: 7 },

  // 2. Automation & Testing Tools
  { name: 'Cypress (E2E Testing)', category: 'Automation & Testing Tools', proficiency: 'Advanced', isLearning: false, sortOrder: 8 },
  { name: 'Katalon Studio', category: 'Automation & Testing Tools', proficiency: 'Advanced', isLearning: false, sortOrder: 9 },
  { name: 'Postman (API Testing)', category: 'Automation & Testing Tools', proficiency: 'Advanced', isLearning: false, sortOrder: 10 },
  { name: 'Swagger / OpenAPI', category: 'Automation & Testing Tools', proficiency: 'Proficient', isLearning: false, sortOrder: 11 },
  { name: 'Katalon Recorder', category: 'Automation & Testing Tools', proficiency: 'Proficient', isLearning: false, sortOrder: 12 },

  // 3. Web & Database Technologies
  { name: 'PHP (Native & Laravel)', category: 'Web & Database Technologies', proficiency: 'Proficient', isLearning: false, sortOrder: 13 },
  { name: 'MySQL Database', category: 'Web & Database Technologies', proficiency: 'Proficient', isLearning: false, sortOrder: 14 },
  { name: 'JavaScript', category: 'Web & Database Technologies', proficiency: 'Proficient', isLearning: false, sortOrder: 15 },
  { name: 'HTML5 & CSS3', category: 'Web & Database Technologies', proficiency: 'Proficient', isLearning: false, sortOrder: 16 },
  { name: 'Python', category: 'Web & Database Technologies', proficiency: 'Intermediate', isLearning: false, sortOrder: 17 },
  { name: 'RESTful APIs', category: 'Web & Database Technologies', proficiency: 'Advanced', isLearning: false, sortOrder: 18 },

  // 4. Tools & Project Collaboration
  { name: 'Git & GitHub', category: 'Tools & Project Collaboration', proficiency: 'Proficient', isLearning: false, sortOrder: 19 },
  { name: 'ClickUp', category: 'Tools & Project Collaboration', proficiency: 'Proficient', isLearning: false, sortOrder: 20 },
  { name: 'Odoo ERP', category: 'Tools & Project Collaboration', proficiency: 'Intermediate', isLearning: false, sortOrder: 21 },
  { name: 'VS Code', category: 'Tools & Project Collaboration', proficiency: 'Advanced', isLearning: false, sortOrder: 22 },
  { name: 'Google Sheets & MS Excel', category: 'Tools & Project Collaboration', proficiency: 'Advanced', isLearning: false, sortOrder: 23 },

  // 5. Certifications & Training
  { name: 'Sanbercode QA Bootcamp (2025)', category: 'Certifications & Training', proficiency: 'Certified', isLearning: false, sortOrder: 24 },
  { name: 'Test Automation University (2025)', category: 'Certifications & Training', proficiency: 'Certified', isLearning: false, sortOrder: 25 },
  { name: 'MySkill QA Certification (2025)', category: 'Certifications & Training', proficiency: 'Certified', isLearning: false, sortOrder: 26 },
  { name: 'Sertifikat SQA OJT Grade A - PT Len Industri', category: 'Certifications & Training', proficiency: 'Certified', isLearning: false, sortOrder: 27 },
  { name: 'Sertifikat SQA Magang - PT Vortex Buana Edumedia', category: 'Certifications & Training', proficiency: 'Certified', isLearning: false, sortOrder: 28 },

  // 6. Currently Exploring (Up-Skilling / 2026)
  { name: 'Technical SEO & Audit', category: 'Currently Learning', proficiency: 'Exploring', isLearning: true, sortOrder: 29 },
  { name: 'Core Web Vitals & PageSpeed', category: 'Currently Learning', proficiency: 'Exploring', isLearning: true, sortOrder: 30 },
  { name: 'On-Page SEO & Semantic HTML', category: 'Currently Learning', proficiency: 'Exploring', isLearning: true, sortOrder: 31 },
  { name: 'Schema & Structured Data (JSON-LD)', category: 'Currently Learning', proficiency: 'Exploring', isLearning: true, sortOrder: 32 },
  { name: 'AI-Augmented QA & Prompt Testing', category: 'Currently Learning', proficiency: 'Exploring', isLearning: true, sortOrder: 33 },
  { name: 'Algorithmic Search Testing', category: 'Currently Learning', proficiency: 'Exploring', isLearning: true, sortOrder: 34 },
];

export async function runTechStacksSeed(customDb?: any) {
  console.log('========================================================');
  console.log('🌱 Starting Tech Stacks Seeder');
  console.log('Target Database:', process.env.DB_NAME);
  console.log('========================================================');

  const db = customDb || createDbConnection();
  let seeded = 0;
  let skipped = 0;

  try {
    for (const stack of initialTechStacks) {
      const existing = await db
        .select()
        .from(techStacks)
        .where(eq(techStacks.name, stack.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(techStacks).values(stack);
        seeded++;
        console.log(`✅ Seeded: [${stack.category}] ${stack.name}`);
      } else {
        skipped++;
      }
    }

    console.log('========================================================');
    console.log(`🎉 Tech Stacks Seeding Done! Seeded: ${seeded}, Skipped: ${skipped}`);
    console.log('========================================================');
    return { seeded, skipped };
  } finally {
    if (!customDb) {
      await closeDbConnection();
    }
  }
}

if (import.meta.main) {
  runTechStacksSeed().catch((err) => {
    console.error('❌ Tech Stacks Seeding failed:', err);
    process.exit(1);
  });
}
