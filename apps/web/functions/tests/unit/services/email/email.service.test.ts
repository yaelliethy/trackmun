import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService, createEmailService } from '#src/services/email/email.service';
import type { EmailContext } from '#src/services/email/email.types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EmailService', () => {
  const mockConfig = {
    brevoApiKey: 'test-api-key',
    senderEmail: 'test@trackmun.app',
    senderName: 'TrackMUN Test',
    frontendUrl: 'http://localhost:5173',
  };

  const templateIds = {
    WELCOME: 1,
    QR_REMINDER: 2,
    PASSWORD_RESET: 3,
  };

  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService(mockConfig, templateIds);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('initializes with provided config', () => {
      const service = new EmailService(mockConfig, templateIds);
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

    it('sends email successfully', async () => {
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

    it('sends correct payload to Brevo API', async () => {
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

    it('throws on API failure', async () => {
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

    it('uses Unknown error when message field is missing', async () => {
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

    it('sends welcome email with correct QR link', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messageId: 'welcome-message-id' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await emailService.sendWelcomeEmail(to, name, qrToken);

      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);

      expect(body.params).toEqual({
        NAME: name,
        QR_LINK: `${mockConfig.frontendUrl}/profile/qr?token=${qrToken}`,
        CONFERENCE_NAME: 'TrackMUN Conference',
      });
      expect(result).toEqual({ messageId: 'welcome-message-id' });
    });

    it('returns null when WELCOME template ID is not configured', async () => {
      const svc = new EmailService(mockConfig, {});
      const result = await svc.sendWelcomeEmail(to, name, qrToken);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null on send failure without throwing', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await emailService.sendWelcomeEmail(to, name, qrToken);

      expect(result).toBeNull();
    });
  });

  describe('sendQrReminder', () => {
    const to = 'delegate@example.com';
    const name = 'Jane Delegate';
    const daysUntilEvent = 5;

    it('sends QR reminder email with correct params', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messageId: 'reminder-message-id' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await emailService.sendQrReminder(to, name, daysUntilEvent);

      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);

      expect(body.params).toEqual({
        NAME: name,
        DAYS_LEFT: daysUntilEvent.toString(),
        CONFERENCE_NAME: 'TrackMUN Conference',
      });
      expect(result).toEqual({ messageId: 'reminder-message-id' });
    });

    it('returns null when QR_REMINDER template ID is not configured', async () => {
      const svc = new EmailService(mockConfig, {});
      const result = await svc.sendQrReminder(to, name, daysUntilEvent);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('sendPasswordReset', () => {
    const to = 'user@example.com';
    const name = 'Reset User';
    const resetToken = 'reset-token-xyz';

    it('sends password reset email with correct reset link', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ messageId: 'reset-message-id' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await emailService.sendPasswordReset(to, name, resetToken);

      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);

      expect(body.params).toEqual({
        NAME: name,
        RESET_LINK: `${mockConfig.frontendUrl}/reset-password?token=${resetToken}`,
      });
      expect(result).toEqual({ messageId: 'reset-message-id' });
    });

    it('returns null when PASSWORD_RESET template ID is not configured', async () => {
      const svc = new EmailService(mockConfig, {});
      const result = await svc.sendPasswordReset(to, name, resetToken);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

describe('createEmailService', () => {
  it('creates EmailService with config from env', () => {
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
