<?php
// router.php — PHP built-in server router
// Routes all requests properly including pretty URLs

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve static files directly (css, js, images, fonts)
if (preg_match('/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/', $uri)) {
    return false; // Let built-in server handle static files
}

// Route / to index.php
if ($uri === '/') {
    require __DIR__ . '/index.php';
    return;
}

// Route /admin to admin/index.php
if ($uri === '/admin' || $uri === '/admin/') {
    require __DIR__ . '/admin/index.php';
    return;
}

// Map URI to file path
$filePath = __DIR__ . $uri;

// Serve existing PHP file
if (file_exists($filePath) && pathinfo($filePath, PATHINFO_EXTENSION) === 'php') {
    require $filePath;
    return;
}

// Try appending .php
if (file_exists($filePath . '.php')) {
    require $filePath . '.php';
    return;
}

// Try index.php inside directory
if (is_dir($filePath) && file_exists($filePath . '/index.php')) {
    require $filePath . '/index.php';
    return;
}

// Static file exists
if (file_exists($filePath) && is_file($filePath)) {
    return false;
}

// 404
http_response_code(404);
echo '<h1 style="font-family:sans-serif;color:#333;padding:2rem;">404 — Page Not Found</h1>';
echo '<p style="font-family:sans-serif;padding:0 2rem;"><a href="/">Go to Homepage</a></p>';
