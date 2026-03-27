<?php
// admin/orders.php
require_once __DIR__ . '/../includes/auth.php';
requireAdminLogin();
require_once __DIR__ . '/../includes/db.php';

// Update Order Status
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['order_id'], $_POST['status'])) {
    $allowed = ['pending','confirmed','shipped','delivered','cancelled'];
    if (in_array($_POST['status'], $allowed)) {
        $pdo->prepare("UPDATE orders SET status=? WHERE id=?")
            ->execute([$_POST['status'], intval($_POST['order_id'])]);
    }
    header('Location: /admin/orders.php?success=1');
    exit;
}

$filter = $_GET['status'] ?? '';
$query = "SELECT * FROM orders";
if ($filter) $query .= " WHERE status='" . $pdo->quote($filter) . "'";
$query .= " ORDER BY created_at DESC";
$orders = $pdo->query($query)->fetchAll(PDO::FETCH_ASSOC);

// Fetch items for a specific order
$orderDetails = null;
if (isset($_GET['view'])) {
    $orderDetails = $pdo->prepare("SELECT o.*, oi.product_id, oi.quantity, oi.price as item_price, p.name as product_name 
        FROM orders o 
        LEFT JOIN order_items oi ON oi.order_id = o.id 
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.id = ?");
    $orderDetails->execute([intval($_GET['view'])]);
    $orderDetails = $orderDetails->fetchAll(PDO::FETCH_ASSOC);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orders — Zain Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&family=Cormorant+Garamond:wght@400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body style="background:#f0f2f5; font-family:'Montserrat',sans-serif;">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="admin-content p-5">
    <div class="d-flex justify-content-between align-items-center mb-5">
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:400;">Orders</h1>
        <div class="d-flex gap-2">
            <?php foreach (['', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as $s): ?>
            <a href="?status=<?= $s ?>" class="btn btn-sm <?= ($filter === $s) ? 'btn-dark' : 'btn-outline-secondary' ?>" style="font-size:0.72rem;border-radius:0;text-transform:uppercase;letter-spacing:0.08em;">
                <?= $s ?: 'All' ?>
            </a>
            <?php endforeach; ?>
        </div>
    </div>

    <?php if (isset($_GET['success'])): ?>
        <div class="alert alert-success py-2 mb-4" style="font-size:0.85rem;border-radius:0;">Order status updated!</div>
    <?php endif; ?>

    <?php if ($orderDetails): ?>
    <!-- Order Detail View -->
    <div class="bg-white p-5 rounded-3 shadow-sm mb-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 style="font-size:1.3rem;font-weight:700;">Order #<?= $orderDetails[0]['id'] ?></h2>
            <a href="/admin/orders.php" style="color:#C9A96E;font-size:0.82rem;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;"><i class="fa-solid fa-arrow-left me-1"></i> Back</a>
        </div>
        <div class="row g-4 mb-4">
            <div class="col-sm-4"><div class="text-muted" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;">Customer</div><div class="fw-bold"><?= htmlspecialchars($orderDetails[0]['customer_name']) ?></div></div>
            <div class="col-sm-4"><div class="text-muted" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;">Phone</div><div class="fw-bold"><?= htmlspecialchars($orderDetails[0]['customer_phone']) ?></div></div>
            <div class="col-sm-4"><div class="text-muted" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;">Address</div><div class="fw-bold"><?= htmlspecialchars($orderDetails[0]['shipping_address']) ?></div></div>
        </div>
        <table class="table mb-4" style="font-size:0.85rem;">
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
            <tbody>
                <?php foreach ($orderDetails as $item): ?>
                    <?php if ($item['product_id']): ?>
                    <tr>
                        <td><?= htmlspecialchars($item['product_name'] ?? '—') ?></td>
                        <td><?= $item['quantity'] ?></td>
                        <td>LE <?= number_format($item['item_price'],2) ?></td>
                        <td class="fw-bold" style="color:#C9A96E;">LE <?= number_format($item['item_price'] * $item['quantity'],2) ?></td>
                    </tr>
                    <?php endif; ?>
                <?php endforeach; ?>
            </tbody>
            <tfoot><tr><td colspan="3" class="fw-bold text-end">Total</td><td class="fw-bold" style="color:#C9A96E;font-size:1.1rem;">LE <?= number_format($orderDetails[0]['total_amount'],2) ?></td></tr></tfoot>
        </table>
        <form method="POST" class="d-flex align-items-center gap-3">
            <input type="hidden" name="order_id" value="<?= $orderDetails[0]['id'] ?>">
            <label class="fw-bold" style="font-size:0.82rem;text-transform:uppercase;letter-spacing:0.1em;">Update Status:</label>
            <select name="status" class="form-select form-select-sm w-auto" style="border-radius:0;font-size:0.82rem;">
                <?php foreach (['pending','confirmed','shipped','delivered','cancelled'] as $s): ?>
                    <option value="<?= $s ?>" <?= $orderDetails[0]['status'] === $s ? 'selected' : '' ?>><?= ucfirst($s) ?></option>
                <?php endforeach; ?>
            </select>
            <button type="submit" class="btn-zain-gold" style="font-size:0.78rem;padding:0.6rem 1.5rem;border:none;cursor:pointer;">Update</button>
        </form>
    </div>
    <?php endif; ?>

    <!-- Orders Table -->
    <div class="bg-white rounded-3 shadow-sm">
        <div class="table-responsive">
            <table class="table table-hover mb-0" style="font-size:0.85rem;">
                <thead style="background:#f8f6f1;">
                    <tr>
                        <th class="ps-4 py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">#</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Customer</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Phone</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Amount</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Status</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Date</th>
                        <th class="py-3 pe-4 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                <?php if (empty($orders)): ?>
                    <tr><td colspan="7" class="text-center text-muted py-5">No orders found</td></tr>
                <?php else: foreach ($orders as $o): 
                    $badge = match($o['status']) {
                        'pending'   => 'bg-warning text-dark',
                        'confirmed' => 'bg-primary',
                        'shipped'   => 'bg-info text-dark',
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
                        <td class="py-3"><span class="badge <?= $badge ?> text-uppercase" style="font-size:0.68rem;letter-spacing:0.06em;"><?= $o['status'] ?></span></td>
                        <td class="py-3 text-muted" style="font-size:0.8rem;"><?= date('d M Y H:i', strtotime($o['created_at'])) ?></td>
                        <td class="py-3 pe-4">
                            <a href="?view=<?= $o['id'] ?>" class="btn btn-sm btn-outline-secondary" style="font-size:0.72rem;border-radius:0;">
                                <i class="fa-solid fa-eye"></i> View
                            </a>
                        </td>
                    </tr>
                <?php endforeach; endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
