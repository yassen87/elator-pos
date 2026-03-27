<?php
// zain-perfumes-php/checkout.php
include 'includes/db.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    header('Location: auth/login_page.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_id'];
    $final_total = $_POST['final_total'];
    $address = $_POST['address'];
    $is_pickup = isset($_POST['is_pickup']) ? 1 : 0;
    
    // Deposit Image Handle
    $deposit_image = "";
    if (isset($_FILES['deposit_img']) && $_FILES['deposit_img']['error'] === 0) {
        $target_dir = "uploads/deposits/";
        if (!is_dir($target_dir)) mkdir($target_dir, 0777, true);
        $deposit_image = "uploads/deposits/" . time() . "_" . $_FILES['deposit_img']['name'];
        move_uploaded_file($_FILES['deposit_img']['tmp_name'], $deposit_image);
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("INSERT INTO orders (user_id, final_amount, shipping_address, is_pickup, deposit_image, status) VALUES (?, ?, ?, ?, ?, 'pending')");
        $stmt->bind_param("idsss", $user_id, $final_total, $address, $is_pickup, $deposit_image);
        $stmt->execute();
        $order_id = $stmt->insert_id;

        // Add Items
        $cart = json_decode($_POST['cart_json'], true);
        $itemStmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, formula_id, quantity, price) VALUES (?, ?, ?, 1, ?)");
        foreach ($cart as $item) {
            $prod_id = $item['type'] == 'product' ? $item['id'] : null;
            $formula_id = $item['type'] == 'formula' ? $item['id'] : null;
            $itemStmt->bind_param("iiid", $order_id, $prod_id, $formula_id, $item['price']);
            $itemStmt->execute();
        }


        $conn->commit();
        echo "<script>localStorage.removeItem('zain_cart'); window.location.href='account.php?success=1';</script>";
        exit;
    } catch (Exception $e) {
        $conn->rollback();
        die("Error: " . $e->getMessage());
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>إتمام الطلب - زين للعطور</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .checkout-container { background: white; padding: 40px; border-radius: 15px; box-shadow: var(--shadow); max-width: 600px; margin: auto; }
        input, select, textarea { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; }
        .btn-confirm { background: var(--accent); color: white; padding: 15px; border: none; border-radius: 8px; width: 100%; cursor: pointer; font-size: 1.2rem; margin-top: 20px; }
    </style>
</head>
<body>
    <nav><a href="index.php" class="logo">ZAIN PERFUMES</a></nav>
    <div class="container">
        <div class="checkout-container">
            <h1>إتمام الطلب</h1>
            <form method="POST" enctype="multipart/form-data">
                <input type="hidden" name="cart_json" id="cart_json">
                <input type="hidden" name="final_total" id="final_total">

                <label>عنوان التوصيل</label>
                <textarea name="address" rows="3" required></textarea>

                <label>
                    <input type="checkbox" name="is_pickup" id="is_pickup" onchange="toggleAddress()"> استلام من المحل (بدون شحن)
                </label>

                <div style="background: #fdf2f2; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <strong>لإتمام الطلب:</strong> يرجى تحويل مبلغ عربون (50 ج.م) على فودافون كاش: 01012345678 ورفع صورة التحويل.
                </div>

                <label>رفع صورة التحويل (الضمان)</label>
                <input type="file" name="deposit_img" accept="image/*" required>

                <div id="order-summary" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;"></div>

                <button type="submit" class="btn-confirm">تأكيد الطلب</button>
            </form>
        </div>
    </div>

    <script>
        function loadCheckout() {
            let cart = JSON.parse(localStorage.getItem('zain_cart') || '[]');
            if (cart.length === 0) window.location.href = 'index.php';
            
            document.getElementById('cart_json').value = JSON.stringify(cart);
            let total = cart.reduce((acc, obj) => acc + obj.price, 0);
            document.getElementById('final_total').value = total;
            
            document.getElementById('order-summary').innerHTML = `
                <p>قيمة المنتجات: ${total} ج.م</p>
                <p><strong>الإجمالي المطلوب: ${total} ج.م</strong></p>
            `;
        }

        function toggleAddress() {
            const isPickup = document.getElementById('is_pickup').checked;
            const addr = document.querySelector('textarea[name="address"]');
            if (isPickup) {
                addr.value = "استلام من الفرع";
                addr.readOnly = true;
            } else {
                addr.value = "";
                addr.readOnly = false;
            }
        }

        loadCheckout();
    </script>
</body>
</html>
