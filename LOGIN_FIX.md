# 🔧 **LOGIN ISSUE - BACKEND PORT CONFLICT**

The login is failing because the backend server isn't running due to a port conflict. Here's how to fix it:

## **Step 1: Kill Process Using Port 5000**

**Open PowerShell or Command Prompt as Administrator** and run:

```powershell
# Find the process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace XXXX with the actual PID shown)
taskkill /PID XXXX /F
```

## **Step 2: Start Backend Server**

```bash
cd C:\Users\User\Documents\risk-management-system\backend
pnpm run dev
```

You should see:
```
Initializing SQLite database...
✓ Database ready
Server running on http://localhost:5000
✓ Database seeded with sample data
```

## **Step 3: Start Frontend (New Terminal)**

```bash
cd C:\Users\User\Documents\risk-management-system\frontend
npm run dev
```

## **Step 4: Test Login**

- Open http://localhost:3000
- Username: `admin`
- Password: `admin123`
- Should login successfully!

## **Alternative: Use Different Port**

If port 5000 keeps getting blocked, you can temporarily use port 5001:

1. **Change backend port:**
   ```javascript
   // In server-sqlite.js line 9
   const PORT = process.env.PORT || 5001;
   ```

2. **Change frontend API URL:**
   ```javascript
   // In frontend/src/services/api.js line 3
   const API_URL = 'http://localhost:5001/api';
   ```

3. **Restart both servers**

## **Database Issues?**

If you see database errors, the SQLite file might be corrupted. Delete and recreate:

```bash
cd C:\Users\User\Documents\risk-management-system
rm risk_management.db
# Restart backend - it will recreate the database
```

## **Quick Test**

After starting servers, test the API directly:

```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
```

Should return a token if working correctly.

**Please kill the port 5000 process and restart the backend, then try logging in again!** 🚀</content>
<parameter name="filePath">C:\Users\User\Documents\risk-management-system\LOGIN_FIX.md