@echo off
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

echo Recreating non-admin invisible shortcuts on Desktop...
powershell -ExecutionPolicy Bypass -Command "$sh = New-Object -ComObject WScript.Shell; $s = $sh.CreateShortcut('C:\Users\DELL\Desktop\equilibr Launcher.lnk'); $s.TargetPath = '%APP_DIR%\equilibr_QuickStart.bat'; $s.WorkingDirectory = '%APP_DIR%'; $s.IconLocation = '%APP_DIR%\EQC.ico'; $s.Save()"
powershell -ExecutionPolicy Bypass -Command "$sh = New-Object -ComObject WScript.Shell; $s = $sh.CreateShortcut('C:\Users\DELL\Desktop\Start equilibr.lnk'); $s.TargetPath = '%APP_DIR%\equilibr_QuickStart.bat'; $s.WorkingDirectory = '%APP_DIR%'; $s.IconLocation = '%APP_DIR%\EQC.ico'; $s.Save()"

echo Recreating Startup shortcut...
powershell -ExecutionPolicy Bypass -Command "$sh = New-Object -ComObject WScript.Shell; $s = $sh.CreateShortcut('C:\Users\DELL\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\equilibr Launcher.lnk'); $s.TargetPath = '%APP_DIR%\equilibr_QuickStart.bat'; $s.WorkingDirectory = '%APP_DIR%'; $s.IconLocation = '%APP_DIR%\EQC.ico'; $s.Save()"

:: Remove old batch-based startup files to avoid duplicates
del "C:\Users\DELL\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\equilibr_UI_Startup.bat" 2>nul
del "C:\Users\DELL\Desktop\Start equilibr.bat" 2>nul

echo Done! Shortcuts are premium and UAC-free!
