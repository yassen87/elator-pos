<?php
// zain-perfumes-php/api/products.php
include '../includes/db.php';

header('Content-Type: application/json');

$type = $_GET['type'] ?? 'all'; // 'product', 'formula', or 'all'

$response = [
    'products' => [],
    'formulas' => []
];

if ($type == 'all' || $type == 'product') {
    $res = $conn->query("SELECT * FROM store_products WHERE is_visible = 1 ORDER BY created_at DESC");
    while($row = $res->fetch_assoc()) {
        $response['products'][] = $row;
    }
}

if ($type == 'all' || $type == 'formula') {
    $res = $conn->query("SELECT * FROM formulas WHERE is_visible = 1 ORDER BY created_at DESC");
    while($row = $res->fetch_assoc()) {
        $response['formulas'][] = $row;
    }
}

echo json_encode(['success' => true, 'data' => $response]);
