import nodemailer from 'nodemailer';


const createTransporter = () => {
  if (!process.env.GOOGLE_APP_USER || !process.env.GOOGLE_APP_PASSWORD) {
    throw new Error('Email configuration missing: GOOGLE_APP_USER and GOOGLE_APP_PASSWORD environment variables are required');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GOOGLE_APP_USER,
      pass: process.env.GOOGLE_APP_PASSWORD,
    },
    secure: true,
    port: 465,
  });
};


const createEscalationEmailTemplate = (
  title: string,
  message: string,
  monitorId: string,
  incidentId?: string,
  recipientEmail?: string,
  escalationLogId?: string
) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>W3Uptime Alert</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .alert-badge { background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .monitor-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ef4444; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .btn-acknowledge { background: #10b981; }
            .btn-acknowledge:hover { background: #059669; }
            .actions { text-align: center; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1> W3Uptime Alert</h1>
                <span class="alert-badge">ESCALATION</span>
            </div>
            <div class="content">
                <h2>${title}</h2>
                <div class="monitor-info">
                    <h3>Alert Details</h3>
                    <p><strong>Message:</strong></p>
                    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">${message}</pre>
                    <p><strong>Monitor ID:</strong> ${monitorId}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p>This alert has been escalated and requires your immediate attention.</p>
                <div class="actions">
                    ${escalationLogId ? `<a href="${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}/acknowledge/${escalationLogId}?via=email&contact=${encodeURIComponent(recipientEmail || '')}" class="btn btn-acknowledge">
                        ✓ Acknowledge Alert
                    </a>` : `<!-- DEBUG: No escalationLogId (${escalationLogId}) -->`}
                    <a href="${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}/monitors/${monitorId}" class="btn">
                        View Monitor Details
                    </a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated message from W3Uptime monitoring service.</p>
                <p>If you believe this is an error, please contact support.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
W3UPTIME ALERT - ESCALATION

${title}

Alert Details:
- Message: ${message}
- Monitor ID: ${monitorId}
- Time: ${new Date().toLocaleString()}

This alert has been escalated and requires your immediate attention.

${escalationLogId ? `ACKNOWLEDGE ALERT: ${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}/acknowledge/${escalationLogId}?via=email&contact=${encodeURIComponent(recipientEmail || '')}

` : ''}View monitor details: ${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}/monitors/${monitorId}

---
This is an automated message from W3Uptime monitoring service.
  `;

  return { html, text };
};

// Email template for incident resolution notifications
const createResolutionEmailTemplate = (
  title: string,
  monitorName: string,
  monitorUrl: string,
  resolvedAt: Date,
  incidentId?: string,
  downtime?: number,
  recipientEmail?: string
) => {
  const downtimeText = downtime ? `${Math.round(downtime / 1000 / 60)} minutes` : 'Unknown duration';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>W3Uptime Incident Resolved</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .resolved-badge { background: #059669; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .monitor-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .actions { text-align: center; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1> W3Uptime Incident Resolved</h1>
                <span class="resolved-badge">RESOLVED</span>
            </div>
            <div class="content">
                <h2>${title} - Resolved</h2>
                <div class="monitor-info">
                    <h3>Resolution Details</h3>
                    <p><strong>Monitor:</strong> ${monitorName}</p>
                    <p><strong>URL:</strong> ${monitorUrl}</p>
                    <p><strong>Resolved At:</strong> ${resolvedAt.toLocaleString()}</p>
                    <p><strong>Total Downtime:</strong> ${downtimeText}</p>
                </div>
                <p>The incident has been resolved and the monitor is functioning normally again.</p>
                <div class="actions">
                    <a href="${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}/monitors" class="btn">
                        View All Monitors
                    </a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated message from W3Uptime monitoring service.</p>
                <p>You received this because you were previously notified about this incident.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
W3UPTIME INCIDENT RESOLVED

${title} - Resolved

Resolution Details:
- Monitor: ${monitorName}
- URL: ${monitorUrl}
- Resolved At: ${resolvedAt.toLocaleString()}
- Total Downtime: ${downtimeText}

The incident has been resolved and the monitor is functioning normally again.

View all monitors: ${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}/monitors

---
This is an automated message from W3Uptime monitoring service.
You received this because you were previously notified about this incident.
  `;

  return { html, text };
};

// Send escalation email function
export async function sendEscalationEmail(
  contacts: string[],
  title: string,
  message: string,
  monitorId: string,
  incidentId?: string,
  escalationLogId?: string
): Promise<void> {
  console.log('Email escalation - escalationLogId:', escalationLogId);
  try {
    // Validate email addresses
    const validEmails = contacts.filter(email => 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );

    if (validEmails.length === 0) {
      throw new Error('No valid email addresses provided');
    }

    // Create transporter
    const transporter = createTransporter();

    // Verify SMTP connection
    await transporter.verify();

    // Send email to each contact
    const emailPromises = validEmails.map(async (email) => {
      // Generate personalized email template for each recipient
      const { html, text } = createEscalationEmailTemplate(title, message, monitorId, incidentId, email, escalationLogId);
      
      const mailOptions = {
        from: {
          name: 'W3Uptime Alerts',
          address: process.env.GOOGLE_APP_USER!,
        },
        to: email,
        subject: ` W3Uptime Alert: ${title}`,
        text,
        html,
        priority: 'high' as const,
      };

      return transporter.sendMail(mailOptions);
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    console.log(`Escalation emails sent successfully to: ${validEmails.join(', ')}`);
  } catch (error) {
    console.error(`L Failed to send escalation emails:`, error);
    throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Send resolution email function
export async function sendResolutionEmail(
  contacts: string[],
  title: string,
  monitorName: string,
  monitorUrl: string,
  resolvedAt: Date,
  incidentId?: string,
  downtime?: number
): Promise<void> {
  try {
    // Validate email addresses
    const validEmails = contacts.filter(email => 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );

    if (validEmails.length === 0) {
      throw new Error('No valid email addresses provided');
    }

    // Create transporter
    const transporter = createTransporter();

    // Verify SMTP connection
    await transporter.verify();

    // Send email to each contact
    const emailPromises = validEmails.map(async (email) => {
      // Generate personalized email template for each recipient
      const { html, text } = createResolutionEmailTemplate(title, monitorName, monitorUrl, resolvedAt, incidentId, downtime, email);
      
      const mailOptions = {
        from: {
          name: 'W3Uptime Alerts',
          address: process.env.GOOGLE_APP_USER!,
        },
        to: email,
        subject: ` W3Uptime Resolved: ${title}`,
        text,
        html,
        priority: 'normal' as const,
      };

      return transporter.sendMail(mailOptions);
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    console.log(`Resolution emails sent successfully to: ${validEmails.join(', ')}`);
  } catch (error) {
    console.error(`Failed to send resolution emails:`, error);
    throw new Error(`Resolution email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('L Email configuration failed:', error);
    return false;
  }
}