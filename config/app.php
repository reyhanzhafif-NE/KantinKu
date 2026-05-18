<?php
// config/app.php — Gemini AI Configuration
// 
// Load environment variable dari .env file
require_once __DIR__ . '/env-loader.php';

// Ambil API key dari environment variable
$geminiApiKey = getenv('GEMINI_API_KEY') ?: 'NOT_SET';
$geminiModel  = getenv('GEMINI_MODEL') ?: 'gemini-1.5-flash';

// Define constant untuk kemudahan akses di seluruh aplikasi
if (!defined('GEMINI_API_KEY')) {
    define('GEMINI_API_KEY', $geminiApiKey);
}
if (!defined('GEMINI_MODEL')) {
    define('GEMINI_MODEL', $geminiModel);
}
if (!defined('GEMINI_API_URL')) {
    define('GEMINI_API_URL',
        'https://generativelanguage.googleapis.com/v1beta/models/'
        . GEMINI_MODEL
        . ':generateContent?key='
        . GEMINI_API_KEY
    );
}
?>
