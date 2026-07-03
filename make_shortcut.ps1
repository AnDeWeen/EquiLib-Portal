Remove-Item -Path 'C:\Users\DELL\Desktop\EquiLib Client.url' -ErrorAction SilentlyContinue
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('C:\Users\DELL\Desktop\EQC.lnk')
$Shortcut.TargetPath = 'explorer.exe'
$Shortcut.Arguments = 'http://localhost:5007/'
$Shortcut.IconLocation = 'c:\Users\DELL\.gemini\antigravity\scratch\EquiLib\real_icon.ico'
$Shortcut.Save()
