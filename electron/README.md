# Qubix CRM Electron App

## Prerequisites

Before running the Electron app, ensure you have:

1. **Node.js** (v20+ recommended) - Already bundled with Electron
2. **PostgreSQL** (v17 recommended) - Must be installed separately

## Installation Instructions for End Users

### Step 1: Install PostgreSQL

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer
3. During installation:
   - Set password for `postgres` user (remember this!)
   - Port: 5432 (default)
   - Locale: Default
4. Complete the installation

### Step 2: Create Database

Open Command Prompt or PowerShell and run:

```bash
psql -U postgres
```

Then in PostgreSQL prompt:

```sql
CREATE DATABASE qubix_crm;
\q
```

### Step 3: Run the Application

1. Double-click `Qubix CRM Setup 1.0.0.exe`
2. Follow the installation wizard
3. Launch Qubix CRM from desktop shortcut

## Development

```bash
npm start
```

## Building

```bash
npm run build:win
```

The installer will be in `dist-electron/` folder.
