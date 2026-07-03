@echo off
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

:: Auto-Elevation Logic for Administrator access
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo [!] Requesting Admin Permissions to restart server...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )

echo --- Restarting equilibr Server ---
echo Stopping service...
.\nssm.exe stop equilibrBackend

echo Force closing old processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5007 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

echo Starting service...
.\nssm.exe start equilibrBackend

echo.
echo Server Restart Complete!
echo You can close this window.
pause
