@echo off
echo ==========================================================
echo   CHERAN ACCOUNTING - SYNC LOCAL DATA TO GLOBAL VERCEL
echo ==========================================================
echo.
echo Adding latest database snapshot to Git...
git add prisma/dev.db prisma/schema.prisma
git commit -m "Update accounting ledgers and registers snapshot"
echo.
echo Pushing latest data to GitHub...
git push origin master
echo.
echo ==========================================================
echo Done! Vercel is now updating your global read-only site.
echo It will be live with new data within 60 seconds.
echo ==========================================================
pause
