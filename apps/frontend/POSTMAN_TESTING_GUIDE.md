# 🧪 Escalation Policies API - Postman Testing Guide

## 📋 Prerequisites

- Ensure your development server is running on `localhost:3000`
- Open Postman
- Create a new collection called "W3Uptime - Escalation Policies"

## 🔄 Quick Test Endpoints (No Authentication Required)

### Base URL

```
http://localhost:3000
```

---

## 📝 Test API Endpoints

### 1. 📊 **GET All Escalation Policies**

```
GET http://localhost:3000/api/escalation-policies/test
```

**Headers:**

```
Content-Type: application/json
```

**Expected Response (Empty):**

```json
{
  "success": true,
  "escalationPolicies": [],
  "message": "Found 0 escalation policies for test user"
}
```

---

### 2. ➕ **CREATE Escalation Policy**

```
POST http://localhost:3000/api/escalation-policies/test
```

**Headers:**

```
Content-Type: application/json
```

**Body (Raw JSON):**

```json
{
  "name": "Critical Production Alerts",
  "levels": [
    {
      "method": "email",
      "target": "oncall@company.com",
      "waitTimeMinutes": 15
    },
    {
      "method": "slack",
      "target": "#critical-alerts",
      "waitTimeMinutes": 30
    },
    {
      "method": "webhook",
      "target": "https://webhook.example.com/escalation",
      "waitTimeMinutes": 0
    }
  ]
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Escalation policy created successfully",
  "escalationPolicy": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Critical Production Alerts",
    "userId": "user-123",
    "levels": [
      {
        "id": "level-uuid-1",
        "order": 1,
        "method": "email",
        "target": "oncall@company.com",
        "waitTimeMinutes": 15
      },
      {
        "id": "level-uuid-2",
        "order": 2,
        "method": "slack",
        "target": "#critical-alerts",
        "waitTimeMinutes": 30
      },
      {
        "id": "level-uuid-3",
        "order": 3,
        "method": "webhook",
        "target": "https://webhook.example.com/escalation",
        "waitTimeMinutes": 0
      }
    ],
    "createdAt": "2024-01-14T10:00:00.000Z",
    "updatedAt": "2024-01-14T10:00:00.000Z"
  }
}
```

---

### 3. 🔄 **GET All Policies Again (Should Show Created Policy)**

```
GET http://localhost:3000/api/escalation-policies/test
```

**Expected Response:**

```json
{
  "success": true,
  "escalationPolicies": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Critical Production Alerts",
      "userId": "user-123",
      "levels": [...],
      "createdAt": "2024-01-14T10:00:00.000Z",
      "updatedAt": "2024-01-14T10:00:00.000Z"
    }
  ],
  "message": "Found 1 escalation policies for test user"
}
```

---

### 4. 🗑️ **DELETE All Test Policies (Cleanup)**

```
DELETE http://localhost:3000/api/escalation-policies/test
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Deleted 1 escalation policies for test user",
  "deletedCount": 1
}
```

---

## 🧪 Additional Test Cases

### Test Case 1: **Email Only Policy**

```json
{
  "name": "Simple Email Alert",
  "levels": [
    {
      "method": "email",
      "target": "admin@company.com",
      "waitTimeMinutes": 60
    }
  ]
}
```

### Test Case 2: **Multi-Level Slack Escalation**

```json
{
  "name": "Team Escalation Policy",
  "levels": [
    {
      "method": "slack",
      "target": "#dev-team",
      "waitTimeMinutes": 10
    },
    {
      "method": "slack",
      "target": "#team-leads",
      "waitTimeMinutes": 20
    },
    {
      "method": "slack",
      "target": "#management",
      "waitTimeMinutes": 0
    }
  ]
}
```

### Test Case 3: **Webhook Integration**

```json
{
  "name": "PagerDuty Integration",
  "levels": [
    {
      "method": "webhook",
      "target": "https://events.pagerduty.com/integration/key/enqueue",
      "waitTimeMinutes": 0
    }
  ]
}
```

---

## ❌ Error Testing

### Test Invalid Data

```json
{
  "name": "",
  "levels": []
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Invalid input data",
  "details": {
    "name": ["Policy name is required"],
    "levels": ["At least one escalation level is required"]
  }
}
```

### Test Invalid Method

```json
{
  "name": "Invalid Method Test",
  "levels": [
    {
      "method": "sms",
      "target": "+1234567890",
      "waitTimeMinutes": 30
    }
  ]
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Invalid input data",
  "details": {
    "levels": {
      "0": {
        "method": [
          "Invalid enum value. Expected 'email' | 'slack' | 'webhook', received 'sms'"
        ]
      }
    }
  }
}
```

---

## 🔐 Testing Authenticated Endpoints (Optional)

If you want to test the real authenticated endpoints, you'll need to:

1. **Create a test user in the database**
2. **Get a session cookie by logging in through the frontend**
3. **Copy the session cookie to Postman**

### Steps for Authenticated Testing:

1. Go to `http://localhost:3000/login` in your browser
2. Connect a wallet and authenticate
3. Open browser dev tools → Application → Cookies
4. Copy the `sessionId` cookie value
5. In Postman, add this cookie to your requests:

**Headers:**

```
Cookie: sessionId=your-session-id-here
```

**Authenticated Endpoints:**

- `GET http://localhost:3000/api/escalation-policies`
- `POST http://localhost:3000/api/escalation-policies`
- `GET http://localhost:3000/api/escalation-policies/{id}`
- `DELETE http://localhost:3000/api/escalation-policies/{id}`

---

## 📊 Expected Workflow

1. **Start Clean:** `DELETE /api/escalation-policies/test` (clears all test data)
2. **Verify Empty:** `GET /api/escalation-policies/test` (should return empty array)
3. **Create Policy:** `POST /api/escalation-policies/test` (create your first policy)
4. **Verify Created:** `GET /api/escalation-policies/test` (should show the new policy)
5. **Create More:** Repeat step 3 with different data
6. **Test Errors:** Try invalid data to test validation
7. **Cleanup:** `DELETE /api/escalation-policies/test` (clean up when done)

---

## 🏆 Success Criteria

✅ **All requests return proper HTTP status codes**
✅ **GET returns array of policies**
✅ **POST creates and returns new policy**
✅ **DELETE removes test data**
✅ **Validation errors return 400 with details**
✅ **Server errors return 500 with message**
✅ **All responses have consistent structure with `success` field**

---

## 🔧 Troubleshooting

### Common Issues:

1. **500 Internal Server Error**
   - Check if the database is running
   - Verify the development server is running
   - Check server logs for detailed error messages

2. **404 Not Found**
   - Verify the URL is correct
   - Ensure the development server is running on port 3000

3. **400 Bad Request**
   - Check the request body format
   - Verify all required fields are present
   - Check field validation rules

### Database Connection:

If you get database errors, ensure your PostgreSQL database is running and the connection string is correct in your `.env` file.
