/**
 * Unit tests for EmailService
 * Tests the Brevo email service integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService, createEmailService } from '../email.service';
import { EmailContext } from '../email.types';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EmailService', () => {
  const mockConfig = {
    brevoApiKey: 'test-api-key',
    senderEmail: 'test@trackmun.app',
    senderName: 'TrackMUN Test',
    frontendUrl: 'http://localhost:5173',
  };

  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService(mockConfig);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const service = new EmailService(mockConfig);
      expect(service).toBeDefined();
    });
  });

  describe('send', () => {
    const mockContext: EmailContext = {
      to: 'test@example.com',
      name: 'Test User',
      templateId: 1,
      params: { NAME: 'Test User' },
    };

    it('should send email successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messageId: 'test-message-id' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await emailService.send(mockContext);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': mockConfig.brevoApiKey,
          },
        })
      );
      expect(result).toEqual({ messageId: 'test-message-id' });
    });

    it('should send correct payload to Brevo API', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messageId: 'test-message-id' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await emailService.send(mockContext);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);

      expect(body).toEqual({
        sender: {
          email: mockConfig.senderEmail,
          name: mockConfig.senderName,
        },
        to: [{ email: mockContext.to, name: mockContext.name }],
        templateId: mockContext.templateId,
        params: mockContext.params,
      });
    });

    it('should throw error on API failure', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid template ID' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(emailService.send(mockContext)).rejects.toThrow(
        'Brevo API error (400): Invalid template ID'
      );
    });

    it('should handle API error without message field', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => ({}),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(emailService.send(mockContext)).rejects.toThrow(
        'Brevo API error (500): Unknown error'
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    const to = 'delegate@example.com';
    const name = 'John Delegate';
    const qrToken = 'test-qr-token-123';

    it('should send welcome email with correct QR link', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messageId: 'welcome-message-id' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      // Mock process.env for template ID
      const originalEnv = process.env;
      process.env = { ...originalEnv, BREVO_WELCOME_TEMPLATE_ID: '1' };

      const result = await emailService.sendWelcomeEmail(to, name, qrToken);

      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);
      
      expect(body.params).toEqual({
        NAME: name,
        QR_LINK: `${mockConfig.frontendUrl}/profile/qr?token=${qrToken}`,
        CONFERENCE_NAME: 'TrackMUN Conference',
      });
      
      process.env = originalEnv;
    });

    it('should return null when template ID is not configured', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, BREVO_WELCOME_TEMPLATE_ID: undefined };

      const result = await emailService.sendWelcomeEmail(to, name, qrToken);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
      
      process.env = originalEnv;
    });

    it('should return null on send failure without throwing', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const originalEnv = process.env;
      process.env = { ...originalEnv, BREVO_WELCOME_TEMPLATE_ID: '1' };

      const result = await emailService.sendWelcomeEmail(to, name, qrToken);

      expect(result).toBeNull();
      
      process.env = originalEnv;
    });
  });

  describe('sendQrReminder', () => {
    const to = 'delegate@example.com';
    const name = 'Jane Delegate';
    const daysUntilEvent = 5;

    it('should send QR reminder email with correct params', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messageId: 'reminder-message-id' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const originalEnv = process.env;
      process.env = { ...originalEnv, BREVO_QR_REMINDER_TEMPLATE_ID: '2' };

      const result = await emailService.sendQrReminder(to, name, daysUntilEvent);

      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);
      
      expect(body.params).toEqual({
        NAME: name,
        DAYS_LEFT: daysUntilEvent.toString(),
        CONFERENCE_NAME: 'TrackMUN Conference',
      });
      
      process.env = originalEnv;
    });

    it('should return null when template ID is not configured', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, BREVO_QR_REMINDER_TEMPLATE_ID: undefined };

      const result = await emailService.sendQrReminder(to, name, daysUntilEvent);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
      
      process.env = originalEnv;
    });
  });

  describe('sendPasswordReset', () => {
    const to = 'user@example.com';
    const name = 'Reset User';
    const resetToken = 'reset-token-xyz';

    it('should send password reset email with correct reset link', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messageId: 'reset-message-id' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const originalEnv = process.env;
      process.env = { ...originalEnv, BREVO_PASSWORD_RESET_TEMPLATE_ID: '3' };

      const result = await emailService.sendPasswordReset(to, name, resetToken);

      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);
      
      expect(body.params).toEqual({
        NAME: name,
        RESET_LINK: `${mockConfig.frontendUrl}/reset-password?token=${resetToken}`,
      });
      
      process.env = originalEnv;
    });

    it('should return null when template ID is not configured', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, BREVO_PASSWORD_RESET_TEMPLATE_ID: undefined };

      const result = await emailService.sendPasswordReset(to, name, resetToken);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
      
      process.env = originalEnv;
    });
  });
});

describe('createEmailService', () => {
  it('should create EmailService with correct config from env', () => {
    const mockEnv = {
      BREVO_API_KEY: 'env-api-key',
      BREVO_SENDER_EMAIL: 'env@trackmun.app',
      BREVO_SENDER_NAME: 'TrackMUN Env',
      FRONTEND_URL: 'http://env.local',
    };

    const service = createEmailService(mockEnv);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(EmailService);
  });
});
