// Pre-build script to prepare files for Electron packaging
const fs = require('fs');
const path = require('path');

console.log('Cleaning dist-electron folder...');

const distDir = path.join(__dirname, 'dist-electron');
if (fs.existsSync(distDir)) {
  try {
    // Try to remove files one by one to avoid locked file errors
    const removeDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const curPath = path.join(dir, file);
        try {
          const stat = fs.lstatSync(curPath);
          if (stat.isDirectory()) {
            removeDir(curPath);
            try {
              fs.rmdirSync(curPath);
            } catch (err) {
              // Ignore if directory not empty or locked
            }
          } else {
            try {
              fs.unlinkSync(curPath);
            } catch (err) {
              // Ignore locked files
              console.log(`Skipping locked file: ${curPath}`);
            }
          }
        } catch (err) {
          // Ignore errors
        }
      }
    };
    
    removeDir(distDir);
    // Try to remove the directory itself
    try {
      fs.rmdirSync(distDir);
    } catch (err) {
      // Directory might not be empty, that's okay
    }
  } catch (err) {
    console.log('Some files could not be deleted (may be in use)');
  }
}

console.log('Cleanup complete');
