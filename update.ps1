# PowerShell Update Script with Progress Bar
# استخدم هذا السكريبت لو عايز شريط تقدم أفضل

param(
    [string]$UpdateUrl = "https://www.mediafire.com/file/xxxxx/ElatorPOS.exe/file",
    [string]$OutputFile = "ElatorPOS-Update.exe"
)

# إعدادات
$Host.UI.RawUI.WindowTitle = "Elator POS - Update Manager"
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "Green"
Clear-Host

# عرض الشعار
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "          🚀 Elator POS - نظام التحديث التلقائي" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# التحقق من الاتصال
Write-Host "[1/4] جاري التحقق من الاتصال بالإنترنت..." -ForegroundColor White
Start-Sleep -Seconds 1

try {
    $ping = Test-Connection -ComputerName google.com -Count 1 -Quiet
    if ($ping) {
        Write-Host "✅ الاتصال بالإنترنت متاح" -ForegroundColor Green
    } else {
        throw "لا يوجد اتصال بالإنترنت"
    }
} catch {
    Write-Host "❌ خطأ: $_" -ForegroundColor Red
    Read-Host "اضغط Enter للخروج"
    exit 1
}

Write-Host ""
Write-Host "[2/4] جاري تحميل التحديث..." -ForegroundColor White

# تحميل الملف مع شريط تقدم
try {
    $webClient = New-Object System.Net.WebClient
    
    # حدث التقدم
    Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -SourceIdentifier WebClient.DownloadProgressChanged -Action {
        $percent = $EventArgs.ProgressPercentage
        $received = [Math]::Round($EventArgs.BytesReceived / 1MB, 2)
        $total = [Math]::Round($EventArgs.TotalBytesToReceive / 1MB, 2)
        
        Write-Progress -Activity "تحميل التحديث" `
                       -Status "$percent% مكتمل - $received MB من $total MB" `
                       -PercentComplete $percent
    }
    
    # بدء التحميل
    $webClient.DownloadFileAsync($UpdateUrl, $OutputFile)
    
    # انتظار الانتهاء
    while ($webClient.IsBusy) {
        Start-Sleep -Milliseconds 100
    }
    
    # إلغاء تسجيل الحدث
    Unregister-Event -SourceIdentifier WebClient.DownloadProgressChanged
    $webClient.Dispose()
    
    Write-Host ""
    Write-Host "✅ تم تحميل التحديث بنجاح!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ فشل التحميل: $_" -ForegroundColor Red
    Read-Host "اضغط Enter للخروج"
    exit 1
}

Write-Host ""
Write-Host "[3/4] إغلاق البرنامج القديم..." -ForegroundColor White

# إغلاق البرنامج القديم
$process = Get-Process -Name "Elator POS" -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Name "Elator POS" -Force
    Start-Sleep -Seconds 2
    Write-Host "✅ تم إغلاق البرنامج القديم" -ForegroundColor Green
} else {
    Write-Host "ℹ️  البرنامج غير مشغّل حالياً" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/4] تثبيت التحديث..." -ForegroundColor White

# نسخ الملف الجديد
if (Test-Path $OutputFile) {
    Move-Item -Path $OutputFile -Destination "Elator POS.exe" -Force
    Write-Host "✅ تم تثبيت التحديث بنجاح!" -ForegroundColor Green
    
    # تشغيل صوت تنبيه
    $sound = New-Object System.Media.SoundPlayer "C:\Windows\Media\Windows Notify System Generic.wav"
    $sound.PlaySync()
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "          ✨ التحديث اكتمل بنجاح!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "سيتم تشغيل البرنامج الآن..." -ForegroundColor White
    
    Start-Sleep -Seconds 3
    
    # تشغيل البرنامج المحدث
    Start-Process "Elator POS.exe"
    
} else {
    Write-Host "❌ خطأ: لم يتم العثور على ملف التحديث" -ForegroundColor Red
    Read-Host "اضغط Enter للخروج"
    exit 1
}

Write-Host ""
Write-Host "تم! يمكنك إغلاق هذه النافذة." -ForegroundColor Green
Start-Sleep -Seconds 5
