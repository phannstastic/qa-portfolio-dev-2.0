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

/**
 * Articles / Blog Table
 * Technical writing, QA engineering case studies, and testing insights.
 */
export const articles = mysqlTable('articles', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 191 }).notNull().unique(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(), // Markdown formatted article body
  category: varchar('category', { length: 100 }).default('QA & Testing').notNull(),
  tags: varchar('tags', { length: 255 }), // Comma-separated tags
  readTime: varchar('read_time', { length: 50 }).default('3 min read').notNull(),
  coverImageUrl: varchar('cover_image_url', { length: 255 }),
  isPublished: boolean('is_published').default(true).notNull(),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
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

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

/**
 * 404 Music & Scene Settings Table
 * Manage the custom music video, artist, lyrics, and narrative for 404 "Wrong Scene?" page.
 */
export const errorScenes = mysqlTable('error_scenes', {
  id: int('id').autoincrement().primaryKey(),
  headline: varchar('headline', { length: 255 }).default('Wrong Scene?').notNull(),
  youtubeUrl: varchar('youtube_url', { length: 500 }).default('https://www.youtube.com/watch?v=N2kz9EOtIPQ').notNull(),
  youtubeVideoId: varchar('youtube_video_id', { length: 100 }).default('N2kz9EOtIPQ').notNull(),
  artist: varchar('artist', { length: 150 }).default('eaJ').notNull(),
  songTitle: varchar('song_title', { length: 150 }).default('pause').notNull(),
  lyricQuote: text('lyric_quote').notNull(),
  message: text('message').notNull(),
  actionHint: text('action_hint').notNull(),
  buttonText: varchar('button_text', { length: 50 }).default('Play').notNull(),
  buttonUrl: varchar('button_url', { length: 255 }).default('/').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type ErrorScene = typeof errorScenes.$inferSelect;
export type NewErrorScene = typeof errorScenes.$inferInsert;


