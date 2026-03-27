@echo off
title Zain Perfumes Website
color 0A
echo ========================================================
echo        Starting Zain Perfumes Website
echo ========================================================
echo.
echo  Website : http://localhost:8000
echo  Admin   : http://localhost:8000/admin
echo  Login   : admin / admin123
echo.
echo Press CTRL+C to stop the server.
echo.

set PHP_EXE=php

rem Check if PHP is in PATH
php -v >nul 2>&1
if %errorlevel% equ 0 goto :run

rem Check XAMPP on C drive
if exist "C:\xampp\php\php.exe" (
    set PHP_EXE=C:\xampp\php\php.exe
    goto :run
)

rem Check XAMPP on D drive
if exist "D:\xampp\php\php.exe" (
    set PHP_EXE=D:\xampp\php\php.exe
    goto :run
)

color 0C
echo ERROR: PHP not found.
echo Please install XAMPP from https://www.apachefriends.org/
echo.
pause
exit /b 1

:run
"%PHP_EXE%" -S localhost:8000 -t zain-standalone-website zain-standalone-website/router.php
pause
