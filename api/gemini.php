<?php
// Salin file ini menjadi app.php lalu isi API key asli
// Dapatkan Gemini API key GRATIS di: https://aistudio.google.com/app/apikey
// JANGAN isi file ini dengan key asli — file ini diupload ke GitHub

define('GEMINI_API_KEY', 'ISI_API_KEY_GEMINI_KAMU');
define('GEMINI_MODEL',   'gemini-1.5-flash');
define('GEMINI_API_URL',
    'https://generativelanguage.googleapis.com/v1beta/models/'
    . GEMINI_MODEL
    . ':generateContent?key='
    . GEMINI_API_KEY
);
?>