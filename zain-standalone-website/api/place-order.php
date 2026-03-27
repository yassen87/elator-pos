<?php
// api/place-order.php — Accepts JSON order, saves to SQLite

header('Content-Type: application/json');
require_once __DIR__ . '/../includes/db.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid request.']);
    exit;
}

$name    = trim($input['customer_name'] ?? '');
$phone   = trim($input['customer_phone'] ?? '');
$address = trim($input['shipping_address'] ?? '');
$total   = floatval($input['total'] ?? 0);
$items   = $input['items'] ?? [];

if (!$name || !$phone || !$address || empty($items)) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit;
}

try {
    // Create order
    $stmt = $pdo->prepare("INSERT INTO orders (customer_name, customer_phone, shipping_address, total_amount, status) VALUES (?, ?, ?, ?, 'pending')");
    $stmt->execute([$name, $phone, $address, $total]);
    $orderId = $pdo->lastInsertId();

    // Insert each item
    foreach ($items as $item) {
        $productId = intval($item['id'] ?? 0);
        $qty       = intval($item['qty'] ?? 1);
        $price     = floatval($item['price'] ?? 0);

        $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)")
            ->execute([$orderId, $productId, $qty, $price]);

        // Reduce stock
        if ($productId > 0) {
            $pdo->prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?")
                ->execute([$qty, $productId]);
        }
    }

    echo json_encode(['success' => true, 'order_id' => $orderId]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
