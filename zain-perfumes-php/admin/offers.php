<?php
// zain-perfumes-php/admin/offers.php
include '../includes/db.php';
session_start();

// Admin check
if ($_SESSION['user_role'] !== 'admin' && $_SESSION['user_role'] !== 'super_admin') {
    die("Unauthorized");
}

if (isset($_POST['save_offer'])) {
    $text = $_POST['offer_text'];
    $is_active = isset($_POST['is_active']) ? 1 : 0;
    
    // Clear old offers or just add new
    $conn->query("UPDATE offers SET is_active = 0");
    $stmt = $conn->prepare("INSERT INTO offers (text, is_active) VALUES (?, ?)");
    $stmt->bind_param("si", $text, $is_active);
    $stmt->execute();
}

$current_offer = $conn->query("SELECT * FROM offers WHERE is_active = 1 LIMIT 1")->fetch_assoc();
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>إدارة العروض - زين للعطور</title>
    <style>
        body { font-family: 'Segoe UI', serif; background: #f8f9fa; padding: 20px; }
        .container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 12px; }
        textarea { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; }
        .btn { background: #1a1a1a; color: white; padding: 12px; border: none; border-radius: 8px; width: 100%; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>إدارة شريط العروض العلوي</h1>
        <form method="POST">
            <label>نص العرض (مثلاً: تركيبة الإثارة عليها عرض 100 بدل 250)</label>
            <textarea name="offer_text" rows="3"><?php echo $current_offer['text'] ?? ''; ?></textarea>
            <label>
                <input type="checkbox" name="is_active" <?php echo isset($current_offer['is_active']) && $current_offer['is_active'] ? 'checked' : ''; ?>> تفعيل الشريط في الموقع
            </label>
            <button type="submit" name="save_offer" class="btn">حفظ العرض</button>
        </form>
        <p style="text-align: center;"><a href="orders.php">العودة للطلبات</a></p>
    </div>
</body>
</html>
