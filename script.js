/* ============================================================
   KantinKu Pro — script.js
   Versi 2.0 — Terhubung ke PHP Backend & MySQL

   PERUBAHAN DARI v1:
   - localStorage diganti dengan fetch() ke api/transaksi.php
   - Ditambahkan auth guard (redirect ke login kalau belum login)
   - Ditambahkan nama user di header
   - Tombol logout
   ============================================================ */


// ============================================================
// 1. STATE
// ============================================================
let state = {
  history:      [],     // Diisi dari database via API
  activeFilter: 'all',  // 'all' | 'income' | 'expense'
  isLoading:    false,
};


// ============================================================
// 2. UTILITAS
// ============================================================

const formatIDR  = (num) => new Intl.NumberFormat('id-ID').format(Math.abs(num || 0));
const parseIDR   = (str) => parseInt(String(str).replace(/\D/g, '')) || 0;

function setupAutoFormat(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.addEventListener('input', function () {
    const digits = this.value.replace(/\D/g, '');
    this.value   = digits ? parseInt(digits).toLocaleString('id-ID') : '';
  });
}

function hitungTotals() {
  let totalIncome = 0, totalExpense = 0;
  state.history.forEach(tx => {
    if (tx.jenis === 'income')  totalIncome  += parseInt(tx.jumlah);
    if (tx.jenis === 'expense') totalExpense += parseInt(tx.jumlah);
  });
  return { totalIncome, totalExpense, saldo: totalIncome - totalExpense };
}

function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// Tampilkan/sembunyikan loading overlay
function setLoading(show) {
  state.isLoading = show;
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

// Tampilkan toast notifikasi
let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toastNotif');
  if (!toast) return;

  toast.textContent  = message;
  toast.className    = `toast-notif show ${type}`;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}


// ============================================================
// 3. AUTH GUARD — Cek apakah user sudah login
// ============================================================
async function cekLogin() {
  try {
    const res  = await fetch('api/auth.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'action=cek_session'
    });
    const data = await res.json();

    if (!data.logged_in) {
      // Belum login → paksa ke halaman login
      window.location.href = 'login.html';
      return false;
    }

    // Tampilkan nama user di header
    const namaEl = document.getElementById('namaUser');
    if (namaEl) namaEl.textContent = data.nama;

    return true;

  } catch (err) {
    // Kalau server tidak jalan, tampilkan pesan
    console.error('Gagal cek session:', err);
    showToast('Tidak dapat terhubung ke server!', 'error');
    return false;
  }
}


// ============================================================
// 4. API CALLS — Komunikasi dengan PHP
// ============================================================

/** Ambil semua transaksi dari database */
async function fetchTransaksi() {
  setLoading(true);
  try {
    const res  = await fetch('api/transaksi.php');
    const data = await res.json();

    if (data.success) {
      state.history = data.data;
      renderUI();
    } else {
      showToast('Gagal memuat data transaksi.', 'error');
    }
  } catch (err) {
    showToast('Koneksi ke server gagal!', 'error');
  } finally {
    setLoading(false);
  }
}

/** Kirim transaksi baru ke database */
async function kirimTransaksi(jenis, jumlah, keterangan) {
  try {
    const res = await fetch('api/transaksi.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jenis, jumlah, keterangan }),
    });
    const data = await res.json();
    return data.success;
  } catch (err) {
    showToast('Gagal menyimpan transaksi!', 'error');
    return false;
  }
}

/** Hapus transaksi dari database */
async function hapusTransaksi(id) {
  try {
    const res = await fetch('api/transaksi.php', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    });
    const data = await res.json();
    return data.success;
  } catch (err) {
    showToast('Gagal menghapus transaksi!', 'error');
    return false;
  }
}

/** Logout */
async function logout() {
  if (!confirm('Yakin ingin keluar?')) return;
  try {
    await fetch('api/auth.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'action=logout'
    });
  } catch (e) { /* abaikan error */ }
  localStorage.removeItem('kantinkupro_user');
  window.location.href = 'login.html';
}


