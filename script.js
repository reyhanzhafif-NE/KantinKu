/* ============================================================
   KantinKu — script.js
   Versi 3.0 — Fix semua: riwayat tampil, AI kategorisasi, mini chat
   ============================================================ */

// ============================================================
// 1. STATE
// ============================================================
let state = {
  history:      [],
  activeFilter: 'all',
  isLoading:    false,
};

// ============================================================
// 2. UTILITAS
// ============================================================
const formatIDR = (num) => new Intl.NumberFormat('id-ID').format(Math.abs(num || 0));
const parseIDR  = (str) => parseInt(String(str).replace(/\D/g, '')) || 0;

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
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function setLoading(show) {
  state.isLoading = show;
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toastNotif');
  if (!toast) return;
  toast.textContent = message;
  toast.className   = `toast-notif show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ============================================================
// 3. AUTH GUARD
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
      window.location.href = 'login.html';
      return false;
    }
    const namaEl = document.getElementById('namaUser');
    if (namaEl) namaEl.textContent = data.nama;
    return true;
  } catch (err) {
    console.error('Gagal cek session:', err);
    showToast('Tidak dapat terhubung ke server!', 'error');
    return false;
  }
}

// ============================================================
// 4. API CALLS
// ============================================================
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

async function kirimTransaksi(jenis, jumlah, keterangan, kategori = '') {
  try {
    const res  = await fetch('api/transaksi.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jenis, jumlah, keterangan, kategori }),
    });
    const data = await res.json();
    return data.success;
  } catch (err) {
    showToast('Gagal menyimpan transaksi!', 'error');
    return false;
  }
}

async function hapusTransaksi(id) {
  try {
    const res  = await fetch('api/transaksi.php', {
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

async function logout() {
  if (!confirm('Yakin ingin keluar?')) return;
  try {
    await fetch('api/auth.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'action=logout'
    });
  } catch (e) {}
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
  updateSummaryStrip(totalIncome, totalExpense, saldo);
  renderTransaksiList();
}

function updateSaldo(saldo, totalIncome, totalExpense) {
  const balanceEl = document.getElementById('balanceDisplay');
  const allowEl   = document.getElementById('allowanceDisplay');
  const usedEl    = document.getElementById('totalUsedDisplay');
  if (balanceEl) balanceEl.innerText = `Rp ${formatIDR(Math.max(0, saldo))}`;
  if (allowEl)   allowEl.innerText   = `Rp ${formatIDR(totalIncome)}`;
  if (usedEl)    usedEl.innerText    = `Rp ${formatIDR(totalExpense)}`;
}

function updateProgressBar(totalExpense, totalIncome) {
  const pct = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;
  const bar  = document.getElementById('progressBar');
  const pctEl = document.getElementById('percentText');

  if (bar) {
    bar.style.width           = `${pct}%`;
    bar.style.backgroundColor = pct > 85 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#2CC295';
  }
  if (pctEl) pctEl.innerText = `${Math.round(pct)}%`;
}

function updateSummaryStrip(totalIncome, totalExpense, saldo) {
  const incEl = document.getElementById('summaryIncome');
  const expEl = document.getElementById('summaryExpense');
  const netEl = document.getElementById('summaryNet');

  if (incEl) incEl.innerText = `Rp ${formatIDR(totalIncome)}`;
  if (expEl) expEl.innerText = `Rp ${formatIDR(totalExpense)}`;
  if (netEl) {
    netEl.innerText   = `${saldo < 0 ? '-' : ''}Rp ${formatIDR(saldo)}`;
    netEl.className   = `text-sm font-extrabold ${saldo < 0 ? 'text-red-500' : 'text-slate-700'}`;
  }
}

function renderTransaksiList() {
  const container = document.getElementById('jajanListContainer');
  const totalEl   = document.getElementById('totalTransaksi');
  if (!container) return;

  // Filter berdasarkan tab aktif
  const filtered = state.activeFilter === 'all'
    ? state.history
    : state.history.filter(tx => tx.jenis === state.activeFilter);

  if (totalEl) totalEl.innerText = state.history.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem 0;">
        <div style="font-size:3rem;opacity:0.3;margin-bottom:12px;">📭</div>
        <p style="font-weight:600;color:#94a3b8;font-size:14px;">Belum ada transaksi</p>
        <p style="color:#cbd5e1;font-size:12px;margin-top:4px;">
          ${state.activeFilter !== 'all' ? 'Coba filter "Semua"' : 'Yuk mulai catat keuanganmu!'}
        </p>
      </div>`;
    return;
  }

  // Badge kategori
  const badgeStyle = {
    'Kebutuhan': 'background:rgba(3,98,76,0.12);color:#03624C;',
    'Keinginan': 'background:rgba(249,115,22,0.12);color:#c2410c;',
    'Tabungan':  'background:rgba(59,130,246,0.12);color:#1d4ed8;',
  };
  const badgeIcon = { 'Kebutuhan': '🍱', 'Keinginan': '🎮', 'Tabungan': '🐷' };

  container.innerHTML = filtered.map((tx, i) => {
    const isIncome   = tx.jenis === 'income';
    const colorClass = isIncome ? 'color:#2CC295;' : 'color:#ef4444;';
    const bgStyle    = isIncome
      ? 'background:#f0fdf4;border-color:#bbf7d0;'
      : 'background:#f8fafc;border-color:transparent;';
    const symbol     = isIncome ? '+' : '−';
    const icon       = isIncome ? '💰' : '💸';

    // Format waktu dari MySQL
    const waktu = new Date(tx.waktu).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    // Badge AI kategori (hanya untuk expense)
    const badgeHTML = (tx.kategori && tx.jenis === 'expense' && badgeStyle[tx.kategori])
      ? `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;${badgeStyle[tx.kategori]}">${badgeIcon[tx.kategori]} ${tx.kategori}</span>`
      : '';

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;${bgStyle}border:1px solid;border-radius:16px;transition:all 0.2s;animation:fadeIn 0.3s ease-out;animation-delay:${i * 30}ms;animation-fill-mode:both;"
           onmouseover="this.style.borderColor='rgba(44,194,149,0.3)';this.style.background='white';"
           onmouseout="this.style.borderColor='${isIncome ? '#bbf7d0' : 'transparent'}';this.style.background='${isIncome ? '#f0fdf4' : '#f8fafc'}';">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;background:white;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 1px 4px rgba(0,0,0,0.08);flex-shrink:0;">
            ${icon}
          </div>
          <div>
            <p style="font-weight:700;color:#1e293b;font-size:13px;margin:0;">${escapeHTML(tx.keterangan || 'Tanpa keterangan')}</p>
            <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
              <p style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin:0;">🕒 ${waktu}</p>
              ${badgeHTML}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <p style="font-weight:700;font-size:13px;white-space:nowrap;${colorClass}">${symbol} Rp ${formatIDR(tx.jumlah)}</p>
          <button
            onclick="deleteTransaksi(${tx.id})"
            style="width:26px;height:26px;border-radius:50%;border:none;background:rgba(239,68,68,0.1);color:#ef4444;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;opacity:0;transition:all 0.2s;flex-shrink:0;"
            onmouseover="this.style.opacity='1';this.style.background='rgba(239,68,68,0.2)';"
            onmouseout="this.style.opacity='0';"
            title="Hapus">×</button>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// 6. FUNGSI AKSI
// ============================================================
function toggleTopUpInput() {
  const el = document.getElementById('topUpContainer');
  if (!el) return;
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) {
    document.getElementById('topUpAmountInput')?.focus();
  }
}

async function setAllowance() {
  const jumlah = parseIDR(document.getElementById('topUpAmountInput')?.value || '');
  if (!jumlah) return;

  const btn = document.querySelector('#topUpContainer button');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  const berhasil = await kirimTransaksi('income', jumlah, 'Pemasukan Uang Saku');
  if (berhasil) {
    document.getElementById('topUpAmountInput').value = '';
    toggleTopUpInput();
    await fetchTransaksi();
    showToast('✅ Uang saku berhasil ditambahkan!');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Selesai'; }
}

async function saveExpense() {
  const nama   = document.getElementById('jajanNameInput')?.value.trim();
  const jumlah = parseIDR(document.getElementById('jajanPriceInput')?.value || '');

  if (!nama || !jumlah) {
    if (!nama)   highlightError('jajanNameInput');
    if (!jumlah) highlightError('jajanPriceInput');
    return;
  }

  const btn = document.getElementById('btnSimpan');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 AI menganalisa...'; }

  // Langkah 1: Minta Gemini kategorikan transaksi
  let kategori = '';
  let alasan   = '';
  try {
    const resKat  = await fetch('api/gemini.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode: 'kategorisasi', keterangan: nama, jumlah }),
    });
    const dataKat = await resKat.json();
    if (dataKat.success) {
      kategori = dataKat.kategori;
      alasan   = dataKat.alasan;
    }
  } catch(e) {
    console.warn('Kategorisasi gagal, lanjut tanpa kategori:', e);
  }

  // Langkah 2: Simpan ke database
  const berhasil = await kirimTransaksi('expense', jumlah, nama, kategori);

  if (berhasil) {
    document.getElementById('jajanNameInput').value  = '';
    document.getElementById('jajanPriceInput').value = '';
    await fetchTransaksi();

    if (kategori && kategori !== 'Tidak Dikategorikan') {
      showToast(`✅ ${kategori} — ${alasan}`);
    } else {
      showToast('✅ Pengeluaran berhasil dicatat!');
    }
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
  if (!el) return;
  el.style.borderColor = '#ef4444';
  el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.15)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  }, 1500);
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
// 7. MINI CHATBOT KIKU AI
// ============================================================
let miniRiwayat = [];
let miniLoading = false;

