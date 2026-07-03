@echo off
TITLE equilibrBackend (Port 5007)
echo Cleaning up existing processes on port 5007...
for /f "tokens=5" %%a in ('netstat -aon ^| find "5007" ^| find "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)
echo Installing NPM Dependencies...
call npm install express sqlite3 cors form-data axios selfsigned --no-audit --no-fund
echo Starting equilibr Node.js SECURE Backend on Port 5007...
node WorkLocusServer.js
pause
