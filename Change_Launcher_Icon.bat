@echo off
setlocal EnableDelayedExpansion

echo =========================================
echo       equilibr Launcher Icon Changer
echo =========================================
echo.
echo Executable (.exe) files have their icons locked. 
echo This tool will create a customizable Desktop Shortcut 
echo that you can easily change later.
echo.

set "APP_DIR=%~dp0"
:: Remove trailing backslash if present
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

:: List all .ico files
set count=0
for %%F in ("%APP_DIR%\*.ico") do (
    set /a count+=1
    set "icon[!count!]=%%~nxF"
    echo [!count!] %%~nxF
)

if %count%==0 (
    echo No .ico files found in %APP_DIR%.
    pause
    exit /b
)

echo.
set /p choice="Enter the number of the icon you want to use (1-%count%): "

:: Validate choice
if not defined icon[%choice%] (
    echo Invalid selection.
    pause
    exit /b
)

set "SELECTED_ICON=!icon[%choice%]!"
set "ICON_PATH=%APP_DIR%\%SELECTED_ICON%"

echo.
echo Selected Icon: %SELECTED_ICON%
echo Creating Desktop Shortcut...

:: PowerShell script to create shortcut
powershell -ExecutionPolicy Bypass -Command "$sh = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $s = $sh.CreateShortcut($desktop + '\equilibr Launcher.lnk'); $s.TargetPath = '%APP_DIR%\equilibr_QuickStart.bat'; $s.WorkingDirectory = '%APP_DIR%'; $s.IconLocation = '%ICON_PATH%,0'; $s.Save()"

echo.
echo =========================================
echo Success! 
echo A new "equilibr Launcher" shortcut has been created on your Desktop.
echo You can use this shortcut to start equilibr with the new icon.
echo.
echo Note: If you want to change it again manually, just Right-Click 
echo the shortcut -^> Properties -^> Change Icon.
echo =========================================
pause
