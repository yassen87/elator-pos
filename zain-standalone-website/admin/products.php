<?php
// admin/products.php
require_once __DIR__ . '/../includes/auth.php';
requireAdminLogin();
require_once __DIR__ . '/../includes/db.php';

$action = $_GET['action'] ?? 'list';
$success = '';
$error = '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $desc = trim($_POST['description'] ?? '');
    $price = floatval($_POST['price'] ?? 0);
    $stock = intval($_POST['stock'] ?? 0);
    $is_active = isset($_POST['is_active']) ? 1 : 0;
    $image_url = trim($_POST['image_url'] ?? '');

    if ($_POST['form_action'] === 'add') {
        $stmt = $pdo->prepare("INSERT INTO products (name, description, price, stock, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $desc, $price, $stock, $image_url, $is_active]);
        $success = 'Product added successfully!';
        $action = 'list';
    } elseif ($_POST['form_action'] === 'edit') {
        $id = intval($_POST['product_id']);
        $stmt = $pdo->prepare("UPDATE products SET name=?, description=?, price=?, stock=?, image_url=?, is_active=? WHERE id=?");
        $stmt->execute([$name, $desc, $price, $stock, $image_url, $is_active, $id]);
        $success = 'Product updated successfully!';
        $action = 'list';
    }
}

// Delete
if ($action === 'delete' && isset($_GET['id'])) {
    $pdo->prepare("DELETE FROM products WHERE id=?")->execute([intval($_GET['id'])]);
    header('Location: /admin/products.php?success=deleted');
    exit;
}

// Fetch single for edit
$editProduct = null;
if ($action === 'edit' && isset($_GET['id'])) {
    $editProduct = $pdo->prepare("SELECT * FROM products WHERE id=?");
    $editProduct->execute([intval($_GET['id'])]);
    $editProduct = $editProduct->fetch(PDO::FETCH_ASSOC);
}

