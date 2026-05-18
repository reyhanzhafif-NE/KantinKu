<?php
/**
 * config/env-loader.php
 * 
 * Membaca file .env dari root project dan set ke environment variable
 * atau define sebagai constant untuk digunakan di seluruh aplikasi.
 * 
 * CATATAN: File ini harus di-require di awal aplikasi sebelum menggunakan konstanta.
 */

$envFile = __DIR__ . '/../.env';

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        // Skip comment lines
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse KEY=VALUE format
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Hapus quotes kalau ada
            $value = trim($value, '\'"');
            
            // Set ke environment variable
            putenv("$key=$value");
            $_ENV[$key] = $value;
            
            // Optional: define sebagai constant jika belum ada
            if (!defined($key)) {
                define($key, $value);
            }
        }
    }
}
?>
