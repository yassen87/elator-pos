<?php
// zain-perfumes-php/api/user_orders.php
include '../includes/db.php';
session_start();

header('Content-Type: application/json');

$user_id = $_GET['user_id'] ?? ($_SESSION['user_id'] ?? null);

if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$orders = [];
$res = $conn->query("SELECT * FROM orders WHERE user_id = $user_id ORDER BY created_at DESC");
while($row = $res->fetch_assoc()) {
    $orders[] = $row;
}

echo json_encode(['success' => true, 'orders' => $orders]);
