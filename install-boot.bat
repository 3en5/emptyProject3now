@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

REM ==========================================================
REM  רישום האפליקציה לעלייה אוטומטית עם הדלקת/כניסה למחשב.
REM  יוצר משימה מתוזמנת (Task Scheduler) שרצה ב-Logon,
REM  ומריצה את השרת ברקע ללא חלון.
REM ==========================================================

set TASK=FinanceDocs

REM קובץ VBS זעיר שמריץ את start-server.bat ללא חלון גלוי
set LAUNCHER=%~dp0_boot-hidden.vbs
> "%LAUNCHER%" echo Set s = CreateObject("WScript.Shell")
>>"%LAUNCHER%" echo s.CurrentDirectory = "%~dp0"
>>"%LAUNCHER%" echo s.Run """%~dp0start-server.bat""", 0, False

schtasks /Create /TN "%TASK%" /TR "wscript.exe \"%LAUNCHER%\"" /SC ONLOGON /RL LIMITED /F
if errorlevel 1 (
  echo [שגיאה] יצירת המשימה נכשלה. נסה להריץ את הקובץ כ-Administrator.
  pause
  exit /b 1
)

echo.
echo   ✅ נרשם! האפליקציה תעלה אוטומטית בכל כניסה למחשב.
echo   כתובת: http://localhost:3018
echo.
echo   להסרה בעתיד:  schtasks /Delete /TN "%TASK%" /F
echo.
echo   מפעיל עכשיו גם לפעם הזו...
start "" wscript.exe "%LAUNCHER%"
timeout /t 3 >nul
start "" http://localhost:3018
pause
