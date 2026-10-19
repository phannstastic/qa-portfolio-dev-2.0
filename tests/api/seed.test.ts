import { describe, expect, it } from 'bun:test';
import {
  validateSeedEnvironment,
  runSeed,
  initialProjects,
  initialExperiences,
} from '../../src/db/seed';

describe('Safe Seed Logic Unit Tests (No Database Touched)', () => {
  // 1. Environment Variable Validation
  describe('Environment Validation (validateSeedEnvironment)', () => {
    it('throws when SEED_ADMIN_PASSWORD is missing', () => {
      expect(() => {
        validateSeedEnvironment({
          DB_NAME: 'qa_portfolio_dev',
        });
      }).toThrow('SEED_ADMIN_PASSWORD environment variable is required');
    });

    it('throws when SEED_ADMIN_PASSWORD is empty or whitespace', () => {
      expect(() => {
        validateSeedEnvironment({
          SEED_ADMIN_PASSWORD: '   ',
          DB_NAME: 'qa_portfolio_dev',
        });
      }).toThrow('SEED_ADMIN_PASSWORD environment variable is required');
    });

    it('throws security violation when DB_NAME is qa_playground_db', () => {
      expect(() => {
        validateSeedEnvironment({
          SEED_ADMIN_PASSWORD: 'SuperSecurePassword123!',
          DB_NAME: 'qa_playground_db',
        });
      }).toThrow('Security violation: Refusing to run seed on protected playground database "qa_playground_db".');
    });

    it('returns sanitized seed config with defaults when environment is valid', () => {
      const config = validateSeedEnvironment({
        SEED_ADMIN_PASSWORD: 'SuperSecurePassword123!',
      });
      expect(config.adminPassword).toBe('SuperSecurePassword123!');
      expect(config.adminEmail).toBe('admin@qa-portfolio.local');
      expect(config.expectedDb).toBe('qa_portfolio_dev');
    });

    it('respects custom ADMIN_EMAIL and DB_NAME overrides', () => {
      const config = validateSeedEnvironment({
        SEED_ADMIN_PASSWORD: 'CustomPassword123!',
        ADMIN_EMAIL: 'custom_admin@example.com',
        DB_NAME: 'qa_portfolio_test',
      });
      expect(config.adminPassword).toBe('CustomPassword123!');
      expect(config.adminEmail).toBe('custom_admin@example.com');
      expect(config.expectedDb).toBe('qa_portfolio_test');
    });
  });

  // 2. Data Fixtures Integrity
  describe('Seed Data Fixtures Integrity', () => {
    it('contains unique project slugs and valid project structures', () => {
      const slugs = initialProjects.map((p) => p.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);

      for (const p of initialProjects) {
        expect(p.title.length).toBeGreaterThan(0);
        expect(p.slug.length).toBeGreaterThan(0);
        expect(p.category.length).toBeGreaterThan(0);
        expect(p.techStack.length).toBeGreaterThan(0);
        expect(typeof p.isFeatured).toBe('boolean');
        expect(typeof p.sortOrder).toBe('number');
      }
    });

    it('contains valid ISO date formats and consistent isCurrent logic for experiences', () => {
      const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
      for (const exp of initialExperiences) {
        expect(ISO_DATE_REGEX.test(exp.startDate)).toBe(true);
        if (exp.isCurrent) {
          expect(exp.endDate).toBeNull();
        } else {
          expect(exp.endDate).not.toBeNull();
          expect(ISO_DATE_REGEX.test(exp.endDate!)).toBe(true);
          const start = new Date(exp.startDate).getTime();
          const end = new Date(exp.endDate!).getTime();
          expect(start <= end).toBe(true);
        }
      }
    });
  });

  // 3. Mock Database Execution & Idempotency
  describe('Mock Database Execution & Idempotency (runSeed)', () => {
    it('seeds admin, projects, and experiences when database is empty', async () => {
      process.env.SEED_ADMIN_PASSWORD = 'TestPassword123!';
      process.env.DB_NAME = 'qa_portfolio_dev';

      const insertedUsers: any[] = [];
      const insertedProjects: any[] = [];
      const insertedExperiences: any[] = [];

      const mockDb = {
        $client: {
          query: async () => [[{ currentDb: 'qa_portfolio_dev' }]],
          end: async () => {},
        },
        select: () => ({
          from: (table: any) => ({
            where: () => ({
              limit: async () => [], // Always empty
            }),
          }),
        }),
        insert: (table: any) => ({
          values: async (data: any) => {
            if (data.email) insertedUsers.push(data);
            else if (data.slug) insertedProjects.push(data);
            else if (data.company) insertedExperiences.push(data);
          },
        }),
      };

      const result = await runSeed(mockDb);

      expect(result.adminSeeded).toBe(true);
      expect(result.adminSkipped).toBe(false);
      expect(result.projectsSeeded).toBe(initialProjects.length);
      expect(result.projectsSkipped).toBe(0);
      expect(result.experiencesSeeded).toBe(initialExperiences.length);
      expect(result.experiencesSkipped).toBe(0);

      // Verify bcrypt password hashing (never plaintext)
      expect(insertedUsers.length).toBe(1);
      expect(insertedUsers[0].passwordHash).not.toBe('TestPassword123!');
      expect(insertedUsers[0].passwordHash.startsWith('$2')).toBe(true); // bcrypt prefix
      const isMatch = await Bun.password.verify('TestPassword123!', insertedUsers[0].passwordHash);
      expect(isMatch).toBe(true);
    });

    it('skips all insertions when records already exist (idempotent)', async () => {
      process.env.SEED_ADMIN_PASSWORD = 'TestPassword123!';
      process.env.DB_NAME = 'qa_portfolio_dev';

      let insertCalled = false;

      const mockDb = {
        $client: {
          query: async () => [[{ currentDb: 'qa_portfolio_dev' }]],
          end: async () => {},
        },
        select: () => ({
          from: (table: any) => ({
            where: () => ({
              limit: async () => [{ id: 1 }], // Always finds existing record
            }),
          }),
        }),
        insert: () => ({
          values: async () => {
            insertCalled = true;
          },
        }),
      };

      const result = await runSeed(mockDb);

      expect(result.adminSeeded).toBe(false);
      expect(result.adminSkipped).toBe(true);
      expect(result.projectsSeeded).toBe(0);
      expect(result.projectsSkipped).toBe(initialProjects.length);
      expect(result.experiencesSeeded).toBe(0);
      expect(result.experiencesSkipped).toBe(initialExperiences.length);
      expect(insertCalled).toBe(false); // No insert queries executed!
    });

    it('aborts immediately with security error if connected session is qa_playground_db', async () => {
      process.env.SEED_ADMIN_PASSWORD = 'TestPassword123!';
      process.env.DB_NAME = 'qa_portfolio_dev';

      const mockDb = {
        $client: {
          query: async () => [[{ currentDb: 'qa_playground_db' }]],
        },
      };

      await expect(runSeed(mockDb)).rejects.toThrow(
        'Security violation: Connected session is "qa_playground_db".'
      );
    });

    it('aborts immediately if connected session mismatches expected target', async () => {
      process.env.SEED_ADMIN_PASSWORD = 'TestPassword123!';
      process.env.DB_NAME = 'qa_portfolio_dev';

      const mockDb = {
        $client: {
          query: async () => [[{ currentDb: 'some_other_db' }]],
        },
      };

      await expect(runSeed(mockDb)).rejects.toThrow(
        'Database connection mismatch! Target is "qa_portfolio_dev", but connected session is "some_other_db".'
      );
    });
  });
});
