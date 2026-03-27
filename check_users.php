<?php
include 'C:/Users/Hp/Desktop/New folder (9)/zain-website-php/includes/db.php';
if ($conn) {
    $res = $conn->query("DESCRIBE users");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            print_r($row);
        }
    } else {
        echo "Error: " . $conn->error;
    }
} else {
    echo "No DB Connection";
}
?>
