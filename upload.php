<?php
/**
 * Easy Production — 3D Model Upload Handler
 *
 * Saves admin-uploaded .glb files to assets/models/{type}.glb
 * so they are served as static files accessible to all users/devices.
 *
 * Protected by the admin panel password (same as auth.js ADMIN_PASSWORD).
 * Place this file in the root of the site (same folder as index.html).
 */

// ── Config ───────────────────────────────────────────────────────────────────
// Must match ADMIN_PASSWORD in admin/auth.js
define('UPLOAD_PASSWORD', 'admin123');
define('MODELS_DIR', __DIR__ . '/assets/models/');
define('MAX_FILE_SIZE', 50 * 1024 * 1024); // 50 MB

// ── CORS headers (admin panel is on same origin, but allow just in case) ─────
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Only accept POST ──────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
$pass = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '';
if ($pass !== UPLOAD_PASSWORD) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

// ── Validate clothing type ────────────────────────────────────────────────────
$type = preg_replace('/[^a-z0-9_\-]/', '', strtolower($_POST['type'] ?? ''));
if (!$type) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid type']);
    exit;
}

// ── Validate file ─────────────────────────────────────────────────────────────
if (!isset($_FILES['model']) || $_FILES['model']['error'] !== UPLOAD_ERR_OK) {
    $codes = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds upload_max_filesize in php.ini',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL    => 'File only partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'No temp directory',
        UPLOAD_ERR_CANT_WRITE => 'Cannot write to disk',
    ];
    $errCode = $_FILES['model']['error'] ?? UPLOAD_ERR_NO_FILE;
    echo json_encode(['ok' => false, 'error' => $codes[$errCode] ?? 'Upload error ' . $errCode]);
    exit;
}

if ($_FILES['model']['size'] > MAX_FILE_SIZE) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'File too large (max 50 MB)']);
    exit;
}

// ── Validate GLB magic bytes: first 4 bytes must be "glTF" ───────────────────
$tmp  = $_FILES['model']['tmp_name'];
$magic = file_get_contents($tmp, false, null, 0, 4);
if ($magic !== 'glTF') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid file: not a GLB/glTF binary']);
    exit;
}

// ── Ensure target directory exists ───────────────────────────────────────────
if (!is_dir(MODELS_DIR)) {
    if (!mkdir(MODELS_DIR, 0755, true)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Cannot create models directory']);
        exit;
    }
}

// ── Save file ─────────────────────────────────────────────────────────────────
$dest = MODELS_DIR . $type . '.glb';
if (move_uploaded_file($tmp, $dest)) {
    echo json_encode([
        'ok'   => true,
        'type' => $type,
        'path' => 'assets/models/' . $type . '.glb',
        'size' => $_FILES['model']['size'],
    ]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to save file — check directory permissions']);
}