// ============================================================
// 5. RENDER UI
// ============================================================
function renderUI() {
  const { totalIncome, totalExpense, saldo } = hitungTotals();
  updateSaldo(saldo, totalIncome, totalExpense);
  updateProgressBar(totalExpense, totalIncome);
  updateAIPlan(totalIncome);
  updateSummaryStrip(totalIncome, totalExpense, saldo);
  renderTransaksiList();
}

function updateSaldo(saldo, totalIncome, totalExpense) {
  document.getElementById('balanceDisplay').innerText   = `Rp ${formatIDR(Math.max(0, saldo))}`;
  document.getElementById('allowanceDisplay').innerText = `Rp ${formatIDR(totalIncome)}`;
  document.getElementById('totalUsedDisplay').innerText = `Rp ${formatIDR(totalExpense)}`;
}

function updateProgressBar(totalExpense, totalIncome) {
  const pct = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;
  const bar  = document.getElementById('progressBar');
  bar.style.width           = `${pct}%`;
  bar.style.backgroundColor = pct > 85 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#2CC295';
  document.getElementById('percentText').innerText = `${Math.round(pct)}%`;

  const aiEl  = document.getElementById('aiResponse');
  const saldo = hitungTotals().saldo;
  if (totalIncome === 0)  aiEl.innerText = 'Masukkan uang saku untuk melihat rencana alokasi.';
  else if (saldo < 0)     aiEl.innerText = '🚨 Bahaya! Pengeluaranmu sudah melebihi uang saku. Segera evaluasi!';
  else if (pct > 85)      aiEl.innerText = `⚠️ Saldo hampir habis! Sisa Rp ${formatIDR(saldo)}. Tahan pengeluaran.`;
  else if (pct > 50)      aiEl.innerText = `💡 Sudah lebih setengah terpakai. Pastikan tabungan Rp ${formatIDR(totalIncome * 0.2)} aman.`;
  else                    aiEl.innerText = `✅ Keuangan aman! Jangan lupa tabung Rp ${formatIDR(totalIncome * 0.2)}.`;
}

function updateAIPlan(totalIncome) {
  document.getElementById('allocNeeds').innerText   = `Rp ${formatIDR(totalIncome * 0.5)}`;
  document.getElementById('allocWants').innerText   = `Rp ${formatIDR(totalIncome * 0.3)}`;
  document.getElementById('allocSavings').innerText = `Rp ${formatIDR(totalIncome * 0.2)}`;
}

function updateSummaryStrip(totalIncome, totalExpense, saldo) {
  document.getElementById('summaryIncome').innerText  = `Rp ${formatIDR(totalIncome)}`;
  document.getElementById('summaryExpense').innerText = `Rp ${formatIDR(totalExpense)}`;
  const netEl     = document.getElementById('summaryNet');
  netEl.innerText = `${saldo < 0 ? '-' : ''}Rp ${formatIDR(saldo)}`;
  netEl.className = `text-sm font-extrabold ${saldo < 0 ? 'text-red-500' : 'text-slate-700'}`;
}

