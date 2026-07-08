@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==================================================
echo   Financial Documents Manager - Local Setup + Run
echo ==================================================
echo.

REM --- Check that Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed on this computer.
  echo         Download the LTS version from: https://nodejs.org
  echo         After installing, run this file again.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo [1/5] Node.js found: %%v

REM --- Install server dependencies ---
echo [2/5] Installing server dependencies - first time may take a minute...
call npm install --silent
if errorlevel 1 (
  echo [ERROR] npm install failed.
  pause
  exit /b 1
)

REM --- Install frontend dependencies ---
echo [3/5] Installing frontend dependencies...
call npm install --prefix frontend --silent
if errorlevel 1 (
  echo [ERROR] frontend install failed.
  pause
  exit /b 1
)

REM --- Build the frontend ---
echo [4/5] Building the frontend...
call npm run build
if errorlevel 1 (
  echo [ERROR] build failed.
  pause
  exit /b 1
)

REM --- Seed initial data only if no DB exists yet ---
if not exist "backend\db\finance.db" (
  echo       Seeding initial inventory...
  call npm run starter
) else (
  echo       Existing database found - keeping your data.
)

REM --- Start ---
echo [5/5] Starting server at http://localhost:3018
echo.
echo   Ready! Opening browser...
echo   To stop the app: close this window, or press Ctrl+C
echo.
start "" http://localhost:3018
set PORT=3018
set FINANCE_QUIET=1
node backend/server.js

pause
