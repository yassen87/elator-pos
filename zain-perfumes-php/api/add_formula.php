<?php
// zain-perfumes-php/api/add_formula.php
include '../includes/db.php';

header('Content-Type: application/json');

$name = $_POST['name'];
$client_id = $_POST['client_id'] ?? null;
$original_price = $_POST['original_price'] ?? 0;
$offer_price = $_POST['offer_price'] ?? 0;
$items = json_decode($_POST['items'], true); // Array of {pos_id, qty}

$image = "";
if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
    $target_dir = "../uploads/formulas/";
    if (!is_dir($target_dir)) mkdir($target_dir, 0777, true);
    $filename = time() . "_" . $_FILES['image']['name'];
    $image = "uploads/formulas/" . $filename;
    move_uploaded_file($_FILES['image']['tmp_name'], "../" . $image);
}

$conn->begin_transaction();
try {
    $stmt = $conn->prepare("INSERT INTO formulas (name, client_id, original_price, offer_price, image, is_visible) VALUES (?, ?, ?, ?, ?, 1)");
    $stmt->bind_param("ssdds", $name, $client_id, $original_price, $offer_price, $image);
    $stmt->execute();
    $formula_id = $stmt->insert_id;

    $itemStmt = $conn->prepare("INSERT INTO formula_items (formula_id, pos_product_id, quantity_ml) VALUES (?, ?, ?)");
    foreach ($items as $item) {
        $itemStmt->bind_param("iid", $formula_id, $item['pos_id'], $item['qty']);
        $itemStmt->execute();
    }

    $conn->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
