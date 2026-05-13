<?php
// ============================================================
// api/auth.php — Handler Login, Register, Session, Logout
// ============================================================

session_start();

// Izinkan akses dari browser (CORS untuk localhost)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Kalau browser kirim preflight request OPTIONS, langsung balas OK
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Pastikan request adalah POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method tidak diizinkan']);
    exit;
}

require_once '../config/db.php';

// Baca action yang dikirim dari frontend
$action = trim($_POST['action'] ?? '');

// ── FUNGSI HELPER ──────────────────────────────────────────

/**
 * Validasi format email
 * Mengembalikan true kalau format email valid
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Bersihkan input dari karakter berbahaya
 * Selalu gunakan fungsi ini sebelum memproses input user
 */
function sanitize($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// ── REGISTER ───────────────────────────────────────────────
if ($action === 'register') {

    $nama     = sanitize($_POST['nama']     ?? '');
    $email    = sanitize($_POST['email']    ?? '');
    $password =          $_POST['password'] ?? '';
    // Password tidak di-sanitize karena karakter khusus valid di password

    // Validasi: semua field harus diisi
    if (empty($nama) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Semua field wajib diisi!']);
        exit;
    }

    // Validasi: format email harus benar
    if (!isValidEmail($email)) {
        echo json_encode(['success' => false, 'message' => 'Format email tidak valid!']);
        exit;
    }

    // Validasi: password minimal 6 karakter
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Password minimal 6 karakter!']);
        exit;
    }

    // Validasi: nama minimal 2 karakter
    if (strlen($nama) < 2) {
        echo json_encode(['success' => false, 'message' => 'Nama terlalu pendek!']);
        exit;
    }

    // Cek apakah email sudah terdaftar di database
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email ini sudah terdaftar!']);
        exit;
    }

    // Hash password menggunakan bcrypt — STANDAR INDUSTRI
    // Jangan pernah simpan password polos ke database
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    // Simpan user baru ke database
    $stmt = $pdo->prepare(
        "INSERT INTO users (nama, email, password, created_at)
         VALUES (?, ?, ?, NOW())"
    );
    $stmt->execute([$nama, $email, $passwordHash]);

    echo json_encode([
        'success' => true,
        'message' => 'Akun berhasil dibuat! Silakan login.'
    ]);
}

// ── LOGIN ───────────────────────────────────────────────────
elseif ($action === 'login') {

    $email    = sanitize($_POST['email']    ?? '');
    $password =          $_POST['password'] ?? '';

    // Validasi input tidak kosong
    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email dan password wajib diisi!']);
        exit;
    }

    // Cari user berdasarkan email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Verifikasi: user ada DAN password cocok dengan hash di database
    // password_verify() aman terhadap timing attack
    if ($user && password_verify($password, $user['password'])) {

        // Regenerate session ID untuk mencegah session fixation attack
        session_regenerate_id(true);

        // Simpan data user ke session server
        // Session ini yang akan dicek setiap kali user membuka halaman
        $_SESSION['user_id']    = $user['id'];
        $_SESSION['user_nama']  = $user['nama'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['login_time'] = time();

        echo json_encode([
            'success' => true,
            'nama'    => $user['nama'],
            'email'   => $user['email'],
            'message' => 'Login berhasil!'
        ]);

    } else {
        // Pesan error yang sama untuk email salah DAN password salah
        // Ini mencegah attacker menebak apakah email terdaftar atau tidak
        echo json_encode([
            'success' => false,
            'message' => 'Email atau password salah!'
        ]);
    }
}

// ── CEK SESSION ─────────────────────────────────────────────
elseif ($action === 'cek_session') {

    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'logged_in' => true,
            'user_id'   => $_SESSION['user_id'],
            'nama'      => $_SESSION['user_nama'],
            'email'     => $_SESSION['user_email'],
        ]);
    } else {
        echo json_encode(['logged_in' => false]);
    }
}

// ── LOGOUT ──────────────────────────────────────────────────
elseif ($action === 'logout') {

    // Hapus semua data session
    $_SESSION = [];

    // Hapus cookie session dari browser user
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logout berhasil']);
}

// ── ACTION TIDAK DIKENAL ─────────────────────────────────────
else {
    echo json_encode(['success' => false, 'message' => 'Action tidak valid']);
}
?>