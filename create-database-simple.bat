@echo off
echo ========================================
echo Qubix CRM - Database Setup
echo ========================================
echo.
echo This script will create the 'qubix_crm' database.
echo You will need your PostgreSQL password.
echo.

REM Try to find psql in common locations
set PSQL_PATH=
if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set PSQL_PATH=C:\Program Files\PostgreSQL\17\bin\psql.exe
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe
if exist "C:\Program Files (x86)\PostgreSQL\18\bin\psql.exe" set PSQL_PATH=C:\Program Files (x86)\PostgreSQL\18\bin\psql.exe
if exist "C:\Program Files (x86)\PostgreSQL\17\bin\psql.exe" set PSQL_PATH=C:\Program Files (x86)\PostgreSQL\17\bin\psql.exe

if "%PSQL_PATH%"=="" (
    echo ERROR: PostgreSQL not found!
    echo.
    echo Please either:
    echo 1. Install PostgreSQL from https://www.postgresql.org/download/windows/
    echo 2. Or add PostgreSQL bin folder to your PATH
    echo.
    pause
    exit /b 1
)

echo Found PostgreSQL at: %PSQL_PATH%
echo.
echo Creating database 'qubix_crm'...
echo You will be prompted for the PostgreSQL password (default user: postgres)
echo.

"%PSQL_PATH%" -U postgres -c "CREATE DATABASE qubix_crm;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Database 'qubix_crm' created!
) else (
    echo.
    echo Checking if database already exists...
    "%PSQL_PATH%" -U postgres -lqt | findstr /C:"qubix_crm" >nul
    if %ERRORLEVEL% EQU 0 (
        echo Database 'qubix_crm' already exists. That's okay!
    ) else (
        echo.
        echo ERROR: Failed to create database.
        echo Please check your PostgreSQL password and try again.
    )
)

echo.
echo Database setup complete!
pause

