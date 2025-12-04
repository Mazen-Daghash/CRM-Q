@echo off
echo Checking for PostgreSQL (psql.exe)...
echo.

REM Check common PostgreSQL installation paths
set FOUND=0

if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
    echo [FOUND] PostgreSQL 18 at: C:\Program Files\PostgreSQL\18\bin\psql.exe
    set FOUND=1
)

if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
    echo [FOUND] PostgreSQL 17 at: C:\Program Files\PostgreSQL\17\bin\psql.exe
    set FOUND=1
)

if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    echo [FOUND] PostgreSQL 16 at: C:\Program Files\PostgreSQL\16\bin\psql.exe
    set FOUND=1
)

if exist "C:\Program Files (x86)\PostgreSQL\18\bin\psql.exe" (
    echo [FOUND] PostgreSQL 18 (32-bit) at: C:\Program Files (x86)\PostgreSQL\18\bin\psql.exe
    set FOUND=1
)

if exist "C:\Program Files (x86)\PostgreSQL\17\bin\psql.exe" (
    echo [FOUND] PostgreSQL 17 (32-bit) at: C:\Program Files (x86)\PostgreSQL\17\bin\psql.exe
    set FOUND=1
)

REM Check if psql is in PATH
where psql >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [FOUND] psql is in your system PATH
    where psql
    set FOUND=1
)

if %FOUND% EQU 0 (
    echo [NOT FOUND] PostgreSQL (psql.exe) was not found on your system.
    echo.
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
) else (
    echo.
    echo PostgreSQL is installed on your system!
)

echo.
pause

