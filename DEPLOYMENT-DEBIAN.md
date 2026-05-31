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
cat > .env << 'EOF'
# Gemini AI Configuration
GEMINI_API_KEY=AIzaSyChppkMN8-xpIjCMwrFuBl5oC-nk1YMjpE
GEMINI_MODEL=gemini-pro
EOF
```

**⚠️ PENTING:**
- Ganti `AIzaSyChppkMN8...` dengan **API key Gemini kamu yang asli**
- Gunakan model `gemini-pro` (paling stable dan gratis)
- **Jangan gunakan** `gemini-1.5-flash` (mungkin error di v1 endpoint)

### 3. Pastikan File `config/app.php` Ada

File ini harus sudah ada dan berisi:

```bash
cat config/app.php
```

Jika tidak ada atau error, pastikan sudah update dari Git terbaru.

### 4. Set Permission File `.env`

Pastikan file `.env` tidak bisa diakses publik:

```bash
chmod 600 .env
chmod 644 config/app.php
chmod 644 config/env-loader.php
chmod 755 api/
```

### 5. Set Permission Folder

```bash
chown -R www-data:www-data /var/www/html/kantinku
chmod -R 755 /var/www/html/kantinku
```

### 6. Restart Apache/PHP

```bash
sudo systemctl restart apache2
# atau jika pakai Nginx:
sudo systemctl restart nginx
sudo systemctl restart php-fpm
```

### 7. Test di Browser

Buka URL aplikasi kamu di browser dan coba gunakan chatbot. Kirim pesan seperti "Apakah membeli buku itu kebutuhan?"

Seharusnya AI akan menjawab dengan analisis tentang kebutuhan vs keinginan.

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

### Error: "AI tidak menjawab apa-apa" atau "Jawaban selalu sama"

**Penyebab Umum:**
1. File `.env` tidak ada atau tidak di-load
2. API key tidak valid atau expired
3. Koneksi cURL ke Gemini API terputus
4. Response dari API tidak di-parse dengan benar

**Solusi:**

#### Step 1: Gunakan Test Script

Upload file `test-gemini.php` (jika belum ada) dan akses di browser:

```
http://your-domain.com/kantinku/test-gemini.php
```

Script ini akan menunjukkan:
- ✅ Apakah API Key ditemukan
- ✅ Apakah file .env ada
- ✅ Apakah cURL aktif
- ✅ Apakah koneksi ke Gemini API berhasil

#### Step 2: Check Log Error

```bash
# Lihat log Apache/Nginx error
tail -f /var/log/apache2/error.log
# atau
tail -f /var/log/nginx/error.log

# Lihat log PHP
tail -f /var/log/php-fpm.log
```

#### Step 3: Test API Secara Manual

```bash
# Test dengan curl
curl -X POST http://your-domain.com/kantinku/api/gemini.php \
  -H "Content-Type: application/json" \
  -d '{"message": "Halo, apa kabar?"}'

# Jika berhasil, akan muncul response JSON seperti:
# {"success":true,"reply":"Halo! Aku baik-baik saja..."}
```

#### Step 4: Verifikasi .env File

```bash
# Check apakah .env ada
ls -la .env

# Check isi .env
cat .env

# Pastikan GEMINI_API_KEY terisi, bukan empty atau NOT_SET
grep GEMINI_API_KEY .env
```

#### Step 5: Verifikasi File yang Sudah Diperbaiki

Pastikan file-file ini sudah di-update:
- ✅ `config/app.php` — Require env-loader.php
- ✅ `config/env-loader.php` — Membaca .env
- ✅ `api/gemini.php` — Request dengan header dan error handling
- ✅ `chat.html` — Fetch ke url yang benar (`api/gemini.php`)

#### Step 6: Test di Browser dengan Console

Buka browser, tekan F12, buka tab Console, lalu coba kirim pesan di chatbot.

Lihat Network tab untuk melihat response dari API:
1. Pilih request ke `api/gemini.php`
2. Lihat tab "Response"
3. Pastikan response adalah JSON dengan format:
   ```json
   {"success":true,"reply":"Jawaban dari AI..."}
   ```

### Error: "API Key tidak ditemukan"

```bash
# Cek apakah file .env ada
file .env

# Jika tidak ada, buat:
cat > .env << 'EOF'
GEMINI_API_KEY=YOUR_API_KEY_HERE
GEMINI_MODEL=gemini-1.5-flash
EOF

# Setel permission
chmod 600 .env
```

### Error: "HTTP 400 atau 401" dari Gemini API

Berarti API key **tidak valid atau sudah expired**:

1. Buka https://aistudio.google.com/app/apikey
2. Dapatkan API key baru
3. Update di file `.env`:
   ```bash
   nano .env
   # Edit GEMINI_API_KEY=VALUE_BARU
   ```
4. Restart Apache/PHP
5. Test lagi

### Error: "cURL error: Could not resolve host"

Berarti server **tidak bisa akses internet**:

```bash
# Test koneksi internet
ping google.com
curl https://www.google.com

# Jika tidak bisa, cek firewall
sudo ufw status
sudo ufw allow out 443  # Allow HTTPS outbound

# Jika pakai VPS dengan iptables
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
```

### Error: "JSON parse error"

Berarti response dari Gemini API tidak sesuai format:

1. Cek di test-gemini.php apakah Gemini API respond dengan benar
2. Jika respons berbeda, mungkin format API sudah berubah
3. Update parsing di `api/gemini.php` sesuai dokumentasi Gemini terbaru

---

## ✨ Tips Performa

### Jika Chatbot Lambat

1. **Tambah timeout** di `api/gemini.php`:
   ```php
   curl_setopt($ch, CURLOPT_TIMEOUT, 60);  // 60 detik
   ```

2. **Batasi jumlah pesan** di riwayat (sudah dilakukan di chat.html):
   ```javascript
   if (riwayat.length > 20) riwayat = riwayat.slice(-20);
   ```

3. **Gunakan cache** untuk pertanyaan yang sering ditanya
   - Implementasi di future version

---

## 🔒 Security Checklist

Sebelum production:

- [ ] File `.env` sudah di-add ke `.gitignore`
- [ ] File `test-gemini.php` sudah dihapus
- [ ] Permission `.env` adalah 600
- [ ] Permission folder adalah 755
- [ ] API key bukan key demo/test
- [ ] Log file disimpan dengan aman
- [ ] Database password tidak ada di GitHub



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
