# BullMQ Alert System Setup Guide

This guide explains how to set up and use the BullMQ-based alert system for W3Uptime incident notifications.

## Overview

The BullMQ alert system replaces the previous setTimeout-based escalation with a robust, Redis-backed queue system that provides:

- **Reliable delivery**: Jobs persist in Redis and survive application restarts
- **Delayed execution**: Proper escalation timing with Redis-based delays
- **Retry logic**: Automatic retries with exponential backoff
- **Horizontal scaling**: Multiple workers can process jobs
- **Monitoring**: Built-in job status tracking and statistics
- **Multi-channel alerts**: Email, Slack, and webhook notifications

## Architecture

```
Incident Created → BullMQ Queue → Workers → Notifications
                                     ↓
                                Email/Slack/Webhook
```

### Components

1. **Queue Package** (`@w3uptime/queue`): Shared BullMQ infrastructure
2. **Alert System**: Main orchestration service
3. **Workers**: Process notification jobs
4. **Services**: Email, Slack, and webhook delivery

## Prerequisites

### 1. Redis Server

BullMQ requires Redis. The system is already configured in `docker-compose.yml`:

```bash
# Start Redis with other services
npm run dev:services

# Or start just Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 2. Environment Variables

Add these variables to your `.env` file:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # Optional
REDIS_DB=0              # Optional, defaults to 0

# Email Configuration (Required)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="W3Uptime <noreply@your-domain.com>"

# Slack Configuration (Optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL=W3UPTIME

# Application URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:8000
```

### 3. Install Dependencies

The queue package is automatically included in the monorepo:

```bash
# Install all dependencies
npm install

# Build the queue package
npm run build
```

## Configuration

### Email Setup (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as `EMAIL_PASS`

### Slack Setup (Optional)

1. Create a Slack App in your workspace
2. Add the following OAuth scopes:
   - `chat:write`
   - `chat:write.public`
3. Install the app to your workspace
4. Copy the Bot User OAuth Token as `SLACK_BOT_TOKEN`

## Usage

### Automatic Escalation

The system automatically triggers when incidents are created via the API:

```typescript
// POST /api/incidents
{
  "title": "Service Down",
  "monitorId": "monitor-uuid",
  "cause": "URL_UNAVAILABLE"
}
```

If the monitor has an escalation policy configured, BullMQ will:
1. Send Level 1 notifications immediately
2. Schedule subsequent levels based on `waitMinutes`
3. Stop escalation when incident is resolved

### Manual Testing

Test the alert system using the test API:

```bash
# Test incident alert
curl -X POST http://localhost:8000/api/queue/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "monitorId": "your-monitor-id",
    "testType": "incident",
    "customMessage": "Test alert message"
  }'

# Test recovery notification
curl -X POST http://localhost:8000/api/queue/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "monitorId": "your-monitor-id",
    "testType": "recovery"
  }'
```

### Queue Statistics

Monitor the system health:

```bash
curl http://localhost:8000/api/queue/stats \
  -H "Authorization: Bearer your-token"
```

Response:
```json
{
  "initialized": true,
  "stats": {
    "alert-immediate": {
      "waiting": 0,
      "active": 1,
      "completed": 45,
      "failed": 2
    },
    "email-notifications": {
      "waiting": 0,
      "active": 0,
      "completed": 23,
      "failed": 0
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Escalation Configuration

Configure escalation policies in the UI or via API:

```json
{
  "name": "Critical Service Policy",
  "enabled": true,
  "levels": [
    {
      "levelOrder": 1,
      "waitMinutes": 0,
      "channel": "EMAIL",
      "contacts": ["oncall@company.com"],
      "message": "Immediate notification"
    },
    {
      "levelOrder": 2,
      "waitMinutes": 5,
      "channel": "SLACK",
      "contacts": ["#critical-alerts"],
      "message": "Escalated to team"
    },
    {
      "levelOrder": 3,
      "waitMinutes": 15,
      "channel": "WEBHOOK",
      "contacts": ["https://hooks.pagerduty.com/..."],
      "message": "Escalated to PagerDuty"
    }
  ]
}
```

## Monitoring and Troubleshooting

### Queue Dashboard

For production monitoring, consider installing Bull Board:

```bash
npm install @bull-board/api @bull-board/express
```

### Logs

The system provides detailed logging:

```bash
# View application logs
docker-compose logs -f frontend

# Look for BullMQ-related messages:
# ✅ Redis connected successfully
# 🚀 Starting queue workers...
# 📧 Email sent to user@example.com
# 🚨 BullMQ escalation triggered for incident: Service Down
```

### Common Issues

1. **Redis Connection Failed**
   - Check if Redis is running: `docker ps | grep redis`
   - Verify `REDIS_HOST` and `REDIS_PORT` environment variables

2. **Email Not Sending**
   - Verify Gmail app password is correct
   - Check `EMAIL_*` environment variables
   - Look for SMTP errors in logs

3. **Jobs Not Processing**
   - Check worker status in queue stats
   - Verify no JavaScript errors in application startup

### Performance Tuning

For high-volume deployments:

```typescript
// Adjust queue options in packages/queue/src/config.ts
export const queueConfig: QueueConfig = {
  defaultJobOptions: {
    removeOnComplete: 100,  // Keep more completed jobs
    removeOnFail: 50,       // Keep fewer failed jobs
    attempts: 5,            // More retry attempts
    backoff: {
      type: 'exponential',
      delay: 5000,          // Longer backoff delay
    },
  },
};
```

## Migration from Old System

The new BullMQ system runs alongside the old setTimeout-based system. To fully migrate:

1. Ensure all environment variables are configured
2. Test with a few monitors using the test API
3. Gradually enable escalation policies on critical monitors
4. Monitor queue statistics for any issues
5. Remove old escalation service once confident

## Security Considerations

1. **Redis Security**: Use Redis AUTH in production
2. **Environment Variables**: Store sensitive data securely
3. **Webhook URLs**: Validate webhook endpoints
4. **Rate Limiting**: Consider rate limits for notification endpoints

## Scaling

For multiple application instances:

1. **Redis Cluster**: Use Redis Cluster for high availability
2. **Worker Scaling**: Run dedicated worker processes
3. **Queue Separation**: Separate queues by priority/type
4. **Monitoring**: Use Redis monitoring tools

## Support

For issues or questions:
1. Check the queue statistics API
2. Review application logs
3. Verify Redis connectivity
4. Test with the manual test API
