# Script to create Qubix CRM database
# This script finds PostgreSQL and creates the database

Write-Host "Finding PostgreSQL installation..." -ForegroundColor Cyan

# Try common PostgreSQL installation paths
$psqlPaths = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\17\bin\psql.exe"
)

$psqlPath = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        Write-Host "Found PostgreSQL at: $psqlPath" -ForegroundColor Green
        break
    }
}

if (-not $psqlPath) {
    Write-Host "PostgreSQL not found in common locations." -ForegroundColor Red
    Write-Host "Please install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or manually add PostgreSQL bin folder to PATH and run:" -ForegroundColor Yellow
    Write-Host '  psql -U postgres -c "CREATE DATABASE qubix_crm;"' -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Creating database 'qubix_crm'..." -ForegroundColor Cyan
Write-Host "You will be prompted for the PostgreSQL password (default user: postgres)" -ForegroundColor Yellow
Write-Host ""

# Create database
$env:PGPASSWORD = Read-Host "Enter PostgreSQL password for user 'postgres'" -AsSecureString
$securePassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD))
$env:PGPASSWORD = $securePassword

try {
    & $psqlPath -U postgres -c "CREATE DATABASE qubix_crm;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database 'qubix_crm' created successfully!" -ForegroundColor Green
    } else {
        # Check if database already exists
        $checkResult = & $psqlPath -U postgres -lqt 2>&1 | Select-String "qubix_crm"
        if ($checkResult) {
            Write-Host "Database 'qubix_crm' already exists!" -ForegroundColor Yellow
        } else {
            Write-Host "Failed to create database. Please check your PostgreSQL credentials." -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    $env:PGPASSWORD = $null
}

Write-Host ""
Write-Host "Database setup complete! You can now run the Qubix CRM application." -ForegroundColor Green

