<?php
require_once __DIR__ . '/includes/db.php';
$page_title = 'Shop';
$products = $pdo->query("SELECT * FROM products WHERE is_active=1 ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
include __DIR__ . '/includes/header.php';
?>

<div class="page-banner">
    <div class="container">
        <span class="section-label">Browse & Discover</span>
        <h1 class="section-title">Our Full Collection</h1>
    </div>
</div>

<section class="py-16">
    <div class="container-xl px-4">
        <?php if (empty($products)): ?>
        <div class="text-center py-16">
            <i class="fa-solid fa-box-open fa-3x mb-4" style="color:#d4cfc7;"></i>
            <p class="text-muted">No products yet. <a href="/admin/products.php?action=add" style="color:#C9A96E;">Add products in Admin Panel.</a></p>
        </div>
        <?php else: ?>
        <div class="row row-cols-2 row-cols-sm-3 row-cols-lg-4 g-4 g-md-5">
            <?php foreach ($products as $p): ?>
            <div class="col">
                <div class="product-card h-100">
                    <?php if (strtotime($p['created_at']) > strtotime('-7 days')): ?>
                        <div class="badge-new">New</div>
                    <?php endif; ?>
                    <div class="img-wrapper">
                        <img src="<?= htmlspecialchars($p['image_url'] ?: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?q=80&w=600&auto=format') ?>"
                             alt="<?= htmlspecialchars($p['name']) ?>">
                        <button class="quick-add-overlay"
                                onclick="addToCart(<?= $p['id'] ?>, '<?= htmlspecialchars(addslashes($p['name'])) ?>', <?= $p['price'] ?>, '<?= htmlspecialchars(addslashes($p['image_url'])) ?>')">
                            <i class="fa-solid fa-bag-shopping me-2"></i> Quick Add
                        </button>
                    </div>
                    <div class="mt-3 text-center">
                        <a href="/product.php?id=<?= $p['id'] ?>" class="product-name d-block"><?= htmlspecialchars($p['name']) ?></a>
                        <div class="product-price">LE <?= number_format($p['price'],2) ?></div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>
