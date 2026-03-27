<?php
// admin/dashboard.php — Summary page
require_once __DIR__ . '/../includes/auth.php';
requireAdminLogin();
require_once __DIR__ . '/../includes/db.php';

$totalProducts = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
$totalOrders   = $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
$pendingOrders = $pdo->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn();
$totalRevenue  = $pdo->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status != 'cancelled'")->fetchColumn();
$recentOrders  = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard — Zain Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&family=Cormorant+Garamond:wght@400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body style="background:#f0f2f5; font-family:'Montserrat',sans-serif;">

    <!-- Sidebar -->
    <?php include __DIR__ . '/partials/sidebar.php'; ?>

    <!-- Main Content -->
    <div class="admin-content p-5">
        <div class="d-flex justify-content-between align-items-center mb-5">
            <div>
                <h1 style="font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:400;">Dashboard</h1>
                <p class="text-muted mb-0" style="font-size:0.82rem;">Welcome back, <?= htmlspecialchars($_SESSION['admin_username']) ?></p>
            </div>
            <a href="/admin/products.php?action=add" class="btn btn-zain-gold">
                <i class="fa-solid fa-plus me-2"></i> Add Product
            </a>
        </div>

        <!-- Stats Cards -->
        <div class="row g-4 mb-5">
            <?php
            $stats = [
                ['icon'=>'fa-box', 'color'=>'#C9A96E', 'label'=>'Total Products', 'value'=> $totalProducts, 'link'=>'/admin/products.php'],
                ['icon'=>'fa-receipt', 'color'=>'#5b8dd9', 'label'=>'Total Orders',   'value'=> $totalOrders,   'link'=>'/admin/orders.php'],
                ['icon'=>'fa-clock', 'color'=>'#e07b54', 'label'=>'Pending Orders',  'value'=> $pendingOrders, 'link'=>'/admin/orders.php?status=pending'],
                ['icon'=>'fa-coins', 'color'=>'#52b788', 'label'=>'Total Revenue',   'value'=> 'LE '.number_format($totalRevenue,2), 'link'=> null],
            ];
            foreach ($stats as $s): ?>
            <div class="col-sm-6 col-xl-3">
                <a href="<?= $s['link'] ?? '#' ?>" class="text-decoration-none">
                    <div class="bg-white rounded-3 p-4 shadow-sm d-flex align-items-center gap-4 h-100 stat-card">
                        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width:54px;height:54px;background:<?= $s['color'] ?>22;">
                            <i class="fa-solid <?= $s['icon'] ?> fa-lg" style="color:<?= $s['color'] ?>;"></i>
                        </div>
                        <div>
                            <div class="fw-bold fs-4 text-dark mb-0"><?= $s['value'] ?></div>
                            <div style="font-size:0.78rem;color:#888;text-transform:uppercase;letter-spacing:0.1em;"><?= $s['label'] ?></div>
                        </div>
                    </div>
                </a>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Recent Orders -->
        <div class="bg-white rounded-3 shadow-sm">
            <div class="p-4 border-bottom d-flex justify-content-between align-items-center">
                <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin:0;">Recent Orders</h2>
                <a href="/admin/orders.php" style="color:#C9A96E;font-size:0.8rem;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:0.1em;">View All</a>
            </div>
            <div class="table-responsive">
                <table class="table table-hover mb-0" style="font-size:0.85rem;">
                    <thead style="background:#f8f6f1;">
                        <tr>
                            <th class="ps-4 py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">#</th>
                            <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Customer</th>
                            <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Phone</th>
                            <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Amount</th>
                            <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Status</th>
                            <th class="py-3 pe-4 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($recentOrders)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-5">No orders yet</td></tr>
                    <?php else: foreach ($recentOrders as $o): ?>
                        <?php
                        $badge = match($o['status']) {
                            'pending'   => 'bg-warning text-dark',
                            'confirmed' => 'bg-primary',
                            'shipped'   => 'bg-info',
                            'delivered' => 'bg-success',
                            'cancelled' => 'bg-danger',
                            default     => 'bg-secondary'
                        };
                        ?>
                        <tr>
                            <td class="ps-4 py-3">#<?= $o['id'] ?></td>
                            <td class="py-3 fw-semibold"><?= htmlspecialchars($o['customer_name']) ?></td>
                            <td class="py-3"><?= htmlspecialchars($o['customer_phone']) ?></td>
                            <td class="py-3 fw-bold" style="color:#C9A96E;">LE <?= number_format($o['total_amount'],2) ?></td>
                            <td class="py-3"><span class="badge <?= $badge ?> text-uppercase" style="font-size:0.7rem;letter-spacing:0.08em;"><?= $o['status'] ?></span></td>
                            <td class="py-3 pe-4 text-muted" style="font-size:0.8rem;"><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                        </tr>
                    <?php endforeach; endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<style>
.stat-card { transition: transform 0.2s, box-shadow 0.2s; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important; }
</style>
</body>
</html>
