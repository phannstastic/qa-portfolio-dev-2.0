import { describe, expect, it } from 'bun:test';
import {
  determineSchemaState,
  verifyInitialBackupData,
  validateRowsBeforeNormalization,
  validatePreDdlRows,
  validatePostMigrationData,
  performTargetedNormalization,
  type ColumnInfo,
  type ExperienceRow,
} from '../../src/db/migrate';
import type { Connection } from 'mysql2/promise';

describe('Safe Migration Logic Unit Tests (No Database Touched)', () => {
  // Mock data fixtures
  const oldContactCols: ColumnInfo[] = [
    { Field: 'id', Type: 'int(11)', Null: 'NO' },
    { Field: 'message', Type: 'text', Null: 'NO' },
  ];

  const targetContactCols: ColumnInfo[] = [
    { Field: 'id', Type: 'int(11)', Null: 'NO' },
    { Field: 'message', Type: 'varchar(500)', Null: 'NO' },
  ];

  const oldExpCols: ColumnInfo[] = [
    { Field: 'id', Type: 'int(11)', Null: 'NO' },
    { Field: 'start_date', Type: 'varchar(50)', Null: 'NO' },
    { Field: 'end_date', Type: 'varchar(50)', Null: 'YES' },
  ];

  const targetExpCols: ColumnInfo[] = [
    { Field: 'id', Type: 'int(11)', Null: 'NO' },
    { Field: 'start_date', Type: 'date', Null: 'NO' },
    { Field: 'end_date', Type: 'date', Null: 'YES' },
  ];

  const initialRawRows: ExperienceRow[] = [
    {
      id: 1,
      company: 'Tech Innovations QA Lab',
      role: 'Senior QA Automation Engineer',
      start_date: 'Jan 2024',
      end_date: 'Present',
      is_current: 1,
    },
    {
      id: 2,
      company: 'Global Software Solutions',
      role: 'QA Engineer',
      start_date: 'Aug 2022',
      end_date: 'Dec 2023',
      is_current: 0,
    },
    {
      id: 3,
      company: 'Digital Creative Studio',
      role: 'Junior QA Tester',
      start_date: 'Jan 2021',
      end_date: 'Jul 2022',
      is_current: 0,
    },
  ];

  const normalizedIsoRows: ExperienceRow[] = [
    {
      id: 1,
      company: 'Tech Innovations QA Lab',
      role: 'Senior QA Automation Engineer',
      start_date: '2024-01-15',
      end_date: null,
      is_current: 1,
    },
    {
      id: 2,
      company: 'Global Software Solutions',
      role: 'QA Engineer',
      start_date: '2022-08-01',
      end_date: '2023-12-31',
      is_current: 0,
    },
    {
      id: 3,
      company: 'Digital Creative Studio',
      role: 'Junior QA Tester',
      start_date: '2021-01-10',
      end_date: '2022-07-20',
      is_current: 0,
    },
  ];

  // 1. Schema Lama (OLD_SCHEMA)
  it('identifies OLD_SCHEMA when columns are text/varchar and rows are unnormalized', () => {
    const state = determineSchemaState(
      oldContactCols,
      oldExpCols,
      initialRawRows,
      false // hasMigrationRecord
    );
    expect(state).toBe('OLD_SCHEMA');
  });

  // 2. Data Transitioned (DATA_TRANSITIONED)
  it('identifies DATA_TRANSITIONED when columns are varchar but data is already normalized to ISO', () => {
    const state = determineSchemaState(
      oldContactCols,
      oldExpCols,
      normalizedIsoRows,
      false
    );
    expect(state).toBe('DATA_TRANSITIONED');
  });

  // 3. Migrasi Parsial (PARTIAL_DDL)
  it('identifies PARTIAL_DDL when contacts.message is updated to varchar(500) but experiences is still varchar', () => {
    const state = determineSchemaState(
      targetContactCols, // varchar(500)
      oldExpCols,       // varchar(50)
      normalizedIsoRows,
      false
    );
    expect(state).toBe('PARTIAL_DDL');
  });

  it('identifies PARTIAL_DDL when experiences.start_date is date but end_date is still varchar', () => {
    const mixedExpCols: ColumnInfo[] = [
      { Field: 'id', Type: 'int(11)', Null: 'NO' },
      { Field: 'start_date', Type: 'date', Null: 'NO' },
      { Field: 'end_date', Type: 'varchar(50)', Null: 'YES' },
    ];
    const state = determineSchemaState(
      targetContactCols,
      mixedExpCols,
      normalizedIsoRows,
      false
    );
    expect(state).toBe('PARTIAL_DDL');
  });

  // 4. Schema Target tetapi Riwayat Migrasi Belum Tercatat (TARGET_DDL_UNRECORDED)
  it('identifies TARGET_DDL_UNRECORDED when all columns match target types but migration is not in __drizzle_migrations', () => {
    const state = determineSchemaState(
      targetContactCols,
      targetExpCols,
      normalizedIsoRows,
      false // NOT recorded in __drizzle_migrations
    );
    expect(state).toBe('TARGET_DDL_UNRECORDED');
  });

  it('identifies FULLY_MIGRATED when all columns match target types AND migration is recorded', () => {
    const state = determineSchemaState(
      targetContactCols,
      targetExpCols,
      normalizedIsoRows,
      true // recorded in __drizzle_migrations
    );
    expect(state).toBe('FULLY_MIGRATED');
  });

  // 5. Backup Verification on OLD_SCHEMA State
  it('passes backup verification when backup is valid and original table is in OLD_SCHEMA', () => {
    expect(() => {
      verifyInitialBackupData(
        oldExpCols,
        initialRawRows,
        oldExpCols,
        initialRawRows
      );
    }).not.toThrow();
  });

  it('fails backup verification in OLD_SCHEMA if backup table columns are DATE instead of initial VARCHAR', () => {
    expect(() => {
      verifyInitialBackupData(
        targetExpCols, // Backup has DATE columns, invalid!
        initialRawRows,
        oldExpCols,
        initialRawRows
      );
    }).toThrow('Backup table columns must be VARCHAR (initial state)');
  });

  it('fails backup verification in OLD_SCHEMA if backup row count does not match original', () => {
    expect(() => {
      verifyInitialBackupData(
        oldExpCols,
        initialRawRows.slice(0, 2), // only 2 rows in backup
        oldExpCols,
        initialRawRows
      );
    }).toThrow('Backup row count mismatch');
  });

  it('fails backup verification in OLD_SCHEMA if backup data has content mismatch with confirmed dummy mapping', () => {
    const corruptedBackup: ExperienceRow[] = [
      ...initialRawRows.slice(0, 2),
      {
        ...initialRawRows[2],
        start_date: 'Corrupted Date',
      },
    ];
    expect(() => {
      verifyInitialBackupData(
        oldExpCols,
        corruptedBackup,
        oldExpCols,
        initialRawRows
      );
    }).toThrow('Backup start_date mismatch for ID 3');
  });

  it('fails backup verification in OLD_SCHEMA if backup does not match current original table', () => {
    const alteredOriginalRows: ExperienceRow[] = [
      initialRawRows[0],
      {
        ...initialRawRows[1],
        company: 'Mismatched Company Name',
      },
      initialRawRows[2],
    ];
    expect(() => {
      verifyInitialBackupData(
        oldExpCols,
        initialRawRows,
        oldExpCols,
        alteredOriginalRows
      );
    }).toThrow('Original table data is in an inconsistent state');
  });

  // 6. Backup Verification on DATA_TRANSITIONED State
  it('passes backup verification when backup has initial raw text and original table is in DATA_TRANSITIONED (normalized ISO)', () => {
    expect(() => {
      verifyInitialBackupData(
        oldExpCols,
        initialRawRows,     // Backup holds verified initial text data ("Jan 2024", etc.)
        oldExpCols,
        normalizedIsoRows   // Original table has already been normalized to ISO strings ("2024-01-15", etc.)
      );
    }).not.toThrow();
  });

  it('fails backup verification in DATA_TRANSITIONED if original table contains inconsistent/corrupted dates', () => {
    const corruptedIsoRows: ExperienceRow[] = [
      normalizedIsoRows[0],
      {
        ...normalizedIsoRows[1],
        start_date: '2099-12-31', // Does not match target mapping 2022-08-01
      },
      normalizedIsoRows[2],
    ];
    expect(() => {
      verifyInitialBackupData(
        oldExpCols,
        initialRawRows,
        oldExpCols,
        corruptedIsoRows
      );
    }).toThrow('Original table data is in an inconsistent state');
  });

  it('fails backup verification in DATA_TRANSITIONED if backup holds ISO dates instead of initial raw text', () => {
    expect(() => {
      verifyInitialBackupData(
        oldExpCols,
        normalizedIsoRows, // Invalid backup: holds ISO dates instead of initial "Jan 2024"
        oldExpCols,
        normalizedIsoRows
      );
    }).toThrow('Backup start_date mismatch for ID 1: expected "Jan 2024", found "2024-01-15"');
  });

  it('fails backup verification in DATA_TRANSITIONED if backup row count does not match original', () => {
    expect(() => {
      verifyInitialBackupData(
        oldExpCols,
        initialRawRows.slice(0, 2),
        oldExpCols,
        normalizedIsoRows
      );
    }).toThrow('Backup row count mismatch: backup has 2 rows, original has 3 rows.');
  });

  // 7. Nilai Tanggal yang Tidak Dikenal (UNKNOWN_DATE_VALUES)
  it('aborts normalization when unknown date string is encountered', () => {
    const unknownDateRows: ExperienceRow[] = [
      initialRawRows[0],
      {
        ...initialRawRows[1],
        start_date: 'March 2025', // Unrecognized date value
      },
      initialRawRows[2],
    ];

    expect(() => {
      validateRowsBeforeNormalization(unknownDateRows);
    }).toThrow('Unexpected start_date for ID 2: expected "Aug 2022", found "March 2025"');
  });

  it('aborts normalization when unexpected company name is encountered', () => {
    const rogueCompanyRows: ExperienceRow[] = [
      initialRawRows[0],
      {
        ...initialRawRows[1],
        company: 'Unauthorized External Corp',
      },
      initialRawRows[2],
    ];

    expect(() => {
      validateRowsBeforeNormalization(rogueCompanyRows);
    }).toThrow('Company name mismatch for ID 2');
  });

  it('aborts normalization when an unexpected extra row is present', () => {
    const extraRows: ExperienceRow[] = [
      ...initialRawRows,
      {
        id: 99,
        company: 'New Unknown Company',
        role: 'Tester',
        start_date: 'Jan 2024',
        end_date: null,
        is_current: 1,
      },
    ];

    expect(() => {
      validateRowsBeforeNormalization(extraRows);
    }).toThrow('Expected exactly 3 experience rows');
  });

  // 7. Validasi Pre-DDL (Constraints & Date Order)
  it('passes pre-DDL validation with valid normalized rows', () => {
    expect(() => {
      validatePreDdlRows(normalizedIsoRows);
    }).not.toThrow();
  });

  it('fails pre-DDL validation if end_date is earlier than start_date', () => {
    const invalidDateOrderRows: ExperienceRow[] = [
      normalizedIsoRows[0],
      {
        ...normalizedIsoRows[1],
        start_date: '2023-12-31',
        end_date: '2022-01-01', // Earlier than start_date!
      },
      normalizedIsoRows[2],
    ];

    expect(() => {
      validatePreDdlRows(invalidDateOrderRows);
    }).toThrow('Date range error: ID 2 end_date (2022-01-01) is earlier than start_date (2023-12-31)');
  });

  it('fails pre-DDL validation if is_current = 1 has non-null end_date', () => {
    const inconsistentCurrentRows: ExperienceRow[] = [
      {
        ...normalizedIsoRows[0],
        is_current: 1,
        end_date: '2025-01-01', // Must be null when is_current is 1
      },
      normalizedIsoRows[1],
      normalizedIsoRows[2],
    ];

    expect(() => {
      validatePreDdlRows(inconsistentCurrentRows);
    }).toThrow('Consistency error: ID 1 has is_current = 1, but end_date is not NULL');
  });

  it('fails pre-DDL validation if zero-date "0000-00-00" is present', () => {
    const zeroDateRows: ExperienceRow[] = [
      normalizedIsoRows[0],
      {
        ...normalizedIsoRows[1],
        end_date: '0000-00-00',
      },
      normalizedIsoRows[2],
    ];

    expect(() => {
      validatePreDdlRows(zeroDateRows);
    }).toThrow('Consistency error: ID 2 has is_current = 0, but end_date is invalid or NULL');
  });

  // 8. Post-Migration Verification
  it('passes post-migration verification when schema types, row count, and sorting are correct', () => {
    expect(() => {
      validatePostMigrationData(targetContactCols, targetExpCols, normalizedIsoRows);
    }).not.toThrow();
  });

  // 9. Foreign / Rogue Column Types in determineSchemaState
  describe('Foreign / Rogue Column Types Handling in determineSchemaState', () => {
    it('returns CORRUPT_OR_UNKNOWN when contacts.message has an unrecognized type', () => {
      const rogueContactCols: ColumnInfo[] = [
        { Field: 'id', Type: 'int(11)', Null: 'NO' },
        { Field: 'message', Type: 'int(11)', Null: 'NO' }, // Rogue type!
      ];
      const state = determineSchemaState(
        rogueContactCols,
        oldExpCols,
        initialRawRows,
        false
      );
      expect(state).toBe('CORRUPT_OR_UNKNOWN');
    });

    it('returns CORRUPT_OR_UNKNOWN when experiences.start_date has an unrecognized type', () => {
      const rogueExpCols: ColumnInfo[] = [
        { Field: 'id', Type: 'int(11)', Null: 'NO' },
        { Field: 'start_date', Type: 'datetime', Null: 'NO' }, // Rogue type!
        { Field: 'end_date', Type: 'varchar(50)', Null: 'YES' },
      ];
      const state = determineSchemaState(
        oldContactCols,
        rogueExpCols,
        initialRawRows,
        false
      );
      expect(state).toBe('CORRUPT_OR_UNKNOWN');
    });

    it('returns CORRUPT_OR_UNKNOWN when experiences.end_date has an unrecognized type', () => {
      const rogueExpCols: ColumnInfo[] = [
        { Field: 'id', Type: 'int(11)', Null: 'NO' },
        { Field: 'start_date', Type: 'varchar(50)', Null: 'NO' },
        { Field: 'end_date', Type: 'blob', Null: 'YES' }, // Rogue type!
      ];
      const state = determineSchemaState(
        oldContactCols,
        rogueExpCols,
        initialRawRows,
        false
      );
      expect(state).toBe('CORRUPT_OR_UNKNOWN');
    });

    it('returns CORRUPT_OR_UNKNOWN when column has unrecognized type even if table has no rows', () => {
      const rogueContactCols: ColumnInfo[] = [
        { Field: 'id', Type: 'int(11)', Null: 'NO' },
        { Field: 'message', Type: 'int(11)', Null: 'NO' },
      ];
      const state = determineSchemaState(
        rogueContactCols,
        oldExpCols,
        [], // Empty table!
        false
      );
      expect(state).toBe('CORRUPT_OR_UNKNOWN');

      const rogueExpCols: ColumnInfo[] = [
        { Field: 'id', Type: 'int(11)', Null: 'NO' },
        { Field: 'start_date', Type: 'timestamp', Null: 'NO' },
        { Field: 'end_date', Type: 'varchar(50)', Null: 'YES' },
      ];
      const state2 = determineSchemaState(
        oldContactCols,
        rogueExpCols,
        [], // Empty table!
        false
      );
      expect(state2).toBe('CORRUPT_OR_UNKNOWN');
    });

    it('returns CORRUPT_OR_UNKNOWN when an unrecognized column is mixed with target columns', () => {
      const rogueExpCols: ColumnInfo[] = [
        { Field: 'id', Type: 'int(11)', Null: 'NO' },
        { Field: 'start_date', Type: 'date', Null: 'NO' }, // target
        { Field: 'end_date', Type: 'int(11)', Null: 'YES' }, // rogue!
      ];
      const state = determineSchemaState(
        targetContactCols, // target: varchar(500)
        rogueExpCols,
        normalizedIsoRows,
        false
      );
      expect(state).toBe('CORRUPT_OR_UNKNOWN');
    });

    it('returns CORRUPT_OR_UNKNOWN when contacts.message is rogue even if both exp columns are valid old or target', () => {
      const rogueContactCols: ColumnInfo[] = [
        { Field: 'id', Type: 'int(11)', Null: 'NO' },
        { Field: 'message', Type: 'blob', Null: 'NO' }, // rogue
      ];
      const state = determineSchemaState(
        rogueContactCols,
        targetExpCols, // target
        normalizedIsoRows,
        false
      );
      expect(state).toBe('CORRUPT_OR_UNKNOWN');
    });

    it('returns PARTIAL_DDL when non-migrated columns strictly match authorized old types', () => {
      const state1 = determineSchemaState(
        oldContactCols,    // old: text
        targetExpCols,     // target: date, date
        normalizedIsoRows,
        false
      );
      expect(state1).toBe('PARTIAL_DDL');

      const mixedExpCols: ColumnInfo[] = [
        { Field: 'id', Type: 'int(11)', Null: 'NO' },
        { Field: 'start_date', Type: 'date', Null: 'NO' },       // target
        { Field: 'end_date', Type: 'varchar(50)', Null: 'YES' }, // old
      ];
      const state2 = determineSchemaState(
        targetContactCols, // target
        mixedExpCols,
        normalizedIsoRows,
        false
      );
      expect(state2).toBe('PARTIAL_DDL');
    });
  });

  // 10. Transactional Normalization Safety in performTargetedNormalization
  describe('Transactional Normalization Safety in performTargetedNormalization', () => {
    it('commits transaction only after all updates and pre-DDL validations succeed', async () => {
      let beginCalled = false;
      let commitCalled = false;
      let rollbackCalled = false;
      let selectCount = 0;
      let updateCount = 0;

      const mockConn = {
        query: async (sql: string) => {
          if (sql.includes('SELECT id, company, role, start_date, end_date, is_current FROM `experiences`')) {
            selectCount++;
            return selectCount === 1 ? [initialRawRows, null] : [normalizedIsoRows, null];
          }
          if (sql.includes('UPDATE `experiences`')) {
            updateCount++;
            return [{ affectedRows: 1 }, null];
          }
          return [[], null];
        },
        beginTransaction: async () => {
          beginCalled = true;
        },
        commit: async () => {
          commitCalled = true;
        },
        rollback: async () => {
          rollbackCalled = true;
        },
      } as unknown as Connection;

      await performTargetedNormalization(mockConn);

      expect(beginCalled).toBe(true);
      expect(updateCount).toBe(3);
      expect(commitCalled).toBe(true);
      expect(rollbackCalled).toBe(false);
    });

    it('triggers rollback and does NOT commit when the second update fails', async () => {
      let beginCalled = false;
      let commitCalled = false;
      let rollbackCalled = false;
      let updateCount = 0;

      const mockConn = {
        query: async (sql: string) => {
          if (sql.includes('SELECT id, company, role, start_date, end_date, is_current FROM `experiences`')) {
            return [initialRawRows, null];
          }
          if (sql.includes('UPDATE `experiences`')) {
            updateCount++;
            if (updateCount === 2) {
              throw new Error('Database connection dropped during 2nd row update');
            }
            return [{ affectedRows: 1 }, null];
          }
          return [[], null];
        },
        beginTransaction: async () => {
          beginCalled = true;
        },
        commit: async () => {
          commitCalled = true;
        },
        rollback: async () => {
          rollbackCalled = true;
        },
      } as unknown as Connection;

      await expect(performTargetedNormalization(mockConn)).rejects.toThrow(
        'Database connection dropped during 2nd row update'
      );

      expect(beginCalled).toBe(true);
      expect(updateCount).toBe(2);
      expect(rollbackCalled).toBe(true);
      expect(commitCalled).toBe(false);
    });

    it('triggers rollback and does NOT commit when the third update fails affectedRows verification', async () => {
      let beginCalled = false;
      let commitCalled = false;
      let rollbackCalled = false;
      let updateCount = 0;

      const mockConn = {
        query: async (sql: string) => {
          if (sql.includes('SELECT id, company, role, start_date, end_date, is_current FROM `experiences`')) {
            return [initialRawRows, null];
          }
          if (sql.includes('UPDATE `experiences`')) {
            updateCount++;
            if (updateCount === 3) {
              return [{ affectedRows: 0 }, null]; // 0 rows affected
            }
            return [{ affectedRows: 1 }, null];
          }
          return [[], null];
        },
        beginTransaction: async () => {
          beginCalled = true;
        },
        commit: async () => {
          commitCalled = true;
        },
        rollback: async () => {
          rollbackCalled = true;
        },
      } as unknown as Connection;

      await expect(performTargetedNormalization(mockConn)).rejects.toThrow(
        'Failed to update ID 3. Expected 1 affected row, got 0.'
      );

      expect(beginCalled).toBe(true);
      expect(updateCount).toBe(3);
      expect(rollbackCalled).toBe(true);
      expect(commitCalled).toBe(false);
    });

    it('preserves the original error message even if rollback itself encounters an error', async () => {
      let rollbackAttempted = false;

      const mockConn = {
        query: async (sql: string) => {
          if (sql.includes('SELECT id, company, role, start_date, end_date, is_current FROM `experiences`')) {
            return [initialRawRows, null];
          }
          if (sql.includes('UPDATE `experiences`')) {
            throw new Error('Original query timeout error');
          }
          return [[], null];
        },
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {
          rollbackAttempted = true;
          throw new Error('Secondary socket error during rollback');
        },
      } as unknown as Connection;

      // Must throw 'Original query timeout error', NOT 'Secondary socket error during rollback'
      await expect(performTargetedNormalization(mockConn)).rejects.toThrow(
        'Original query timeout error'
      );

      expect(rollbackAttempted).toBe(true);
    });
  });
});
