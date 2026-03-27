<?php
// includes/auth.php - Admin session check
session_start();

function requireAdminLogin() {
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        header('Location: /admin/index.php');
        exit;
    }
}
?>
