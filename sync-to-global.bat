@echo off
cd /d "%~dp0"
echo ==========================================================
echo   CHERAN ACCOUNTING - SYNC LOCAL DATA TO GLOBAL VERCEL
echo ==========================================================
echo.
echo [1/3] Checking for updated accounting records...
git add prisma/dev.db prisma/prod.db prisma/schema.prisma 2>nul

git diff-index --quiet HEAD --
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Everything is already up to date! No new local data to sync.
    echo Your global site already has the latest records.
    echo.
    goto finished
)

echo [2/3] Saving latest snapshot...
git commit -m "Update accounting data snapshot"

echo.
echo [3/3] Uploading data to GitHub and triggering Vercel refresh...
git push origin master

echo.
echo ==========================================================
echo SUCCESS!
echo Vercel has received your new data and is refreshing.
echo Your global website will show the updated numbers in ~60 seconds.
echo ==========================================================

:finished
echo.
pause
