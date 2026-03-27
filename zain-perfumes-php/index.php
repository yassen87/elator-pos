<?php
// zain-perfumes-php/index.php
include 'includes/db.php';
session_start();

// Fetch active offer
$offerRes = $conn->query("SELECT text FROM offers WHERE is_active = 1 LIMIT 1");
$offer = $offerRes->fetch_assoc();

// Fetch products
$products = $conn->query("SELECT * FROM store_products WHERE is_visible = 1 ORDER BY created_at DESC");

// Fetch formulas
$formulas = $conn->query("SELECT * FROM formulas WHERE is_visible = 1 ORDER BY created_at DESC");
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>زين للعطور - عالم من الفخامة</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php if ($offer): ?>
        <div class="offer-banner">
            <?php echo $offer['text']; ?>
        </div>
    <?php endif; ?>

    <nav>
        <a href="index.php" class="logo">ZAIN PERFUMES</a>
        <ul class="nav-links">
            <li><a href="index.php">الرئيسية</a></li>
            <li><a href="#products">العطور</a></li>
            <li><a href="#formulas">التركيبات الشخصية</a></li>
            <?php if (isset($_SESSION['user_id'])): ?>
                <li><a href="account.php">حسابي</a></li>
                <?php if ($_SESSION['user_role'] == 'admin'): ?>
                    <li><a href="admin/orders.php">لوحة التحكم</a></li>
                <?php endif; ?>
            <?php else: ?>
                <li><a href="auth/login_page.php">تسجيل الدخول</a></li>
            <?php endif; ?>
        </ul>
    </nav>

    <header class="hero">
        <h1>زين للعطور</h1>
        <p>اكتشف تجربة العطر الفريدة المصممة خصيصاً لك</p>
    </header>

    <div class="container" id="formulas">
        <h2 class="section-title">التركيبات الحصرية</h2>
        <div class="product-grid">
            <?php while($f = $formulas->fetch_assoc()): ?>
                <div class="product-card">
                    <?php if ($f['is_offer']): ?>
                        <span class="offer-tag">عرض خاص</span>
                    <?php endif; ?>
                    <img src="<?php echo $f['image'] ?: 'assets/img/default-perfume.jpg'; ?>" class="product-img" alt="<?php echo $f['name']; ?>">
                    <div class="product-info">
                        <h3 class="product-name"><?php echo $f['name']; ?></h3>
                        <p class="product-price">تبدأ من 35 ج.م</p>
                        <?php if ($f['is_offer']): ?>
                            <p style="text-decoration: line-through; color: #999; font-size: 0.9em;"><?php echo $f['original_price']; ?> ج.م</p>
                            <p style="color: #e74c3c; font-weight: bold;"><?php echo $f['offer_price']; ?> ج.م (للعرض)</p>
                        <?php endif; ?>
                        <a href="product_details.php?type=formula&id=<?php echo $f['id']; ?>" class="btn-view">اطلب الآن</a>
                    </div>
                </div>
            <?php endwhile; ?>
        </div>
    </div>

    <div class="container" id="products">
        <h2 class="section-title">العطور الجاهزة</h2>
        <div class="product-grid">
            <?php while($p = $products->fetch_assoc()): ?>
                <div class="product-card">
                    <img src="<?php echo $p['image'] ?: 'assets/img/default-perfume.jpg'; ?>" class="product-img" alt="<?php echo $p['name']; ?>">
                    <div class="product-info">
                        <h3 class="product-name"><?php echo $p['name']; ?></h3>
                        <p class="product-price"><?php echo $p['price']; ?> ج.م</p>
                        <p style="font-size: 0.8em; color: <?php echo $p['stock'] > 0 ? 'green' : 'red'; ?>">
                            <?php echo $p['stock'] > 0 ? 'متوفر (' . $p['stock'] . ')' : 'غير متوفر'; ?>
                        </p>
                        <a href="product_details.php?type=product&id=<?php echo $p['id']; ?>" class="btn-view">تفاصيل المنتج</a>
                    </div>
                </div>
            <?php endwhile; ?>
        </div>
    </div>

    <footer>
        <p>&copy; 2026 زين للعطور - جميع الحقوق محفوظة</p>
    </footer>
</body>
</html>
