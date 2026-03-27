<?php
// zain-perfumes-php/auth/send_code.php
include '../includes/db.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Email is required']);
    exit;
}

// Generate 6-digit code
$code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
$expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

// Delete old codes for this email
$conn->query("DELETE FROM verifications WHERE email = '$email'");

// Insert new code
$stmt = $conn->prepare("INSERT INTO verifications (email, code, expires_at) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $email, $code, $expires_at);

if ($stmt->execute()) {
    // In a real scenario, use PHPMailer to send the code
    // For now, we simulate success. We can log the code for testing.
    error_log("Verification code for $email: $code");
    
    echo json_encode(['success' => true, 'message' => 'Code sent (check logs)', 'code' => $code]); // Returning code for easy testing
} else {
    echo json_encode(['success' => false, 'message' => 'Error saving code']);
}
?>
