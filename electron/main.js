const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let apiProcess;
let webProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: false,
  });

  // Show loading screen immediately
  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .loader {
          text-align: center;
          color: white;
        }
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h1 { margin: 0; font-size: 24px; }
        p { margin: 10px 0 0 0; opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="loader">
        <div class="spinner"></div>
        <h1>Qubix CRM</h1>
        <p id="status">Initializing...</p>
      </div>
    </body>
    </html>
  `);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

function updateStatus(message) {
  if (mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      document.getElementById('status').textContent = '${message.replace(/'/g, "\\'")}';
    `).catch(() => {});
  }
}

function waitForService(url, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        req.destroy();
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else {
          if (attempts >= maxAttempts) {
            reject(new Error(`Service not ready after ${maxAttempts} attempts`));
          } else {
            setTimeout(check, interval);
          }
        }
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Service not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, interval);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error(`Service not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, interval);
        }
      });
    };
    check();
  });
}

async function checkPostgreSQL() {
  const fs = require('fs');
  const path = require('path');
  
  // Common PostgreSQL installation paths on Windows
  const commonPaths = [
    'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\18\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe',
  ];

  // Check if PostgreSQL binaries exist
  let psqlPath = null;
  for (const testPath of commonPaths) {
    if (fs.existsSync(testPath)) {
      psqlPath = testPath;
      break;
    }
  }

  // Also try checking PATH
  if (!psqlPath) {
    try {
      await execAsync('psql --version');
      psqlPath = 'psql'; // Found in PATH
    } catch {
      // Not in PATH
    }
  }

  if (!psqlPath) {
    return { installed: false, running: false };
  }

  // Check if service is running
  try {
    // Try pg_isready if available
    const pgIsReadyPath = psqlPath.replace('psql.exe', 'pg_isready.exe');
    if (fs.existsSync(pgIsReadyPath)) {
      await execAsync(`"${pgIsReadyPath}"`);
      return { installed: true, running: true };
    } else {
      // Fallback: check service status
      try {
        const { stdout } = await execAsync('sc query postgresql-x64-18');
        if (stdout.includes('RUNNING')) {
          return { installed: true, running: true };
        }
      } catch {
        // Try other service names
        try {
          const { stdout } = await execAsync('sc query postgresql-x64-17');
          if (stdout.includes('RUNNING')) {
            return { installed: true, running: true };
          }
        } catch {
          // Service might not be running
        }
      }
    }
  } catch {
    // pg_isready failed, but PostgreSQL is installed
    // Try to start the service
    if (process.platform === 'win32') {
      try {
        await execAsync('net start postgresql-x64-18');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { installed: true, running: true };
      } catch {
        try {
          await execAsync('net start postgresql-x64-17');
          await new Promise(resolve => setTimeout(resolve, 5000));
          return { installed: true, running: true };
        } catch {
          return { installed: true, running: false };
        }
      }
    }
    return { installed: true, running: false };
  }

  return { installed: true, running: true };
}

async function createDatabaseIfNeeded() {
  const fs = require('fs');
  
  // Find PostgreSQL installation
  const commonPaths = [
    'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\18\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe',
  ];

  let psqlPath = null;
  for (const testPath of commonPaths) {
    if (fs.existsSync(testPath)) {
      psqlPath = testPath;
      break;
    }
  }

  if (!psqlPath) {
    try {
      await execAsync('psql --version');
      psqlPath = 'psql';
    } catch {
      return; // PostgreSQL not found, skip database creation
    }
  }

  try {
    // Try to create database (will fail silently if exists)
    const command = psqlPath === 'psql' 
      ? 'psql -U postgres -c "CREATE DATABASE qubix_crm;"'
      : `"${psqlPath}" -U postgres -c "CREATE DATABASE qubix_crm;"`;
    await execAsync(command);
  } catch {
    // Database might already exist, ignore error
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const rootPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app')
      : path.join(__dirname, '..');

    const apiPath = app.isPackaged
      ? path.join(rootPath, 'apps/api/dist')
      : path.join(rootPath, 'apps/api');

    // Use Electron's Node.js (process.execPath points to Electron, but we need node)
    // In packaged app, we'll use system node or bundled node
    const nodePath = process.platform === 'win32' ? 'node.exe' : 'node';
    
    const command = app.isPackaged 
      ? nodePath  // Use system node
      : 'npm';
    
    const args = app.isPackaged 
      ? [path.join(apiPath, 'main.js')]
      : ['run', 'start:dev', '--workspace=@qubix/api'];

    const cwd = app.isPackaged ? apiPath : rootPath;

    console.log('Starting backend...', { command, args, cwd });

    apiProcess = spawn(command, args, {
      cwd,
      shell: true, // Always use shell for better compatibility
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '4000',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/qubix_crm',
      },
    });

    let backendReady = false;

    apiProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`API: ${output}`);
      if ((output.includes('listening') || output.includes('Application is running') || output.includes('4000')) && !backendReady) {
        backendReady = true;
        setTimeout(() => resolve(), 1000);
      }
    });

    apiProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.error(`API Error: ${output}`);
      // Don't reject on stderr - NestJS logs warnings there
    });

    apiProcess.on('error', (error) => {
      console.error('Failed to start API:', error);
      if (!backendReady) {
        reject(error);
      }
    });

    // Fallback: resolve after timeout even if no ready message
    setTimeout(() => {
      if (!backendReady) {
        console.log('Backend timeout - assuming ready');
        backendReady = true;
        resolve();
      }
    }, 15000);
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    const rootPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app')
      : path.join(__dirname, '..');

    const webPath = app.isPackaged
      ? path.join(rootPath, 'apps/web')
      : path.join(rootPath, 'apps/web');

    const nodePath = process.platform === 'win32' ? 'node.exe' : 'node';
    
    const command = app.isPackaged 
      ? nodePath
      : 'npm';
    
    const nextPath = app.isPackaged
      ? path.join(webPath, 'node_modules', '.bin', 'next')
      : 'next';
    
    const args = app.isPackaged 
      ? [nextPath, 'start']
      : ['run', 'dev'];

    console.log('Starting frontend...', { command, args, cwd: webPath });

    webProcess = spawn(command, args, {
      cwd: webPath,
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:4000/api',
      },
    });

    let frontendReady = false;

    webProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`Web: ${output}`);
      if ((output.includes('Local:') || output.includes('ready') || output.includes('3000')) && !frontendReady) {
        frontendReady = true;
        setTimeout(() => resolve(), 2000);
      }
    });

    webProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.error(`Web Error: ${output}`);
    });

    webProcess.on('error', (error) => {
      console.error('Failed to start Web:', error);
      if (!frontendReady) {
        reject(error);
      }
    });

    // Fallback: resolve after timeout
    setTimeout(() => {
      if (!frontendReady) {
        console.log('Frontend timeout - assuming ready');
        frontendReady = true;
        resolve();
      }
    }, 20000);
  });
}

function loadApp() {
  const url = 'http://localhost:3000';
  console.log('Loading app from:', url);
  
  mainWindow.loadURL(url).catch((err) => {
    console.error('Failed to load URL:', err);
    // Retry after delay
    setTimeout(() => {
      mainWindow.loadURL(url);
    }, 3000);
  });
}

function showError(error) {
  const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 40px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
        }
        .error {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 600px;
          margin: 0 auto;
        }
        h1 { color: #e74c3c; }
        pre { background: #f8f8f8; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
        .instructions { background: #e8f4f8; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .instructions h3 { margin-top: 0; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="error">
        <h1>Failed to Start Qubix CRM</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <div class="instructions">
          <h3>Setup Instructions:</h3>
          <ol>
            <li><strong>Install Node.js:</strong> Download from <a href="https://nodejs.org" target="_blank">nodejs.org</a> (LTS version)</li>
            <li><strong>Install PostgreSQL:</strong> Download from <a href="https://www.postgresql.org/download/windows/" target="_blank">postgresql.org</a></li>
            <li><strong>Create Database:</strong> Run in Command Prompt:<br>
              <code>psql -U postgres -c "CREATE DATABASE qubix_crm;"</code></li>
            <li><strong>Restart the application</strong></li>
          </ol>
        </div>
        <details>
          <summary>Technical Details</summary>
          <pre>${error.stack}</pre>
        </details>
      </div>
    </body>
    </html>
  `;
  
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

app.whenReady().then(async () => {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Fullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Qubix CRM',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Qubix CRM',
              message: 'Qubix CRM v1.0.0',
              detail: 'Internal CRM platform for construction management.\n\nRequires Node.js and PostgreSQL to be installed.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Create window first with loading screen
  createWindow();

  try {
    // Check PostgreSQL
    updateStatus('Checking PostgreSQL...');
    const pgStatus = await checkPostgreSQL();
    
    if (!pgStatus.installed) {
      throw new Error('PostgreSQL is not installed. Please install PostgreSQL from https://www.postgresql.org/download/windows/. See SETUP_INSTRUCTIONS.md for detailed installation steps.');
    }
    
    if (!pgStatus.running) {
      throw new Error('PostgreSQL service is not running. Please start PostgreSQL service: 1) Press Windows+R, 2) Type "services.msc" and press Enter, 3) Find "postgresql-x64-18" (or similar), 4) Right-click and select "Start". See SETUP_INSTRUCTIONS.md for more help.');
    }
    
    updateStatus('PostgreSQL ready');
    await createDatabaseIfNeeded();

    // Start backend
    updateStatus('Starting backend API...');
    await startBackend();
    updateStatus('Backend ready');

    // Start frontend
    updateStatus('Starting frontend...');
    await startFrontend();
    updateStatus('Frontend ready');

    // Load the app
    updateStatus('Loading application...');
    setTimeout(() => {
      loadApp();
    }, 2000);
  } catch (error) {
    console.error('Failed to start services:', error);
    showError(error);
  }
});

app.on('window-all-closed', () => {
  if (apiProcess) {
    apiProcess.kill();
  }
  if (webProcess) {
    webProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (apiProcess) {
    apiProcess.kill();
  }
  if (webProcess) {
    webProcess.kill();
  }
});
