/**
 * Email service types for Brevo integration
 */

export type EmailTemplateType = 'WELCOME' | 'QR_REMINDER' | 'PASSWORD_RESET';

export interface EmailContext {
  to: string;
  name: string;
  templateId: number;
  params: Record<string, string>;
}

export interface BrevoSendResponse {
  messageId: string;
}

export interface BrevoSender {
  email: string;
  name: string;
}

export interface BrevoRecipient {
  email: string;
  name: string;
}

export interface BrevoEmailPayload {
  sender: BrevoSender;
  to: BrevoRecipient[];
  templateId: number;
  params: Record<string, string>;
}

export interface EmailServiceConfig {
  brevoApiKey: string;
  senderEmail: string;
  senderName: string;
  frontendUrl: string;
}
