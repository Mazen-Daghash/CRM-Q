@echo off
echo ========================================
echo Starting Qubix CRM on Localhost
echo ========================================
echo.

echo Checking prerequisites...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found!
echo.

echo Starting Backend API (Terminal 1)...
start "Qubix CRM - Backend API" cmd /k "npm run start:dev --workspace=@qubix/api"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend Web (Terminal 2)...
start "Qubix CRM - Frontend Web" cmd /k "npm run dev --workspace=@qubix/web"

echo.
echo ========================================
echo Application Starting...
echo ========================================
echo.
echo Backend API:  http://localhost:4000
echo Frontend Web: http://localhost:3000
echo.
echo Opening browser in 10 seconds...
timeout /t 10 /nobreak >nul

start http://localhost:3000

echo.
echo Browser opened! Check the two terminal windows for status.
echo.
echo To stop: Close both terminal windows or press Ctrl+C in each.
echo.
pause

