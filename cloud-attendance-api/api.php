<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Set Timezone to Egypt
date_default_timezone_set('Africa/Cairo');

// MySQL Connection Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'zain_perfumes');

function getDB()
{
    static $db = null;
    if ($db === null) {
        $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($db->connect_error) {
            throw new Exception("Database Connection Failed: " . $db->connect_error);
        }
        $db->set_charset("utf8mb4");
    }
    return $db;
}

$data_file = __DIR__ . '/attendance_data.json';

function initializeData()
{
    global $data_file;
    $initial_data = [
        'employees' => [],
        'attendance' => [],
        'commands' => [],
        'branches' => [],
        'products' => [],
        'sales' => [],
        'updates' => []
    ];
    file_put_contents($data_file, json_encode($initial_data, JSON_PRETTY_PRINT));
    return $initial_data;
}

function loadData()
{
    global $data_file;
    try {
        if (!file_exists($data_file))
            return initializeData();
        $content = file_get_contents($data_file);
        if (empty($content))
            return initializeData();
        $decoded = json_decode($content, true);
        if ($decoded === null)
            return initializeData();

        $defaults = [
            'employees' => [],
            'attendance' => [],
            'commands' => [],
            'branches' => [],
            'products' => [],
            'sales' => [],
            'updates' => []
        ];
        return array_merge($defaults, $decoded);
    } catch (Exception $e) {
        return initializeData();
    }
}

