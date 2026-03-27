<?php
// zain-perfumes-php/migrate.php
include 'includes/db.php';

echo "Starting migrations...\n";

// 1. Modify orders table
$sql = "ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS is_pickup TINYINT(1) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS deposit_image VARCHAR(255) DEFAULT NULL";
if ($conn->query($sql)) {
    echo "Orders table updated.\n";
} else {
    echo "Error updating orders table: " . $conn->error . "\n";
}

// 2. Create formulas table
$sql = "CREATE TABLE IF NOT EXISTS formulas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_id INT DEFAULT NULL,
    image VARCHAR(255) DEFAULT NULL,
    is_visible TINYINT(1) DEFAULT 1,
    is_offer TINYINT(1) DEFAULT 0,
    original_price DECIMAL(10, 2) DEFAULT 0,
    offer_price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";
if ($conn->query($sql)) {
    echo "Formulas table created.\n";
} else {
    echo "Error creating formulas table: " . $conn->error . "\n";
}

// 3. Create formula_items table
$sql = "CREATE TABLE IF NOT EXISTS formula_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    formula_id INT NOT NULL,
    pos_product_id INT NOT NULL,
    quantity_ml DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
)";
if ($conn->query($sql)) {
    echo "Formula_items table created.\n";
} else {
    echo "Error creating formula_items table: " . $conn->error . "\n";
}

// 3b. Update order_items table to support formula_id
$sql = "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS formula_id INT DEFAULT NULL";
$conn->query($sql);


// 4. Create offers table (for banner)
$sql = "CREATE TABLE IF NOT EXISTS offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1
)";
if ($conn->query($sql)) {
    echo "Offers table created.\n";
} else {
    echo "Error creating offers table: " . $conn->error . "\n";
}

// 5. Create verifications table
$sql = "CREATE TABLE IF NOT EXISTS verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX (email)
)";
if ($conn->query($sql)) {
    echo "Verifications table created.\n";
} else {
    echo "Error creating verifications table: " . $conn->error . "\n";
}

echo "Migrations completed.\n";
?>
