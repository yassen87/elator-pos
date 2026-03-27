<?php
// zain-perfumes-php/api/place_order.php
include '../includes/db.php';
session_start();

header('Content-Type: application/json');

// Handle FormData (since it includes a file)
$user_id = $_POST['user_id'] ?? ($_SESSION['user_id'] ?? null);
if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit;
}

$final_total = $_POST['final_total'];
$address = $_POST['address'];
$is_pickup = ($_POST['is_pickup'] === 'true' || $_POST['is_pickup'] === '1') ? 1 : 0;
$cart = json_decode($_POST['cart_json'], true);

// Deposit Image
$deposit_image = "";
if (isset($_FILES['deposit_img']) && $_FILES['deposit_img']['error'] === 0) {
    $target_dir = "../uploads/deposits/";
    if (!is_dir($target_dir)) mkdir($target_dir, 0777, true);
    $filename = time() . "_" . $_FILES['deposit_img']['name'];
    $deposit_image = "uploads/deposits/" . $filename;
    move_uploaded_file($_FILES['deposit_img']['tmp_name'], "../" . $deposit_image);
}

$conn->begin_transaction();
try {
    $stmt = $conn->prepare("INSERT INTO orders (user_id, final_amount, shipping_address, is_pickup, deposit_image, status) VALUES (?, ?, ?, ?, ?, 'pending')");
    $stmt->bind_param("idsss", $user_id, $final_total, $address, $is_pickup, $deposit_image);
    $stmt->execute();
    $order_id = $stmt->insert_id;

    $itemStmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, formula_id, quantity, price) VALUES (?, ?, ?, 1, ?)");
    foreach ($cart as $item) {
        $prod_id = ($item['type'] === 'product') ? $item['id'] : null;
        $formula_id = ($item['type'] === 'formula') ? $item['id'] : null;
        $itemStmt->bind_param("iiid", $order_id, $prod_id, $formula_id, $item['price']);
        $itemStmt->execute();
    }

    $conn->commit();
    echo json_encode(['success' => true, 'order_id' => $order_id, 'message' => 'Order placed successfully']);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
