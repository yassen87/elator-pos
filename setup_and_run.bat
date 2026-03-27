@echo off
setlocal enabledelayedexpansion

TITLE Setup Elator POS System
color 0B

echo ======================================================
echo           Elator Perfume POS System Setup
echo ======================================================
echo.

:: Check for Git
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Git is not installed. Please install Git from https://git-scm.com/
    pause
    exit /b
)

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo [+] Downloading/Updating source code from GitHub...
if exist .git (
    git pull origin main
) else (
    git clone https://github.com/yassen87/elator-pos.git .
)

echo.
echo [+] Installing dependencies (this may take a few minutes)...
call npm install

echo.
echo [+] Building the application...
call npm run build

echo.
echo ======================================================
echo   Setup Complete! 
echo   To start the app in development mode: npm run dev
echo   To open the built version: check the 'dist' folder
echo ======================================================
echo.
pause
