<?php
// zain-perfumes-php/admin/add_product.php
include '../includes/db.php';
session_start();

// Admin check
if ($_SESSION['user_role'] !== 'admin' && $_SESSION['user_role'] !== 'super_admin') {
    die("Unauthorized");
}

$message = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'];
    $price = $_POST['price'];
    $description = $_POST['description'];
    $category = $_POST['category'];
    $stock = $_POST['stock'];
    $is_visible = isset($_POST['is_visible']) ? 1 : 0;
    
    // Image handle
    $image_path = "";
    if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
        $target_dir = "../uploads/products/";
        if (!is_dir($target_dir)) mkdir($target_dir, 0777, true);
        $image_path = "uploads/products/" . time() . "_" . $_FILES['image']['name'];
        move_uploaded_file($_FILES['image']['tmp_name'], "../" . $image_path);
    }

    $stmt = $conn->prepare("INSERT INTO store_products (name, price, description, image, category, is_visible, stock) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sdsssii", $name, $price, $description, $image_path, $category, $is_visible, $stock);
    
    if ($stmt->execute()) {
        $message = "تم إضافة المنتج بنجاح!";
    } else {
        $message = "خطأ: " . $conn->error;
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>إضافة منتج - زين للعطور</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        body { font-family: 'Segoe UI', serif; background: #f8f9fa; padding: 20px; }
        .form-container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        h1 { color: #1a1a1a; text-align: center; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #444; }
        input[type="text"], input[type="number"], textarea, select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
        .btn { background: #1a1a1a; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; width: 100%; font-size: 18px; font-weight: bold; transition: background 0.3s; }
        .btn:hover { background: #333; }
        .alert { padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center; }
        .alert-success { background: #d4edda; color: #155724; }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>إضافة منتج جديد</h1>
        <?php if ($message): ?>
            <div class="alert alert-success"><?php echo $message; ?></div>
        <?php endif; ?>
        <form method="POST" enctype="multipart/form-data">
            <div class="form-group">
                <label>اسم المنتج</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>السعر (ج.م)</label>
                <input type="number" step="0.01" name="price" required>
            </div>
            <div class="form-group">
                <label>الوصف</label>
                <textarea name="description" rows="4"></textarea>
            </div>
            <div class="form-group">
                <label>القسم</label>
                <select name="category">
                    <option value="عطور">عطور</option>
                    <option value="بخور">بخور</option>
                    <option value="زيوت">زيوت</option>
                </select>
            </div>
            <div class="form-group">
                <label>الكمية في المخزون</label>
                <input type="number" name="stock" value="0">
            </div>
            <div class="form-group">
                <label>صورة المنتج</label>
                <input type="file" name="image" accept="image/*">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_visible" checked> يظهر في الموقع
                </label>
            </div>
            <button type="submit" class="btn">حفظ المنتج</button>
        </form>
        <p style="text-align: center; margin-top: 20px;"><a href="orders.php" style="color: #666;">العودة للطلبات</a></p>
    </div>
</body>
</html>
