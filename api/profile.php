<?php
// ============================================================
// api/profil.php — Update Profil & Ganti Password
// ============================================================

session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Belum login']);
    exit;
}

require_once '../config/db.php';

$user_id = (int) $_SESSION['user_id'];
$action  = trim($_POST['action'] ?? '');

// ── UPDATE NAMA ─────────────────────────────────────────────
if ($action === 'update_nama') {
    $nama = htmlspecialchars(trim($_POST['nama'] ?? ''), ENT_QUOTES, 'UTF-8');

    if (strlen($nama) < 2) {
        echo json_encode(['success' => false, 'message' => 'Nama terlalu pendek!']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE users SET nama = ? WHERE id = ?");
    $stmt->execute([$nama, $user_id]);

    // Update session supaya header langsung berubah tanpa logout
    $_SESSION['user_nama'] = $nama;

    echo json_encode(['success' => true, 'message' => 'Nama berhasil diperbarui!']);
}

// ── GANTI PASSWORD ───────────────────────────────────────────
elseif ($action === 'ganti_password') {
    $passLama = $_POST['password_lama'] ?? '';
    $passBaru = $_POST['password_baru'] ?? '';

    if (empty($passLama) || empty($passBaru)) {
        echo json_encode(['success' => false, 'message' => 'Semua field wajib diisi!']);
        exit;
    }

    if (strlen($passBaru) < 6) {
        echo json_encode(['success' => false, 'message' => 'Password baru minimal 6 karakter!']);
        exit;
    }

    // Ambil password hash lama dari database
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    // Verifikasi password lama dulu sebelum ganti
    if (!password_verify($passLama, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Password lama tidak sesuai!']);
        exit;
    }

    $newHash = password_hash($passBaru, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt    = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$newHash, $user_id]);

    echo json_encode(['success' => true, 'message' => 'Password berhasil diubah!']);
}

else {
    echo json_encode(['success' => false, 'message' => 'Action tidak valid']);
}
?>