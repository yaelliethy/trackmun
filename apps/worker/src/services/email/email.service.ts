/**
 * Email service for sending transactional emails via Brevo
 * 
 * This service handles all email communications in the TrackMUN platform.
 * It uses Brevo's transactional email API for reliable delivery.
 */

import {
  EmailContext,
  BrevoSendResponse,
  BrevoEmailPayload,
  EmailServiceConfig,
  EmailTemplateType,
} from './email.types';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export class EmailService {
  private config: EmailServiceConfig;
  private templateIds: Partial<Record<EmailTemplateType, number>>;

  constructor(config: EmailServiceConfig, templateIds?: {
    WELCOME?: number;
    QR_REMINDER?: number;
    PASSWORD_RESET?: number;
  }) {
    this.config = config;
    this.templateIds = templateIds || {};
  }

  /**
   * Send an email using Brevo's transactional API
   * 
   * @param context - Email context including recipient, template, and params
   * @returns Brevo send response with message ID
   * @throws Error if Brevo API request fails
   */
  async send(context: EmailContext): Promise<BrevoSendResponse> {
    const payload: BrevoEmailPayload = {
      sender: {
        email: this.config.senderEmail,
        name: this.config.senderName,
      },
      to: [{ email: context.to, name: context.name }],
      templateId: context.templateId,
      params: context.params,
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.brevoApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch((): { message: string } => ({ message: 'Unknown error' })) as { message: string };
      throw new Error(`Brevo API error (${response.status}): ${errorData.message}`);
    }

    return response.json<BrevoSendResponse>();
  }

  /**
   * Send a welcome email to a newly registered delegate
   * Includes their QR code link for easy access
   * 
   * @param to - Recipient email address
   * @param name - Recipient name
   * @param qrToken - QR token for generating the profile QR link
   * @returns Promise that resolves when email is sent (or fails silently)
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    qrToken: string
  ): Promise<BrevoSendResponse | null> {
    const templateId = this.getTemplateId('WELCOME');
    
    if (!templateId) {
      console.warn('WELCOME template ID not configured, skipping welcome email');
      return null;
    }

    const qrLink = `${this.config.frontendUrl}/profile/qr?token=${qrToken}`;

    try {
      return await this.send({
        to,
        name,
        templateId,
        params: {
          NAME: name,
          QR_LINK: qrLink,
          CONFERENCE_NAME: 'TrackMUN Conference',
        },
      });
    } catch (error) {
      console.error('Failed to send welcome email', {
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Send a QR code reminder email
   * 
   * @param to - Recipient email address
   * @param name - Recipient name
   * @param daysUntilEvent - Number of days until the conference
   * @returns Promise that resolves when email is sent (or fails silently)
   */
  async sendQrReminder(
    to: string,
    name: string,
    daysUntilEvent: number
  ): Promise<BrevoSendResponse | null> {
    const templateId = this.getTemplateId('QR_REMINDER');
    
    if (!templateId) {
      console.warn('QR_REMINDER template ID not configured, skipping reminder email');
      return null;
    }

    try {
      return await this.send({
        to,
        name,
        templateId,
        params: {
          NAME: name,
          DAYS_LEFT: daysUntilEvent.toString(),
          CONFERENCE_NAME: 'TrackMUN Conference',
        },
      });
    } catch (error) {
      console.error('Failed to send QR reminder email', {
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Send a password reset email
   * 
   * @param to - Recipient email address
   * @param name - Recipient name
   * @param resetToken - Password reset token
   * @returns Promise that resolves when email is sent (or fails silently)
   */
  async sendPasswordReset(
    to: string,
    name: string,
    resetToken: string
  ): Promise<BrevoSendResponse | null> {
    const templateId = this.getTemplateId('PASSWORD_RESET');
    
    if (!templateId) {
      console.warn('PASSWORD_RESET template ID not configured, skipping reset email');
      return null;
    }

    const resetLink = `${this.config.frontendUrl}/reset-password?token=${resetToken}`;

    try {
      return await this.send({
        to,
        name,
        templateId,
        params: {
          NAME: name,
          RESET_LINK: resetLink,
        },
      });
    } catch (error) {
      console.error('Failed to send password reset email', {
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get template ID from template type
   * Uses the template IDs provided in constructor
   *
   * @param type - Email template type
   * @returns Template ID or null if not configured
   */
  private getTemplateId(type: EmailTemplateType): number | null {
    const templateId = this.templateIds[type];
    return templateId && templateId > 0 ? templateId : null;
  }
}

/**
 * Factory function to create EmailService from Worker bindings
 *
 * @param env - Worker environment bindings
 * @returns Configured EmailService instance
 */
export function createEmailService(env: {
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  FRONTEND_URL: string;
  BREVO_WELCOME_TEMPLATE_ID?: string;
  BREVO_QR_REMINDER_TEMPLATE_ID?: string;
  BREVO_PASSWORD_RESET_TEMPLATE_ID?: string;
}): EmailService {
  return new EmailService(
    {
      brevoApiKey: env.BREVO_API_KEY,
      senderEmail: env.BREVO_SENDER_EMAIL,
      senderName: env.BREVO_SENDER_NAME,
      frontendUrl: env.FRONTEND_URL,
    },
    {
      WELCOME: env.BREVO_WELCOME_TEMPLATE_ID ? Number(env.BREVO_WELCOME_TEMPLATE_ID) : undefined,
      QR_REMINDER: env.BREVO_QR_REMINDER_TEMPLATE_ID ? Number(env.BREVO_QR_REMINDER_TEMPLATE_ID) : undefined,
      PASSWORD_RESET: env.BREVO_PASSWORD_RESET_TEMPLATE_ID ? Number(env.BREVO_PASSWORD_RESET_TEMPLATE_ID) : undefined,
    }
  );
}
