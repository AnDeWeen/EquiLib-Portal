@echo off
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

:: Auto-Elevation Logic for Administrator access
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo [!] Requesting Admin Permissions to install Cloudflare Tunnel...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )

echo --- Installing Cloudflare Tunnel ---
.\cloudflared.exe service install eyJhIjoiYjdmYmY2MWRkOTAzMTA5OGU1MTM2MjcxNWE4OTZhODQiLCJ0IjoiOWM4ZTExYjgtYTU4NC00NDdhLWJmMjEtNDA4NWMzNzljZWY2IiwicyI6IlpXRXhaV1ppTldJdE5tWTNaaTAwT0dNeUxUZzVNR1V0TVRaaFpUUmpPV0ptWkdWaCJ9

echo.
echo Tunnel Installation Complete! Cloudflare is now running in the background.
echo You can close this window.
pause
