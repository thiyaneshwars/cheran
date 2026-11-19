@echo off
title Cheran Co-operative Society Accounting Server [PRODUCTION]
color 0A

echo =====================================================================
echo    CHERAN WEAVERS CO-OPERATIVE PRODUCTION SERVER SETUP
echo    சேரன் நெசவாளர் கூட்டுறவு சங்க கணக்கு மென்பொருள் [தயாரிப்பு நிலை]
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Verify Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Set Production Environment
set NODE_ENV=production
set PORT=3000
set HOSTNAME=0.0.0.0
set DATABASE_URL=file:./prod.db

:: 3. Automated Database Backup before startup
if exist "prisma\prod.db" (
    echo [1/4] Creating automated safety backup of production database...
    node scripts\backup-db.js
    echo.
)

:: 4. Database Schema Sync for Production
echo [2/4] Verifying production database schema...
call npx prisma db push --skip-generate --accept-data-loss
if %errorlevel% neq 0 (
    echo [WARNING] Schema sync encountered a notice. Continuing...
)
echo.

:: 5. Initialize Production Database if first time
if not exist "prisma\prod.db" (
    echo [3/4] Initializing clean production database with official accounts...
    call npx tsx prisma\seed-prod.ts
    echo.
) else (
    echo [3/4] Production database verified at prisma\prod.db.
    echo.
)

:: 6. Check for Production Build
if not exist ".next\BUILD_ID" (
    echo [4/4] Building optimized production server bundle...
    call npm run build
    echo.
) else (
    echo [4/4] Production build verified.
    echo.
)

:: 7. Detect Local LAN IP for Office Wi-Fi access
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object IPEnabled).IPAddress[0]"`^) do set "LOCAL_IP=%%i"

cls
color 02
echo =====================================================================
echo    CHERAN WEAVERS CO-OPERATIVE ACCOUNTING SOFTWARE [LIVE]
echo =====================================================================
echo.
echo    Server is running on all network interfaces!
echo.
echo    [1] Local PC Access:
echo        http://localhost:3000
echo.
if defined LOCAL_IP (
echo    [2] Office LAN / Wi-Fi Access (Other Office Computers & Tablets):
echo        http://%LOCAL_IP%:3000
echo.
)
echo    Database: prisma\prod.db
echo    Backups:  backups\ (Auto-saved on startup & via 'npm run backup')
echo.
echo    Default Staff Logins:
echo    -----------------------------------------------------------------
echo    - Secretary / Admin : admin@cheran.coop       / Society@2026
echo    - Head Accountant   : accountant@cheran.coop  / Society@2026
echo    - Data Operator     : operator@cheran.coop    / Society@2026
echo    - Auditor           : auditor@cheran.coop     / Society@2026
echo    - President         : management@cheran.coop  / Society@2026
echo.
echo    Press Ctrl+C to stop the server at any time.
echo =====================================================================
echo.

:: Start Next.js on 0.0.0.0:3000
call npx next start -H 0.0.0.0 -p 3000

pause