// Fetch all products
$products = $pdo->query("SELECT * FROM products ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);

if (isset($_GET['success'])) $success = 'Operation completed successfully!';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products — Zain Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&family=Cormorant+Garamond:wght@400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body style="background:#f0f2f5; font-family:'Montserrat',sans-serif;">

<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="admin-content p-5">
    <div class="d-flex justify-content-between align-items-center mb-5">
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:400;">
            <?= ($action === 'add') ? 'Add Product' : (($action === 'edit') ? 'Edit Product' : 'Products') ?>
        </h1>
        <?php if ($action === 'list'): ?>
        <a href="?action=add" class="btn-zain-gold" style="font-size:0.78rem;padding:0.75rem 1.8rem;text-decoration:none;">
            <i class="fa-solid fa-plus me-2"></i> Add New Product
        </a>
        <?php else: ?>
        <a href="/admin/products.php" style="color:#C9A96E;font-size:0.82rem;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
            <i class="fa-solid fa-arrow-left me-1"></i> Back to List
        </a>
        <?php endif; ?>
    </div>

    <?php if ($success): ?>
        <div class="alert alert-success py-2 mb-4" style="font-size:0.85rem;border-radius:0;"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>

    <!-- ADD / EDIT FORM -->
    <?php if ($action === 'add' || $action === 'edit'): ?>
    <div class="bg-white p-5 rounded-3 shadow-sm">
        <form method="POST">
            <input type="hidden" name="form_action" value="<?= $action ?>">
            <?php if ($action === 'edit'): ?>
                <input type="hidden" name="product_id" value="<?= $editProduct['id'] ?>">
            <?php endif; ?>

            <div class="row g-4">
                <div class="col-md-8">
                    <label class="form-label fw-semibold" style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;color:#888;">Product Name *</label>
                    <input type="text" name="name" class="form-control form-input-gold" required value="<?= htmlspecialchars($editProduct['name'] ?? '') ?>" placeholder="e.g. Oud Al Layl">
                </div>
                <div class="col-md-4">
                    <label class="form-label fw-semibold" style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;color:#888;">Price (LE) *</label>
                    <input type="number" step="0.01" name="price" class="form-control form-input-gold" required value="<?= htmlspecialchars($editProduct['price'] ?? '') ?>" placeholder="0.00">
                </div>
                <div class="col-md-8">
                    <label class="form-label fw-semibold" style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;color:#888;">Image URL</label>
                    <input type="url" name="image_url" class="form-control form-input-gold" value="<?= htmlspecialchars($editProduct['image_url'] ?? '') ?>" placeholder="https://...">
                </div>
                <div class="col-md-4">
                    <label class="form-label fw-semibold" style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;color:#888;">Stock Quantity *</label>
                    <input type="number" name="stock" class="form-control form-input-gold" required value="<?= htmlspecialchars($editProduct['stock'] ?? 0) ?>">
                </div>
                <div class="col-12">
                    <label class="form-label fw-semibold" style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;color:#888;">Description</label>
                    <textarea name="description" class="form-control form-input-gold" rows="4" placeholder="Product description..."><?= htmlspecialchars($editProduct['description'] ?? '') ?></textarea>
                </div>
                <div class="col-12">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="is_active" id="isActive" <?= ($editProduct['is_active'] ?? 1) ? 'checked' : '' ?>>
                        <label class="form-check-label fw-semibold" for="isActive" style="font-size:0.82rem;">Active (Visible in Shop)</label>
                    </div>
                </div>
                <div class="col-12">
                    <button type="submit" class="btn-zain-gold" style="font-size:0.78rem;padding:0.85rem 2.5rem;border:none;cursor:pointer;">
                        <i class="fa-solid fa-save me-2"></i> <?= ($action === 'edit') ? 'Update Product' : 'Save Product' ?>
                    </button>
                </div>
            </div>
        </form>
    </div>

    <!-- PRODUCTS LIST -->
    <?php else: ?>
    <div class="bg-white rounded-3 shadow-sm">
        <div class="table-responsive">
            <table class="table table-hover mb-0" style="font-size:0.85rem;">
                <thead style="background:#f8f6f1;">
                    <tr>
                        <th class="ps-4 py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">#</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Image</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Name</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Price</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Stock</th>
                        <th class="py-3 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Status</th>
                        <th class="py-3 pe-4 fw-semibold text-muted" style="text-transform:uppercase;letter-spacing:0.1em;font-size:0.75rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                <?php if (empty($products)): ?>
                    <tr><td colspan="7" class="text-center text-muted py-5">
                        <i class="fa-solid fa-box-open fa-2x mb-2 d-block" style="color:#e0e0e0;"></i>
                        No products yet. <a href="?action=add" style="color:#C9A96E;">Add your first product</a>
                    </td></tr>
                <?php else: foreach ($products as $p): ?>
                    <tr>
                        <td class="ps-4 py-3"><?= $p['id'] ?></td>
                        <td class="py-3">
                            <?php if ($p['image_url']): ?>
                                <img src="<?= htmlspecialchars($p['image_url']) ?>" style="width:48px;height:60px;object-fit:cover;border:1px solid #e8e0d0;" alt="">
                            <?php else: ?>
                                <div style="width:48px;height:60px;background:#f0ede7;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-image text-muted"></i></div>
                            <?php endif; ?>
                        </td>
                        <td class="py-3 fw-semibold"><?= htmlspecialchars($p['name']) ?></td>
                        <td class="py-3 fw-bold" style="color:#C9A96E;">LE <?= number_format($p['price'],2) ?></td>
                        <td class="py-3"><?= $p['stock'] ?></td>
                        <td class="py-3">
                            <?php if ($p['is_active']): ?>
                                <span class="badge bg-success text-uppercase" style="font-size:0.68rem;letter-spacing:0.06em;">Active</span>
                            <?php else: ?>
                                <span class="badge bg-secondary text-uppercase" style="font-size:0.68rem;letter-spacing:0.06em;">Hidden</span>
                            <?php endif; ?>
                        </td>
                        <td class="py-3 pe-4">
                            <a href="?action=edit&id=<?= $p['id'] ?>" class="btn btn-sm btn-outline-secondary me-1" style="font-size:0.72rem;border-radius:0;">
                                <i class="fa-solid fa-pen"></i> Edit
                            </a>
                            <a href="?action=delete&id=<?= $p['id'] ?>" onclick="return confirm('Delete this product?')" class="btn btn-sm btn-outline-danger" style="font-size:0.72rem;border-radius:0;">
                                <i class="fa-solid fa-trash"></i>
                            </a>
                        </td>
                    </tr>
                <?php endforeach; endif; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php endif; ?>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
