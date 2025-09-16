# 🚀 Postman Testing Guide for BullMQ Alert System

## Quick Setup (Session ID from earlier)

**Use this session ID in Postman:** `cfcb005a-4b2d-4d3a-a9d1-fce335e960ef`

## Step 1: Postman Environment Setup

1. Create a new environment called "W3Uptime Local"
2. Add these variables:
   ```
   base_url: http://localhost:8000
   session_cookie: cfcb005a-4b2d-4d3a-a9d1-fce335e960ef
   ```

## Step 2: Test Endpoints (In Order)

### 🔍 Test 1: Check Queue Statistics

**Request:**
```
GET {{base_url}}/api/queue/stats
```

**Headers:**
```
Cookie: sessionId={{session_cookie}}
```

**Expected Response:**
```json
{
  "initialized": true,
  "stats": {
    "alert-immediate": {
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0
    },
    "email-notifications": {
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 📧 Test 2: Create an Incident (Triggers BullMQ)

**Request:**
```
POST {{base_url}}/api/incidents
```

**Headers:**
```
Content-Type: application/json
Cookie: sessionId={{session_cookie}}
```

**Body:**
```json
{
  "title": "Test Service Down",
  "cause": "URL_UNAVAILABLE",
  "monitorId": "YOUR_MONITOR_ID_HERE"
}
```

**Note:** You'll need a valid monitor ID. First, let's create one...

### 🖥️ Test 3: Create a Monitor First

**Request:**
```
POST {{base_url}}/api/monitors
```

**Headers:**
```
Content-Type: application/json
Cookie: sessionId={{session_cookie}}
```

**Body:**
```json
{
  "name": "Test API Monitor",
  "url": "https://httpbin.org/status/200",
  "checkInterval": 300,
  "timeout": 30,
  "expectedStatusCodes": [200]
}
```

**Expected Response:**
```json
{
  "message": "Monitor created successfully",
  "monitor": {
    "id": "monitor-uuid-here",
    "name": "Test API Monitor",
    "url": "https://httpbin.org/status/200"
  }
}
```

### ⚡ Test 4: Test BullMQ Alert System Directly

**Request:**
```
POST {{base_url}}/api/queue/test
```

**Headers:**
```
Content-Type: application/json
Cookie: sessionId={{session_cookie}}
```

**Body:**
```json
{
  "monitorId": "YOUR_MONITOR_ID_FROM_STEP_3",
  "testType": "incident",
  "customMessage": "Testing BullMQ alert system from Postman"
}
```

**Expected Response:**
```json
{
  "message": "Test incident alert triggered successfully",
  "monitor": {
    "id": "monitor-uuid",
    "name": "Test API Monitor",
    "url": "https://httpbin.org/status/200"
  },
  "escalationLevels": 0,
  "testTitle": "Testing BullMQ alert system from Postman"
}
```

### 🔄 Test 5: Check Queue Stats After Alert

**Request:**
```
GET {{base_url}}/api/queue/stats
```

**Headers:**
```
Cookie: sessionId={{session_cookie}}
```

**Expected Response (should show activity):**
```json
{
  "initialized": true,
  "stats": {
    "alert-immediate": {
      "waiting": 0,
      "active": 1,
      "completed": 0,
      "failed": 0
    },
    "email-notifications": {
      "waiting": 1,
      "active": 0,
      "completed": 0,
      "failed": 0
    }
  }
}
```

## Environment Variables for Email Testing

Add these to your `.env` file to test email notifications:

```bash
# Redis (should already be running)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration for Testing
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM="W3Uptime Test <noreply@test.com>"

# Optional: Slack Testing
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_DEFAULT_CHANNEL=#alerts
```

## Common Issues & Solutions

### ❌ Issue: 401 Unauthorized
**Solution:** Check that the `sessionId` cookie is set correctly in your request headers.

### ❌ Issue: Monitor not found
**Solution:** Create a monitor first using Test 3, then use the returned monitor ID.

### ❌ Issue: Queue stats show "not initialized"
**Solution:** Restart the development server to ensure BullMQ workers are started.

### ❌ Issue: No escalation levels
**Solution:** The monitor needs an escalation policy. Create one in the UI or via API.

## Advanced Testing

### Create Escalation Policy via API

**Request:**
```
POST {{base_url}}/api/escalation-policies
```

**Body:**
```json
{
  "name": "Test Escalation Policy",
  "enabled": true,
  "levels": [
    {
      "levelOrder": 1,
      "waitMinutes": 0,
      "contacts": ["test@example.com"],
      "channel": "EMAIL",
      "name": "Immediate Email",
      "message": "Service is down - immediate notification"
    },
    {
      "levelOrder": 2,
      "waitMinutes": 5,
      "contacts": ["#alerts"],
      "channel": "SLACK",
      "name": "Slack Escalation",
      "message": "Service still down after 5 minutes"
    }
  ]
}
```

## Monitoring Logs

Watch the development server logs for BullMQ activity:
```bash
# Look for these messages:
✅ Redis connected successfully
🚀 Starting queue workers...
📧 Email sent to test@example.com
🚨 BullMQ escalation triggered for incident: Test Service Down
```

## Success Indicators

✅ Queue stats API returns data
✅ Creating incidents triggers BullMQ jobs
✅ Queue stats show job processing activity
✅ Email notifications are sent (check logs)
✅ Recovery notifications work when incidents are resolved

## Next Steps

1. Test with real email addresses
2. Set up Slack integration
3. Test webhook notifications
4. Create escalation policies with multiple levels
5. Test delayed escalation timing
