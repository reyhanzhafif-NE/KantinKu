<?php
// ============================================================
// api/transaksi.php — CRUD Transaksi Keuangan
// ============================================================
// GET    → Ambil semua transaksi milik user yang login
// POST   → Simpan transaksi baru
// DELETE → Hapus satu transaksi

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';

// ── GUARD: Wajib login ──────────────────────────────────────
// Kalau belum login (tidak ada session), tolak semua request
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized. Silakan login terlebih dahulu.'
    ]);
    exit;
}

// Ambil user_id dari session — JANGAN ambil dari request frontend
// karena user bisa memanipulasi data yang dikirim dari browser
$user_id = (int) $_SESSION['user_id'];
$method  = $_SERVER['REQUEST_METHOD'];

// ── GET: Ambil semua transaksi ──────────────────────────────
if ($method === 'GET') {

    // Ambil parameter filter opsional dari URL
    // Contoh: api/transaksi.php?filter=income
    $filter = $_GET['filter'] ?? 'all';

    if ($filter === 'income' || $filter === 'expense') {
        // Ambil transaksi berdasarkan jenis
        $stmt = $pdo->prepare(
            "SELECT id, jenis, jumlah, keterangan, waktu
             FROM transaksi
             WHERE user_id = ? AND jenis = ?
             ORDER BY waktu DESC"
        );
        $stmt->execute([$user_id, $filter]);
    } else {
        // Ambil semua transaksi
        $stmt = $pdo->prepare(
            "SELECT id, jenis, jumlah, keterangan, waktu
             FROM transaksi
             WHERE user_id = ?
             ORDER BY waktu DESC"
        );
        $stmt->execute([$user_id]);
    }

    $transaksi = $stmt->fetchAll();

    // Hitung ringkasan (total income, expense, saldo)
    $stmtSum = $pdo->prepare(
        "SELECT
            SUM(CASE WHEN jenis = 'income'  THEN jumlah ELSE 0 END) AS total_income,
            SUM(CASE WHEN jenis = 'expense' THEN jumlah ELSE 0 END) AS total_expense
         FROM transaksi
         WHERE user_id = ?"
    );
    $stmtSum->execute([$user_id]);
    $summary = $stmtSum->fetch();

    echo json_encode([
        'success'  => true,
        'data'     => $transaksi,
        'summary'  => [
            'total_income'  => (int) ($summary['total_income']  ?? 0),
            'total_expense' => (int) ($summary['total_expense'] ?? 0),
            'saldo'         => (int) (($summary['total_income'] ?? 0) - ($summary['total_expense'] ?? 0)),
        ]
    ]);
}

// ── POST: Simpan transaksi baru ─────────────────────────────
elseif ($method === 'POST') {

    // Baca body JSON yang dikirim dari script.js
    $body       = json_decode(file_get_contents('php://input'), true);
    $jenis      = trim($body['jenis']      ?? '');
    $jumlah     = (int) ($body['jumlah']   ?? 0);
    $keterangan = trim($body['keterangan'] ?? '');

    // Validasi jenis hanya boleh 'income' atau 'expense'
    if (!in_array($jenis, ['income', 'expense'])) {
        echo json_encode(['success' => false, 'message' => 'Jenis transaksi tidak valid!']);
        exit;
    }

    // Validasi jumlah harus angka positif
    if ($jumlah <= 0) {
        echo json_encode(['success' => false, 'message' => 'Jumlah harus lebih dari 0!']);
        exit;
    }

    // Validasi keterangan tidak boleh kosong
    if (empty($keterangan)) {
        echo json_encode(['success' => false, 'message' => 'Keterangan tidak boleh kosong!']);
        exit;
    }

    // Simpan ke database
    $stmt = $pdo->prepare(
        "INSERT INTO transaksi (user_id, jenis, jumlah, keterangan, waktu)
         VALUES (?, ?, ?, ?, NOW())"
    );
    $stmt->execute([$user_id, $jenis, $jumlah, $keterangan]);

    $newId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'id'      => $newId,
        'message' => 'Transaksi berhasil disimpan'
    ]);
}
// ── DELETE: Hapus transaksi ─────────────────────────────────
elseif ($method === 'DELETE') {

    $body       = json_decode(file_get_contents('php://input'), true);
    $hapusSemua = $body['hapus_semua'] ?? false;

    if ($hapusSemua) {
        // Hapus SEMUA transaksi milik user ini
        $stmt = $pdo->prepare("DELETE FROM transaksi WHERE user_id = ?");
        $stmt->execute([$user_id]);
        echo json_encode(['success' => true, 'message' => 'Semua transaksi dihapus']);

    } else {
        // Hapus satu transaksi berdasarkan ID
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'ID tidak valid!']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM transaksi WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user_id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Transaksi dihapus']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Transaksi tidak ditemukan']);
        }
    }
}

// ── Method tidak diizinkan ───────────────────────────────────
else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method tidak diizinkan']);
}
?>