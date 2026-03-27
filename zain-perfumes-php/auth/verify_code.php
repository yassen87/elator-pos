<?php
// zain-perfumes-php/auth/verify_code.php
include '../includes/db.php';
session_start();

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$code = $data['code'] ?? '';

if (empty($email) || empty($code)) {
    echo json_encode(['success' => false, 'message' => 'Email and code are required']);
    exit;
}

// Check verification
$stmt = $conn->prepare("SELECT id FROM verifications WHERE email = ? AND code = ? AND expires_at > NOW()");
$stmt->bind_param("ss", $email, $code);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Code is valid! Delete it
    $conn->query("DELETE FROM verifications WHERE email = '$email'");
    
    // Check if user exists in the main users table
    $stmt = $conn->prepare("SELECT id, name, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $userResult = $stmt->get_result();
    
    if ($userResult->num_rows > 0) {
        $user = $userResult->fetch_assoc();
    } else {
        // Auto-register new user
        $name = explode('@', $email)[0];
        $role = (str_starts_with($email, 'admin')) ? 'admin' : 'user';
        
        $insertStmt = $conn->prepare("INSERT INTO users (name, email, role) VALUES (?, ?, ?)");
        $insertStmt->bind_param("sss", $name, $email, $role);
        $insertStmt->execute();
        
        $user = [
            'id' => $insertStmt->insert_id,
            'name' => $name,
            'role' => $role
        ];
    }
    
    // Set Session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_role'] = $user['role'];
    
    echo json_encode(['success' => true, 'message' => 'Logged in successfully', 'user' => $user]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired code']);
}
?>