function renderTransaksiList() {
  const container = document.getElementById('jajanListContainer');
  const totalEl   = document.getElementById('totalTransaksi');

  // Filter berdasarkan tab aktif
  // Perhatikan: field dari DB pakai 'jenis', bukan 'type'
  const filtered = state.activeFilter === 'all'
    ? state.history
    : state.history.filter(tx => tx.jenis === state.activeFilter);

  totalEl.innerText = state.history.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-20 text-slate-300">
        <div class="text-5xl mb-3 opacity-50">📭</div>
        <p class="font-semibold text-slate-400">Belum ada transaksi</p>
        <p class="text-xs text-slate-300 mt-1">
          ${state.activeFilter !== 'all' ? 'Coba filter "Semua"' : 'Yuk mulai catat keuanganmu!'}
        </p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map((tx, i) => {
    const isIncome   = tx.jenis === 'income';
    const colorClass = isIncome ? 'text-[#2CC295]' : 'text-red-500';
    const bgClass    = isIncome ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-transparent';
    const symbol     = isIncome ? '+' : '−';
    const icon       = isIncome ? '💰' : '💸';

    // Format waktu dari MySQL (format: "2025-01-15 14:30:00")
    const waktu = new Date(tx.waktu).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="flex justify-between items-center p-4 ${bgClass} rounded-2xl border hover:border-[#2CC295]/30 hover:bg-white transition-all duration-200 animate-fadeIn group"
           style="animation-delay: ${i * 40}ms">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg border border-slate-100 shrink-0">
            ${icon}
          </div>
          <div>
            <p class="font-bold text-slate-800 text-sm">${escapeHTML(tx.keterangan || 'Tanpa keterangan')}</p>
            <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">🕒 ${waktu}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <p class="font-bold ${colorClass} tracking-tight">${symbol} Rp ${formatIDR(tx.jumlah)}</p>
          <button
            onclick="deleteTransaksi(${tx.id})"
            class="w-7 h-7 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 text-sm font-bold flex items-center justify-center"
            title="Hapus">
            ×
          </button>
        </div>
      </div>`;
  }).join('');
}


// ============================================================
// 6. FUNGSI AKSI
// ============================================================

function toggleTopUpInput() {
  const el = document.getElementById('topUpContainer');
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) {
    document.getElementById('topUpAmountInput').focus();
  }
}

async function setAllowance() {
  const jumlah = parseIDR(document.getElementById('topUpAmountInput').value);
  if (!jumlah) return;

  const btn = document.querySelector('#topUpContainer button');
  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';

  // Kirim ke database sebagai transaksi income
  const berhasil = await kirimTransaksi('income', jumlah, 'Pemasukan Uang Saku');

  if (berhasil) {
    document.getElementById('topUpAmountInput').value = '';
    toggleTopUpInput();
    await fetchTransaksi(); // Reload data dari DB
    showToast('Uang saku berhasil ditambahkan!');
  }

  btn.disabled    = false;
  btn.textContent = 'Selesai';
}

async function saveExpense() {
  const nama   = document.getElementById('jajanNameInput').value.trim();
  const jumlah = parseIDR(document.getElementById('jajanPriceInput').value);

  if (!nama || !jumlah) {
    if (!nama)   highlightError('jajanNameInput');
    if (!jumlah) highlightError('jajanPriceInput');
    return;
  }

  const btn = document.getElementById('btnSimpan');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  // Kirim ke database sebagai transaksi expense
  const berhasil = await kirimTransaksi('expense', jumlah, nama);

  if (berhasil) {
    document.getElementById('jajanNameInput').value  = '';
    document.getElementById('jajanPriceInput').value = '';
    await fetchTransaksi(); // Reload data dari DB
    showToast('Pengeluaran berhasil dicatat!');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Simpan Catatan'; }
}

async function deleteTransaksi(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  const berhasil = await hapusTransaksi(id);
  if (berhasil) {
    await fetchTransaksi();
    showToast('Transaksi dihapus.');
  }
}

function setFilter(filter) {
  state.activeFilter = filter;
  ['all', 'income', 'expense'].forEach(f => {
    const btn = document.getElementById(`filter-${f}`);
    if (!btn) return;
    if (f === filter) {
      btn.classList.add('active-tab');
      btn.classList.remove('text-slate-500');
    } else {
      btn.classList.remove('active-tab');
      btn.classList.add('text-slate-500');
    }
  });
  renderTransaksiList();
}

function highlightError(id) {
  const el = document.getElementById(id);
  el?.classList.add('ring-2', 'ring-red-400');
  setTimeout(() => el?.classList.remove('ring-2', 'ring-red-400'), 1500);
}

function setupEnterKey() {
  document.getElementById('jajanNameInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveExpense();
  });
  document.getElementById('jajanPriceInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveExpense();
  });
  document.getElementById('topUpAmountInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') setAllowance();
  });
}


// ============================================================
// 7. INISIALISASI
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {

  // Tampilkan tanggal
  document.getElementById('displayDate').innerText = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Setup format rupiah otomatis
  setupAutoFormat('topUpAmountInput');
  setupAutoFormat('jajanPriceInput');

  // Setup enter key
  setupEnterKey();

  // Cek login — kalau belum login, redirect ke login.html
  const sudahLogin = await cekLogin();
  if (!sudahLogin) return;

  // Ambil data transaksi dari database
  await fetchTransaksi();
});

// ============================================================
// MINI CHATBOT KIKU AI — untuk sidebar dashboard
// ============================================================

let miniRiwayat  = [];
let miniLoading  = false;

function miniTampilPesan(teks, role) {
  const container = document.getElementById('miniChatMessages');
  if (!container) return;

  const isAI    = role === 'ai';
  const div     = document.createElement('div');
  div.style.cssText = `
    display:flex; gap:8px; align-items:flex-end;
    ${isAI ? '' : 'flex-direction:row-reverse;'}
    animation: fadeIn 0.3s ease-out;
  `;

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    max-width:80%; padding:8px 12px; font-size:12px;
    line-height:1.5; border-radius:12px;
    ${isAI
      ? 'background:white;color:#1e293b;border-bottom-left-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.08);'
      : 'background:#03624C;color:white;border-bottom-right-radius:3px;'
    }
  `;

  bubble.innerHTML = isAI
    ? teks.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')
    : escapeHTML(teks);

  const avatar = document.createElement('div');
  avatar.style.cssText = `
    width:26px;height:26px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;
    ${isAI ? 'background:linear-gradient(135deg,#03624C,#2CC295);' : 'background:#e2e8f0;'}
  `;
  avatar.textContent = isAI ? '🤖' : '👤';

  if (isAI) { div.appendChild(avatar); div.appendChild(bubble); }
  else       { div.appendChild(bubble); div.appendChild(avatar); }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function miniTampilTyping() {
  const container = document.getElementById('miniChatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.id = 'miniTyping';
  div.style.cssText = 'display:flex;gap:8px;align-items:flex-end;';
  div.innerHTML = `
    <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#03624C,#2CC295);display:flex;align-items:center;justify-content:center;font-size:12px;">🤖</div>
    <div style="background:white;padding:10px 14px;border-radius:12px;border-bottom-left-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.08);display:flex;gap:4px;align-items:center;">
      <div style="width:6px;height:6px;background:#94a3b8;border-radius:50%;animation:typing 1.2s infinite;"></div>
      <div style="width:6px;height:6px;background:#94a3b8;border-radius:50%;animation:typing 1.2s 0.2s infinite;"></div>
      <div style="width:6px;height:6px;background:#94a3b8;border-radius:50%;animation:typing 1.2s 0.4s infinite;"></div>
    </div>
    <style>@keyframes typing{0%,60%,100%{transform:translateY(0);opacity:.4;}30%{transform:translateY(-5px);opacity:1;}}</style>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function kirimMiniChat() {
  if (miniLoading) return;
  const input = document.getElementById('miniChatInput');
  const btn   = document.getElementById('btnMiniKirim');
  const pesan = input?.value.trim();
  if (!pesan) return;

  miniTampilPesan(pesan, 'user');
  input.value = '';
  miniLoading = true;
  if (btn) btn.disabled = true;
  miniTampilTyping();

  try {
    const res  = await fetch('api/gemini.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode:'chat', pesan, riwayat: miniRiwayat }),
    });
    const data = await res.json();
    document.getElementById('miniTyping')?.remove();

    if (data.success) {
      miniTampilPesan(data.balasan, 'ai');
      miniRiwayat.push({ role:'user',  text: pesan });
      miniRiwayat.push({ role:'model', text: data.balasan });
      if (miniRiwayat.length > 10) miniRiwayat = miniRiwayat.slice(-10);
    } else {
      miniTampilPesan('Maaf, aku sedang gangguan 😔 Coba lagi ya!', 'ai');
    }
  } catch(e) {
    document.getElementById('miniTyping')?.remove();
    miniTampilPesan('Koneksi bermasalah, coba lagi!', 'ai');
  }

  miniLoading = false;
  if (btn) btn.disabled = false;
  input?.focus();
}

// Inisialisasi mini chat saat halaman load
document.addEventListener('DOMContentLoaded', () => {
  // Pesan sambutan mini chat muncul setelah data selesai dimuat
  setTimeout(() => {
    miniTampilPesan('Halo! Aku Kiku 👋 Ada yang bisa aku bantu soal keuanganmu?', 'ai');
  }, 1000);
});