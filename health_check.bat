@echo off
set "PORT=5007"
echo --- equilibr Health Check ---
echo Checking if Service is listening on port %PORT%...

netstat -aon | findstr :%PORT% | findstr LISTENING >nul
if errorlevel 1 (
    echo [!] Server is DOWN!
    echo Attempting to restart via equilibr Launcher...
    start "" "%~dp0equilibr Launcher.exe"
) else (
    echo [OK] Server is running normally.
)
