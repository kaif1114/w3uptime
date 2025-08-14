# 🐛 Debug Form Issues - Step by Step Guide

## 🎯 **Follow These Steps to Debug**

### **Step 1: Open Browser Console**

1. Go to `http://localhost:3000/escalation-policies/create`
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Clear the console (`Ctrl+L` or click clear button)

### **Step 2: Fill Out the Form**

1. **Policy Name:** Type `Test Policy`
2. **Level 1:**
   - Select `Webhook` from dropdown
   - Enter `https://webhook` in the URL field
   - Wait time should show `59` (default)

### **Step 3: Click Debug Button First**

1. Click the **"Debug"** button (next to Cancel)
2. Check the console - you should see:

```javascript
🐛 Debug - Current State: {
  policyName: "Test Policy",
  levels: [...],
  isValid: true/false,
  nameError: "",
  isPending: false
}
```

### **Step 4: Check What's Wrong**

Look at the debug output:

**❌ If `policyName` is empty:**

- The policy name input isn't working
- Try typing in the name field again

**❌ If `levels` array has empty `method` or `target`:**

- The escalation level isn't filled out properly
- Make sure you selected a method and entered a target

**❌ If `isValid` is `false`:**

- Something is failing validation
- Check the validation logs in console

### **Step 5: Try Clicking Create Policy**

1. Click **"Create Policy"** button
2. Look for these console messages:

```javascript
🚀 Create Policy button clicked!
🔥 Form submitted! {policyName: "...", levels: [...]}
🔥 isValid(): true
🔥 createMutation.isPending: false
```

### **Step 6: Check What Happens**

**✅ If you see all the console messages:**

- The form is working, but API might be failing
- Look for API errors in console

**❌ If you DON'T see "🚀 Create Policy button clicked!":**

- The button click isn't working
- Button might be disabled

**❌ If you see "🚀" but not "🔥 Form submitted!":**

- The onSubmit function isn't being called
- Check validation logs

---

## 🔍 **Common Issues & Solutions**

### **Issue 1: Button is Disabled**

**Symptoms:** Button appears grayed out, can't click
**Solution:**

1. Check the debug output
2. Make sure `isValid()` returns `true`
3. Fill out policy name and at least one complete escalation level

### **Issue 2: Form Fields Not Working**

**Symptoms:** Typing doesn't update the form state
**Solution:**

1. Make sure you're typing in the policy name field
2. Make sure you selected a method from the dropdown
3. Make sure you entered a target value

### **Issue 3: API Call Fails**

**Symptoms:** You see the form submission logs but no success
**Solution:**

1. Check Network tab for API requests
2. Look for 401 (authentication) or 500 (server) errors
3. Make sure you're logged in

### **Issue 4: Validation Fails**

**Symptoms:** `isValid()` returns `false`
**Solution:**

1. Check the validation logs in console
2. Make sure policy name is not empty
3. Make sure at least one level has method, target, and wait time > 0

---

## 📝 **Validation Requirements**

For the form to be valid, you need:

✅ **Policy Name:** Not empty, 1-100 characters
✅ **At least one escalation level with:**

- Method selected (email, slack, or webhook)
- Target filled out (email address, slack channel, or webhook URL)
- Wait time > 0 (except for last level)

---

## 🎯 **Expected Console Output (Success)**

When everything works, you should see:

```javascript
// When clicking Debug:
🐛 Debug - Current State: {
  policyName: "Test Policy",
  levels: [{ method: "webhook", target: "https://webhook", waitTimeMinutes: 59 }],
  isValid: true,
  nameError: "",
  isPending: false
}

// When clicking Create Policy:
🚀 Create Policy button clicked!
🔥 Form submitted! {...}
🔥 isValid(): true
🔥 createMutation.isPending: false
🔍 Validation check: {...}
Submitting escalation policy: {...}
Policy created successfully: {...}
```

---

## 🚨 **If Nothing Works**

If you still can't get it working:

1. **Refresh the page** and try again
2. **Check if development server is running** (`npm run dev`)
3. **Try a different browser** or **incognito mode**
4. **Check for JavaScript errors** in console (red errors)

Let me know what you see in the console and I'll help you fix the specific issue! 🚀
