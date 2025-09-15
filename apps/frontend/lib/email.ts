import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check for environment variables
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailHost || !emailPort || !emailUser || !emailPass) {
      console.warn('Email configuration missing. Email notifications will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: emailHost,
        port: parseInt(emailPort),
        secure: parseInt(emailPort) === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized. Cannot send email.');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Test the email configuration
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email connection test successful');
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
const emailService = new EmailService();

export default emailService;

// Email templates
export const createIncidentEmailTemplate = (
  monitorName: string,
  monitorUrl: string,
  incidentTitle: string,
  timestamp: Date,
  escalationLevel: number,
  customMessage?: string
) => {
  const formattedDate = timestamp.toLocaleString();
  
  return {
    subject: `🚨 Alert: ${monitorName} is down (Level ${escalationLevel})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 Monitor Alert - Level ${escalationLevel}</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
          <h2 style="color: #dc3545; margin-top: 0;">Incident Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Monitor:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${monitorName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">URL:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <a href="${monitorUrl}" style="color: #007bff; text-decoration: none;">${monitorUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Issue:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${incidentTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Time:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Escalation Level:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Level ${escalationLevel}</td>
            </tr>
          </table>

          ${customMessage ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Custom Message:</h3>
            <p style="margin-bottom: 0;">${customMessage}</p>
          </div>
          ` : ''}

          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'}/monitors" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Monitor Dashboard
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #6c757d;">
            <p>This is an automated alert from your W3Uptime monitoring system.</p>
            <p>If you believe this is a false alarm, please check your monitor configuration.</p>
          </div>
        </div>
      </div>
    `,
    text: `
🚨 Monitor Alert - Level ${escalationLevel}

Monitor: ${monitorName}
URL: ${monitorUrl}
Issue: ${incidentTitle}
Time: ${formattedDate}
Escalation Level: Level ${escalationLevel}

${customMessage ? `Custom Message: ${customMessage}` : ''}

View your monitor dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'}/monitors

This is an automated alert from your W3Uptime monitoring system.
    `
  };
};

export const createRecoveryEmailTemplate = (
  monitorName: string,
  monitorUrl: string,
  timestamp: Date,
  downtimeDuration?: number
) => {
  const formattedDate = timestamp.toLocaleString();
  const downtimeText = downtimeDuration 
    ? `The service was down for approximately ${Math.round(downtimeDuration / 60)} minutes.`
    : '';
  
  return {
    subject: `✅ Resolved: ${monitorName} is back online`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">✅ Monitor Recovered</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
          <h2 style="color: #28a745; margin-top: 0;">Service Restored</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Monitor:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${monitorName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">URL:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <a href="${monitorUrl}" style="color: #007bff; text-decoration: none;">${monitorUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Recovered At:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${formattedDate}</td>
            </tr>
          </table>

          ${downtimeText ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffeaa7;">
            <p style="margin: 0; color: #856404;">${downtimeText}</p>
          </div>
          ` : ''}

          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'}/monitors" 
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Monitor Dashboard
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #6c757d;">
            <p>This is an automated recovery notification from your W3Uptime monitoring system.</p>
          </div>
        </div>
      </div>
    `,
    text: `
✅ Monitor Recovered

Monitor: ${monitorName}
URL: ${monitorUrl}
Recovered At: ${formattedDate}
${downtimeText}

View your monitor dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'}/monitors

This is an automated recovery notification from your W3Uptime monitoring system.
    `
  };
};
