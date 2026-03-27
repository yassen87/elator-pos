@echo off
TITLE Download Elator Perfume POS
color 0A

echo ======================================================
echo      Downloading Latest Elator Perfume Setup
echo ======================================================
echo.

set "REPO=yassen87/elator-pos"
set "FILE_NAME=ElatorPerfume-Setup.exe"
set "URL=https://github.com/%REPO%/releases/latest/download/%FILE_NAME%"

echo [+] Target: %URL%
echo [+] Saving to: %cd%\%FILE_NAME%
echo.
echo [!] Downloading... Please wait...

powershell -Command "try { Invoke-WebRequest -Uri '%URL%' -OutFile '%FILE_NAME%' -ErrorAction Stop; echo 'Successfully downloaded!' } catch { echo 'Error: Could not download file. Make sure a release exists on GitHub.'; pause; exit 1 }"

if exist "%FILE_NAME%" (
    echo.
    echo ======================================================
    echo   Download Finished! 
    echo   File: %FILE_NAME%
    echo ======================================================
    echo.
    echo Opening installer...
    start "" "%FILE_NAME%"
) else (
    echo.
    echo [X] Download failed.
)

pause
