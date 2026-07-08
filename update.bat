@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo   Financial Documents Manager - Update
echo ==================================================
echo.

REM --- This only works if the project was cloned with Git ---
if not exist ".git" (
  echo [ERROR] This folder is not a Git clone, so it cannot auto-update.
  echo         Either re-download the ZIP from GitHub, or set up Git once
  echo         so future updates are a single double-click.
  echo.
  pause
  exit /b 1
)

REM --- Check Git is installed ---
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed. Download it from: https://git-scm.com
  echo.
  pause
  exit /b 1
)

echo [1/4] Pulling latest changes from GitHub...
git pull
if errorlevel 1 (
  echo [ERROR] git pull failed. Check your internet connection.
  pause
  exit /b 1
)

echo [2/4] Updating server dependencies...
call npm install --silent

echo [3/4] Updating frontend dependencies...
call npm install --prefix frontend --silent

echo [4/4] Rebuilding the frontend...
call npm run build
if errorlevel 1 (
  echo [ERROR] build failed.
  pause
  exit /b 1
)

echo.
echo   Update complete! Your data was not touched.
echo   Start the app again with: start-server.bat
echo   (If the app is running as a boot service, just restart the computer.)
echo.
pause
