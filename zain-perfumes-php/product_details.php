<?php
// zain-perfumes-php/product_details.php
include 'includes/db.php';
session_start();

$id = $_GET['id'] ?? 0;
$type = $_GET['type'] ?? 'product'; // 'product' or 'formula'

if ($type == 'formula') {
    $res = $conn->query("SELECT * FROM formulas WHERE id = $id");
    $item = $res->fetch_assoc();
} else {
    $res = $conn->query("SELECT * FROM store_products WHERE id = $id");
    $item = $res->fetch_assoc();
}

if (!$item) die("المنتج غير موجود");

?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title><?php echo $item['name']; ?> - زين للعطور</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .details-container { display: flex; gap: 50px; margin-top: 50px; }
        .details-img { flex: 1; border-radius: 20px; width: 100%; max-height: 500px; object-fit: cover; box-shadow: var(--shadow); }
        .details-info { flex: 1; }
        .price-big { font-size: 2rem; color: var(--accent); font-weight: 700; margin: 20px 0; }
        .size-selector { margin: 30px 0; }
        .size-option { display: inline-block; padding: 10px 20px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; margin-left: 10px; transition: 0.3s; }
        .size-option.active { border-color: var(--primary); background: var(--primary); color: white; }
        .btn-cart { background: var(--primary); color: white; padding: 15px 40px; border: none; border-radius: 10px; font-size: 1.2rem; cursor: pointer; width: 100%; margin-top: 20px; }
    </style>
</head>
<body>
    <nav>
        <a href="index.php" class="logo">ZAIN PERFUMES</a>
        <ul class="nav-links">
            <li><a href="index.php">الرئيسية</a></li>
            <li><a href="account.php">حسابي</a></li>
        </ul>
    </nav>

    <div class="container">
        <div class="details-container">
            <img src="<?php echo $item['image'] ?: 'assets/img/default-perfume.jpg'; ?>" class="details-img">
            
            <div class="details-info">
                <h1 class="arabic" style="font-size: 3rem;"><?php echo $item['name']; ?></h1>
                <p><?php echo $item['description'] ?? 'لا يوجد وصف متاح لهذا المنتج.'; ?></p>

                <?php if ($type == 'formula'): ?>
                    <p class="price-big" id="display-price">35 ج.م</p>
                    <div class="size-selector">
                        <p>اختر الحجم:</p>
                        <div class="size-option active" onclick="updatePrice(35, this)">35 مل</div>
                        <div class="size-option" onclick="updatePrice(55, this)">55 مل</div>
                        <div class="size-option" onclick="updatePrice(110, this)">110 مل</div>
                    </div>
                <?php else: ?>
                    <p class="price-big"><?php echo $item['price']; ?> ج.م</p>
                    <p>المخزون المتوفر: <?php echo $item['stock']; ?></p>
                <?php endif; ?>

                <button class="btn-cart" onclick="addToCart()">إضافة السلة</button>
            </div>
        </div>
    </div>

    <script>
        let selectedPrice = <?php echo $type == 'formula' ? 35 : $item['price']; ?>;
        let selectedSize = '<?php echo $type == 'formula' ? '35ml' : 'standard'; ?>';

        function updatePrice(price, el) {
            selectedPrice = price;
            selectedSize = price + 'ml';
            document.getElementById('display-price').innerText = price + ' ج.م';
            document.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('active'));
            el.classList.add('active');
        }

        function addToCart() {
            // Simple LocalStorage Cart for demo
            let cart = JSON.parse(localStorage.getItem('zain_cart') || '[]');
            cart.push({
                id: <?php echo $id; ?>,
                name: '<?php echo $item['name']; ?>',
                price: selectedPrice,
                size: selectedSize,
                type: '<?php echo $type; ?>'
            });
            localStorage.setItem('zain_cart', JSON.stringify(cart));
            alert('تم الإضافة للسلة بنجاح!');
            window.location.href = 'cart.php';
        }
    </script>
</body>
</html>
