<?php
require_once __DIR__ . '/includes/db.php';
$page_title = 'Zain Perfumes';

// Fetch featured products
$featured = $pdo->query("SELECT * FROM products WHERE is_active=1 ORDER BY created_at DESC LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);

include __DIR__ . '/includes/header.php';
?>

<!-- ============ HERO ============ -->
<section class="hero-section position-relative">
    <div class="container text-center position-relative" style="z-index:2;">
        <div class="section-label tracking-super">زين للعطور — Est. 2020</div>
        <h1 class="hero-title">
            Discover Your<br><em>Signature</em><br>Fragrance
        </h1>
        <p class="hero-subtitle">Luxury Niche & Designer Perfumes</p>
        <a href="/shop.php" class="hero-cta">Explore Collection</a>
    </div>
    <!-- Decorative circles -->
    <div style="position:absolute;width:500px;height:500px;border-radius:50%;border:1px solid rgba(201,169,110,0.1);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;"></div>
    <div style="position:absolute;width:700px;height:700px;border-radius:50%;border:1px solid rgba(201,169,110,0.05);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;"></div>
</section>

<!-- ============ ABOUT STRIP ============ -->
<section class="py-16 text-center" style="background:#f8f6f1; border-top:1px solid #e8e0d0; border-bottom:1px solid #e8e0d0;">
    <div class="container-xl px-4">
        <div class="row g-6 row-cols-1 row-cols-md-3 text-center">
            <?php
            $features = [
                ['icon'=>'fa-certificate','title'=>'100% Authentic','desc'=>'All fragrances are guaranteed authentic and imported directly from source.'],
                ['icon'=>'fa-truck-fast','title'=>'Egypt-Wide Delivery','desc'=>'Fast, secure delivery to all Egyptian governorates, 2-5 business days.'],
                ['icon'=>'fa-headset','title'=>'Expert Consultation','desc'=>'Our perfume specialists are here to help you choose the perfect scent.'],
            ];
            foreach($features as $f): ?>
            <div class="col py-6 px-4">
                <i class="fa-solid <?= $f['icon'] ?> fa-2x mb-4" style="color:#C9A96E;"></i>
                <h4 class="fw-bold mb-2" style="font-size:0.88rem;text-transform:uppercase;letter-spacing:0.12em;"><?= $f['title'] ?></h4>
                <p style="font-size:0.82rem;color:#6b6b6b;line-height:1.7;margin:0;"><?= $f['desc'] ?></p>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- ============ CATEGORY CARDS ============ -->
<section class="py-20">
    <div class="container-xl px-4">
        <div class="text-center mb-12">
            <span class="section-label">Browse By Type</span>
            <h2 class="section-title">Our Collections</h2>
        </div>
        <div class="row g-4">
            <?php
            $cats = [
                ['name'=>'Niche Collection', 'img'=>'https://images.unsplash.com/photo-1615486171448-4fd3242095cc?q=80&w=600&auto=format','link'=>'/shop.php'],
                ['name'=>'Oriental Oud',     'img'=>'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format','link'=>'/shop.php'],
                ['name'=>'Designer Blends',  'img'=>'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?q=80&w=600&auto=format','link'=>'/shop.php'],
            ];
            foreach ($cats as $c): ?>
            <div class="col-md-4">
                <a href="<?= $c['link'] ?>" class="category-card d-block text-decoration-none">
                    <img src="<?= $c['img'] ?>" alt="<?= $c['name'] ?>">
                    <div class="overlay">
                        <div class="cat-title"><?= $c['name'] ?></div>
                    </div>
                </a>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- ============ PRODUCTS GRID ============ -->
<section class="py-16" style="background:#f8f6f1;">
    <div class="container-xl px-4">
        <div class="text-center mb-12">
            <span class="section-label">New Arrivals</span>
            <h2 class="section-title">Featured Fragrances</h2>
        </div>

        <?php if (empty($featured)): ?>
        <div class="text-center py-16">
            <i class="fa-solid fa-box-open fa-3x mb-4" style="color:#d4cfc7;"></i>
            <p class="text-muted mb-2">No products have been added yet.</p>
            <a href="/admin/products.php?action=add" style="color:#C9A96E;font-weight:700;font-size:0.85rem;text-decoration:none;text-transform:uppercase;letter-spacing:0.1em;">
                <i class="fa-solid fa-plus me-1"></i> Add your first product (Admin)
            </a>
        </div>
        <?php else: ?>
        <div class="row row-cols-2 row-cols-sm-3 row-cols-lg-4 g-4 g-md-5">
            <?php foreach ($featured as $p): ?>
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
        <div class="text-center mt-12">
            <a href="/shop.php" class="btn-zain-outline">View All Products</a>
        </div>
        <?php endif; ?>
    </div>
</section>

<!-- ============ BANNER ============ -->
<section style="background:#0a0a0a; padding:5rem 0; position:relative; overflow:hidden; border-top:1px solid #1a1a1a; border-bottom:1px solid #1a1a1a;">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(201,169,110,0.08) 0%, transparent 70%);"></div>
    <div class="container text-center position-relative" style="z-index:1;">
        <span class="section-label" style="color:#C9A96E;">Special Offer</span>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,5vw,3.5rem);color:#fff;font-weight:300;letter-spacing:0.05em;margin-bottom:1.5rem;">
            Free Shipping on Orders <em style="color:#C9A96E;">Above LE 1500</em>
        </h2>
        <p style="color:rgba(255,255,255,0.55);font-size:0.85rem;letter-spacing:0.15em;margin-bottom:2.5rem;">USE CODE: <span style="color:#C9A96E;font-weight:700;letter-spacing:0.25em;">ZAIN15</span></p>
        <a href="/shop.php" class="hero-cta">Shop Now</a>
    </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>
