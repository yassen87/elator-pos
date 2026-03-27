<?php
// admin/index.php — Admin Login Page
session_start();

if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header('Location: /admin/dashboard.php');
    exit;
}

require_once __DIR__ . '/../includes/db.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($admin && password_verify($password, $admin['password'])) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = $admin['username'];
        header('Location: /admin/dashboard.php');
        exit;
    } else {
        $error = 'Invalid username or password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login — Zain Perfumes</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&family=Cormorant+Garamond:ital,wght@0,400;1,300&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { font-family: 'Montserrat', sans-serif; }
        body {
            min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            background: #0a0a0a;
            background-image: radial-gradient(ellipse at 50% 50%, rgba(201,169,110,0.08) 0%, transparent 65%);
        }
        .login-card {
            background: #111;
            border: 1px solid rgba(201,169,110,0.3);
            border-radius: 0;
            padding: 3rem 3.5rem;
            width: 100%;
            max-width: 420px;
        }
        .logo-text {
            font-family: 'Cormorant Garamond', serif;
            font-size: 2rem;
            color: #C9A96E;
            letter-spacing: 0.2em;
        }
        .form-control {
            background: transparent !important;
            border: none !important;
            border-bottom: 1px solid rgba(201,169,110,0.4) !important;
            border-radius: 0 !important;
            color: #fff !important;
            padding: 0.75rem 0 !important;
            font-size: 0.9rem;
        }
        .form-control:focus { box-shadow: none !important; border-bottom-color: #C9A96E !important; }
        .form-control::placeholder { color: rgba(255,255,255,0.35) !important; }
        label { color: rgba(255,255,255,0.6); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.5rem; }
        .btn-login {
            width: 100%; background: #C9A96E; color: #0a0a0a;
            font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em;
            font-size: 0.8rem; padding: 0.9rem; border: none;
            transition: background 0.25s, color 0.25s; margin-top: 1.5rem;
        }
        .btn-login:hover { background: #fff; color: #0a0a0a; }
        .divider { border-color: rgba(201, 169, 110, 0.15); }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="text-center mb-5">
            <div class="logo-text">✦ Zain Perfumes ✦</div>
            <div style="color:rgba(255,255,255,0.4);font-size:0.72rem;letter-spacing:0.3em;text-transform:uppercase;margin-top:0.5rem;">Admin Portal</div>
        </div>

        <?php if ($error): ?>
            <div class="alert alert-danger py-2 text-center" style="font-size:0.82rem;border-radius:0;"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST">
            <div class="mb-4">
                <label>Username</label>
                <input type="text" name="username" class="form-control" placeholder="admin" required value="<?= htmlspecialchars($_POST['username'] ?? '') ?>">
            </div>
            <div class="mb-2">
                <label>Password</label>
                <input type="password" name="password" class="form-control" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn-login">
                <i class="fa-solid fa-arrow-right-to-bracket me-2"></i> Login
            </button>
        </form>

        <hr class="divider mt-4">
        <div class="text-center" style="font-size:0.72rem;color:rgba(255,255,255,0.25);">
            Default credentials: admin / admin123
        </div>
    </div>
</body>
</html>
