<?php
// zain-perfumes-php/seed.php
include 'includes/db.php';

$conn->query("DELETE FROM store_products");
$conn->query("DELETE FROM formulas");

// Mock Products
$products = [
    ['Layton Luxury', 4500, 10, 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80', 'A sophisticated blend of vanilla, apple and lavender.'],
    ['Oud Wood Royale', 7200, 5, 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80', 'The smoky, incense-filled temples of the Far East.'],
    ['Santal 33 Tribute', 3800, 15, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80', 'An addictive scent of cardamom, iris, and violet.']
];

foreach ($products as $p) {
    $stmt = $conn->prepare("INSERT INTO store_products (name, price, stock, image, description, is_visible) VALUES (?, ?, ?, ?, ?, 1)");
    $stmt->bind_param("sdiss", $p[0], $p[1], $p[2], $p[3], $p[4]);
    $stmt->execute();
}

// Mock Formulas
$formulas = [
    ['Winter Spice', 120],
    ['Summer Breeze', 95],
    ['Night Bloom', 150]
];

foreach ($formulas as $f) {
    $stmt = $conn->prepare("INSERT INTO formulas (name, original_price, is_visible) VALUES (?, ?, 1)");
    $stmt->bind_param("sd", $f[0], $f[1]);
    $stmt->execute();
}


echo "Database seeded successfully!";
