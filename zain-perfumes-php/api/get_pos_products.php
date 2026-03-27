<?php
// zain-perfumes-php/api/get_pos_products.php
include '../includes/db.php';
header('Content-Type: application/json');

$res = $conn->query("SELECT id, name, stock_quantity FROM pos_products ORDER BY name ASC");
$products = [];
while($row = $res->fetch_assoc()) {
    $products[] = $row;
}
echo json_encode(['success' => true, 'products' => $products]);
