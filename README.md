# KantinKu Pro 🏪

Aplikasi manajemen uang saku siswa SMK berbasis web.
Dibangun dengan PHP, MySQL, HTML, Tailwind CSS, dan JavaScript.

## Fitur
- ✅ Sistem login & register multi-user
- ✅ Catat pemasukan dan pengeluaran
- ✅ AI Financial Plan (50/30/20)
- ✅ AI Kategorisasi otomatis transaksi
- ✅ Riwayat transaksi dengan filter
- ✅ Halaman profil user

## Cara Install di Lokal

### Persyaratan
- XAMPP (PHP 8.0+, MySQL)
- Browser modern

### Langkah-langkah

1. Clone repository ini
   git clone git@github.com:usernamekamu/kantinku-pro.git

2. Salin file konfigurasi database
   cp config/db.example.php config/db.php

3. Edit config/db.php — isi dengan kredensial database kamu

4. Import database
   - Buka phpMyAdmin
   - Buat database baru bernama kantinkupro
   - Import file database/kantinkupro.sql

5. Jalankan di browser
   http://localhost/kantinku-pro/

## Struktur Folder

kantinku-pro/
├── api/                 # PHP API endpoints
│   ├── auth.php         # Login, register, session
│   ├── transaksi.php    # CRUD transaksi
│   └── profil.php       # Update profil user
├── config/
│   ├── db.php           # Konfigurasi database (tidak diupload)
│   └── db.example.php   # Contoh konfigurasi
├── database/
│   └── kantinkupro.sql  # Schema database
├── index.html           # Dashboard utama
├── login.html           # Halaman login
├── register.html        # Halaman register
└── profil.html          # Halaman profil