<?php
// zain-perfumes-php/auth/login_page.php
session_start();
if (isset($_SESSION['user_id'])) header('Location: ../index.php');
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تسجيل الدخول - زين للعطور</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        .login-box { max-width: 400px; margin: 100px auto; background: white; padding: 40px; border-radius: 15px; box-shadow: var(--shadow); text-align: center; }
        input { width: 100%; padding: 12px; margin: 15px 0; border: 1px solid #ddd; border-radius: 8px; }
        .btn-login { background: var(--primary); color: white; padding: 12px; border: none; border-radius: 8px; width: 100%; cursor: pointer; font-weight: bold; }
        #step-2 { display: none; }
    </style>
</head>
<body>
    <div class="login-box">
        <h1>مرحباً بك</h1>
        <p>أدخل بريدك الإلكتروني لتسجيل الدخول</p>
        
        <div id="step-1">
            <input type="email" id="email" placeholder="البريد الإلكتروني" required>
            <button class="btn-login" onclick="sendCode()">إرسال كود التحقق</button>
        </div>

        <div id="step-2">
            <p>أدخل الكود المرسل إليك</p>
            <input type="text" id="code" placeholder="000000">
            <button class="btn-login" onclick="verifyCode()">تأكيد الدخول</button>
        </div>
    </div>

    <script>
        let currentEmail = "";

        async function sendCode() {
            currentEmail = document.getElementById('email').value;
            const res = await fetch('send_code.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: currentEmail})
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('step-1').style.display = 'none';
                document.getElementById('step-2').style.display = 'block';
                // For demo/testing:
                alert("تم إرسال الكود: " + data.code);
            } else {
                alert(data.message);
            }
        }

        async function verifyCode() {
            const code = document.getElementById('code').value;
            const res = await fetch('verify_code.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: currentEmail, code: code})
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = '../index.php';
            } else {
                alert(data.message);
            }
        }
    </script>
</body>
</html>
