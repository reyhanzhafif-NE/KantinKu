<?php
header('Content-Type: application/json');

// 1. Masukkan API Key kamu di sini
 
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;

// 2. Ambil pesan dari Frontend
$input = json_decode(file_get_contents('php://input'), true);
$userMessage = $input['message'] ?? 'Halo';

// 3. Instruksi khusus agar Kiku cerdas (Sesuai saran guru)
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

// 4. Kirim ke Google Gemini
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode(['success' => false, 'message' => 'Error koneksi: ' . $error]);
} else {
    $result = json_decode($response, true);
    $aiText = $result['candidates'][0]['content']['parts'][0]['text'] ?? 'Maaf, Kiku sedang bingung.';
    echo json_encode(['success' => true, 'reply' => $aiText]);
}
?>