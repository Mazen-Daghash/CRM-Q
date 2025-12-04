# How to Run Qubix CRM

This guide explains how to run Qubix CRM in different modes.

---

## Prerequisites

Before running, make sure you have:
- ✅ Node.js installed (v20+)
- ✅ PostgreSQL installed and running
- ✅ Database `qubix_crm` created

See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed setup.

---

## Option 1: Development Mode (Recommended for Development)

### Step 1: Install Dependencies

Open Command Prompt or PowerShell in the project root folder and run:

```bash
npm install
```

This will install all dependencies for the entire monorepo.

### Step 2: Start Backend API

Open a **new terminal window** and run:

```bash
npm run start:dev --workspace=@qubix/api
```

Wait until you see: `Application is running on: http://localhost:4000`

### Step 3: Start Frontend Web App

Open **another new terminal window** and run:

```bash
npm run dev --workspace=@qubix/web
```

Wait until you see: `Local: http://localhost:3000`

### Step 4: Access the Application

Open your web browser and go to:
```
http://localhost:3000
```

You should see the Qubix CRM login page.

---

## Option 2: Electron Desktop App (For End Users)

### Step 1: Build the Electron App

```bash
cd electron
npm run build:win
```

This will create an installer in `electron/dist-electron/` folder.

### Step 2: Install the Application

1. Find the installer: `electron/dist-electron/Qubix CRM Setup 1.0.0.exe`
2. Double-click to install
3. Follow the installation wizard

### Step 3: Run the Application

1. Look for **Qubix CRM** icon on your desktop
2. Double-click to launch
3. The app will automatically:
   - Check PostgreSQL
   - Start backend services
   - Start frontend
   - Open the login page

---

## Option 3: Quick Start Scripts

### Run Everything at Once (Development)

Create a file `start-dev.bat` in the project root:

```batch
@echo off
echo Starting Qubix CRM Development Mode...
start "Backend API" cmd /k "npm run start:dev --workspace=@qubix/api"
timeout /t 5
start "Frontend Web" cmd /k "npm run dev --workspace=@qubix/web"
echo.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause
```

Double-click `start-dev.bat` to start both services.

---

## Troubleshooting

### Port Already in Use

If you see errors like "Port 3000 is already in use":

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

**Or change the port:**
- Frontend: Edit `apps/web/.env` and set `PORT=3001`
- Backend: Edit `apps/api/.env` and set `PORT=4001`

### Database Connection Error

1. Make sure PostgreSQL is running:
   - Press `Windows + R`
   - Type `services.msc`
   - Find `postgresql-x64-18` (or similar)
   - Make sure it's **Running**

2. Check database exists:
   ```bash
   "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -l
   ```
   Look for `qubix_crm` in the list

### Node.js Not Found

1. Make sure Node.js is installed:
   ```bash
   node --version
   ```

2. If not found, install from: https://nodejs.org/

---

## Default Login

After first run, you'll need to:
1. Click **"Register here"** on the login page
2. Create your first admin account
3. Log in with your credentials

---

## Stopping the Application

### Development Mode:
- Press `Ctrl + C` in each terminal window to stop

### Electron App:
- Close the application window
- Services will stop automatically

---

## Need Help?

- Check [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for installation help
- Check [README.md](./README.md) for general information
- Make sure all prerequisites are installed correctly

