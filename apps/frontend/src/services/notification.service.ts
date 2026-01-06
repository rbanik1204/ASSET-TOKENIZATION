/**
 * Notification Service
 * Handles real email and SMS notifications using SendGrid and Twilio
 */

import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
if (SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.')) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Initialize Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let twilioClient: ReturnType<typeof twilio> | null = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_ACCOUNT_SID.startsWith('AC')) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// Email templates
const EMAIL_TEMPLATES = {
  ASSET_SUBMITTED: {
    subject: '🎉 Asset Submission Received',
    getHtml: (data: { assetName: string; walletAddress: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Asset Submission Received</h2>
        <p>Thank you for submitting your asset for tokenization!</p>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Asset Name:</strong> ${data.assetName}</p>
          <p><strong>Wallet Address:</strong> ${data.walletAddress}</p>
        </div>
        <p>Our compliance team will review your submission within 3-5 business days.</p>
        <p style="color: #64748b; font-size: 14px;">You can track the status inside the platform.</p>
      </div>
    `,
  },
  ASSET_APPROVED: {
    subject: '✅ Asset Approved for Tokenization',
    getHtml: (data: { assetName: string; tokenAddress: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Asset Approved!</h2>
        <p>Great news! Your asset has been approved and is now live on the marketplace.</p>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Asset Name:</strong> ${data.assetName}</p>
          <p><strong>Token Address:</strong> ${data.tokenAddress}</p>
        </div>
        <p>Investors can now purchase tokens representing ownership in your asset.</p>
        <a href="https://asset-linked-c4ef2.web.app/assets/${data.tokenAddress}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Your Asset</a>
      </div>
    `,
  },
  TOKENS_PURCHASED: {
    subject: '💰 New Token Purchase',
    getHtml: (data: { assetName: string; amount: string; buyer: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Token Purchase</h2>
        <p>Someone just purchased tokens from your asset!</p>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Asset:</strong> ${data.assetName}</p>
          <p><strong>Amount:</strong> ${data.amount} tokens</p>
          <p><strong>Buyer:</strong> ${data.buyer}</p>
        </div>
        <p>Check your portfolio for updated statistics.</p>
      </div>
    `,
  },
  INCOME_DEPOSITED: {
    subject: '💵 Income Deposited',
    getHtml: (data: { assetName: string; amount: string; currency: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Income Deposited</h2>
        <p>Income has been deposited for your tokenized asset!</p>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Asset:</strong> ${data.assetName}</p>
          <p><strong>Amount:</strong> ${data.amount} ${data.currency}</p>
        </div>
        <p>Token holders can now claim their share of the income.</p>
        <a href="https://asset-linked-c4ef2.web.app/income" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Claim Income</a>
      </div>
    `,
  },
};

// SMS templates
const SMS_TEMPLATES = {
  ASSET_SUBMITTED: (data: { assetName: string }) =>
    `Asset Tokenization: Your asset "${data.assetName}" has been submitted for review. You'll be notified once approved.`,
  
  ASSET_APPROVED: (data: { assetName: string }) =>
    `Asset Tokenization: Great news! Your asset "${data.assetName}" has been approved and is now live on the marketplace.`,
  
  TOKENS_PURCHASED: (data: { assetName: string; amount: string }) =>
    `Asset Tokenization: ${data.amount} tokens purchased from your asset "${data.assetName}". Check your portfolio for details.`,
  
  INCOME_DEPOSITED: (data: { assetName: string; amount: string }) =>
    `Asset Tokenization: Income deposited for "${data.assetName}": ${data.amount}. Claim it now!`,
};

export type NotificationType = 
  | 'ASSET_SUBMITTED'
  | 'ASSET_APPROVED'
  | 'TOKENS_PURCHASED'
  | 'INCOME_DEPOSITED';

export interface NotificationPayload {
  type: NotificationType;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  data: Record<string, any>;
}

export interface NotificationResult {
  email?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
  sms?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
}

/**
 * Send email notification via SendGrid
 */
async function sendEmail(
  to: string,
  type: NotificationType,
  data: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!SENDGRID_API_KEY) {
      return { success: false, error: 'SendGrid API key not configured' };
    }

    const template = EMAIL_TEMPLATES[type];
    if (!template) {
      return { success: false, error: `Unknown email template: ${type}` };
    }

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@asset-tokenization.com',
      subject: template.subject,
      html: template.getHtml(data as any),
    };

    const [response] = await sgMail.send(msg);
    
    return {
      success: true,
      messageId: response.headers['x-message-id'] || 'sent',
    };
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Send SMS notification via Twilio
 */
async function sendSMS(
  to: string,
  type: NotificationType,
  data: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      return { success: false, error: 'Twilio not configured' };
    }

    const template = SMS_TEMPLATES[type];
    if (!template) {
      return { success: false, error: `Unknown SMS template: ${type}` };
    }

    const message = await twilioClient.messages.create({
      body: template(data as any),
      from: TWILIO_PHONE_NUMBER,
      to,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

/**
 * Send notification (email and/or SMS)
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const result: NotificationResult = {};

  // Send email if provided
  if (payload.recipientEmail) {
    result.email = await sendEmail(
      payload.recipientEmail,
      payload.type,
      payload.data
    );
  }

  // Send SMS if provided
  if (payload.recipientPhone) {
    result.sms = await sendSMS(
      payload.recipientPhone,
      payload.type,
      payload.data
    );
  }

  return result;
}

/**
 * Validate notification service configuration
 */
export function isNotificationConfigured(): {
  email: boolean;
  sms: boolean;
} {
  return {
    email: Boolean(SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.')),
    sms: Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && TWILIO_ACCOUNT_SID.startsWith('AC')),
  };
}
