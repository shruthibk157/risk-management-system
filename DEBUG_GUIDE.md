# 🔍 Risk Creation & Register Sync - DEBUGGING GUIDE

## 🚨 CURRENT ISSUE
Risks are created successfully on the backend, but the Risk Register is not updating to show new risks.

## 🧪 STEP-BY-STEP TESTING

### **Step 1: Verify Backend is Working**
✅ **Already confirmed**: Backend saves and returns risks correctly

### **Step 2: Check Frontend API Connection**
1. Open your browser to http://localhost:3000
2. Login as admin/admin123
3. Go to Risk Register page
4. Click the **"Test API"** button (green button next to Refresh)
5. **Expected**: Alert showing "API Test: Found X risks in database"
6. **Check Console**: Look for "API test successful" message

### **Step 3: Test Risk Creation**
1. Click "Add New Risk"
2. Fill form:
   - Department: Select "IT" (or any)
   - Risk Description: "Debug test risk"
   - Severity: 5, Occurrence: 4, Detection: 3
3. Click "Create Risk"
4. **Check Console** for these messages:
   ```
   🚀 Starting risk submission...
   📝 Form data: {...}
   🔗 Making API call to create risk...
   ✅ Risk creation successful!
   📄 Response data: {...}
   ```

### **Step 4: Check Navigation & Refresh**
1. After form submission, you should be redirected to Risk Register
2. **Check Console** for:
   ```
   RiskList component mounted - fetching fresh risk data from API
   🔄 fetchRisks called, showRefreshing: false
   📡 Making API call to GET /risks with params: {}
   ✅ API response received: {...}
   📊 Setting risks data: X items
   ```

### **Step 5: Verify Data Display**
1. Check if the new risk appears in the table
2. Check "Last updated" timestamp - should be recent
3. If not showing, click "Refresh" button
4. **Check Console** for refresh messages

## 🔧 COMMON ISSUES & FIXES

### **Issue 1: Console Shows "Failed to fetch risks"**
- **Cause**: Authentication token expired
- **Fix**: Logout and login again

### **Issue 2: API Test Button Shows 0 Risks**
- **Cause**: Backend not running or authentication failed
- **Fix**: Restart backend server with `pnpm run dev`

### **Issue 3: Form Submission Succeeds but Risk Doesn't Appear**
- **Cause**: Navigation or refresh not working
- **Fix**: Check console for "RiskList component mounted" message

### **Issue 4: Department ID Validation**
- **Status**: ✅ Working correctly (accepts numbers, rejects letters)

## 📊 DEBUGGING CHECKLIST

- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] User logged in with valid token
- [ ] Browser console open (F12)
- [ ] Network tab shows API calls
- [ ] Console shows expected log messages

## 🚀 IMMEDIATE ACTIONS

1. **Open browser console** (F12)
2. **Go to Risk Register**
3. **Click "Test API" button**
4. **Report what the alert shows**
5. **Try creating a risk and report console messages**

## 📞 REPORT FORMAT

Please reply with:
```
API Test Result: [what the alert showed]
Form Submission Logs: [copy console messages]
Navigation Logs: [copy console messages after form submit]
Risk Count: [how many risks show in table]
```

This will help identify exactly where the issue is occurring! 🔍</content>
<parameter name="filePath">C:\Users\User\Documents\risk-management-system\DEBUG_GUIDE.md