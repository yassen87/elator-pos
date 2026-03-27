@echo off
TITLE Zain Perfumes Website Runner
echo.
echo ======================================================
echo    ZAIN PERFUMES WEBSITE - LOCAL RUNNER
echo ======================================================
echo.

SET PHP_PATH=C:\xampp\php\php.exe
SET MYSQL_PATH=C:\xampp\mysql\bin\mysqld.exe
SET SITE_FOLDER=zain-perfumes-php
SET PORT=8000

:: Check if PHP exists
if not exist "%PHP_PATH%" (
    echo [ERROR] PHP not found at %PHP_PATH%. 
    echo Please make sure XAMPP is installed.
    pause
    exit /b
)

:: Start MySQL in background (if not already running)
echo [1/3] Starting MySQL Database...
start /B "" "%MYSQL_PATH%" >nul 2>&1
timeout /t 3 >nul

:: Start Browser
echo [2/3] Opening Browser...
start http://localhost:%PORT%

:: Start PHP Server
echo [3/3] Starting PHP Server on port %PORT%...
echo ------------------------------------------------------
echo DO NOT CLOSE THIS WINDOW WHILE USING THE WEBSITE
echo ------------------------------------------------------
cd %SITE_FOLDER%
"%PHP_PATH%" -S localhost:%PORT%

pause
