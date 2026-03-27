<?php
// zain-perfumes-php/api/update_order_status.php
include '../includes/db.php';
session_start();

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'];
$status = $data['status'];

// Stock deduction logic (same as before)
if ($status === 'delivered') {
    $items = $conn->query("SELECT * FROM order_items WHERE order_id = $id");
    while($item = $items->fetch_assoc()) {
        if ($item['product_id']) {
            $conn->query("UPDATE store_products SET stock = stock - " . $item['quantity'] . " WHERE id = " . $item['product_id']);
        } elseif ($item['formula_id']) {
            $formula_id = $item['formula_id'];
            $formula_items = $conn->query("SELECT * FROM formula_items WHERE formula_id = $formula_id");
            while($f_item = $formula_items->fetch_assoc()) {
                $pos_prod_id = $f_item['pos_product_id'];
                $qty = $f_item['quantity_ml'];
                $conn->query("UPDATE pos_products SET stock_quantity = stock_quantity - $qty WHERE id = $pos_prod_id");
            }
        }
    }
}

$stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
$stmt->bind_param("si", $status, $id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}
