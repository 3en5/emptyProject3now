@echo off
setlocal
cd /d "%~dp0"

REM ==========================================================
REM  Register the app to start automatically on login.
REM  Creates a Task Scheduler task that runs at logon and
REM  starts the server in the background with no window.
REM ==========================================================

set TASK=FinanceDocs

REM Tiny VBS launcher that runs start-server.bat with no visible window
set LAUNCHER=%~dp0_boot-hidden.vbs
> "%LAUNCHER%" echo Set s = CreateObject("WScript.Shell")
>>"%LAUNCHER%" echo s.CurrentDirectory = "%~dp0"
>>"%LAUNCHER%" echo s.Run """%~dp0start-server.bat""", 0, False

schtasks /Create /TN "%TASK%" /TR "wscript.exe \"%LAUNCHER%\"" /SC ONLOGON /RL LIMITED /F
if errorlevel 1 (
  echo [ERROR] Could not create the task. Try running this file as Administrator.
  pause
  exit /b 1
)

echo.
echo   Done! The app will start automatically every time you log in.
echo   Address: http://localhost:3018
echo.
echo   To remove later:  schtasks /Delete /TN "FinanceDocs" /F
echo.
echo   Starting it now for this session too...
start "" wscript.exe "%LAUNCHER%"
timeout /t 3 >nul
start "" http://localhost:3018
pause
