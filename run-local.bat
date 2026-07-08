@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   מערכת ניהול מסמכים פיננסיים — הרצה מקומית
echo ============================================
echo.

REM --- בדיקה ש-Node.js מותקן ---
where node >nul 2>nul
if errorlevel 1 (
  echo [שגיאה] Node.js לא מותקן על המחשב.
  echo         הורד והתקן מ:  https://nodejs.org  ^(גרסת LTS^)
  echo         אחרי ההתקנה — הרץ את הקובץ הזה שוב.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo [1/5] Node.js מזוהה: %%v

REM --- התקנת תלויות (root) ---
echo [2/5] מתקין תלויות שרת... ^(פעם ראשונה יכול לקחת דקה^)
call npm install --silent
if errorlevel 1 ( echo [שגיאה] npm install נכשל & pause & exit /b 1 )

REM --- התקנת תלויות frontend ---
echo [3/5] מתקין תלויות ממשק...
call npm install --prefix frontend --silent
if errorlevel 1 ( echo [שגיאה] התקנת frontend נכשלה & pause & exit /b 1 )

REM --- בנייה ---
echo [4/5] בונה את הממשק...
call npm run build
if errorlevel 1 ( echo [שגיאה] הבנייה נכשלה & pause & exit /b 1 )

REM --- נתונים ראשוניים (רק אם אין DB קיים) ---
if not exist "backend\db\finance.db" (
  echo       מקים נתונים ראשוניים ^(המצאי הראשוני^)...
  call npm run starter
) else (
  echo       נמצא DB קיים — משאיר את הנתונים שלך כמו שהם.
)

REM --- הפעלה ---
echo [5/5] מפעיל את השרת על http://localhost:3018
echo.
echo   ✅ מוכן! פותח את הדפדפן...
echo   לעצירה: סגור את החלון הזה או Ctrl+C
echo.
start "" http://localhost:3018
set PORT=3018
set FINANCE_QUIET=1
node backend/server.js

pause
