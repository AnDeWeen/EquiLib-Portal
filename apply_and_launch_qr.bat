@echo off
set APP_DIR=c:\Users\DELL\.gemini\antigravity\scratch\equilibr
cd /d %APP_DIR%

echo --- Applying Offline Portable Server Update ---
.\nssm.exe stop equilibrBackend
taskkill /F /IM equilibrBootloader.exe /T
taskkill /F /IM node.exe /T
timeout /t 2 /nobreak

echo.
echo Restarting equilibr Local Service...
.\nssm.exe start equilibrBackend

echo.
echo Opening Server QR Code Launcher...
timeout /t 5 /nobreak
start http://localhost:5007/

echo Update Complete!
pause
