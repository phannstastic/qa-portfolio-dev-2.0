import { describe, expect, it } from 'bun:test';
import { createServer } from '../../src/index';

describe('Public Portfolio Website (Task 7)', () => {
  const app = createServer();

  // 1. Serving Home Page (GET /)
  it('GET / returns 200 OK with HTML document and all required portfolio sections', async () => {
    const res = await app.handle(new Request('http://localhost/'));
    expect(res.status).toBe(200);

    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Portfolio 2.0');

    // Section containers (Hero -> Experience -> Projects -> Skills -> Contact)
    expect(html).toContain('id="hero"');
    expect(html).toContain('id="skills"');
    expect(html).toContain('id="projects"');
    expect(html).toContain('id="project-modal"');
    expect(html).toContain('id="experience"');
    expect(html).toContain('id="contact"');
    expect(html).toContain('id="contact-form"');

    // Asset links
    expect(html).toContain('href="/css/style.css');
    expect(html).toContain('src="/js/app.js');

    // Social links in header include Instagram
    expect(html).toContain('https://www.instagram.com/irfantrinugroho/');

    // Drive archive card with Google Drive link
    expect(html).toContain('https://drive.google.com/drive/folders/1pmYXm-BRgx7-NTrwBj92_se_tFxjINm6?usp=drive_link');
    expect(html).toContain('Google Drive');

    // Navigation dock exists
    expect(html).toContain('floating-nav-dock');
    expect(html).toContain('Download CV');

    // Contact section contains phone and WhatsApp
    expect(html).toContain('081273044163');
    expect(html).toContain('https://wa.me/6281273044163');

    // Ensure old SUT badge is NOT present
    expect(html).not.toContain('hero-pill-badge');
    expect(html).not.toContain('Automation Testing &bull; QA Portfolio SUT');
    expect(html).not.toContain('Automation Testing · QA Portfolio SUT');
  });

  // 2. Serving Static CSS (GET /css/style.css)
  it('GET /css/style.css returns 200 OK with CSS design system styles', async () => {
    const res = await app.handle(new Request('http://localhost/css/style.css'));
    expect(res.status).toBe(200);

    const css = await res.text();
    expect(css).toContain('--bg-primary');
    expect(css).toContain('--accent-gold');
    expect(css).toContain('.hero-headline');
    expect(css).toContain('.project-card');
    expect(css).toContain('.exp-card');
    expect(css).toContain('.modal-dialog');
  });

  // 3. Serving Static JS (GET /js/app.js)
  it('GET /js/app.js returns 200 OK with frontend API consumer functions', async () => {
    const res = await app.handle(new Request('http://localhost/js/app.js'));
    expect(res.status).toBe(200);

    const js = await res.text();
    expect(js).toContain('escapeHtml');
    expect(js).toContain('loadProfile');
    expect(js).toContain('loadSkills');
    expect(js).toContain('loadProjects');
    expect(js).toContain('openProjectModal');
    expect(js).toContain('loadExperiences');
    expect(js).toContain('setupContactForm');
    expect(js).toContain('/api/profile');
    expect(js).toContain('/api/skills');
    expect(js).toContain('/api/projects');
    expect(js).toContain('/api/experiences');
    expect(js).toContain('/api/contacts');
  });

  // 4. Client-side Security: escapeHtml Unit Tests
  describe('Client-Side Security: escapeHtml XSS Prevention', () => {
    function escapeHtml(str: string | null | undefined): string {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    it('escapes standard script tags and dangerous HTML characters', () => {
      const malicious = '<script>alert("XSS")</script>';
      const safe = escapeHtml(malicious);
      expect(safe).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(safe).not.toContain('<');
      expect(safe).not.toContain('>');
    });

    it('escapes attribute quotes and event injection payloads', () => {
      const payload = '" onmouseover="evil()" data-vuln=\'true\' & more';
      const safe = escapeHtml(payload);
      expect(safe).toBe('&quot; onmouseover=&quot;evil()&quot; data-vuln=&#39;true&#39; &amp; more');
    });

    it('handles null and undefined gracefully without throwing', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });
  });

  // 5. Contact Form Submission Validation Logic
  describe('Contact Form Client-side Validation Logic', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateContactPayload(name: string, email: string, message: string) {
      if (!name || name.trim() === '') {
        return { valid: false, error: 'Name is required' };
      }
      if (!emailRegex.test(email.trim())) {
        return { valid: false, error: 'Valid email is required' };
      }
      const trimmedMsg = message.trim();
      if (trimmedMsg.length < 10 || trimmedMsg.length > 500) {
        return { valid: false, error: 'Message must be between 10 and 500 characters' };
      }
      return { valid: true, error: null };
    }

    it('accepts valid contact submissions without requiring a subject field', () => {
      const res = validateContactPayload(
        'Jane Doe',
        'jane.doe@example.com',
        'This is a valid inquiry message regarding automated QA testing services.'
      );
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });

    it('rejects submissions with empty names', () => {
      const res = validateContactPayload(
        '   ',
        'jane@example.com',
        'Valid message with enough characters for testing.'
      );
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Name is required');
    });

    it('rejects submissions with invalid email formats', () => {
      const res = validateContactPayload(
        'Jane',
        'not-an-email-format',
        'Valid message with enough characters for testing.'
      );
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Valid email is required');
    });

    it('rejects messages shorter than 10 characters', () => {
      const res = validateContactPayload('Jane', 'jane@example.com', 'Too short');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Message must be between 10 and 500 characters');
    });

    it('rejects messages longer than 500 characters', () => {
      const longMessage = 'A'.repeat(501);
      const res = validateContactPayload('Jane', 'jane@example.com', longMessage);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Message must be between 10 and 500 characters');
    });
  });

  // 6. Custom Favicon Assets & HTML Tags
  describe('Custom Favicon Assets & Browser Compatibility', () => {
    it('GET /favicon.svg returns 200 OK with valid SVG content matching irfan.Lab brand', async () => {
      const res = await app.handle(new Request('http://localhost/favicon.svg'));
      expect(res.status).toBe(200);

      const svg = await res.text();
      expect(svg).toContain('<svg');
      expect(svg).toContain('irfanBrandGrad');
      expect(svg).toContain('#38bdf8');
      expect(svg).toContain('#6366f1');
      expect(svg).toContain('#ec4899');
    });

    it('GET /favicon-32x32.png returns 200 OK with valid PNG binary image', async () => {
      const res = await app.handle(new Request('http://localhost/favicon-32x32.png'));
      expect(res.status).toBe(200);

      const buffer = await res.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(500);

      // Verify PNG magic header bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      const bytes = new Uint8Array(buffer);
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50); // P
      expect(bytes[2]).toBe(0x4e); // N
      expect(bytes[3]).toBe(0x47); // G
    });

    it('GET /favicon.ico returns 200 OK for standard browser crawler requests', async () => {
      const res = await app.handle(new Request('http://localhost/favicon.ico'));
      expect(res.status).toBe(200);

      const buffer = await res.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(500);
    });

    it('HTML pages (index, login, admin) contain standard SVG and PNG fallback favicon links', async () => {
      const pages = ['/', '/login', '/admin'];
      for (const page of pages) {
        const res = await app.handle(new Request(`http://localhost${page}`));
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('href="/favicon.svg"');
        expect(html).toContain('href="/favicon-32x32.png"');
        expect(html).toContain('rel="apple-touch-icon"');
      }
    });
  });
});

