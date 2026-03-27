<?php
// zain-perfumes-php/api/offers.php
include '../includes/db.php';

header('Content-Type: application/json');

$res = $conn->query("SELECT text FROM offers WHERE is_active = 1 LIMIT 1");
$offer = $res->fetch_assoc();

echo json_encode(['success' => true, 'offer' => $offer ? $offer['text'] : null]);
