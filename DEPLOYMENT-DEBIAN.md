# 📋 Panduan Deployment KantinKu di Server Debian

## ⚠️ Masalah yang Terjadi

Chatbot/Fitur AI tidak berfungsi di production karena:

1. **File `.env` tidak di-load** — Aplikasi tidak membaca API key dari file `.env`
2. **Variabel `$apiKey` tidak terdefinisi** — Di `api/gemini.php`, variabel digunakan tapi tidak pernah didefinisikan
3. **Konfigurasi hardcoded** — API key hardcoded di dalam kode (tidak aman untuk production)

## ✅ Solusi

Kami sudah memperbaiki dengan:

1. **Membuat `config/env-loader.php`** — File PHP yang membaca `.env` dan set environment variable
2. **Update `config/app.php`** — Menggunakan env-loader dan define konstanta dari `.env`
3. **Update `api/gemini.php`** — Require `config/app.php` dan validasi API key

## 🚀 Cara Deploy di Debian

### 1. SSH ke Server Debian

```bash
ssh user@your-server-ip
cd /var/www/html/kantinku  # atau path folder aplikasi kamu
```

### 2. Pastikan File `.env` Ada

File `.env` harus berada di root folder KantinKu:

```bash
ls -la .env
```

Jika tidak ada, buat file:

```bash
nano .env
```

Isi dengan:

```env
# Gemini AI Configuration
GEMINI_API_KEY=AIzaSyChppkMN8-xpIjCMwrFuBl5oC-nk1YMjpE
GEMINI_MODEL=gemini-1.5-flash

# Database Configuration (jika diperlukan)
# DB_HOST=localhost
# DB_NAME=kantinku
# DB_USER=root
# DB_PASS=
```

**Ganti `AIzaSyChppkMN8...` dengan API key Gemini kamu yang sebenarnya!**

### 3. Set Permission File `.env`

Pastikan file `.env` tidak bisa diakses publik:

```bash
chmod 600 .env
chmod 644 config/app.php
chmod 644 config/env-loader.php
chmod 755 api/
```

### 4. Set Permission Folder

```bash
chown -R www-data:www-data /var/www/html/kantinku
chmod -R 755 /var/www/html/kantinku
```

### 5. Test di Browser

Buka URL aplikasi kamu di browser dan coba gunakan chatbot/fitur AI. Jika error, lihat log error.

### 6. Debug Jika Ada Error

#### Check log PHP error:

```bash
tail -f /var/log/apache2/error.log
```

atau

```bash
tail -f /var/log/php-fpm.log
```

#### Test API secara langsung:

```bash
curl -X POST http://your-domain.com/api/gemini.php \
  -H "Content-Type: application/json" \
  -d '{"message": "Halo"}'
```

#### Check apakah `.env` terbaca:

```bash
php -r "require 'config/app.php'; echo 'GEMINI_API_KEY: ' . GEMINI_API_KEY;"
```

## 🔒 Keamanan

⚠️ **PENTING untuk Production:**

1. **Jangan push `.env` ke GitHub!** 
   - Pastikan `.env` ada di `.gitignore`
   - Kirim `.env` ke server melalui secure channel (SSH, SCP, atau upload manual)

2. **Proteksi akses ke `.env`**:
   ```bash
   # Dengan Apache
   echo "Deny from all" > .env.htaccess
   cat .env.htaccess >> .env
   ```

3. **Jangan expose API key di console atau log produksi**

4. **Update API key jika terlanjur ter-push ke GitHub publik**

## 🐛 Troubleshooting

### Error: "API Key tidak ditemukan"

- ✅ Cek apakah file `.env` ada: `cat .env`
- ✅ Cek apakah `GEMINI_API_KEY` sudah diisi nilai: `grep GEMINI_API_KEY .env`
- ✅ Restart Apache/PHP-FPM: `sudo systemctl restart apache2` atau `sudo systemctl restart php-fpm`

### Error: "cURL error"

- ✅ Pastikan server Debian bisa akses internet (test dengan `curl https://www.google.com`)
- ✅ Check firewall: `sudo ufw status`
- ✅ Pastikan port 443 terbuka untuk outbound HTTPS

### Chatbot tetap tidak bekerja

- ✅ Check log error Apache: `tail -f /var/log/apache2/error.log`
- ✅ Test API key dengan curl ke Gemini API secara langsung
- ✅ Pastikan PHP version >= 7.4

## 📞 Perlu Bantuan?

1. Check file-file yang sudah diperbaiki:
   - `config/env-loader.php` ← File baru
   - `config/app.php` ← File yang diupdate
   - `api/gemini.php` ← File yang diupdate
   - `.env` ← File yang di-update format

2. Test koneksi ke Gemini API: https://makersuite.google.com/app/apikey

3. Dokumentasi Gemini API: https://ai.google.dev/tutorials/python_quickstart

---

**Last Updated:** May 18, 2026
