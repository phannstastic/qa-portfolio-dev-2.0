import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  boolean,
  date,
} from 'drizzle-orm/mysql-core';

/**
 * Users Table
 * Dedicated to admin CMS authentication and authorization.
 */
export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 191 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['admin', 'superadmin']).default('admin').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Projects Table
 * Showcase portfolio projects (e.g. automation frameworks, API testing suites, web apps).
 */
export const projects = mysqlTable('projects', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 191 }).notNull().unique(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // e.g. "Automation Testing", "API Testing", "Performance"
  techStack: text('tech_stack').notNull(), // Comma-separated or JSON list of technologies
  githubUrl: varchar('github_url', { length: 255 }),
  liveDemoUrl: varchar('live_demo_url', { length: 255 }),
  imageUrl: varchar('image_url', { length: 255 }),
  isFeatured: boolean('is_featured').default(false).notNull(),
  sortOrder: int('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Experiences Table
 * Professional career journey, QA engineering roles, and internships.
 */
export const experiences = mysqlTable('experiences', {
  id: int('id').autoincrement().primaryKey(),
  company: varchar('company', { length: 150 }).notNull(),
  role: varchar('role', { length: 150 }).notNull(),
  location: varchar('location', { length: 150 }),
  startDate: date('start_date', { mode: 'string' }).notNull(), // Format YYYY-MM-DD for chronological sorting
  endDate: date('end_date', { mode: 'string' }), // Nullable for ongoing positions (is_current = true)
  isCurrent: boolean('is_current').default(false).notNull(),
  description: text('description').notNull(),
  certificateUrl: varchar('certificate_url', { length: 255 }), // Path to uploaded PDF or photo (e.g. /docs/certificates/...)
  certificateType: varchar('certificate_type', { length: 50 }), // 'pdf' | 'image'
  certificateName: varchar('certificate_name', { length: 255 }), // Human-readable certificate title
  sortOrder: int('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Contacts Table
 * Stores visitor messages sent through the portfolio contact form.
 * Note: Subject is preserved pending final design alignment.
 * Minimum message length (10 chars) will be enforced at API level (TypeBox).
 */
export const contacts = mysqlTable('contacts', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 191 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: varchar('message', { length: 500 }).notNull(),
  status: mysqlEnum('status', ['unread', 'read', 'archived']).default('unread').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Tech Stacks Table
 * Manageable skills & tools library (Automation, API, Performance, Tools, Learning/Future)
 */
export const techStacks = mysqlTable('tech_stacks', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // e.g. "Automation", "API Testing", "Performance", "Tools", "Learning"
  proficiency: varchar('proficiency', { length: 50 }).default('Proficient').notNull(),
  isLearning: boolean('is_learning').default(false).notNull(), // Flag for Future / Currently Learning
  icon: varchar('icon', { length: 100 }),
  sortOrder: int('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Experience = typeof experiences.$inferSelect;
export type NewExperience = typeof experiences.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type TechStack = typeof techStacks.$inferSelect;
export type NewTechStack = typeof techStacks.$inferInsert;
