# Email Notifications with Nodemailer Integration

This document explains how to set up and use email notifications in the W3Uptime escalation policy system.

## Overview

The email notification system automatically sends alerts when monitors go down and recovery notifications when they come back online. It integrates with the existing escalation policy system to provide multi-level notifications with configurable wait times.

## Architecture

```
Monitor Down → Database Trigger → Notification Handler → Escalation Service → Email Service → User
```

### Key Components

1. **Email Service** (`lib/email.ts`) - Handles email configuration and sending
2. **Escalation Service** (`lib/escalation.ts`) - Manages escalation levels and timing
3. **Notification Handler** (`lib/notifications.ts`) - Integrates with monitor status changes
4. **API Endpoints** - Testing and management endpoints

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Email Configuration (Required)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="W3Uptime <noreply@your-domain.com>"

# Application URL (for links in emails)
NEXT_PUBLIC_APP_URL="http://localhost:8000"
```

### 2. Email Provider Setup

#### Gmail Setup (Recommended for Development)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as `EMAIL_PASS`

#### Other SMTP Providers
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`

### 3. Database Migration

The system uses existing database tables:
- `EscalationPolicy` - Escalation policy configuration
- `EscalationLevel` - Individual escalation levels with email contacts
- `Alert` - Alert records
- `EscalationLog` - Tracks sent notifications
- `TimelineEvent` - Logs escalation events

No additional migrations are required.

## How It Works

### 1. Monitor Goes Down
```
MonitorTick (BAD status) → Database Trigger → Notification Handler → Escalation Service
```

1. Validator reports bad status to database
2. Database trigger fires notification
3. Notification handler calls `escalationService.startEscalation()`
4. Escalation service:
   - Creates an Alert record
   - Executes Level 1 immediately
   - Schedules subsequent levels based on `waitMinutes`

### 2. Email Notification Process
```
Escalation Level → Email Service → SMTP Server → Recipient
```

For each escalation level with `channel: 'EMAIL'`:
1. Gets email contacts from `contacts[]` array
2. Generates HTML and text email using templates
3. Sends via nodemailer
4. Creates `EscalationLog` record
5. Adds `TimelineEvent` for audit trail

### 3. Monitor Recovers
```
MonitorTick (GOOD status) → Stop Escalation → Recovery Emails
```

1. Notification handler calls `escalationService.stopEscalation()`
2. Cancels any pending escalation timers
3. Sends recovery emails to all previously notified contacts

## Email Templates

### Incident Alert Email
- **Subject**: `🚨 Alert: [Monitor Name] is down (Level [X])`
- **Content**: Monitor details, incident info, escalation level, custom message
- **CTA**: Link to monitor dashboard

### Recovery Email
- **Subject**: `✅ Resolved: [Monitor Name] is back online`
- **Content**: Monitor details, recovery time, downtime duration
- **CTA**: Link to monitor dashboard

## API Endpoints

### Test Email Configuration
```bash
POST /api/escalation/test
{
  "testType": "email",
  "email": "test@example.com"
}
```

### Get Escalation Status
```bash
GET /api/escalation/status?monitorId=uuid
```

### Stop Active Escalation
```bash
POST /api/escalation/status
{
  "monitorId": "uuid",
  "action": "stop"
}
```

## Usage Examples

### 1. Create Escalation Policy with Email Notifications

```javascript
// Frontend form data
const escalationPolicy = {
  name: "Critical Service Alert",
  levels: [
    {
      order: 1,
      method: "EMAIL",
      target: "oncall@company.com",
      waitTimeMinutes: 0
    },
    {
      order: 2,
      method: "EMAIL", 
      target: "manager@company.com",
      waitTimeMinutes: 15
    },
    {
      order: 3,
      method: "EMAIL",
      target: "cto@company.com", 
      waitTimeMinutes: 30
    }
  ]
};
```

### 2. Test Email Configuration

```bash
curl -X POST http://localhost:8000/api/escalation/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "email", "email": "your-email@example.com"}'
```

### 3. Monitor Escalation Status

```bash
curl http://localhost:8000/api/escalation/status
```

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Check environment variables are set
   - Verify SMTP credentials are correct

2. **"Authentication failed"**
   - For Gmail: Use App Password, not regular password
   - Check 2FA is enabled for Gmail

3. **"Connection timeout"**
   - Check firewall settings
   - Verify SMTP host and port

4. **Emails not sending**
   - Check server logs for errors
   - Test with `/api/escalation/test` endpoint

### Debug Commands

```bash
# Test email connection
curl -X GET http://localhost:8000/api/escalation/test

# Check escalation status
curl -X GET http://localhost:8000/api/escalation/status

# View server logs
docker logs w3uptime-frontend-1
```

## Security Considerations

1. **Environment Variables**: Never commit email credentials to version control
2. **App Passwords**: Use app-specific passwords instead of main account passwords
3. **Rate Limiting**: Email providers have rate limits (Gmail: 500/day for free accounts)
4. **Validation**: Email addresses are validated before sending
5. **Error Handling**: Failed sends are logged but don't break the escalation process

## Future Enhancements

1. **Slack Integration**: Add Slack webhook support
2. **SMS Notifications**: Integrate with SMS providers
3. **Email Templates**: Customizable email templates
4. **Delivery Tracking**: Track email delivery status
5. **Escalation Rules**: More complex escalation logic
6. **Notification Preferences**: User-specific notification settings

## Dependencies

- `nodemailer`: Email sending library
- `@types/nodemailer`: TypeScript definitions
- Existing Prisma database models
- Environment variable support

## Configuration Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `EMAIL_HOST` | SMTP server hostname | `smtp.gmail.com` | Yes |
| `EMAIL_PORT` | SMTP server port | `587` | Yes |
| `EMAIL_USER` | SMTP username | `user@gmail.com` | Yes |
| `EMAIL_PASS` | SMTP password/app password | `abcd efgh ijkl mnop` | Yes |
| `EMAIL_FROM` | From address for emails | `W3Uptime <noreply@domain.com>` | No |
| `NEXT_PUBLIC_APP_URL` | App URL for email links | `https://monitor.company.com` | No |
