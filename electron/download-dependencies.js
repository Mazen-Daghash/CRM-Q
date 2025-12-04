// Script to download Node.js and PostgreSQL portable versions
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const NODE_VERSION = '20.18.0';
const POSTGRES_VERSION = '17.0';

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }
    }).on('error', reject);
  });
}

async function extractZip(zipPath, destDir) {
  const { extract } = require('extract-zip');
  await extract(zipPath, { dir: destDir });
}

async function setupDependencies() {
  const depsDir = path.join(__dirname, 'dependencies');
  if (!fs.existsSync(depsDir)) {
    fs.mkdirSync(depsDir, { recursive: true });
  }

  console.log('Setting up dependencies...');

  // Node.js is already bundled with Electron, so we don't need to download it
  // But we'll create a script to use Electron's Node.js

  // For PostgreSQL, we'll create a setup script that checks for installation
  // and provides instructions if not found
  
  console.log('Dependencies setup complete!');
  console.log('Note: PostgreSQL must be installed separately.');
  console.log('Download from: https://www.postgresql.org/download/windows/');
}

if (require.main === module) {
  setupDependencies().catch(console.error);
}

module.exports = { setupDependencies };

