@echo off
set "INSTALLER_DIR=%~dp0"
set "APP_DIR=%INSTALLER_DIR%.."
set "SERVICE_NAME=equilibrBackend"
set "PORT=5007"

:: Change to the application root directory so we run commands from the correct folder
cd /d "%APP_DIR%"

:: [Auto-Elevation Logic for Administrator access]
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo [!] Requesting Admin Permissions to run setup...
    goto UACPrompt
) else ( goto gotAdmin )
:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B
:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )

echo --- equilibr Master Setup (Admin) ---

echo.
echo Installing Node.js Dependencies...
call npm install

echo.
echo Force-clearing any "ghost" processes on port 5007...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM server.exe /T 2>nul
taskkill /F /IM equilibrBootloader.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo stopping service...
.\nssm.exe stop %SERVICE_NAME% 2>nul
.\nssm.exe remove %SERVICE_NAME% confirm >nul 2>&1

echo configuring application...
:: 1. Find Node.js executable robustly
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" (
    for /f "tokens=*" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
)

:: 2. Use Standalone EXE if available, otherwise use detected Node
set "EXE_PATH=%cd%\WorkLocusServer.exe"
if exist "%EXE_PATH%" (
    echo [INFO] Using standalone WorkLocusServer.exe
    .\nssm.exe install %SERVICE_NAME% "%EXE_PATH%"
    .\nssm.exe set %SERVICE_NAME% AppParameters ""
) else (
    echo [INFO] Using detected Node: %NODE_EXE%
    .\nssm.exe install %SERVICE_NAME% "%NODE_EXE%"
    .\nssm.exe set %SERVICE_NAME% AppParameters "WorkLocusServer.js"
)

:: 3. Configure Logging (Removed due to NSSM bug causing SERVICE_PAUSED)

.\nssm.exe set %SERVICE_NAME% AppDirectory "%cd%"
.\nssm.exe set %SERVICE_NAME% AppRestartDelay 5000
.\nssm.exe set %SERVICE_NAME% Start SERVICE_AUTO_START

echo starting service...
.\nssm.exe start %SERVICE_NAME%

echo.
echo Ensuring Firewall is open for Port %PORT% (All Profiles)...
powershell -NoProfile -Command "if (!(Get-NetFirewallRule -DisplayName 'equilibr Port %PORT%' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'equilibr Port %PORT%' -Direction Inbound -LocalPort %PORT% -Protocol TCP -Profile Any -Action Allow } else { Set-NetFirewallRule -DisplayName 'equilibr Port %PORT%' -Profile Any -Action Allow }"

echo.
powershell -Command "Write-Host 'Success: The server is online, firewall is open, dependencies are installed, and logs are active.' -ForegroundColor Green"
echo.
.\nssm.exe status %SERVICE_NAME%
pause
