<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

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

$url = GEMINI_API_URL;

// Ambil pesan dari Frontend
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['message'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Pesan tidak ditemukan dalam request'
    ]);
    exit;
}

$userMessage = $input['message'];

// Instruksi khusus agar Kiku cerdas
$systemPrompt = "Kamu adalah Kiku AI, asisten keuangan untuk siswa SMK di Indonesia. 
Tugasmu: 
1. Menentukan apakah suatu barang (seperti bensin, skin game, jajan) itu Kebutuhan atau Keinginan.
2. Memberikan saran hemat yang masuk akal untuk pelajar.
3. Gunakan bahasa yang ramah, santai (pake 'kamu'), dan ringkas. 
Jika ditanya tentang bensin, jelaskan itu kebutuhan untuk sekolah.";

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
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Error handling
if ($error) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Error koneksi ke Gemini: ' . $error
    ]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'message' => 'Gemini API error (HTTP ' . $httpCode . '): ' . substr($response, 0, 200)
    ]);
    exit;
}

// Parse response
$result = json_decode($response, true);

if (!$result || !isset($result['candidates'][0]['content']['parts'][0]['text'])) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Respons Gemini tidak sesuai format. Coba lagi nanti.'
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