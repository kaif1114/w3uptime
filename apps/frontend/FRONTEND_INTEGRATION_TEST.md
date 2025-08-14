# 🎯 Frontend Integration Testing Guide

## ✅ **What's Been Updated**

I've successfully integrated the escalation policies API with the frontend! Here's what's working now:

### 🔧 **Updated Components:**

1. **`useCreateEscalationPolicy` Hook** - Enhanced with better error handling
2. **Create Escalation Policy Form** - Improved validation and user feedback
3. **API Integration** - Properly sends data to our backend API
4. **Error Handling** - Shows detailed error messages and validation feedback

---

## 🚀 **How to Test the Frontend Integration**

### **Step 1: Start the Development Server**

```bash
npm run dev
```

### **Step 2: Navigate to Create Escalation Policy**

Go to: `http://localhost:3000/escalation-policies/create`

### **Step 3: Fill Out the Form**

**Policy Name:** `Production Critical Alerts`

**Level 1:**

- Method: `Email`
- Target: `oncall@company.com`
- Wait Time: `15` minutes

**Level 2:**

- Method: `Slack`
- Target: `#critical-alerts`
- Wait Time: `30` minutes

**Level 3:**

- Method: `Webhook`
- Target: `https://webhook.example.com/alerts`
- Wait Time: `0` minutes (auto-set for last level)

### **Step 4: Submit the Form**

Click "Create Policy" button

### **Step 5: Check the Results**

**✅ Success Case:**

- Green success message appears
- Console shows: "Policy created successfully"
- Redirects to escalation policies list
- New policy appears in the list

**❌ Error Case:**

- Red error message with details
- Console shows detailed error information
- Form stays on page for corrections

---

## 🔍 **What to Look For**

### **Console Logs (F12 → Console):**

```javascript
// When submitting:
"Submitting escalation policy: {name: '...', levels: [...]}";

// On success:
"Policy created successfully: {escalationPolicy: {...}}";

// On error:
"Failed to create escalation policy: Error details...";
```

### **Network Tab (F12 → Network):**

- **Request:** `POST /api/escalation-policies`
- **Status:** `201 Created` (success) or `400/500` (error)
- **Response:** JSON with policy data or error details

### **API Request Body:**

```json
{
  "name": "Production Critical Alerts",
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
      "target": "https://webhook.example.com/alerts",
      "waitTimeMinutes": 0
    }
  ]
}
```

---

## 🎨 **Form Features Working**

✅ **Real-time Validation**

- Policy name: 1-100 characters
- Escalation levels: 1-10 levels max
- Target validation based on method type
- Wait time: 1-1440 minutes

✅ **Drag & Drop Reordering**

- Drag escalation levels to reorder
- Visual feedback during drag
- Order preserved in API request

✅ **Dynamic Level Management**

- Add new levels (up to 10)
- Remove levels (minimum 1)
- Last level auto-sets wait time to 0

✅ **Method-Specific Validation**

- Email: validates email format
- Slack: accepts channel (#alerts) or user (@user)
- Webhook: validates URL format

✅ **Enhanced Error Handling**

- Shows API validation errors
- Displays detailed error information
- User-friendly error messages

✅ **Success Feedback**

- Success message on creation
- Automatic redirect to policies list
- Cache invalidation (shows new policy immediately)

---

## 🧪 **Test Scenarios**

### **Scenario 1: Basic Email Policy**

```
Name: "Email Notifications"
Level 1: Email → admin@company.com (60 min)
```

### **Scenario 2: Multi-Level Escalation**

```
Name: "Critical System Alerts"
Level 1: Email → oncall@team.com (15 min)
Level 2: Slack → #alerts (30 min)
Level 3: Webhook → https://pagerduty.com/webhook (0 min)
```

### **Scenario 3: Team Escalation**

```
Name: "Development Team Alerts"
Level 1: Slack → #dev-team (10 min)
Level 2: Slack → #team-leads (20 min)
Level 3: Email → management@company.com (0 min)
```

### **Scenario 4: Error Testing**

- Leave name empty → Shows validation error
- Invalid email format → Shows format error
- Invalid webhook URL → Shows URL error
- No escalation levels → Shows level requirement error

---

## 📊 **Expected Database Result**

After creating a policy, check the database:

```sql
-- Check created policy
SELECT * FROM "EscalationPolicy" WHERE name = 'Production Critical Alerts';

-- Check created levels
SELECT * FROM "EscalationLevel"
WHERE "escalationId" = 'your-policy-id'
ORDER BY "levelOrder";
```

**Database Structure:**

```
EscalationPolicy:
- id: UUID
- name: "Production Critical Alerts"
- userId: "authenticated-user-id"
- enabled: true
- createdAt/updatedAt: timestamps

EscalationLevel:
- id: UUID
- escalationId: policy-uuid
- levelOrder: 1, 2, 3...
- waitMinutes: 15, 30, 0
- contacts: ["oncall@company.com"]
- channel: "EMAIL", "SLACK", "WEBHOOK"
```

---

## 🎯 **Success Criteria**

✅ **Form submits successfully**
✅ **API receives correct data format**
✅ **Database stores policy and levels**
✅ **User sees success feedback**
✅ **Redirects to policies list**
✅ **New policy appears in list**
✅ **Console shows no errors**
✅ **Network requests return 201 status**

The frontend is now fully integrated with the backend API! 🚀
