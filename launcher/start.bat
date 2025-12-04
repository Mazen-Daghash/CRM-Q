@echo off
echo Starting Qubix CRM...
echo.

cd /d "%~dp0\.."

echo Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking PostgreSQL...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL not found in PATH
    echo Make sure PostgreSQL is installed and running
)

echo.
echo Installing dependencies...
call npm install

echo.
echo Starting backend server...
start "Qubix CRM API" cmd /k "npm run dev:api"

timeout /t 5 /nobreak >nul

echo.
echo Starting frontend server...
start "Qubix CRM Web" cmd /k "npm run dev:web"

timeout /t 3 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:3000

echo.
echo Qubix CRM is starting...
echo Backend: http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window (servers will keep running)
pause >nul

