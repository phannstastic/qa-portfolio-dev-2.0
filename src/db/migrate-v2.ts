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
  });

  // Ensure DB exists
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
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
