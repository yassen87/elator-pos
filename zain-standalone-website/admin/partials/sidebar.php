<!-- admin/partials/sidebar.php -->
<div class="admin-sidebar d-flex flex-column">
    <div class="text-center py-5 border-bottom" style="border-color:rgba(201,169,110,0.2) !important;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:#C9A96E;letter-spacing:0.2em;">✦ Zain ✦</div>
        <div style="font-size:0.65rem;color:rgba(255,255,255,0.35);letter-spacing:0.25em;text-transform:uppercase;margin-top:0.3rem;">Admin Panel</div>
    </div>

    <nav class="flex-grow-1 py-3">
        <?php
        $current = basename($_SERVER['PHP_SELF']);
        $links = [
            ['file'=>'dashboard.php', 'icon'=>'fa-gauge-high', 'label'=>'Dashboard',     'href'=>'/admin/dashboard.php'],
            ['file'=>'products.php',  'icon'=>'fa-box',         'label'=>'Products',      'href'=>'/admin/products.php'],
            ['file'=>'orders.php',    'icon'=>'fa-receipt',     'label'=>'Orders',        'href'=>'/admin/orders.php'],
        ];
        foreach ($links as $l):
            $active = ($current === $l['file']) ? 'active' : '';
        ?>
        <a href="<?= $l['href'] ?>" class="admin-nav-link <?= $active ?>">
            <i class="fa-solid <?= $l['icon'] ?> fa-fw"></i>
            <?= $l['label'] ?>
        </a>
        <?php endforeach; ?>
    </nav>

    <div class="py-4 px-4 border-top" style="border-color:rgba(255,255,255,0.08) !important;">
        <div style="font-size:0.72rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.5rem;">
            Logged in as
        </div>
        <div style="color:rgba(255,255,255,0.7);font-size:0.82rem;font-weight:600;margin-bottom:0.75rem;">
            <?= htmlspecialchars($_SESSION['admin_username'] ?? 'admin') ?>
        </div>
        <a href="/admin/logout.php" style="color:#C9A96E;font-size:0.78rem;text-decoration:none;text-transform:uppercase;letter-spacing:0.1em;">
            <i class="fa-solid fa-right-from-bracket me-1"></i> Logout
        </a>
    </div>
</div>
