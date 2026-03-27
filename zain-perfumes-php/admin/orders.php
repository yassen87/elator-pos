<?php
// zain-perfumes-php/admin/orders.php
include '../includes/db.php';
session_start();

// Admin check
if ($_SESSION['user_role'] !== 'admin' && $_SESSION['user_role'] !== 'super_admin') {
    die("Unauthorized");
}

// Update status if requested
if (isset($_POST['update_status'])) {
    $order_id = $_POST['order_id'];
    $new_status = $_POST['status'];
    
    // Inventory Sync if status is delivered
    if ($new_status === 'delivered') {
        $items = $conn->query("SELECT * FROM order_items WHERE order_id = $order_id");
        while($item = $items->fetch_assoc()) {
            if ($item['product_id']) {
                // Regular product
                $conn->query("UPDATE store_products SET stock = stock - " . $item['quantity'] . " WHERE id = " . $item['product_id']);
            } elseif ($item['formula_id']) {
                // Formula - Deduct ingredients from POS
                $formula_id = $item['formula_id'];
                $formula_items = $conn->query("SELECT * FROM formula_items WHERE formula_id = $formula_id");
                while($f_item = $formula_items->fetch_assoc()) {
                    $pos_prod_id = $f_item['pos_product_id'];
                    $qty_to_deduct = $f_item['quantity_ml']; 
                    // Note: You might want to scale this by bottle size (35, 55, 110)
                    $conn->query("UPDATE pos_products SET stock_quantity = stock_quantity - $qty_to_deduct WHERE id = $pos_prod_id");
                }
            }
        }
    }
    
    $conn->query("UPDATE orders SET status = '$new_status' WHERE id = $order_id");
}


// Delete deposit image if order is completed
if (isset($_POST['delete_deposit'])) {
    $order_id = $_POST['order_id'];
    $res = $conn->query("SELECT deposit_image FROM orders WHERE id = $order_id");
    $row = $res->fetch_assoc();
    if ($row['deposit_image'] && file_exists("../" . $row['deposit_image'])) {
        unlink("../" . $row['deposit_image']);
        $conn->query("UPDATE orders SET deposit_image = NULL WHERE id = $order_id");
    }
}

// Fetch orders
$orders = $conn->query("SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC");

?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>إدارة الطلبات - زين للعطور</title>
    <style>
        body { font-family: 'Segoe UI', serif; background: #f4f4f9; padding: 20px; }
        .container { max-width: 1200px; margin: auto; }
        .order-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .order-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
        .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-delivered { background: #d4edda; color: #155724; }
        .deposit-img { max-width: 300px; border-radius: 8px; margin-top: 10px; cursor: pointer; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .btn-update { background: #1a1a1a; color: white; }
        .btn-delete { background: #dc3545; color: white; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { text-align: right; padding: 10px; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <h1>إدارة طلبات الموقع</h1>
            <div>
                <a href="add_product.php" style="margin-right: 15px;">+ إضافة منتج</a>
                <a href="add_formula.php" style="margin-right: 15px;">+ إضافة تركيبة</a>
                <a href="offers.php">+ إدارة العروض</a>
            </div>
        </div>

        <?php if ($orders->num_rows == 0): ?>
            <p>لا يوجد طلبات حالياً.</p>
        <?php endif; ?>

        <?php while($order = $orders->fetch_assoc()): ?>
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <strong>طلب رقم #<?php echo $order['id']; ?></strong> | 
                        العميل: <?php echo $order['customer_name']; ?> | 
                        التاريخ: <?php echo $order['created_at']; ?>
                    </div>
                    <span class="status-badge status-<?php echo $order['status']; ?>">
                        <?php echo $order['status']; ?>
                    </span>
                </div>

                <div>
                    <strong>نوع الاستلام:</strong> <?php echo $order['is_pickup'] ? "استلام من الفرع" : "شحن للمنزل"; ?> <br>
                    <strong>العنوان:</strong> <?php echo $order['shipping_address']; ?> <br>
                    <strong>الإجمالي:</strong> <?php echo $order['final_amount']; ?> ج.م
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $items = $conn->query("SELECT oi.*, p.name FROM order_items oi LEFT JOIN store_products p ON oi.product_id = p.id WHERE oi.order_id = " . $order['id']);
                        while($item = $items->fetch_assoc()):
                        ?>
                        <tr>
                            <td><?php echo $item['name']; ?></td>
                            <td><?php echo $item['quantity']; ?></td>
                            <td><?php echo $item['price']; ?></td>
                        </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>

                <?php if ($order['deposit_image']): ?>
                    <div>
                        <strong>صورة التحويل (الضمان):</strong><br>
                        <a href="../<?php echo $order['deposit_image']; ?>" target="_blank">
                            <img src="../<?php echo $order['deposit_image']; ?>" class="deposit-img">
                        </a>
                        <form method="POST" onsubmit="return confirm('هل تريد مسح الصورة لتوفير المساحة؟')">
                            <input type="hidden" name="order_id" value="<?php echo $order['id']; ?>">
                            <button type="submit" name="delete_deposit" class="btn btn-delete">مسح الصورة (بعد الاستلام)</button>
                        </form>
                    </div>
                <?php endif; ?>

                <form method="POST" style="margin-top: 20px; display: flex; gap: 10px;">
                    <input type="hidden" name="order_id" value="<?php echo $order['id']; ?>">
                    <select name="status" style="padding: 8px; border-radius: 6px;">
                        <option value="pending" <?php if($order['status']=='pending') echo 'selected'; ?>>قيد الانتظار</option>
                        <option value="processing" <?php if($order['status']=='processing') echo 'selected'; ?>>جاري التحضير</option>
                        <option value="delivered" <?php if($order['status']=='delivered') echo 'selected'; ?>>تم الاستلام</option>
                        <option value="cancelled" <?php if($order['status']=='cancelled') echo 'selected'; ?>>ملغي</option>
                    </select>
                    <button type="submit" name="update_status" class="btn btn-update">تحديث الحالة</button>
                </form>
            </div>
        <?php endwhile; ?>
    </div>
</body>
</html>
