<?php
// zain-perfumes-php/account.php
include 'includes/db.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    header('Location: auth/login_page.php');
    exit;
}

$user_id = $_SESSION['user_id'];
$orders = $conn->query("SELECT * FROM orders WHERE user_id = $user_id ORDER BY created_at DESC");

?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>حسابي - زين للعطور</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .account-header { margin-bottom: 40px; }
        .order-row { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: var(--shadow); display: flex; justify-content: space-between; align-items: center; }
        .status-badge { padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .status-pending { background: #eee; }
        .status-processing { background: #fff3cd; color: #856404; }
        .status-delivered { background: #d4edda; color: #155724; }
    </style>
</head>
<body>
    <nav>
        <a href="index.php" class="logo">ZAIN PERFUMES</a>
        <ul class="nav-links">
            <li><a href="index.php">الرئيسية</a></li>
            <li><a href="auth/logout.php">تسجيل الخروج</a></li>
        </ul>
    </nav>

    <div class="container">
        <div class="account-header">
            <h1>مرحباً، <?php echo $_SESSION['user_name']; ?></h1>
            <p>هنا يمكنك متابعة طلباتك السابقة وحالة طلباتك الحالية.</p>
        </div>

        <?php if (isset($_GET['success'])): ?>
            <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
                تم استلام طلبك بنجاح! سيقوم فريقنا بمراجعته قريباً.
            </div>
        <?php endif; ?>

        <h2>طلباتي الأخيرة</h2>
        <?php if ($orders->num_rows == 0): ?>
            <p>لا يوجد طلبات سابقة.</p>
        <?php endif; ?>

        <?php while($order = $orders->fetch_assoc()): ?>
            <div class="order-row">
                <div>
                    <strong>طلب #<?php echo $order['id']; ?></strong><br>
                    <small><?php echo $order['created_at']; ?></small>
                </div>
                <div>
                    <strong>إجمالي: <?php echo $order['final_amount']; ?> ج.م</strong>
                </div>
                <div>
                    <span class="status-badge status-<?php echo $order['status']; ?>">
                        <?php echo $order['status']; ?>
                    </span>
                </div>
            </div>
        <?php endwhile; ?>
    </div>
</body>
</html>
