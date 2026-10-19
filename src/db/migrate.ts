import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql, { type Connection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface ExperienceRow {
  id: number;
  company: string;
  role: string;
  location?: string | null;
  start_date: string;
  end_date: string | null;
  is_current: number;
  description?: string;
  sort_order?: number;
}

export interface ColumnInfo {
  Field: string;
  Type: string;
  Null: string;
  Key?: string;
  Default?: string | null;
  Extra?: string;
}

export type SchemaState =
  | 'OLD_SCHEMA'
  | 'DATA_TRANSITIONED'
  | 'PARTIAL_DDL'
  | 'TARGET_DDL_UNRECORDED'
  | 'FULLY_MIGRATED'
  | 'CORRUPT_OR_UNKNOWN';

// Confirmed dummy row mappings for Task 2 transition
export const CONFIRMED_DUMMY_MAPPINGS: Record<
  number,
  {
    company: string;
    expectedOldStart: string;
    expectedOldEnd: string;
    expectedIsCurrent: number;
    targetStart: string;
    targetEnd: string | null;
  }
> = {
  1: {
    company: 'Tech Innovations QA Lab',
    expectedOldStart: 'Jan 2024',
    expectedOldEnd: 'Present',
    expectedIsCurrent: 1,
    targetStart: '2024-01-15',
    targetEnd: null,
  },
  2: {
    company: 'Global Software Solutions',
    expectedOldStart: 'Aug 2022',
    expectedOldEnd: 'Dec 2023',
    expectedIsCurrent: 0,
    targetStart: '2022-08-01',
    targetEnd: '2023-12-31',
  },
  3: {
    company: 'Digital Creative Studio',
    expectedOldStart: 'Jan 2021',
    expectedOldEnd: 'Jul 2022',
    expectedIsCurrent: 0,
    targetStart: '2021-01-10',
    targetEnd: '2022-07-20',
  },
};

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(dateStr: string): boolean {
  if (!ISO_DATE_REGEX.test(dateStr)) return false;
  if (dateStr === '0000-00-00') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export type ColumnClassification = 'OLD' | 'TARGET' | 'UNKNOWN';

export function classifyContactMessage(typeStr?: string): ColumnClassification {
  if (!typeStr) return 'UNKNOWN';
  const t = typeStr.toLowerCase();
  if (t.includes('varchar(500)')) return 'TARGET';
  if (t.includes('text')) return 'OLD';
  return 'UNKNOWN';
}

export function classifyExpDate(typeStr?: string): ColumnClassification {
  if (!typeStr) return 'UNKNOWN';
  const t = typeStr.toLowerCase().trim();
  if (t === 'date' || /^date\b/.test(t)) return 'TARGET';
  if (t.includes('varchar')) return 'OLD';
  return 'UNKNOWN';
}

/**
 * Pure function: Determine schema and migration state across all column combinations.
 * Strictly verifies authorized old schema types and target schema types.
 */
export function determineSchemaState(
  contactCols: ColumnInfo[],
  expCols: ColumnInfo[],
  rows: ExperienceRow[],
  hasMigrationRecord: boolean
): SchemaState {
  const messageCol = contactCols.find((c) => c.Field === 'message');
  const startDateCol = expCols.find((c) => c.Field === 'start_date');
  const endDateCol = expCols.find((c) => c.Field === 'end_date');

  const contactStatus = classifyContactMessage(messageCol?.Type);
  const startStatus = classifyExpDate(startDateCol?.Type);
  const endStatus = classifyExpDate(endDateCol?.Type);

  // 1. Any unrecognized or corrupt column type immediately returns CORRUPT_OR_UNKNOWN
  // (evaluated before checking row count, ensuring empty tables with rogue types are caught)
  if (
    contactStatus === 'UNKNOWN' ||
    startStatus === 'UNKNOWN' ||
    endStatus === 'UNKNOWN'
  ) {
    return 'CORRUPT_OR_UNKNOWN';
  }

  // 2. Fully Migrated or Target DDL Unrecorded
  if (
    contactStatus === 'TARGET' &&
    startStatus === 'TARGET' &&
    endStatus === 'TARGET'
  ) {
    return hasMigrationRecord ? 'FULLY_MIGRATED' : 'TARGET_DDL_UNRECORDED';
  }

  // 3. Pure Old Schema or Data-Transitioned (all columns strictly match authorized old schema types)
  if (
    contactStatus === 'OLD' &&
    startStatus === 'OLD' &&
    endStatus === 'OLD'
  ) {
    if (rows.length === 0) return 'OLD_SCHEMA';

    const allOldText = rows.every((r) => {
      const mapping = CONFIRMED_DUMMY_MAPPINGS[r.id];
      return (
        mapping &&
        r.company === mapping.company &&
        r.start_date === mapping.expectedOldStart &&
        r.end_date === mapping.expectedOldEnd &&
        r.is_current === mapping.expectedIsCurrent
      );
    });

    if (allOldText) return 'OLD_SCHEMA';

    const allNormalized = rows.every((r) => {
      const mapping = CONFIRMED_DUMMY_MAPPINGS[r.id];
      return (
        mapping &&
        r.company === mapping.company &&
        r.start_date === mapping.targetStart &&
        r.end_date === mapping.targetEnd &&
        r.is_current === mapping.expectedIsCurrent
      );
    });

    if (allNormalized) return 'DATA_TRANSITIONED';

    return 'CORRUPT_OR_UNKNOWN';
  }

  // 4. Valid Partial DDL:
  // Every column is strictly either TARGET or OLD (since UNKNOWN was rejected above).
  // At least one column is TARGET and at least one is OLD.
  return 'PARTIAL_DDL';
}

/**
 * Pure function: Rigorously verify backup data against the initial pre-normalization state.
 */
export function verifyInitialBackupData(
  backupCols: ColumnInfo[],
  backupRows: ExperienceRow[],
  originalCols: ColumnInfo[],
  originalRows: ExperienceRow[]
): void {
  // 1. Verify backup columns are of type varchar (initial pre-normalization state)
  const backupStartCol = backupCols.find((c) => c.Field === 'start_date');
  const backupEndCol = backupCols.find((c) => c.Field === 'end_date');

  if (
    !backupStartCol?.Type.toLowerCase().includes('varchar') ||
    !backupEndCol?.Type.toLowerCase().includes('varchar')
  ) {
    throw new Error(
      `Backup table columns must be VARCHAR (initial state), found start_date: '${backupStartCol?.Type}', end_date: '${backupEndCol?.Type}'. Backup is not from initial state.`
    );
  }

  // 2. Verify row count matches
  if (backupRows.length !== originalRows.length) {
    throw new Error(
      `Backup row count mismatch: backup has ${backupRows.length} rows, original has ${originalRows.length} rows.`
    );
  }

  if (backupRows.length !== Object.keys(CONFIRMED_DUMMY_MAPPINGS).length) {
    throw new Error(
      `Expected ${Object.keys(CONFIRMED_DUMMY_MAPPINGS).length} initial backup rows, found ${backupRows.length}.`
    );
  }

  // 3. Row-by-row verification against confirmed initial dummy data
  for (const b of backupRows) {
    const mapping = CONFIRMED_DUMMY_MAPPINGS[b.id];
    if (!mapping) {
      throw new Error(
        `Backup contains unmapped row ID ${b.id} ("${b.company}"). Not a valid initial backup.`
      );
    }
    if (b.company !== mapping.company) {
      throw new Error(
        `Backup company mismatch for ID ${b.id}: expected "${mapping.company}", found "${b.company}".`
      );
    }
    if (b.start_date !== mapping.expectedOldStart) {
      throw new Error(
        `Backup start_date mismatch for ID ${b.id}: expected "${mapping.expectedOldStart}", found "${b.start_date}".`
      );
    }
    if (b.end_date !== mapping.expectedOldEnd) {
      throw new Error(
        `Backup end_date mismatch for ID ${b.id}: expected "${mapping.expectedOldEnd}", found "${b.end_date}".`
      );
    }
    if (b.is_current !== mapping.expectedIsCurrent) {
      throw new Error(
        `Backup is_current mismatch for ID ${b.id}: expected ${mapping.expectedIsCurrent}, found ${b.is_current}.`
      );
    }
  }

  // 4. Verify original table data according to its state (OLD_SCHEMA vs DATA_TRANSITIONED)
  const isOriginalOldText = originalRows.every((o) => {
    const mapping = CONFIRMED_DUMMY_MAPPINGS[o.id];
    return (
      mapping &&
      o.company === mapping.company &&
      o.start_date === mapping.expectedOldStart &&
      o.end_date === mapping.expectedOldEnd &&
      o.is_current === mapping.expectedIsCurrent
    );
  });

  if (isOriginalOldText) {
    // If original table is still in OLD_SCHEMA, compare directly with backup
    for (let i = 0; i < originalRows.length; i++) {
      const o = originalRows[i];
      const b = backupRows.find((r) => r.id === o.id);
      if (
        !b ||
        o.company !== b.company ||
        o.start_date !== b.start_date ||
        o.end_date !== b.end_date ||
        o.is_current !== b.is_current
      ) {
        throw new Error(
          `Backup does not match current original table row ID ${o.id}.`
        );
      }
    }
  } else {
    // If original table is in DATA_TRANSITIONED (or target schema), validate against target mapping
    const isOriginalDataTransitioned = originalRows.every((o) => {
      const mapping = CONFIRMED_DUMMY_MAPPINGS[o.id];
      return (
        mapping &&
        o.company === mapping.company &&
        o.start_date === mapping.targetStart &&
        o.end_date === mapping.targetEnd &&
        o.is_current === mapping.expectedIsCurrent
      );
    });

    if (!isOriginalDataTransitioned) {
      throw new Error(
        'Original table data is in an inconsistent state: neither matching initial pre-normalization state nor target normalized state.'
      );
    }
  }
}

/**
 * Pure function: Validate experience rows before normalization.
 * Refuses to normalize if unknown or unexpected values exist.
 */
export function validateRowsBeforeNormalization(rows: ExperienceRow[]): void {
  const expectedCount = Object.keys(CONFIRMED_DUMMY_MAPPINGS).length;
  if (rows.length !== expectedCount) {
    throw new Error(
      `Expected exactly ${expectedCount} experience rows for dummy data transition, found ${rows.length}. Aborting without modifying data.`
    );
  }

  for (const row of rows) {
    const mapping = CONFIRMED_DUMMY_MAPPINGS[row.id];
    if (!mapping) {
      throw new Error(
        `❌ Unrecognized experience row detected (ID ${row.id}, company "${row.company}"). ` +
          `Migration halted: Refusing to modify unmapped data.`
      );
    }

    if (row.company !== mapping.company) {
      throw new Error(
        `❌ Company name mismatch for ID ${row.id}: expected "${mapping.company}", found "${row.company}".`
      );
    }
    if (row.start_date !== mapping.expectedOldStart) {
      throw new Error(
        `❌ Unexpected start_date for ID ${row.id}: expected "${mapping.expectedOldStart}", found "${row.start_date}".`
      );
    }
    if (row.end_date !== mapping.expectedOldEnd) {
      throw new Error(
        `❌ Unexpected end_date for ID ${row.id}: expected "${mapping.expectedOldEnd}", found "${row.end_date}".`
      );
    }
    if (row.is_current !== mapping.expectedIsCurrent) {
      throw new Error(
        `❌ Unexpected is_current for ID ${row.id}: expected ${mapping.expectedIsCurrent}, found ${row.is_current}.`
      );
    }
  }
}

/**
 * Pure function: Validate pre-DDL rows for date validity, constraints, and chronological integrity.
 */
export function validatePreDdlRows(rows: ExperienceRow[]): void {
  const expectedCount = Object.keys(CONFIRMED_DUMMY_MAPPINGS).length;
  if (rows.length !== expectedCount) {
    throw new Error(
      `Expected exactly ${expectedCount} experience rows, found ${rows.length}.`
    );
  }

  for (const row of rows) {
    // 1. start_date must be valid ISO date
    if (!isValidIsoDate(row.start_date)) {
      throw new Error(`Invalid start_date for ID ${row.id}: "${row.start_date}".`);
    }

    // 2. is_current consistency and end_date validity
    if (row.is_current === 1) {
      if (row.end_date !== null) {
        throw new Error(
          `Consistency error: ID ${row.id} has is_current = 1, but end_date is not NULL ("${row.end_date}").`
        );
      }
    } else {
      if (row.end_date === null || !isValidIsoDate(row.end_date)) {
        throw new Error(
          `Consistency error: ID ${row.id} has is_current = 0, but end_date is invalid or NULL ("${row.end_date}").`
        );
      }

      // 3. Chronological validity: start_date <= end_date
      const startTime = new Date(row.start_date).getTime();
      const endTime = new Date(row.end_date).getTime();
      if (endTime < startTime) {
        throw new Error(
          `Date range error: ID ${row.id} end_date (${row.end_date}) is earlier than start_date (${row.start_date}).`
        );
      }
    }
  }
}

/**
 * Pure function: Validate post-migration schema and data.
 */
export function validatePostMigrationData(
  contactCols: ColumnInfo[],
  expCols: ColumnInfo[],
  rows: ExperienceRow[]
): void {
  const startDateCol = expCols.find((c) => c.Field === 'start_date');
  const endDateCol = expCols.find((c) => c.Field === 'end_date');
  const messageCol = contactCols.find((c) => c.Field === 'message');

  const isStartDateDate =
    startDateCol?.Type.toLowerCase().trim() === 'date' ||
    /^date\b/.test(startDateCol?.Type.toLowerCase() ?? '');
  const isEndDateDate =
    endDateCol?.Type.toLowerCase().trim() === 'date' ||
    /^date\b/.test(endDateCol?.Type.toLowerCase() ?? '');

  if (!isStartDateDate || startDateCol?.Null !== 'NO') {
    throw new Error(
      `experiences.start_date verification failed: expected 'date NOT NULL', got '${startDateCol?.Type}', Null: '${startDateCol?.Null}'.`
    );
  }

  if (!isEndDateDate || endDateCol?.Null !== 'YES') {
    throw new Error(
      `experiences.end_date verification failed: expected 'date NULL', got '${endDateCol?.Type}', Null: '${endDateCol?.Null}'.`
    );
  }

  if (!messageCol?.Type.toLowerCase().includes('varchar(500)')) {
    throw new Error(
      `contacts.message verification failed: expected 'varchar(500)', got '${messageCol?.Type}'.`
    );
  }

  if (rows.length !== 3) {
    throw new Error(`Expected 3 rows in experiences after migration, found ${rows.length}.`);
  }

  for (const r of rows) {
    if (r.start_date === '0000-00-00' || r.end_date === '0000-00-00') {
      throw new Error(`Detected invalid zero-date for ID ${r.id}.`);
    }
  }

  // Verify chronological sort: start_date DESC
  const sorted = [...rows].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
  const expectedSortedIds = [1, 2, 3];
  const actualSortedIds = sorted.map((r) => r.id);

  if (JSON.stringify(actualSortedIds) !== JSON.stringify(expectedSortedIds)) {
    throw new Error(
      `Chronological sorting check failed. Expected IDs [1, 2, 3], got ${JSON.stringify(actualSortedIds)}.`
    );
  }
}

/**
 * Check if migration 0001 is recorded in __drizzle_migrations
 */
export async function checkMigrationRecorded(
  connection: Connection,
  migrationTag: string
): Promise<boolean> {
  const [tables] = (await connection.query(
    "SHOW TABLES LIKE '__drizzle_migrations';"
  )) as [{ [key: string]: string }[], unknown];

  if (tables.length === 0) return false;

  // Drizzle records migrations in __drizzle_migrations
  // Query records and inspect entries
  try {
    const [rows] = (await connection.query(
      'SELECT id, hash, created_at FROM `__drizzle_migrations`;'
    )) as [{ id: number; hash: string; created_at: number }[], unknown];

    // Read journal to know tag when timestamp
    return rows.some((r) => r.hash.includes(migrationTag) || r.created_at === 1792054841911);
  } catch {
    return false;
  }
}

/**
 * Database operations handler for backup
 */
async function ensureAndVerifyBackup(connection: Connection): Promise<void> {
  console.log('🛡️ [Phase 2] Verifying and Creating Initial Backup...');
  const backupTable = 'experiences_backup_task2';

  const [tables] = (await connection.query(
    `SHOW TABLES LIKE '${backupTable}';`
  )) as [{ [key: string]: string }[], unknown];

  const backupExists = tables.length > 0;

  const [origCols] = (await connection.query('SHOW COLUMNS FROM `experiences`;')) as [
    ColumnInfo[],
    unknown,
  ];
  const [origRows] = (await connection.query('SELECT * FROM `experiences` ORDER BY id ASC;')) as [
    ExperienceRow[],
    unknown,
  ];

  if (backupExists) {
    console.log(`   Backup table '${backupTable}' already exists. Inspecting contents...`);
    const [backupCols] = (await connection.query(
      `SHOW COLUMNS FROM \`${backupTable}\`;`
    )) as [ColumnInfo[], unknown];
    const [backupRows] = (await connection.query(
      `SELECT * FROM \`${backupTable}\` ORDER BY id ASC;`
    )) as [ExperienceRow[], unknown];

    // Rigorously verify that existing backup represents the initial state
    verifyInitialBackupData(backupCols, backupRows, origCols, origRows);
    console.log('   ✅ Existing backup verified against initial pre-normalization state.');
    return;
  }

  // Backup does not exist: ensure current table is in initial state before backing up
  const startCol = origCols.find((c) => c.Field === 'start_date');
  if (!startCol?.Type.toLowerCase().includes('varchar')) {
    throw new Error(
      `Cannot create initial backup: 'experiences.start_date' is already '${startCol?.Type}'. Aborting.`
    );
  }

  // Validate initial rows before creating backup
  validateRowsBeforeNormalization(origRows);

  console.log(`   Creating clean backup table structure: '${backupTable}'...`);
  await connection.query(`CREATE TABLE \`${backupTable}\` LIKE \`experiences\`;`);
  await connection.query(`INSERT INTO \`${backupTable}\` SELECT * FROM \`experiences\`;`);

  // Verify newly created backup
  const [newBackupCols] = (await connection.query(
    `SHOW COLUMNS FROM \`${backupTable}\`;`
  )) as [ColumnInfo[], unknown];
  const [newBackupRows] = (await connection.query(
    `SELECT * FROM \`${backupTable}\` ORDER BY id ASC;`
  )) as [ExperienceRow[], unknown];

  verifyInitialBackupData(newBackupCols, newBackupRows, origCols, origRows);
  console.log('   ✅ Initial backup created and verified row-by-row.');
}

/**
 * Perform normalization on confirmed dummy rows within an explicit transaction.
 * Note: This transaction protects the DML data normalization operations.
 * Subsequent DDL operations (ALTER TABLE) in Phase 5 cause implicit commits in MySQL/MariaDB.
 */
export async function performTargetedNormalization(connection: Connection): Promise<void> {
  console.log('🔎 [Phase 3 & 4] Validating and Normalizing Experiences Data (Transactional)...');
  const [rows] = (await connection.query(
    'SELECT id, company, role, start_date, end_date, is_current FROM `experiences` ORDER BY id ASC;'
  )) as [ExperienceRow[], unknown];

  validateRowsBeforeNormalization(rows);

  await connection.beginTransaction();
  try {
    for (const row of rows) {
      const mapping = CONFIRMED_DUMMY_MAPPINGS[row.id];
      console.log(
        `   Updating ID ${row.id} (${mapping.company}) -> start: ${mapping.targetStart}, end: ${mapping.targetEnd}`
      );
      const [result] = (await connection.query(
        `UPDATE \`experiences\`
         SET \`start_date\` = ?, \`end_date\` = ?
         WHERE \`id\` = ? AND \`company\` = ? AND \`start_date\` = ? AND \`end_date\` = ?;`,
        [
          mapping.targetStart,
          mapping.targetEnd,
          row.id,
          mapping.company,
          mapping.expectedOldStart,
          mapping.expectedOldEnd,
        ]
      )) as [{ affectedRows: number }, unknown];

      if (result.affectedRows !== 1) {
        throw new Error(
          `Failed to update ID ${row.id}. Expected 1 affected row, got ${result.affectedRows}.`
        );
      }
    }

    // Re-fetch and run pre-DDL validation within transaction before committing
    const [updatedRows] = (await connection.query(
      'SELECT id, company, role, start_date, end_date, is_current FROM `experiences` ORDER BY id ASC;'
    )) as [ExperienceRow[], unknown];

    validatePreDdlRows(updatedRows);

    // Commit only after all updates and validations in the transaction succeed
    await connection.commit();
    console.log('   ✅ Targeted normalization and Pre-DDL validation committed successfully.');
  } catch (err: unknown) {
    try {
      await connection.rollback();
    } catch (rollbackErr: unknown) {
      console.error('⚠️ Transaction rollback failed:', rollbackErr);
    }
    throw err;
  }
}

/**
 * Main migration entrypoint
 */
export async function runMigrate(): Promise<void> {
  console.log('========================================================');
  console.log('🚀 Starting Safe Drizzle Database Migration Runner');
  console.log('Target Database:', process.env.DB_NAME || 'qa_portfolio_dev');
  console.log('========================================================');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qa_portfolio_dev',
    multipleStatements: true,
  });

  try {
    // 0. Verify connected database matches target
    const [dbResult] = (await connection.query('SELECT DATABASE() AS currentDb;')) as [
      { currentDb: string }[],
      unknown,
    ];
    const actualDb = dbResult[0]?.currentDb;
    console.log(`Connected Database: [${actualDb}]`);
    const expectedDb = process.env.DB_NAME || 'qa_portfolio_dev';
    if (!actualDb || actualDb !== expectedDb) {
      throw new Error(
        `Database connection mismatch! Target is "${expectedDb}", but connected session is "${actualDb}". Halting immediately to protect unintended databases.`
      );
    }

    // 1. Inspect schema state
    console.log('🔍 [Phase 1] Inspecting Current Schema & Migration State...');
    const [contactCols] = (await connection.query('SHOW COLUMNS FROM `contacts`;')) as [
      ColumnInfo[],
      unknown,
    ];
    const [expCols] = (await connection.query('SHOW COLUMNS FROM `experiences`;')) as [
      ColumnInfo[],
      unknown,
    ];
    const [expRows] = (await connection.query(
      'SELECT id, company, role, start_date, end_date, is_current FROM `experiences` ORDER BY id ASC;'
    )) as [ExperienceRow[], unknown];

    const isRecorded = await checkMigrationRecorded(
      connection,
      '0001_faulty_lady_mastermind'
    );
    const state = determineSchemaState(contactCols, expCols, expRows, isRecorded);

    console.log(`   Current Systemic Schema State: [${state}]`);

    if (state === 'FULLY_MIGRATED') {
      console.log('✅ Database is already fully migrated and recorded in Drizzle.');
      return;
    }

    if (state === 'CORRUPT_OR_UNKNOWN') {
      throw new Error(
        'Database is in an unrecognized or corrupt state. Halting migration to prevent data loss.'
      );
    }

    // 2. Ensure initial backup exists and is verified
    await ensureAndVerifyBackup(connection);

    // 3. Normalize data if still in OLD_SCHEMA
    if (state === 'OLD_SCHEMA') {
      await performTargetedNormalization(connection);
    } else if (state === 'DATA_TRANSITIONED') {
      console.log('ℹ️ Data already normalized to ISO format. Skipping text normalization.');
      validatePreDdlRows(expRows);
    } else if (state === 'PARTIAL_DDL') {
      console.log('⚠️ Partial DDL state detected. Inspecting data before proceeding with DDL...');
      // If experiences is still varchar, ensure it has valid ISO format before DDL
      const startCol = expCols.find((c) => c.Field === 'start_date');
      if (startCol?.Type.toLowerCase().includes('varchar')) {
        validatePreDdlRows(expRows);
      }
    } else if (state === 'TARGET_DDL_UNRECORDED') {
      console.log('⚠️ Columns already at target types, but migration 0001 not recorded in Drizzle.');
      console.log('   Re-running Drizzle migration runner to synchronize migration history safely.');
    }

    // 4. Run Drizzle migration
    console.log('⚡ [Phase 5] Executing Drizzle Migrations...');
    const db = drizzle(connection);
    const migrationsFolder = path.resolve(import.meta.dir, '../../drizzle');
    await migrate(db, { migrationsFolder });
    console.log('   ✅ Drizzle migration runner completed.');

    // 5. Post-migration verification
    console.log('🎯 [Phase 6] Running Post-Migration Verification...');
    const [postContactCols] = (await connection.query('SHOW COLUMNS FROM `contacts`;')) as [
      ColumnInfo[],
      unknown,
    ];
    const [postExpCols] = (await connection.query('SHOW COLUMNS FROM `experiences`;')) as [
      ColumnInfo[],
      unknown,
    ];
    const [postExpRows] = (await connection.query(
      'SELECT id, company, role, start_date, end_date, is_current FROM `experiences` ORDER BY id ASC;'
    )) as [ExperienceRow[], unknown];

    validatePostMigrationData(postContactCols, postExpCols, postExpRows);

    console.log('========================================================');
    console.log('🎉 Migration finished with all verifications PASSED!');
    console.log('========================================================');
  } catch (err: any) {
    console.error('========================================================');
    console.error('❌ MIGRATION FAILED:', err.message);
    console.error('========================================================');
    console.error('DIAGNOSTIC & MANUAL RECOVERY GUIDANCE:');
    console.error('1. Inspect current database column types:');
    console.error('   SHOW COLUMNS FROM contacts;');
    console.error('   SHOW COLUMNS FROM experiences;');
    console.error('   SELECT * FROM __drizzle_migrations;');
    console.error('2. Verify if verified initial backup table exists:');
    console.error('   SHOW TABLES LIKE "experiences_backup_task2";');
    console.error('   SELECT * FROM experiences_backup_task2;');
    console.error('3. Manual rollback procedure (REQUIRES EXPLICIT ADMIN CONFIRMATION):');
    console.error('   Do NOT automatically drop tables or delete from __drizzle_migrations.');
    console.error('   To manually restore experiences to pre-normalization state:');
    console.error('     CREATE TABLE experiences_temp LIKE experiences_backup_task2;');
    console.error('     INSERT INTO experiences_temp SELECT * FROM experiences_backup_task2;');
    console.error('     -- Verify experiences_temp rows, then coordinate table swap under maintenance.');
    console.error('========================================================');
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (import.meta.main) {
  runMigrate();
}
