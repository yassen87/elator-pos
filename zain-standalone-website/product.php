<?php
require_once __DIR__ . '/includes/db.php';

$id = intval($_GET['id'] ?? 0);
$stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? AND is_active = 1");
$stmt->execute([$id]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$product) {
    header('Location: /shop.php');
    exit;
}

// Related products
$related = $pdo->query("SELECT * FROM products WHERE is_active=1 AND id != $id ORDER BY RANDOM() LIMIT 4")->fetchAll(PDO::FETCH_ASSOC);
$page_title = $product['name'];
include __DIR__ . '/includes/header.php';
?>

<div class="container-xl px-4 py-16">
    <!-- Breadcrumb -->
    <nav style="font-size:0.78rem;color:#888;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2.5rem;">
        <a href="/" style="color:#888;text-decoration:none;hover:color:#C9A96E;">Home</a>
        <span class="mx-2">/</span>
        <a href="/shop.php" style="color:#888;text-decoration:none;">Shop</a>
        <span class="mx-2">/</span>
        <span style="color:#C9A96E;"><?= htmlspecialchars($product['name']) ?></span>
    </nav>

    <div class="row g-10 align-items-start">
        <!-- Image -->
        <div class="col-md-6">
            <div style="aspect-ratio:3/4;overflow:hidden;background:#f8f6f1;border:1px solid #e8e0d0;">
                <img src="<?= htmlspecialchars($product['image_url'] ?: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?q=80&w=800&auto=format') ?>"
                     alt="<?= htmlspecialchars($product['name']) ?>"
                     style="width:100%;height:100%;object-fit:cover;">
            </div>
        </div>

        <!-- Details -->
        <div class="col-md-6 ps-md-5">
            <span class="section-label">Zain Perfumes</span>
            <h1 style="font-family:'Cormorant Garamond',serif;font-size:2.8rem;font-weight:400;margin-bottom:0.5rem;line-height:1.1;">
                <?= htmlspecialchars($product['name']) ?>
            </h1>
            <div style="font-size:1.6rem;color:#C9A96E;font-weight:700;margin-bottom:1.5rem;">
                LE <?= number_format($product['price'],2) ?>
            </div>

            <?php if ($product['description']): ?>
            <div style="font-size:0.9rem;color:#6b6b6b;line-height:1.9;margin-bottom:2rem;">
                <?= nl2br(htmlspecialchars($product['description'])) ?>
            </div>
            <?php endif; ?>

            <!-- Qty + Add -->
            <div class="d-flex gap-3 align-items-center mb-4">
                <div class="d-flex align-items-center border" style="border-color:#d0c9be !important;">
                    <button class="qty-btn" onclick="document.getElementById('qty').value = Math.max(1, parseInt(document.getElementById('qty').value)-1)">−</button>
                    <input type="number" id="qty" value="1" min="1" max="<?= $product['stock'] ?>"
                           style="width:48px;text-align:center;border:none;outline:none;font-weight:700;font-size:0.9rem;">
                    <button class="qty-btn" onclick="document.getElementById('qty').value = parseInt(document.getElementById('qty').value)+1">+</button>
                </div>
                <button class="btn-zain-gold flex-grow-1 border-0" 
                        onclick="addMultiple(<?= $product['id'] ?>, '<?= htmlspecialchars(addslashes($product['name'])) ?>', <?= $product['price'] ?>, '<?= htmlspecialchars(addslashes($product['image_url'])) ?>')">
                    <i class="fa-solid fa-bag-shopping me-2"></i> Add to Cart
                </button>
            </div>

            <!-- Meta -->
            <hr style="border-color:#e8e0d0;margin:1.5rem 0;">
            <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.12em;color:#888;line-height:2.2;">
                <div><strong style="color:#0a0a0a;">Availability:</strong>
                    <?= $product['stock'] > 0 ? '<span style="color:#4CAF82;">In Stock</span>' : '<span style="color:#e05454;">Out of Stock</span>' ?>
                </div>
                <div><strong style="color:#0a0a0a;">Vendor:</strong> Zain Perfumes</div>
            </div>
        </div>
    </div>

    <!-- Related Products -->
    <?php if (!empty($related)): ?>
    <div class="mt-24">
        <div class="text-center mb-12">
            <span class="section-label">You May Also Like</span>
            <h2 class="section-title">Related Products</h2>
        </div>
        <div class="row row-cols-2 row-cols-md-4 g-4">
            <?php foreach ($related as $r): ?>
            <div class="col">
                <div class="product-card">
                    <div class="img-wrapper">
                        <img src="<?= htmlspecialchars($r['image_url'] ?: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?q=80&w=400') ?>" alt="<?= htmlspecialchars($r['name']) ?>">
                        <button class="quick-add-overlay" onclick="addToCart(<?= $r['id'] ?>, '<?= htmlspecialchars(addslashes($r['name'])) ?>', <?= $r['price'] ?>, '<?= htmlspecialchars(addslashes($r['image_url'])) ?>')">Quick Add</button>
                    </div>
                    <div class="mt-3 text-center">
                        <a href="/product.php?id=<?= $r['id'] ?>" class="product-name d-block"><?= htmlspecialchars($r['name']) ?></a>
                        <div class="product-price">LE <?= number_format($r['price'],2) ?></div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>
</div>

<script>
function addMultiple(id, name, price, img) {
    const qty = parseInt(document.getElementById('qty').value) || 1;
    for (let i = 0; i < qty; i++) {
        addToCart(id, name, price, img);
    }
}
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