function saveData($data)
{
    global $data_file;
    file_put_contents($data_file, json_encode($data, JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_REQUEST['action'] ?? '';

if ($method === 'OPTIONS')
    exit(0);

try {
    if (!$action || $action === 'health') {
        $dbStatus = 'Not Connected';
        try {
            $db = getDB();
            $dbStatus = 'Connected';
        } catch (Exception $e) {
            $dbStatus = 'Error: ' . $e->getMessage();
        }

        echo json_encode([
            'success' => true,
            'message' => 'Zain Elite PHP Cloud API Connected',
            'database' => $dbStatus,
            'time' => date('Y-m-d H:i:s'),
            'server' => [
                'upload_max' => ini_get('upload_max_filesize'),
                'post_max' => ini_get('post_max_size'),
                'memory' => ini_get('memory_limit'),
                'updates_writable' => is_writable(__DIR__ . '/updates/') || (!is_dir(__DIR__ . '/updates/') && is_writable(__DIR__))
            ]
        ]);
        exit;
    }

    $data = loadData();

    // 1. Sync Employees
    if ($action === 'sync_employees' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $employees = $input['employees'] ?? [];
        $branchId = $input['branchId'] ?? 'MAIN';
        $data['employees'] = array_map(function ($emp) use ($branchId) {
            return [
                'remote_id' => $emp['id'],
                'name' => $emp['name'],
                'code' => $emp['code'],
                'branch_id' => $branchId,
                'work_hours' => $emp['work_hours'] ?? 8
            ];
        }, $employees);
        saveData($data);
        echo json_encode(['success' => true, 'count' => count($employees)]);
        exit;
    }

    // 1.5 Attendance Punch (From Mobile -> Cloud)
    if ($action === 'punch' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $code = $input['employeeCode'] ?? '';
        if (!$code)
            throw new Exception('Employee Code required');

        $employee = null;
        foreach ($data['employees'] as $emp) {
            if ($emp['code'] === $code) {
                $employee = $emp;
                break;
            }
        }
        if (!$employee)
            throw new Exception('Employee not found');

        $requestedType = isset($input['type']) ? strtoupper($input['type']) : (isset($_REQUEST['type']) ? strtoupper($_REQUEST['type']) : null);
        $today = date('Y-m-d');
        $lastPunch = null;
        foreach (array_reverse($data['attendance']) as $record) {
            if ($record['employee_code'] === $code && substr($record['timestamp'], 0, 10) === $today) {
                $lastPunch = $record['type'];
                break;
            }
        }
        $newType = $requestedType ?: (($lastPunch === 'IN') ? 'OUT' : 'IN');

        if ($requestedType !== null && $requestedType === $lastPunch) {
            echo json_encode(['success' => true, 'type' => $requestedType, 'name' => $employee['name'], 'time' => date('H:i'), 'alreadyRecorded' => true]);
            exit;
        }

        $data['attendance'][] = [
            'id' => count($data['attendance']) + 1,
            'employee_code' => $code,
            'type' => $newType,
            'timestamp' => date('Y-m-d H:i:s'),
            'synced_to_pos' => 0
        ];
        saveData($data);
        echo json_encode(['success' => true, 'type' => $newType, 'name' => $employee['name'], 'time' => date('H:i')]);
        exit;
    }

    // 1.6 Get Attendance (Cloud -> POS)
    if ($action === 'get_attendance' && $method === 'GET') {
        $unsynced = [];
        foreach ($data['attendance'] as $key => $record) {
            if ($record['synced_to_pos'] == 0) {
                $unsynced[] = $record;
                $data['attendance'][$key]['synced_to_pos'] = 1;
            }
        }
        if (!empty($unsynced))
            saveData($data);
        echo json_encode(['success' => true, 'data' => $unsynced]);
        exit;
    }

    // 2. Register Shop
    if ($action === 'register_shop' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $shopId = $input['branchId'] ?? '';
        $shopName = $input['name'] ?? 'متجر غير معروف';
        if (!$shopId)
            throw new Exception('Shop ID required');

        $found = false;
        foreach ($data['branches'] as &$branch) {
            if ($branch['id'] === $shopId) {
                $branch['name'] = $shopName;
                $branch['last_seen'] = date('Y-m-d H:i:s');
                $found = true;
                break;
            }
        }
        if (!$found) {
            $data['branches'][] = [
                'id' => $shopId,
                'name' => $shopName,
                'is_disabled' => false,
                'created_at' => date('Y-m-d H:i:s'),
                'last_seen' => date('Y-m-d H:i:s')
            ];
        }
        saveData($data);

        $isDisabled = false;
        foreach ($data['branches'] as $branch) {
            if ($branch['id'] === $shopId) {
                $isDisabled = (bool) ($branch['is_disabled'] ?? false);
                break;
            }
        }
        echo json_encode(['success' => true, 'is_disabled' => $isDisabled]);
        exit;
    }

    // 3. Get Hub Stats
    if ($action === 'get_hub_stats' && $method === 'GET') {
        $shops = [];
        $branchesMetadata = $data['branches'] ?? [];
        $branchIds = [];
        foreach ($branchesMetadata as $bm)
            $branchIds[] = $bm['id'];
        if (isset($data['employees']))
            foreach ($data['employees'] as $e)
                $branchIds[] = $e['branch_id'];
        $uniqueBranches = array_unique($branchIds);

        foreach ($uniqueBranches as $bid) {
            $meta = null;
            foreach ($branchesMetadata as $bm) {
                if ($bm['id'] === $bid) {
                    $meta = $bm;
                    break;
                }
            }
            $branchSales = 0;
            $saleCount = 0;
            $prodCount = 0;
            if (isset($data['sales'])) {
                foreach ($data['sales'] as $s) {
                    if (($s['branchId'] ?? 'MAIN') === $bid) {
                        $branchSales += ($s['total'] ?? 0);
                        $saleCount++;
                    }
                }
            }
            if (isset($data['products'])) {
                // productCount logic could be per branch if data supports it
            }
            $shops[] = [
                'id' => $bid,
                'name' => $meta ? $meta['name'] : (($bid === 'MAIN') ? 'الفرع الرئيسي' : "فرع $bid"),
                'totalSales' => $branchSales,
                'saleCount' => $saleCount,
                'is_disabled' => $meta ? (bool) ($meta['is_disabled'] ?? false) : false,
                'last_seen' => $meta ? $meta['last_seen'] : null,
                'status' => ($meta && (time() - strtotime($meta['last_seen'])) < 300) ? 'online' : 'offline'
            ];
        }
        echo json_encode(['success' => true, 'shops' => $shops]);
        exit;
    }

    // 4. Send Command
    if ($action === 'send_command' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $bid = $input['branchId'] ?? '';
        $cmd = $input['command'] ?? '';
        $data['commands'][] = [
            'id' => uniqid(),
            'branchId' => $bid,
            'command' => $cmd,
            'timestamp' => date('Y-m-d H:i:s'),
            'executed' => false
        ];
        if ($cmd === 'DISABLE_APP' || $cmd === 'ENABLE_APP') {
            foreach ($data['branches'] as &$b) {
                if ($b['id'] === $bid) {
                    $b['is_disabled'] = ($cmd === 'DISABLE_APP');
                    break;
                }
            }
        }
        saveData($data);
        echo json_encode(['success' => true]);
        exit;
    }

    // 4.5 Master Sync (Command all branches)
    if ($action === 'master_sync' && $method === 'POST') {
        foreach ($data['branches'] as $b) {
            $data['commands'][] = [
                'id' => uniqid(),
                'branchId' => $b['id'],
                'command' => 'SYNC_DATA',
                'timestamp' => date('Y-m-d H:i:s'),
                'executed' => false
            ];
        }
        saveData($data);
        echo json_encode(['success' => true]);
        exit;
    }

    // 4.6 Get Backups List
    if ($action === 'get_backups' && $method === 'GET') {
        $bid = $_GET['branchId'] ?? '';
        $backups = [];
        $dir = __DIR__ . '/backups/';
        if (is_dir($dir)) {
            $files = scandir($dir);
            foreach ($files as $file) {
                if ($file === '.' || $file === '..')
                    continue;
                // Format: backup_{branchId}_{timestamp}.sqlite
                if (strpos($file, 'backup_') === 0) {
                    $parts = explode('_', $file);
                    if ($bid === 'ALL' || (isset($parts[1]) && $parts[1] === $bid)) {
                        $backups[] = [
                            'filename' => $file,
                            'branchId' => $parts[1] ?? 'unknown',
                            'timestamp' => str_replace('.sqlite', '', $parts[2] ?? 'unknown'),
                            'size' => filesize($dir . $file),
                            'url' => 'https://' . $_SERVER['HTTP_HOST'] . str_replace($_SERVER['DOCUMENT_ROOT'], '', __DIR__) . '/backups/' . $file
                        ];
                    }
                }
            }
        }
        echo json_encode(['success' => true, 'backups' => array_reverse($backups)]);
        exit;
    }

    // 4.7 Upload Backup from POS
    if ($action === 'upload_backup' && $method === 'POST') {
        if (!isset($_FILES['backup_file']))
            throw new Exception('No backup file uploaded');
        $branchId = $_POST['branchId'] ?? 'unknown';
        $timestamp = date('Ymd_His');
        $filename = "backup_{$branchId}_{$timestamp}.sqlite";

        $target_dir = __DIR__ . "/backups/";
        if (!is_dir($target_dir))
            mkdir($target_dir, 0777, true);

        if (move_uploaded_file($_FILES['backup_file']['tmp_name'], $target_dir . $filename)) {
            echo json_encode(['success' => true, 'filename' => $filename]);
        } else {
            throw new Exception('Failed to save backup file');
        }
        exit;
    }

    // 5. Get Commands
    if ($action === 'get_commands' && $method === 'GET') {
        $bid = $_GET['branchId'] ?? '';
        $pending = [];
        foreach ($data['commands'] as $key => $c) {
            if ($c['branchId'] === $bid && !$c['executed']) {
                $pending[] = $c;
                $data['commands'][$key]['executed'] = true;
            }
        }
        if (!empty($pending))
            saveData($data);
        echo json_encode(['success' => true, 'commands' => $pending]);
        exit;
    }

    // 6. Get Latest Update
    if ($action === 'get_latest_update') {
        $latest = null;
        if (!empty($data['updates'])) {
            $latest = $data['updates'][count($data['updates']) - 1];
        }
        echo json_encode(['success' => true, 'latest' => $latest]);
        exit;
    }

    // 7. Upload Update (From Hub -> Cloud)
    if ($action === 'upload_update' && $method === 'POST') {
        if (!isset($_FILES['update_file'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No file uploaded']);
            exit;
        }

        $version = $_POST['version'] ?? '1.0.0';
        $notes = $_POST['notes'] ?? '';
        $target = $_POST['target_branch'] ?? 'ALL';

        $upload_dir = __DIR__ . '/updates/';
        if (!is_dir($upload_dir))
            mkdir($upload_dir, 0777, true);

        $filename = 'update_' . time() . '_' . basename($_FILES['update_file']['name']);
        $target_path = $upload_dir . $filename;

        if (move_uploaded_file($_FILES['update_file']['tmp_name'], $target_path)) {
            $data['updates'][] = [
                'id' => uniqid(),
                'version' => $version,
                'notes' => $notes,
                'target_branch' => $target,
                'url' => 'https://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/updates/' . $filename,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            saveData($data);
            echo json_encode(['success' => true, 'message' => 'Update uploaded successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save file']);
        }
        exit;
    }

    // (Fallback for other existing actions like 'sync_sales', 'sync_products', 'punch'...)
    if ($action === 'sync_sales') {
        $input = json_decode(file_get_contents('php://input'), true);
        $sales = $input['sales'] ?? [];
        if (!isset($data['sales']))
            $data['sales'] = [];
        $data['sales'] = array_merge($data['sales'], $sales);
        saveData($data);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'sync_products' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $prods = $input['products'] ?? [];
        $db = getDB();
        
        // Use database for products instead of JSON
        foreach ($prods as $p) {
            $name = $db->real_escape_string($p['name']);
            $price = floatval($p['price']);
            $category = $db->real_escape_string($p['category'] ?? '');
            $desc = $db->real_escape_string($p['description'] ?? '');
            $img = $db->real_escape_string($p['image'] ?? '');
            $visible = isset($p['is_visible']) ? ($p['is_visible'] ? 1 : 0) : 1;

            // Check if product exists by name or id if provided
            $check = $db->query("SELECT id FROM store_products WHERE name = '$name'");
            if ($check->num_rows > 0) {
                $db->query("UPDATE store_products SET price = $price, category = '$category', description = '$desc', image = '$img', is_visible = $visible WHERE name = '$name'");
            } else {
                $db->query("INSERT INTO store_products (name, price, category, description, image, is_visible) VALUES ('$name', $price, '$category', '$desc', '$img', $visible)");
            }
        }
        
        echo json_encode(['success' => true, 'message' => 'Products synchronized to MySQL']);
        exit;
    }

    if ($action === 'sync_offers' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $offers = $input['offers'] ?? [];
        $db = getDB();
        
        foreach ($offers as $o) {
            $title = $db->real_escape_string($o['title']);
            $desc = $db->real_escape_string($o['description'] ?? '');
            $img = $db->real_escape_string($o['image'] ?? '');
            $duration = intval($o['duration_days'] ?? 7);
            $active = isset($o['is_active']) ? ($o['is_active'] ? 1 : 0) : 1;

            $check = $db->query("SELECT id FROM store_offers WHERE title = '$title'");
            if ($check->num_rows > 0) {
                $db->query("UPDATE store_offers SET description = '$desc', image = '$img', duration_days = $duration, is_active = $active WHERE title = '$title'");
            } else {
                $db->query("INSERT INTO store_offers (title, description, image, duration_days, is_active) VALUES ('$title', '$desc', '$img', $duration, $active)");
            }
        }
        
        echo json_encode(['success' => true, 'message' => 'Offers synchronized to MySQL']);
        exit;
    }

    echo json_encode(['success' => false, 'error' => "Action '$action' not found"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>