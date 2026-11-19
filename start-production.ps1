# Cheran Co-operative Society Accounting - Production Launcher
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "    CHERAN WEAVERS CO-OPERATIVE PRODUCTION SERVER SETUP" -ForegroundColor Green
Write-Host "    சேரன் நெசவாளர் கூட்டுறவு சங்க கணக்கு மென்பொருள் [தயாரிப்பு நிலை]" -ForegroundColor Gray
Write-Host "=====================================================================`n" -ForegroundColor Green

Set-Location $PSScriptRoot

$env:NODE_ENV = "production"
$env:PORT = "3000"
$env:HOSTNAME = "0.0.0.0"
$env:DATABASE_URL = "file:./prod.db"

# 1. Automated Backup
if (Test-Path "prisma\prod.db") {
    Write-Host "[1/4] Creating automated safety backup of production database..." -ForegroundColor Yellow
    node scripts\backup-db.js
    Write-Host ""
}

# 2. Schema Sync
Write-Host "[2/4] Verifying production database schema..." -ForegroundColor Cyan
npx prisma db push --skip-generate --accept-data-loss
Write-Host ""

# 3. First-time initialization
if (-not (Test-Path "prisma\prod.db")) {
    Write-Host "[3/4] Initializing clean production database with official accounts..." -ForegroundColor Cyan
    npx tsx prisma\seed-prod.ts
    Write-Host ""
} else {
    Write-Host "[3/4] Production database verified at prisma\prod.db." -ForegroundColor Green
    Write-Host ""
}

# 4. Build Check
if (-not (Test-Path ".next\BUILD_ID")) {
    Write-Host "[4/4] Building optimized production server bundle..." -ForegroundColor Cyan
    npm run build
    Write-Host ""
} else {
    Write-Host "[4/4] Production build verified." -ForegroundColor Green
    Write-Host ""
}

# Get Local LAN IP
$localIp = (Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object IPEnabled).IPAddress[0]

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "    CHERAN WEAVERS CO-OPERATIVE ACCOUNTING SOFTWARE [LIVE]" -ForegroundColor Green
Write-Host "=====================================================================`n" -ForegroundColor Green

Write-Host " Server is running and listening on all network interfaces!`n" -ForegroundColor White
Write-Host " [1] Local PC Access:" -ForegroundColor Cyan
Write-Host "     http://localhost:3000`n" -ForegroundColor Yellow

if ($localIp) {
    Write-Host " [2] Office LAN / Wi-Fi Access (Other Office Computers & Tablets):" -ForegroundColor Cyan
    Write-Host "     http://${localIp}:3000`n" -ForegroundColor Yellow
}

Write-Host " Database: prisma\prod.db" -ForegroundColor Gray
Write-Host " Backups:  backups\ (Auto-saved on startup & via 'npm run backup')`n" -ForegroundColor Gray

Write-Host " Default Staff Logins:" -ForegroundColor White
Write-Host " -----------------------------------------------------------------" -ForegroundColor Gray
Write-Host " - Secretary / Admin : admin@cheran.coop       / Society@2026" -ForegroundColor Gray
Write-Host " - Head Accountant   : accountant@cheran.coop  / Society@2026" -ForegroundColor Gray
Write-Host " - Data Operator     : operator@cheran.coop    / Society@2026" -ForegroundColor Gray
Write-Host " - Auditor           : auditor@cheran.coop     / Society@2026" -ForegroundColor Gray
Write-Host " - President         : management@cheran.coop  / Society@2026`n" -ForegroundColor Gray

Write-Host " Press Ctrl+C to stop the server at any time." -ForegroundColor DarkYellow
Write-Host "=====================================================================`n" -ForegroundColor Green

npx next start -H 0.0.0.0 -p 3000
