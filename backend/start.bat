@echo off
cls
echo ============================================
echo    Risk Management System - Backend Server
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo    ERROR: Node.js not found!
    echo    Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo    OK - Node.js is installed

echo.
echo [2/3] Starting server...
echo.
node server-sqlite.js

echo.
echo [3/3] Server stopped.
echo.
pause
