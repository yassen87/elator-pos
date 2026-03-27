<?php
// zain-perfumes-php/api/update_offer.php
include '../includes/db.php';

$data = json_decode(file_get_contents("php://input"), true);
$text = $data['text'];
$is_active = $data['is_active'] ? 1 : 0;

$conn->query("UPDATE offers SET is_active = 0");
$stmt = $conn->prepare("INSERT INTO offers (text, is_active) VALUES (?, ?)");
$stmt->bind_param("si", $text, $is_active);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false]);
}
