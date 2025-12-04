// PostgreSQL Setup Script
// This will check if PostgreSQL is installed and set it up

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

function checkPostgreSQL() {
  return new Promise((resolve) => {
    // Try to connect to PostgreSQL
    exec('psql --version', (error) => {
      if (error) {
        resolve({ installed: false });
      } else {
        // Check if service is running
        exec('pg_isready', (err) => {
          resolve({ installed: true, running: !err });
        });
      }
    });
  });
}

function startPostgreSQL() {
  return new Promise((resolve, reject) => {
    // Try to start PostgreSQL service (Windows)
    if (process.platform === 'win32') {
      exec('net start postgresql-x64-17', (error) => {
        if (error) {
          // Try alternative service name
          exec('sc start postgresql-x64-17', (err) => {
            if (err) {
              reject(new Error('PostgreSQL service not found. Please install PostgreSQL.'));
            } else {
              setTimeout(() => resolve(), 5000);
            }
          });
        } else {
          setTimeout(() => resolve(), 5000);
        }
      });
    } else {
      exec('pg_ctl start', (error) => {
        if (error) {
          reject(error);
        } else {
          setTimeout(() => resolve(), 5000);
        }
      });
    }
  });
}

function createDatabase() {
  return new Promise((resolve, reject) => {
    const createDbCommand = 'psql -U postgres -c "CREATE DATABASE qubix_crm;"';
    exec(createDbCommand, (error) => {
      // Ignore error if database already exists
      resolve();
    });
  });
}

async function setupPostgreSQL() {
  try {
    const status = await checkPostgreSQL();
    
    if (!status.installed) {
      throw new Error('PostgreSQL is not installed. Please install PostgreSQL 17 from https://www.postgresql.org/download/');
    }

    if (!status.running) {
      console.log('Starting PostgreSQL service...');
      await startPostgreSQL();
    }

    console.log('PostgreSQL is running');
    
    // Try to create database (will fail silently if exists)
    await createDatabase();
    
    return true;
  } catch (error) {
    console.error('PostgreSQL setup error:', error);
    throw error;
  }
}

module.exports = { setupPostgreSQL, checkPostgreSQL };

