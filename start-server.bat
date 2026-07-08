@echo off
cd /d "%~dp0"
REM Fast daily start - assumes run-local.bat already built the app once.
if not exist "frontend\dist\index.html" (
  echo [INFO] Frontend not built yet - running full setup once...
  call "%~dp0run-local.bat"
  exit /b
)
echo Starting server at http://localhost:3018
set PORT=3018
set FINANCE_QUIET=1
node backend/server.js
