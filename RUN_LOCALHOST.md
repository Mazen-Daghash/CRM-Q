# Running Qubix CRM on Localhost

Step-by-step guide to run Qubix CRM on your local machine.

---

## Prerequisites Check

Before starting, make sure you have:

1. ✅ **Node.js** installed
   - Check: Open Command Prompt and type `node --version`
   - Should show: `v20.x.x` or higher
   - If not installed: Download from https://nodejs.org/

2. ✅ **PostgreSQL** installed and running
   - Check: Press `Windows + R`, type `services.msc`, find `postgresql-x64-18` (or similar)
   - Status should be **"Running"**
   - If not running: Right-click → **Start**

3. ✅ **Database created**
   - Check: Run this command:
     ```
     "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -l
     ```
   - Look for `qubix_crm` in the list
   - If not found: See Step 3 in SETUP_INSTRUCTIONS.md

---

## Step-by-Step: Run on Localhost

### Step 1: Open Project Folder

1. Open **File Explorer**
2. Navigate to: `C:\Users\mazen\Desktop\qubix crm`
3. **Right-click** in the folder → **Open in Terminal** (or **Open PowerShell window here**)

### Step 2: Install Dependencies

In the terminal, run:

```bash
npm install
```

**Wait for this to complete** (may take 2-5 minutes). You'll see:
```
added 1234 packages
```

### Step 3: Start Backend API

**Keep the terminal open** and run:

```bash
npm run start:dev --workspace=@qubix/api
```

**Wait until you see:**
```
Application is running on: http://localhost:4000
```

**Keep this terminal window open!**

### Step 4: Start Frontend (New Terminal)

1. **Open a NEW terminal window** (don't close the first one!)
2. Navigate to the project folder again:
   ```bash
   cd "C:\Users\mazen\Desktop\qubix crm"
   ```
3. Run:
   ```bash
   npm run dev --workspace=@qubix/web
   ```

**Wait until you see:**
```
Local:        http://localhost:3000
```

### Step 5: Open in Browser

1. Open your web browser (Chrome, Edge, Firefox, etc.)
2. Go to: **http://localhost:3000**
3. You should see the **Qubix CRM login page**!

---

## Quick Commands Summary

**Terminal 1 (Backend):**
```bash
npm run start:dev --workspace=@qubix/api
```

**Terminal 2 (Frontend):**
```bash
npm run dev --workspace=@qubix/web
```

**Browser:**
```
http://localhost:3000
```

---

## First Time Setup

When you first open `http://localhost:3000`:

1. You'll see a **Login** page
2. Click **"Register here"** (or go to `/register`)
3. Fill in your details:
   - First Name
   - Last Name
   - Email
   - Password
   - Role: Select **ADMIN** (for full access)
4. Click **Create Account**
5. You'll be automatically logged in!

---

## Stopping the Application

To stop the application:

1. Go to **Terminal 1** (Backend)
2. Press **Ctrl + C**
3. Type `Y` and press Enter (if asked)
4. Go to **Terminal 2** (Frontend)
5. Press **Ctrl + C**
6. Type `Y` and press Enter (if asked)

---

## Troubleshooting

### "Port 3000 is already in use"

**Solution:** Something else is using port 3000. Close it or change the port:

1. Find what's using port 3000:
   ```bash
   netstat -ano | findstr :3000
   ```
2. Kill the process:
   ```bash
   taskkill /PID <PID_NUMBER> /F
   ```
3. Or change port: Edit `apps/web/.env` and add:
   ```
   PORT=3001
   ```
   Then use `http://localhost:3001`

### "Port 4000 is already in use"

Same as above, but for port 4000:
```bash
netstat -ano | findstr :4000
taskkill /PID <PID_NUMBER> /F
```

### "Cannot connect to database"

1. Make sure PostgreSQL is running (see Prerequisites Check above)
2. Check database exists:
   ```bash
   "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "\l"
   ```
3. If database doesn't exist, create it:
   ```bash
   "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE qubix_crm;"
   ```

### "npm: command not found"

**Solution:** Node.js is not installed or not in PATH.

1. Install Node.js from: https://nodejs.org/
2. Restart your terminal
3. Try again

### Backend keeps restarting

This is normal in development mode! It restarts automatically when you save code changes.

---

## What You Should See

**Terminal 1 (Backend):**
```
[Nest] Starting Nest application...
[Nest] Application successfully started
Application is running on: http://localhost:4000
```

**Terminal 2 (Frontend):**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.5s
```

**Browser:**
- Qubix CRM login page with blue background
- "Qubix CRM" title
- Email and Password fields
- "Register here" link

---

## Need Help?

- Check `SETUP_INSTRUCTIONS.md` for installation help
- Make sure PostgreSQL is running
- Make sure database `qubix_crm` exists
- Check both terminals for error messages

---

**That's it! You're running Qubix CRM on localhost! 🎉**

