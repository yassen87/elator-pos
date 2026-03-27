<?php
// zain-perfumes-php/admin/add_formula.php
include '../includes/db.php';
session_start();

// Admin check
if ($_SESSION['user_role'] !== 'admin' && $_SESSION['user_role'] !== 'super_admin') {
    die("Unauthorized");
}

$message = "";

// Get users for client selection
$users = $conn->query("SELECT id, name FROM users ORDER BY name ASC");

// Get POS products for ingredients
$pos_products = $conn->query("SELECT id, name FROM pos_products WHERE is_active = 1 ORDER BY name ASC");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'];
    $client_id = $_POST['client_id'] ?: null;
    $is_offer = isset($_POST['is_offer']) ? 1 : 0;
    $original_price = $_POST['original_price'] ?: 0;
    $offer_price = $_POST['offer_price'] ?: 0;
    
    // Image handle
    $image_path = "";
    if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
        $target_dir = "../uploads/formulas/";
        if (!is_dir($target_dir)) mkdir($target_dir, 0777, true);
        $image_path = "uploads/formulas/" . time() . "_" . $_FILES['image']['name'];
        move_uploaded_file($_FILES['image']['tmp_name'], "../" . $image_path);
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("INSERT INTO formulas (name, client_id, image, is_offer, original_price, offer_price) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sisidd", $name, $client_id, $image_path, $is_offer, $original_price, $offer_price);
        $stmt->execute();
        $formula_id = $stmt->insert_id;

        // Add ingredients
        if (isset($_POST['ingredients'])) {
            $ingredients = $_POST['ingredients'];
            $quantities = $_POST['quantities'];
            $itemStmt = $conn->prepare("INSERT INTO formula_items (formula_id, pos_product_id, quantity_ml) VALUES (?, ?, ?)");
            foreach ($ingredients as $index => $pos_id) {
                if ($pos_id) {
                    $qty = $quantities[$index];
                    $itemStmt->bind_param("iid", $formula_id, $pos_id, $qty);
                    $itemStmt->execute();
                }
            }
        }

        $conn->commit();
        $message = "تم إضافة التركيبة بنجاح!";
    } catch (Exception $e) {
        $conn->rollback();
        $message = "خطأ: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>إضافة تركيبة - زين للعطور</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        body { font-family: 'Segoe UI', serif; background: #f8f9fa; padding: 20px; }
        .form-container { max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        h1 { color: #1a1a1a; text-align: center; margin-bottom: 30px; }
        .form-row { display: flex; gap: 20px; margin-bottom: 20px; }
        .form-group { flex: 1; margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #444; }
        input[type="text"], input[type="number"], select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
        .ingredient-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
        .btn { background: #1a1a1a; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; }
        .btn-add { background: #28a745; margin-bottom: 20px; }
        .alert { padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center; background: #d4edda; color: #155724; }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>إضافة تركيبة جديدة</h1>
        <?php if ($message): ?>
            <div class="alert"><?php echo $message; ?></div>
        <?php endif; ?>
        <form method="POST" enctype="multipart/form-data">
            <div class="form-group">
                <label>اسم التركيبة</label>
                <input type="text" name="name" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>الزبون (اختياري)</label>
                    <select name="client_id">
                        <option value="">-- اختياري --</option>
                        <?php while($u = $users->fetch_assoc()): ?>
                            <option value="<?php echo $u['id']; ?>"><?php echo $u['name']; ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label>صورة التركيبة</label>
                    <input type="file" name="image" accept="image/*">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>هل هي عرض؟</label>
                    <input type="checkbox" name="is_offer"> نعم
                </div>
                <div class="form-group">
                    <label>السعر الأصلي</label>
                    <input type="number" step="0.01" name="original_price" placeholder="مثلاً 250">
                </div>
                <div class="form-group">
                    <label>سعر العرض</label>
                    <input type="number" step="0.01" name="offer_price" placeholder="مثلاً 100">
                </div>
            </div>

            <div id="ingredients-container">
                <label>المكونات (من خامات السيستم)</label>
                <div class="ingredient-row">
                    <select name="ingredients[]" required style="flex: 2;">
                        <option value="">-- اختر خامة --</option>
                        <?php 
                        $pos_products->data_seek(0);
                        while($p = $pos_products->fetch_assoc()): 
                        ?>
                            <option value="<?php echo $p['id']; ?>"><?php echo $p['name']; ?></option>
                        <?php endwhile; ?>
                    </select>
                    <input type="number" step="0.1" name="quantities[]" placeholder="الكمية (مل)" style="flex: 1;" required>
                </div>
            </div>
            <button type="button" class="btn btn-add" onclick="addIngredient()">+ إضافة مكون آخر</button>

            <button type="submit" class="btn" style="width: 100%; margin-top: 20px;">حفظ التركيبة</button>
        </form>
    </div>

    <script>
        function addIngredient() {
            const container = document.getElementById('ingredients-container');
            const row = document.querySelector('.ingredient-row').cloneNode(true);
            row.querySelector('select').value = "";
            row.querySelector('input').value = "";
            container.appendChild(row);
        }
    </script>
</body>
</html>
