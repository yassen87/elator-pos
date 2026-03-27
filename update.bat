@echo off
chcp 65001 >nul
title تحديث Elator POS
color 0A

echo.
echo ═══════════════════════════════════════════════════════
echo          🚀 Elator POS - نظام التحديث التلقائي
echo ═══════════════════════════════════════════════════════
echo.

REM رابط التحديث (غيّره حسب رابط MediaFire أو Google Drive)
set UPDATE_URL=https://www.mediafire.com/file/xxxxx/ElatorPOS-Latest.exe/file
set DOWNLOAD_FILE=ElatorPOS-Update.exe

echo [1/4] جاري التحقق من التحديثات...
timeout /t 2 /nobreak >nul

echo [2/4] جاري تحميل التحديث من السيرفر...
echo.

REM استخدام PowerShell لتحميل الملف مع شريط تقدم
powershell -Command "& {
    $ProgressPreference = 'SilentlyContinue'
    Write-Host '⬇️  جاري التحميل...' -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri '%UPDATE_URL%' -OutFile '%DOWNLOAD_FILE%' -UseBasicParsing
        Write-Host '✅ تم التحميل بنجاح!' -ForegroundColor Green
    } catch {
        Write-Host '❌ فشل التحميل: ' $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}"

if errorlevel 1 (
    echo.
    echo ❌ فشل تحميل التحديث. تحقق من اتصال الإنترنت.
    pause
    exit /b 1
)

echo.
echo [3/4] إغلاق البرنامج القديم...
taskkill /F /IM "Elator POS.exe" 2>nul
timeout /t 2 /nobreak >nul

echo [4/4] تثبيت التحديث...
echo.

REM نسخ الملف الجديد
if exist "%DOWNLOAD_FILE%" (
    move /Y "%DOWNLOAD_FILE%" "Elator POS.exe"
    echo ✅ تم تثبيت التحديث بنجاح!
    
    REM تشغيل صوت تنبيه
    powershell -c (New-Object Media.SoundPlayer "C:\Windows\Media\Windows Notify System Generic.wav").PlaySync();
    
    echo.
    echo ═══════════════════════════════════════════════════════
    echo          ✨ التحديث اكتمل بنجاح!
    echo ═══════════════════════════════════════════════════════
    echo.
    echo سيتم تشغيل البرنامج الآن...
    timeout /t 3 /nobreak >nul
    
    REM تشغيل البرنامج المحدث
    start "" "Elator POS.exe"
) else (
    echo ❌ خطأ: لم يتم العثور على ملف التحديث
    pause
    exit /b 1
)

echo.
echo تم! يمكنك إغلاق هذه النافذة.
timeout /t 5 /nobreak >nul
exit
