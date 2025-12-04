# Building Qubix CRM Desktop App

## Prerequisites

1. **Build the applications first:**
   ```bash
   npm run build
   ```

2. **Make sure PostgreSQL is running** (or configure SQLite)

3. **Install Electron dependencies:**
   ```bash
   cd electron
   npm install
   ```

## Building the Desktop App

### For Windows:
```bash
npm run build:electron
```

This will create:
- `electron/dist-electron/Qubix CRM Setup.exe` - Windows installer
- Client can double-click to install
- Creates desktop shortcut automatically

### Development Mode (for testing):
```bash
npm run electron
```

This runs Electron in development mode with hot-reload.

## What Gets Built

1. Backend (NestJS) - compiled to `apps/api/dist/`
2. Frontend (Next.js) - compiled to `apps/web/.next/standalone/`
3. Electron wrapper - bundles everything into a single installer

## Client Installation

1. Client receives `Qubix CRM Setup.exe`
2. Double-clicks to install
3. Chooses installation directory (optional)
4. Desktop shortcut is created automatically
5. Double-clicks desktop icon to launch

## Notes

- The app requires Node.js runtime (bundled in Electron)
- Database (PostgreSQL) needs to be installed separately OR switch to SQLite for zero-config
- First launch takes 10-15 seconds to start services
- All services run automatically in the background

