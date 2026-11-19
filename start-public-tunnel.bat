@echo off
echo ========================================================
echo   CHERAN ACCOUNTING - PUBLIC SECURE CLOUDFLARE TUNNEL
echo ========================================================
echo.
echo Starting secure HTTPS public tunnel for http://localhost:3000 ...
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:3000 --http-host-header localhost:3000
pause
