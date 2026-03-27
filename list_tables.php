<?php
include 'C:/Users/Hp/Desktop/New folder (9)/zain-website-php/includes/db.php';
if ($conn) {
    $res = $conn->query("SHOW TABLES");
    if ($res) {
        while ($row = $res->fetch_array()) {
            echo $row[0] . "\n";
        }
    } else {
        echo "Error: " . $conn->error;
    }
} else {
    echo "No DB Connection";
}
?>
