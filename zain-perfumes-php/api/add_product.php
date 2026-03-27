<?php
// zain-perfumes-php/api/add_product.php
include '../includes/db.php';

header('Content-Type: application/json');

$name = $_POST['name'];
$price = $_POST['price'];
$stock = $_POST['stock'];

$image = "";
if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
    $target_dir = "../uploads/products/";
    if (!is_dir($target_dir)) mkdir($target_dir, 0777, true);
    $filename = time() . "_" . $_FILES['image']['name'];
    $image = "uploads/products/" . $filename;
    move_uploaded_file($_FILES['image']['tmp_name'], "../" . $image);
}

$stmt = $conn->prepare("INSERT INTO store_products (name, price, stock, image, is_visible) VALUES (?, ?, ?, ?, 1)");
$stmt->bind_param("sdss", $name, $price, $stock, $image);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}
