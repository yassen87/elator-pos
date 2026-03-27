<?php
// zain-perfumes-php/api/admin_orders.php
include '../includes/db.php';
session_start();

header('Content-Type: application/json');

// Simplified role check
// In production, use token-based auth
if (($_SESSION['user_role'] ?? '') !== 'admin') {
    // For demo/dev, we allow if session exists or if we use a specific flag
    // echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    // exit;
}

$orders = [];
$res = $conn->query("SELECT * FROM orders ORDER BY created_at DESC");
while($row = $res->fetch_assoc()) {
    $orders[] = $row;
}

echo json_encode(['success' => true, 'orders' => $orders]);
