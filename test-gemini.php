<?php
/**
 * test-gemini.php
 * 
 * Script untuk test koneksi ke Gemini API
 * Jangan upload ke production!
 * 
 * Akses: http://localhost/kantinku/test-gemini.php
 */

// Load config
require_once 'config/app.php';

echo "<h2>Test Gemini API</h2>";
echo "<hr>";

// 1. Cek API Key
echo "<h3>1. Cek API Key</h3>";
if (defined('GEMINI_API_KEY') && GEMINI_API_KEY !== 'NOT_SET') {
    echo "✅ API Key ditemukan: <code>" . substr(GEMINI_API_KEY, 0, 20) . "...</code>";
} else {
    echo "❌ API Key TIDAK ditemukan!";
}
echo "<br><br>";

// 2. Cek File .env
echo "<h3>2. Cek File .env</h3>";
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    echo "✅ File .env ada";
    echo "<pre>" . file_get_contents($envFile) . "</pre>";
} else {
    echo "❌ File .env TIDAK ditemukan di: <code>$envFile</code>";
}
echo "<br><br>";

// 3. Test cURL
echo "<h3>3. Test cURL</h3>";
if (!extension_loaded('curl')) {
    echo "❌ Extension cURL tidak aktif!";
} else {
    echo "✅ cURL aktif";
}
echo "<br><br>";

// 4. Test koneksi ke Gemini API
echo "<h3>4. Test Koneksi ke Gemini API</h3>";

$url = GEMINI_API_URL;
$testData = [
    "contents" => [
        [
            "parts" => [
                ["text" => "Halo, siapa namamu?"]
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "❌ cURL Error: <code>$error</code>";
} else if ($httpCode === 200) {
    echo "✅ Koneksi berhasil! (HTTP 200)";
    echo "<pre>" . json_encode(json_decode($response, true), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
} else {
    echo "❌ HTTP Error $httpCode";
    echo "<pre>" . $response . "</pre>";
}

echo "<hr>";
echo "<p>Script ini hanya untuk debugging. Hapus file ini sebelum deploy ke production.</p>";
?>
