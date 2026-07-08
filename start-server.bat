@echo off
chcp 65001 >nul
cd /d "%~dp0"
REM הפעלה מהירה של השרת (מניח שכבר הורץ run-local.bat פעם אחת לבנייה)
if not exist "frontend\dist\index.html" (
  echo [מידע] הממשק עדיין לא נבנה — מריץ בנייה מלאה פעם אחת...
  call "%~dp0run-local.bat"
  exit /b
)
set PORT=3018
set FINANCE_QUIET=1
node backend/server.js