function miniRenderBubble(teks, role) {
  const container = document.getElementById('miniChatMessages');
  if (!container) return;

  const isAI = role === 'ai';
  const wrap  = document.createElement('div');
  wrap.style.cssText = `
    display:flex;gap:8px;align-items:flex-end;
    animation:fadeIn 0.3s ease-out;
    ${isAI ? '' : 'flex-direction:row-reverse;'}
  `;

  const avatar = document.createElement('div');
  avatar.style.cssText = `
    width:28px;height:28px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:13px;flex-shrink:0;
    ${isAI
      ? 'background:linear-gradient(135deg,#03624C,#2CC295);'
      : 'background:#e2e8f0;'}
  `;
  avatar.textContent = isAI ? '🤖' : '👤';

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    max-width:78%;padding:8px 12px;font-size:12px;
    line-height:1.6;border-radius:14px;word-break:break-word;
    font-family:'Plus Jakarta Sans',sans-serif;
    ${isAI
      ? 'background:white;color:#1e293b;border-bottom-left-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.08);'
      : 'background:#03624C;color:white;border-bottom-right-radius:3px;'}
  `;

  bubble.innerHTML = isAI
    ? escapeHTML(teks)
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#03624C">$1</strong>')
        .replace(/\n/g, '<br>')
    : escapeHTML(teks);

  if (isAI) { wrap.appendChild(avatar); wrap.appendChild(bubble); }
  else       { wrap.appendChild(bubble); wrap.appendChild(avatar); }

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function miniTampilTyping() {
  const container = document.getElementById('miniChatMessages');
  if (!container) return;
  const wrap = document.createElement('div');
  wrap.id = 'miniTyping';
  wrap.style.cssText = 'display:flex;gap:8px;align-items:flex-end;';
  wrap.innerHTML = `
    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#03624C,#2CC295);display:flex;align-items:center;justify-content:center;font-size:13px;">🤖</div>
    <div style="background:white;padding:10px 14px;border-radius:14px;border-bottom-left-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.08);display:flex;gap:5px;align-items:center;">
      <div style="width:6px;height:6px;background:#94a3b8;border-radius:50%;animation:typing 1.2s infinite;"></div>
      <div style="width:6px;height:6px;background:#94a3b8;border-radius:50%;animation:typing 1.2s 0.2s infinite;"></div>
      <div style="width:6px;height:6px;background:#94a3b8;border-radius:50%;animation:typing 1.2s 0.4s infinite;"></div>
    </div>
    <style>
      @keyframes typing{0%,60%,100%{transform:translateY(0);opacity:.4;}30%{transform:translateY(-5px);opacity:1;}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    </style>
  `;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

async function kirimMiniChat() {
  if (miniLoading) return;
  const input = document.getElementById('miniChatInput');
  const btn   = document.getElementById('btnMiniKirim');
  const pesan = input?.value.trim();
  if (!pesan) return;

  miniRenderBubble(pesan, 'user');
  input.value = '';
  miniLoading = true;
  if (btn) btn.disabled = true;
  miniTampilTyping();

  try {
    const res  = await fetch('api/gemini.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode: 'chat', pesan, riwayat: miniRiwayat }),
    });
    const data = await res.json();
    document.getElementById('miniTyping')?.remove();

    if (data.success) {
      miniRenderBubble(data.balasan, 'ai');
      miniRiwayat.push({ role: 'user',  text: pesan });
      miniRiwayat.push({ role: 'model', text: data.balasan });
      if (miniRiwayat.length > 10) miniRiwayat = miniRiwayat.slice(-10);
    } else {
      miniRenderBubble(`Maaf ada gangguan: ${data.message || 'coba lagi'}`, 'ai');
    }
  } catch(e) {
    document.getElementById('miniTyping')?.remove();
    miniRenderBubble('Koneksi bermasalah, coba lagi!', 'ai');
    console.error('Mini chat error:', e);
  }

  miniLoading = false;
  if (btn) btn.disabled = false;
  input?.focus();
}

// ============================================================
// 8. INISIALISASI
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {

  // Tampilkan tanggal
  const dateEl = document.getElementById('displayDate');
  if (dateEl) {
    dateEl.innerText = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  // Setup auto-format input rupiah
  setupAutoFormat('topUpAmountInput');
  setupAutoFormat('jajanPriceInput');

  // Setup enter key shortcut
  setupEnterKey();

  // Cek login — kalau belum login, redirect ke login.html
  const sudahLogin = await cekLogin();
  if (!sudahLogin) return;

  // Ambil data transaksi dari database
  await fetchTransaksi();

  // Pesan sambutan Kiku setelah data load
  setTimeout(() => {
    miniRenderBubble('Halo! Aku Kiku 👋 Ada yang bisa aku bantu soal keuanganmu hari ini?', 'ai');
  }, 1000);
});