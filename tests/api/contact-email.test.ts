import { describe, expect, it, mock } from 'bun:test';
import { createServer } from '../../src/index';
import { ResendEmailService, type EmailService, type EmailNotificationPayload } from '../../src/services/email';

// Helper mock DB generator
function createMockContactDb(options?: { shouldThrow?: boolean }) {
  const insertedRows: any[] = [];
  return {
    insertedRows,
    insert: (table: any) => ({
      values: async (data: any) => {
        if (options?.shouldThrow) {
          throw new Error('Simulated database error on insert');
        }
        const row = { id: insertedRows.length + 1, ...data };
        insertedRows.push(row);
        return [{ insertId: row.id, id: row.id }];
      },
    }),
  };
}

describe('Contact Form Email Notification Service (Resend Integration)', () => {
  // 1. ResendEmailService Unit Tests
  describe('ResendEmailService Unit Tests', () => {
    it('gracefully skips email dispatch when RESEND_API_KEY is not configured', async () => {
      const emailService = new ResendEmailService({ apiKey: '' });
      const result = await emailService.sendContactNotification({
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'QA Automation Inquiry',
        message: 'Looking for a reliable test automation engineer for our project.',
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.error).toBe('RESEND_API_KEY is not configured');
    });

    it('successfully calls Resend REST API when API key is provided (mock fetch)', async () => {
      const originalFetch = globalThis.fetch;
      let capturedUrl = '';
      let capturedOptions: any = null;

      globalThis.fetch = (async (url: string, options: any) => {
        capturedUrl = url;
        capturedOptions = options;
        return new Response(JSON.stringify({ id: 're_mock_email_12345' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      try {
        const emailService = new ResendEmailService({
          apiKey: 're_test_mock_secret_key_123',
          toEmail: 'rphannfvs@gmail.com',
          fromEmail: 'irfan.Lab <onboarding@resend.dev>',
        });

        const result = await emailService.sendContactNotification({
          name: 'Irfan Client',
          email: 'client@company.com',
          subject: 'Contract QA Project',
          message: 'We would like to hire you for Cypress & Katalon test automation.',
        });

        expect(result.success).toBe(true);
        expect(result.id).toBe('re_mock_email_12345');
        expect(capturedUrl).toBe('https://api.resend.com/emails');
        expect(capturedOptions.method).toBe('POST');
        expect(capturedOptions.headers.Authorization).toBe('Bearer re_test_mock_secret_key_123');

        const parsedBody = JSON.parse(capturedOptions.body);
        expect(parsedBody.to).toEqual(['rphannfvs@gmail.com']);
        expect(parsedBody.from).toBe('irfan.Lab <onboarding@resend.dev>');
        expect(parsedBody.reply_to).toBe('client@company.com');
        expect(parsedBody.subject).toContain('Contract QA Project');
        expect(parsedBody.html).toContain('Irfan Client');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles Resend API error safely (e.g. unverified domain or 403) without throwing', async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            statusCode: 403,
            message: 'Domain not verified. You can only send testing emails to your own email address.',
            name: 'validation_error',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        const emailService = new ResendEmailService({
          apiKey: 're_test_mock_unverified_key',
        });

        const result = await emailService.sendContactNotification({
          name: 'External Visitor',
          email: 'visitor@external.org',
          message: 'Testing unverified domain response handling in email service.',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Domain not verified');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // 2. Integration with POST /api/contacts
  describe('POST /api/contacts Backend Integration', () => {
    it('saves inquiry to database AND triggers mock email service with 201 response', async () => {
      const mockDb = createMockContactDb();
      let emailDispatchedWith: EmailNotificationPayload | null = null;

      const mockEmailService: EmailService = {
        async sendContactNotification(payload) {
          emailDispatchedWith = payload;
          return { success: true, id: 're_mock_test_id' };
        },
      };

      const app = createServer({ db: mockDb as any, emailService: mockEmailService });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Sarah QA Lead',
            email: 'sarah.lead@techcorp.io',
            subject: 'Consulting Opportunity',
            message: 'Hello Irfan, we are interested in discussing your manual and automation QA experience.',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(body.data.name).toBe('Sarah QA Lead');
      expect(body.data.email).toBe('sarah.lead@techcorp.io');

      // Verify record is in database
      expect(mockDb.insertedRows.length).toBe(1);
      expect(mockDb.insertedRows[0].name).toBe('Sarah QA Lead');

      // Verify email was dispatched
      expect(emailDispatchedWith).not.toBeNull();
      expect(emailDispatchedWith!.name).toBe('Sarah QA Lead');
      expect(emailDispatchedWith!.email).toBe('sarah.lead@techcorp.io');
      expect(emailDispatchedWith!.message).toContain('interested in discussing');
    });

    it('still saves inquiry and returns 201 even when email service fails or throws (graceful degradation)', async () => {
      const mockDb = createMockContactDb();

      const failingEmailService: EmailService = {
        async sendContactNotification() {
          // Simulate network failure or unconfigured key
          return { success: false, error: 'Simulated Resend API timeout' };
        },
      };

      const app = createServer({ db: mockDb as any, emailService: failingEmailService });

      const response = await app.handle(
        new Request('http://localhost/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Resilient Tester',
            email: 'resilient@example.com',
            message: 'Ensuring database record persists even when email notification fails.',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as any;
      expect(body.status).toBe('success');
      expect(mockDb.insertedRows.length).toBe(1);
      expect(mockDb.insertedRows[0].email).toBe('resilient@example.com');
    });
  });
});
