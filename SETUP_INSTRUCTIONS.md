# Qubix CRM - Installation & Setup Guide

Follow these steps to install and set up Qubix CRM on your Windows computer.

---

## Step 1: Install Node.js

1. Go to **https://nodejs.org/**
2. Download the **LTS** version (green button)
3. Run the installer
4. **IMPORTANT:** Make sure **"Add to PATH"** is checked during installation
5. Complete the installation

**Verify installation:** Open Command Prompt and type `node --version`. You should see a version number.

---

## Step 2: Install PostgreSQL

1. Go to **https://www.postgresql.org/download/windows/**
2. Click **"Download the installer"**
3. Download the latest version (17 or 18) for **Windows x86-64**
4. **Right-click** the installer and select **"Run as administrator"**
5. During installation:
   - **Set a password** for the `postgres` user (WRITE IT DOWN - you'll need it!)
   - Leave port as **5432** (default)
   - Leave all other settings as default
6. Complete the installation

**Verify installation:** 
- Press **Windows + R**, type `services.msc`, press Enter
- Look for **postgresql-x64-18** (or similar)
- Make sure its Status is **"Running"**
- If not running, right-click it and select **"Start"**

---

## Step 3: Create the Database

You need to create a database called `qubix_crm`. Choose one method:

### Method 1: Using Command Prompt (Recommended)

**What is `psql`?** It's a PostgreSQL command-line tool that lets you run database commands. We use the full path because it's not always in your system PATH.

**First, find where psql is installed:**

1. Press **Windows + R**, type `cmd`, press Enter
2. Run this command to check if psql exists:
   ```
   where psql
   ```
   
   **If you see a path** (like `C:\Program Files\PostgreSQL\18\bin\psql.exe`), use that path in the command below.
   
   **If you see "Could not find"**, PostgreSQL might be installed but not in PATH. Check these common locations:
   - `C:\Program Files\PostgreSQL\18\bin\psql.exe`
   - `C:\Program Files\PostgreSQL\17\bin\psql.exe`
   - `C:\Program Files (x86)\PostgreSQL\18\bin\psql.exe`

**Then create the database:**

**IMPORTANT:** You must use the FULL PATH to psql.exe. Just typing `psql` won't work if it's not in your PATH.

1. Copy and paste this EXACT command (for PostgreSQL 18):
   ```
   "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE qubix_crm;"
   ```
   
   **Note:** Make sure to include the quotes around the path!
   
   **What this does:**
   - `"C:\Program Files\PostgreSQL\18\bin\psql.exe"` - Full path to the PostgreSQL command tool (the quotes are required because of spaces in the path)
   - `-U postgres` - Connect as the `postgres` user (the admin user)
   - `-c "CREATE DATABASE qubix_crm;"` - Run the SQL command to create the database
   
   **If you have PostgreSQL 17, use this instead:**
   ```
   "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE qubix_crm;"
   ```
   
   **If you have PostgreSQL 16, use this instead:**
   ```
   "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE qubix_crm;"
   ```

2. Press Enter
3. Enter your PostgreSQL password when prompted (the one you set in Step 2)
   - **Note:** The password won't show on screen as you type (this is normal for security)
4. You should see `CREATE DATABASE` - this means it worked!

**Tip:** You can also double-click `check-psql.bat` (included with Qubix CRM) to automatically find where psql is installed.

### Method 2: Using pgAdmin (Visual Method)

1. Open **pgAdmin 4** from Start Menu
2. Enter your PostgreSQL password if prompted
3. In the left panel: Expand **Servers** → **PostgreSQL 18** (or your version)
4. Right-click on **Databases** → **Create** → **Database...**
5. Name it: `qubix_crm`
6. Click **Save**

---

## Step 4: Install Qubix CRM

1. Run the installer: `Qubix CRM Setup 1.0.0.exe`
2. Follow the installation wizard
3. Launch Qubix CRM from the desktop shortcut

The application will automatically:
- Check for PostgreSQL
- Start the backend services
- Open the login page

---

## Step 5: First Login

1. When Qubix CRM opens, click **"Register here"**
2. Fill in your details and create an account
3. You'll be automatically logged in after registration

---

## 🔧 Troubleshooting

### "PostgreSQL is not installed" error

- Make sure PostgreSQL is installed (Step 2)
- Check if PostgreSQL service is running: Press **Windows + R**, type `services.msc`, find `postgresql-x64-18` and make sure it's **Running**

### "Node.js is not recognized" error

- Make sure Node.js is installed (Step 1)
- Restart your computer
- Reinstall Node.js and make sure **"Add to PATH"** is checked

### "Database connection failed" error

- Make sure PostgreSQL service is running (see above)
- Make sure database `qubix_crm` exists (Step 3)
- Check your PostgreSQL password is correct

### Application shows blank screen

- Wait 30-60 seconds (services are starting)
- Make sure Node.js and PostgreSQL are both installed and running
- Try restarting the application

### Can't find psql.exe

- PostgreSQL might be in a different location
- Search for `psql.exe` on your computer to find the path
- Use that path in Step 3 instead

---

## ✅ Quick Checklist

Before launching Qubix CRM:

- [ ] Node.js installed (`node --version` works in Command Prompt)
- [ ] PostgreSQL installed and service is running
- [ ] Database `qubix_crm` is created
- [ ] Qubix CRM is installed
- [ ] You have your PostgreSQL password written down

---

**That's it! You're ready to use Qubix CRM! 🎉**
