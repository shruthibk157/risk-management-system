@echo off
echo ========================================
echo Risk Management System - Database Setup
echo ========================================
echo.

REM Create environment file
echo Creating .env file...
(
echo DB_HOST=localhost
echo DB_USER=root
echo DB_PASSWORD=
echo DB_NAME=risk_management
echo JWT_SECRET=risk-management-secret-key-2024
echo PORT=5000
) > .env

echo.
echo Environment file created!
echo.
pause
