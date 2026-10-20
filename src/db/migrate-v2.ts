import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function runMigrationV2() {
  const dbName = process.env.DB_NAME || 'qa_portfolio_20_db';
  console.log(`🚀 Running Migration for ${dbName}...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  // Try creating DB if user has global privileges (ignored if already exists or access restricted)
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  } catch (_e) {
    // Database already exists on managed cloud hosts (like Silly Development)
  }
  await connection.query(`USE \`${dbName}\`;`);

  // Users
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id int AUTO_INCREMENT NOT NULL,
      name varchar(100) NOT NULL,
      email varchar(191) NOT NULL,
      password_hash varchar(255) NOT NULL,
      role enum('admin','superadmin') NOT NULL DEFAULT 'admin',
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY users_email_unique (email)
    );
  `);

  // Projects
  await connection.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id int AUTO_INCREMENT NOT NULL,
      title varchar(255) NOT NULL,
      slug varchar(191) NOT NULL,
      description text NOT NULL,
      category varchar(100) NOT NULL,
      tech_stack text NOT NULL,
      github_url varchar(255),
      live_demo_url varchar(255),
      image_url varchar(255),
      is_featured boolean NOT NULL DEFAULT false,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY projects_slug_unique (slug)
    );
  `);

  // Experiences with integrated Certificate fields
  await connection.query(`
    CREATE TABLE IF NOT EXISTS experiences (
      id int AUTO_INCREMENT NOT NULL,
      company varchar(150) NOT NULL,
      role varchar(150) NOT NULL,
      location varchar(150),
      start_date varchar(50) NOT NULL,
      end_date varchar(50),
      is_current boolean NOT NULL DEFAULT false,
      description text NOT NULL,
      certificate_url varchar(255),
      certificate_type varchar(50),
      certificate_name varchar(255),
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `);

  // Ensure certificate columns exist if table was previously created without them
  try { await connection.query(`ALTER TABLE experiences ADD COLUMN certificate_url varchar(255);`); } catch (_e) {}
  try { await connection.query(`ALTER TABLE experiences ADD COLUMN certificate_type varchar(50);`); } catch (_e) {}
  try { await connection.query(`ALTER TABLE experiences ADD COLUMN certificate_name varchar(255);`); } catch (_e) {}

  // Contacts
  await connection.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id int AUTO_INCREMENT NOT NULL,
      name varchar(100) NOT NULL,
      email varchar(191) NOT NULL,
      subject varchar(255) NOT NULL,
      message text NOT NULL,
      status enum('unread','read','archived') NOT NULL DEFAULT 'unread',
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `);

  // Tech Stacks
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tech_stacks (
      id int AUTO_INCREMENT NOT NULL,
      name varchar(100) NOT NULL,
      category varchar(100) NOT NULL,
      proficiency varchar(50) NOT NULL DEFAULT 'Proficient',
      is_learning boolean NOT NULL DEFAULT false,
      icon varchar(100),
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `);

  // Articles / Blog
  await connection.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id int AUTO_INCREMENT NOT NULL,
      title varchar(255) NOT NULL,
      slug varchar(191) NOT NULL,
      excerpt text NOT NULL,
      content text NOT NULL,
      category varchar(100) NOT NULL DEFAULT 'QA & Testing',
      tags varchar(255),
      read_time varchar(50) NOT NULL DEFAULT '3 min read',
      cover_image_url varchar(255),
      is_published boolean NOT NULL DEFAULT true,
      published_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY articles_slug_unique (slug)
    );
  `);

  // Error Scenes (404 Music Scene Settings)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS error_scenes (
      id int AUTO_INCREMENT NOT NULL,
      headline varchar(255) NOT NULL DEFAULT 'Wrong Scene?',
      youtube_url varchar(500) NOT NULL DEFAULT 'https://www.youtube.com/watch?v=N2kz9EOtIPQ',
      youtube_video_id varchar(100) NOT NULL DEFAULT 'N2kz9EOtIPQ',
      artist varchar(150) NOT NULL DEFAULT 'eaJ',
      song_title varchar(150) NOT NULL DEFAULT 'pause',
      lyric_quote text NOT NULL,
      message text NOT NULL,
      action_hint text NOT NULL,
      button_text varchar(50) NOT NULL DEFAULT 'Play',
      button_url varchar(255) NOT NULL DEFAULT '/',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `);

  // Seed default 404 scene if table is empty
  const [existingScenes]: any = await connection.query(`SELECT id FROM error_scenes LIMIT 1;`);
  if (!existingScenes || existingScenes.length === 0) {
    await connection.query(`
      INSERT INTO error_scenes (
        headline, youtube_url, youtube_video_id, artist, song_title,
        lyric_quote, message, action_hint, button_text, button_url, is_active
      ) VALUES (
        'Wrong Scene?',
        'https://www.youtube.com/watch?v=N2kz9EOtIPQ',
        'N2kz9EOtIPQ',
        'eaJ',
        'pause',
        'Scene out of a movie, I hope it never ends.',
        'He wishes that beautiful scene would never end. You, on the other hand, seem to have stumbled into a deleted scene.',
        'Don\\'t worry, just hit the button below to \\'Play\\' your journey again from the homepage.',
        'Play',
        '/',
        true
      );
    `);
    console.log('✅ Seeded default 404 music scene (eaJ - pause)');
  }

  console.log(`✅ All tables created and verified in ${dbName}`);
  await connection.end();
}

if (import.meta.main) {
  runMigrationV2()
    .then(() => {
      console.log('Migration finished!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
