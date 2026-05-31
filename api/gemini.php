<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

// Tangani preflight request dari CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load Gemini configuration
require_once '../config/app.php';

// Validasi API key tersedia
if (!defined('GEMINI_API_KEY') || GEMINI_API_KEY === 'NOT_SET') {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'API Key tidak ditemukan. Pastikan file .env ada dan GEMINI_API_KEY sudah diisi.'
    ]);
    exit;
}

// Ambil raw input
$rawInput = file_get_contents('php://input');

// Debug: catat request yang diterima (optional, untuk production bisa dihapus)
// error_log("Raw input: " . $rawInput);

// Parse JSON
$input = json_decode($rawInput, true);

// Validasi input
if (!$input) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Format JSON tidak valid'
    ]);
    exit;
}

if (!isset($input['message']) || empty(trim($input['message']))) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Pesan tidak ditemukan dalam request'
    ]);
    exit;
}

$userMessage = $input['message'];
$url = GEMINI_API_URL;

// Instruksi khusus agar Kiku cerdas
$systemPrompt = "Kamu adalah Kiku AI, asisten keuangan untuk siswa SMK di Indonesia. 
Tugasmu: 
1. Menentukan apakah suatu barang (seperti bensin, skin game, jajan) itu Kebutuhan atau Keinginan.
2. Memberikan saran hemat yang masuk akal untuk pelajar.
3. Gunakan bahasa yang ramah, santai (pake 'kamu'), dan ringkas. 
Jika ditanya tentang bensin, jelaskan itu kebutuhan untuk sekolah.";

// Format request sesuai Gemini API v1
$data = [
    "contents" => [
        [
            "parts" => [
                ["text" => $systemPrompt . "\n\nUser: " . $userMessage]
            ]
        ]
    ]
];

// Kirim ke Google Gemini
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Error handling - cURL error
if ($error) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Koneksi ke Gemini gagal: ' . $error
    ]);
    exit;
}

// Error handling - HTTP error
if ($httpCode !== 200) {
    http_response_code($httpCode);
    
    // Parse error response dari Gemini
    $errorData = json_decode($response, true);
    $errorMsg = isset($errorData['error']['message']) 
        ? $errorData['error']['message'] 
        : 'HTTP ' . $httpCode;
    
    echo json_encode([
        'success' => false,
        'message' => 'Gemini API error: ' . substr($errorMsg, 0, 150)
    ]);
    exit;
}

// Parse successful response
$result = json_decode($response, true);

if (!$result || !isset($result['candidates'][0]['content']['parts'][0]['text'])) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Respons Gemini tidak valid. Coba lagi nanti.'
    ]);
    exit;
}

$aiText = $result['candidates'][0]['content']['parts'][0]['text'];

// Response sukses
http_response_code(200);
echo json_encode([
    'success' => true, 
    'reply' => $aiText
]);
?>
