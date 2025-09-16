import * as nodemailer from 'nodemailer';
import { getEmailConfig } from '../config';
import { NotificationResult } from '../types';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      const config = getEmailConfig();
      
      if (!config.auth.user || !config.auth.pass) {
        console.warn('Email configuration missing. Email notifications will be disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });

      console.log('📧 Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  async sendEmail(to: string[], template: EmailTemplate): Promise<NotificationResult> {
    if (!this.transporter) {
      return {
        success: false,
        sentTo: [],
        errors: ['Email service not initialized']
      };
    }

    const config = getEmailConfig();
    const from = config.from || config.auth.user;
    const sentTo: string[] = [];
    const errors: string[] = [];

    for (const recipient of to) {
      try {
        if (!this.isValidEmail(recipient)) {
          errors.push(`Invalid email address: ${recipient}`);
          continue;
        }

        const info = await this.transporter.sendMail({
          from,
          to: recipient,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        sentTo.push(recipient);
        console.log(`📧 Email sent to ${recipient}: ${info.messageId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to send to ${recipient}: ${errorMessage}`);
        console.error(`❌ Failed to send email to ${recipient}:`, error);
      }
    }

    return {
      success: sentTo.length > 0,
      sentTo,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Email template generators
export const createIncidentEmailTemplate = (
  monitorName: string,
  monitorUrl: string,
  incidentTitle: string,
  timestamp: Date,
  levelOrder: number,
  customMessage?: string
): EmailTemplate => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `🚨 Alert: ${monitorName} is down (Level ${levelOrder})`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Service Alert</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb; border-left: 4px solid #dc2626;">
        <h2 style="color: #dc2626; margin: 0 0 20px 0;">${incidentTitle}</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Monitor Details</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${monitorName}</p>
          <p style="margin: 5px 0;"><strong>URL:</strong> <a href="${monitorUrl}" style="color: #2563eb;">${monitorUrl}</a></p>
          <p style="margin: 5px 0;"><strong>Escalation Level:</strong> ${levelOrder}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
        </div>

        ${customMessage ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">Custom Message</h4>
            <p style="margin: 0; color: #92400e;">${customMessage}</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/monitors" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Monitor Dashboard
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>This is an automated alert from W3Uptime monitoring system.</p>
      </div>
    </div>
  `;

  const text = `
🚨 SERVICE ALERT - Level ${levelOrder}

${incidentTitle}

Monitor Details:
- Service: ${monitorName}
- URL: ${monitorUrl}
- Escalation Level: ${levelOrder}
- Time: ${timestamp.toLocaleString()}

${customMessage ? `Custom Message: ${customMessage}\n` : ''}

View Monitor Dashboard: ${appUrl}/monitors

This is an automated alert from W3Uptime monitoring system.
  `.trim();

  return { subject, html, text };
};

export const createRecoveryEmailTemplate = (
  monitorName: string,
  monitorUrl: string,
  recoveryTime: Date,
  downtimeDuration?: string
): EmailTemplate => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `✅ Resolved: ${monitorName} is back online`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Service Recovered</h1>
      </div>
      
      <div style="padding: 30px; background: #f0fdf4; border-left: 4px solid #059669;">
        <h2 style="color: #059669; margin: 0 0 20px 0;">Service is back online!</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Recovery Details</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${monitorName}</p>
          <p style="margin: 5px 0;"><strong>URL:</strong> <a href="${monitorUrl}" style="color: #2563eb;">${monitorUrl}</a></p>
          <p style="margin: 5px 0;"><strong>Recovery Time:</strong> ${recoveryTime.toLocaleString()}</p>
          ${downtimeDuration ? `<p style="margin: 5px 0;"><strong>Downtime Duration:</strong> ${downtimeDuration}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/monitors" 
             style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Monitor Dashboard
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>This is an automated recovery notification from W3Uptime monitoring system.</p>
      </div>
    </div>
  `;

  const text = `
✅ SERVICE RECOVERED

${monitorName} is back online!

Recovery Details:
- Service: ${monitorName}
- URL: ${monitorUrl}
- Recovery Time: ${recoveryTime.toLocaleString()}
${downtimeDuration ? `- Downtime Duration: ${downtimeDuration}\n` : ''}

View Monitor Dashboard: ${appUrl}/monitors

This is an automated recovery notification from W3Uptime monitoring system.
  `.trim();

  return { subject, html, text };
};

export default new EmailService();
