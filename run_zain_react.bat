@echo off
TITLE Zain Perfumes - React + PHP Runner
echo.
echo ======================================================
echo    ZAIN PERFUMES (REACT + PHP) - LOCAL RUNNER
echo ======================================================
echo.

SET PHP_EXE=C:\xampp\php\php.exe
SET MYSQL_EXE=C:\xampp\mysql\bin\mysqld.exe
SET BACKEND_DIR=zain-perfumes-php
SET FRONTEND_DIR=zain-frontend-react

:: 1. Start MySQL
echo [1/3] Starting MySQL...
start /B "" "%MYSQL_EXE%" >nul 2>&1
timeout /t 2 >nul

:: 2. Start PHP Backend API
echo [2/3] Starting PHP API (localhost:8080)...
start /B "" "%PHP_EXE%" -S localhost:8080 -t %BACKEND_DIR% >nul 2>&1

:: 3. Start React Frontend
echo [3/3] Starting React Frontend...
cd %FRONTEND_DIR%
start "" cmd /c "npm run dev & pause"

echo.
echo ======================================================
echo    SYSTEM IS RUNNING
echo    Frontend: http://localhost:5173
echo    Backend API: http://localhost:80
echo ======================================================
echo.
pause
