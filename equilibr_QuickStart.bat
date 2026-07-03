@echo off
set "PORT=5007"
echo --- equilibr 🌪️ Next-Week-Proof Launcher ---

pushd "%~dp0"

:: 1. Wait a few seconds for the automatic Windows service to start if it is booting up
echo Checking if equilibr Service is active...
for /L %%i in (1,1,6) do (
    netstat -aon | findstr :%PORT% | findstr LISTENING >nul
    if not errorlevel 1 (
        echo [INFO] equilibr Service is active! Skipping Admin check...
        goto SkipAdminRestart
    )
    if %%i LSS 6 (
        timeout /t 1 /nobreak >nul
    )
)

:: 2. If not running, check if we are already Admin
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' EQU '0' (
    :: We ARE admin - we can safely clean system and restart the Windows Service
    echo [INFO] Running with Admin privileges. Optimizing background service...
    
    :: Force Clear Zombie Processes on Port 5007
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
    
    :: Restart the Service
    .\nssm.exe stop equilibrBackend 2>nul
    .\nssm.exe start equilibrBackend 2>nul
    
    :: Register Watchdog
    schtasks /create /tn "equilibr Watchdog" /tr "\"%~dp0health_check.bat\"" /sc DAILY /st 00:00 /F >nul 2>&1
    
    goto SkipAdminRestart
)

:: 3. We are NOT Admin, and the service is not active. Let's try to start the service as user
echo [INFO] Trying to start equilibr Service...
net start equilibrBackend >nul 2>&1

:: Check if starting the service worked
timeout /t 2 /nobreak >nul
netstat -aon | findstr :%PORT% | findstr LISTENING >nul
if not errorlevel 1 (
    echo [INFO] equilibr Service started successfully!
    goto SkipAdminRestart
)

:: 4. Service is not running and we cannot start it. Launch local user-space server in background
echo [INFO] Starting local user-space server in background...
if exist "WorkLocusServer.exe" (
    start "" /B "WorkLocusServer.exe"
) else (
    start "" /B node WorkLocusServer.js
)

:SkipAdminRestart

:: 5. Smart IP Detection & Wait Handshake
echo Checking for network address...

:: Robust PowerShell Active IP Fetcher (ignores dead adapters)
for /f "usebackq tokens=*" %%i in (`powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPv4Address -notlike '169.254*' }).IPv4Address | Select-Object -First 1"`) do set IP=%%i
if "%IP%"=="" set IP=localhost

echo 📡 Dynamic IP Detected: %IP%
echo ⏳ Syncing server certificate...

:: Wait for port 5007 to actually be listening before opening browser
:waitproc
powershell -NoProfile -Command "Test-NetConnection -Port %PORT% -ComputerName 127.0.0.1" | findstr "TcpTestSucceeded : True" >nul
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto waitproc
)

:: Launch Dashboard
set "URL=http://%IP%:%PORT%"
echo 🚀 Dashboard Ready! Launching: %URL%
start "" "%URL%"

echo.
echo ===================================
echo DONE! System is alive on: %URL%
echo ===================================
timeout /t 5
