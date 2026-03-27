<?php
// zain-perfumes-php/includes/db.php

$host = 'localhost';
$user = 'root';
$pass = ''; // Based on .env
$dbname = 'zain_perfumes';

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Set charset to utf8mb4 for Arabic support
$conn->set_charset("utf8mb4");

// CORS Headers for React Frontend
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}
?>

