/* ═══════════════════════════════════════════════
   SiPAM — app.js
   Sistem Pembayaran Air Minum
═══════════════════════════════════════════════ */

// ── CONFIG ───────────────────────────────────────────────────────────────
// Ganti dengan URL Google Apps Script Anda setelah deploy
const API_URL = "https://script.google.com/macros/s/AKfycbzTE5Vs2foRmYnue3A93Rj8bYzAWkZKKi4O0L13zve0xF3ihD-cn1hdCg4xpYi-vV6G/exec";

const BULAN_LIST = ["Januari","Februari","Maret","April","Mei","Juni",
                    "Juli","Agustus","September","Oktober","November","Desember"];
const BULAN_INI  = BULAN_LIST[new Date().getMonth()];
const TAHUN_INI  = new Date().getFullYear();

// ── STATE ────────────────────────────────────────────────────────────────
let session      = JSON.parse(sessionStorage.getItem("sipam_session") || "null");
let allPelanggan = [];          // cached pelanggan list
let currentPel   = null;        // pelanggan di halaman detail
let currentTrx   = null;        // transaksi di halaman detail
let metodeAktif  = "Tunai";
let fromPage     = "dashboard"; // untuk tombol Kembali

// Pagination state per section
const PAGE_SIZE = 3;
const pgState = {
  dashboard: { page: 1, data: [] },
  cari:      { page: 1, data: [] },
  laporan:   { page: 1, data: [] },
};

// ════════════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════════════
window.onload = () => {
  if (session?.token) {
    showApp();
  } else {
    showPage("pg-login");
  }
  document.getElementById("inp-password")
    .addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
};

// ════════════════════════════════════════════════════════════════════════
//  API — JSONP (solusi CORS untuk Google Apps Script)
// ════════════════════════════════════════════════════════════════════════
function api(body) {
  return new Promise((resolve, reject) => {
    const cb   = "cb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const url  = API_URL + "?data=" + encodeURIComponent(JSON.stringify(body)) + "&callback=" + cb;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
      showToast("Request timeout — periksa koneksi", "error");
    }, 20000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      const s = document.getElementById("jsonp-" + cb);
      if (s) document.body.removeChild(s);
    }

    window[cb] = (res) => { cleanup(); resolve(res); };

    const script   = document.createElement("script");
    script.id      = "jsonp-" + cb;
    script.src     = url;
    script.onerror = () => {
      cleanup();
      reject(new Error("network error"));
      showToast("Gagal terhubung ke server", "error");
    };
    document.body.appendChild(script);
  });
}

// ════════════════════════════════════════════════════════════════════════
//  LOGIN / LOGOUT
// ════════════════════════════════════════════════════════════════════════
async function doLogin() {
  const username = document.getElementById("inp-username").value.trim();
  const password = document.getElementById("inp-password").value;
  const btn      = document.getElementById("btn-login");

  if (!username || !password) {
    showErr("Username dan password wajib diisi.");
    return;
  }

  btn.disabled    = true;
  btn.textContent = "Memverifikasi…";

  try {
    const res = await api({ action: "login", username, password });

    if (res.status !== "ok") {
      showErr(res.message || "Username atau password salah.");
      return;
    }

    document.getElementById("login-err").style.display = "none";
    session = { token: res.token, nama: res.nama, role: res.role, id_user: res.id_user };
    sessionStorage.setItem("sipam_session", JSON.stringify(session));

    // Preload pelanggan di background agar halaman lain responsif
    prefetchPelanggan();
    showApp();

  } catch (err) {
    showErr("Gagal terhubung: " + err.message);
  } finally {
    btn.disabled   = false;
    btn.innerHTML  = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg> Masuk`;
  }
}

function showErr(msg) {
  const el = document.getElementById("login-err");
  el.textContent    = msg;
  el.style.display  = "block";
}

function doLogout() {
  sessionStorage.removeItem("sipam_session");
  session      = null;
  allPelanggan = [];
  // Reset pagination
  Object.keys(pgState).forEach(k => { pgState[k].page = 1; pgState[k].data = []; });
  showPage("pg-login");
  document.getElementById("inp-username").value = "";
  document.getElementById("inp-password").value = "";
  document.getElementById("login-err").style.display = "none";
  showToast("Anda telah logout");
}

// ════════════════════════════════════════════════════════════════════════
//  NAVIGATION — single-page routing
// ════════════════════════════════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
  // Scroll to top of new page
  window.scrollTo(0, 0);
}

function showApp() {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  document.getElementById("dash-greeting").textContent = greeting + ", " + (session?.role === "admin" ? "Admin" : "Petugas");
  document.getElementById("dash-nama").textContent     = session?.nama || "—";
  showPage("pg-dashboard");
  loadDashboard();
}

function goPage(page) {
  const map = {
    dashboard: "pg-dashboard",
    pelanggan: "pg-pelanggan",
    meteran:   "pg-meteran",
    laporan:   "pg-laporan",
  };
  showPage(map[page]);

  if (page === "dashboard") loadDashboard();
  if (page === "laporan")   { initFilterLaporan(); loadLaporan(); }
  if (page === "pelanggan") {
    document.getElementById("search-input").value = "";
    renderSearchResults([]);
  }
  if (page === "meteran") {
    resetMeteranForm();
  }
}

function goBack() {
  const dest = { meteran: "pg-meteran", pelanggan: "pg-pelanggan" };
  showPage(dest[fromPage] || "pg-dashboard");
}

// ════════════════════════════════════════════════════════════════════════
//  PREFETCH — cache pelanggan saat login agar UI tidak berat
// ════════════════════════════════════════════════════════════════════════
async function prefetchPelanggan() {
  if (allPelanggan.length) return;
  try {
    const res = await api({ action: "getPelanggan", token: session?.token });
    if (res.status === "ok") allPelanggan = res.data;
  } catch (e) { /* silent */ }
}

// ════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════════════════
async function loadDashboard() {
  document.getElementById("dash-belum-list").innerHTML =
    `<div class="loading"><div class="spinner"></div> Memuat data…</div>`;

  try {
    const res = await api({ action: "getLaporan", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI });
    if (res.status !== "ok") throw new Error(res.message);

    const { laporan, detail } = res;
    document.getElementById("s-total").textContent   = laporan.total_pelanggan;
    document.getElementById("s-lunas").textContent   = laporan.sudah_bayar;
    document.getElementById("s-belum").textContent   = laporan.belum_bayar;
    document.getElementById("s-nominal").textContent = rp(laporan.total_terkumpul);

    const pct = laporan.total_pelanggan
      ? Math.round(laporan.sudah_bayar / laporan.total_pelanggan * 100) : 0;
    document.getElementById("s-progress").style.width = pct + "%";
    document.getElementById("s-pct").textContent      = pct + "% lunas";

    const belum = (detail || []).filter(t => t.status === "Belum Bayar");
    pgState.dashboard.data = belum;
    pgState.dashboard.page = 1;
    renderDashboardList();

  } catch (err) {
    console.error("Dashboard:", err);
    document.getElementById("dash-belum-list").innerHTML =
      `<div class="empty"><p>Gagal memuat data. Coba lagi.</p></div>`;
  }
}

function renderDashboardList() {
  const { data, page } = pgState.dashboard;
  const el = document.getElementById("dash-belum-list");

  if (!data.length) {
    el.innerHTML = `<div class="empty">
      <svg fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
      <p>Semua pelanggan sudah lunas! 🎉</p>
    </div>`;
    return;
  }

  const { items, totalPages, start, end } = paginate(data, page);

  el.innerHTML = items.map(t => `
    <div class="pel-item" onclick="openDetailFromDash('${esc(t.id_pelanggan)}','${esc(t.id_transaksi)}')">
      <div class="avatar av-a">${initials(t.nama)}</div>
      <div class="pel-info">
        <div class="pel-name">${escHtml(t.nama)}</div>
        <div class="pel-sub">${escHtml(t.no_rumah)} · ${rp(t.jumlah_bayar)}</div>
      </div>
      <span class="badge badge-red">Belum</span>
    </div>`).join("")
  + renderPagination("dashboard", page, totalPages, data.length, start, end);
}

// ════════════════════════════════════════════════════════════════════════
//  CARI PELANGGAN
// ════════════════════════════════════════════════════════════════════════
let searchTimer;
function doSearch(val) {
  clearTimeout(searchTimer);
  if (!val.trim()) { renderSearchResults([]); return; }
  searchTimer = setTimeout(async () => {
    try {
      // Use cached data if available, else fetch
      let results;
      if (allPelanggan.length) {
        const kw = val.toLowerCase();
        results = allPelanggan.filter(p =>
          p.no_rumah.toLowerCase().includes(kw) ||
          p.nama.toLowerCase().includes(kw)
        );
      } else {
        const res = await api({ action: "searchPelanggan", token: session?.token, keyword: val });
        results = res.status === "ok" ? res.data : [];
      }
      pgState.cari.data = results;
      pgState.cari.page = 1;
      renderSearchResults(results);
    } catch (e) { console.error("Search:", e); }
  }, 300);
}

function renderSearchResults(list) {
  const el = document.getElementById("search-results");
  if (!list.length) { el.innerHTML = ""; return; }

  pgState.cari.data = list;
  const { items, totalPages, start, end } = paginate(list, pgState.cari.page);

  el.innerHTML = `<div class="card"><div class="card-body" style="padding:0 16px;">
    ${items.map((p, i) => `
      <div class="pel-item" onclick="openDetail('${esc(p.id_pelanggan)}','pelanggan')">
        <div class="avatar ${["av-b","av-g","av-a"][i % 3]}">${initials(p.nama)}</div>
        <div class="pel-info">
          <div class="pel-name">${escHtml(p.nama)}</div>
          <div class="pel-sub">${escHtml(p.no_rumah)} · ${escHtml(p.alamat)}</div>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>`).join("")}
    ${renderPagination("cari", pgState.cari.page, totalPages, list.length, start, end)}
  </div></div>`;
}

function changePage(section, dir) {
  pgState[section].page += dir;
  if (section === "dashboard") renderDashboardList();
  if (section === "cari")      renderSearchResults(pgState.cari.data);
  if (section === "laporan")   renderLaporanList();
}

// ════════════════════════════════════════════════════════════════════════
//  DETAIL PELANGGAN
// ════════════════════════════════════════════════════════════════════════
async function openDetail(id_pelanggan, from = "dashboard") {
  fromPage = from;

  // Ensure cache
  if (!allPelanggan.length) await prefetchPelanggan();
  const pel = allPelanggan.find(p => p.id_pelanggan === id_pelanggan);
  if (!pel) return;

  currentPel = pel;
  document.getElementById("detail-nama").textContent    = pel.nama;
  document.getElementById("detail-norumah").textContent = pel.no_rumah;
  document.getElementById("detail-alamat").textContent  = pel.alamat;
  document.getElementById("detail-telp").textContent    = pel.no_telpon || "—";
  document.getElementById("detail-id").textContent      = pel.id_pelanggan;

  // Show page immediately, then load tagihan
  showPage("pg-detail");
  document.getElementById("detail-actions").innerHTML =
    `<div class="loading"><div class="spinner"></div> Memuat tagihan…</div>`;

  try {
    const lapRes = await api({ action: "getLaporan", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI });
    const trx = lapRes.status === "ok"
      ? lapRes.detail?.find(t => t.id_pelanggan === id_pelanggan) : null;

    const actionsEl = document.getElementById("detail-actions");

    if (trx) {
      currentTrx = trx;
      const lunas = trx.status === "Lunas";
      document.getElementById("detail-pakai").textContent   = trx.pemakaian + " m³";
      document.getElementById("detail-tagihan").textContent = rp(trx.pemakaian * 1500);
      document.getElementById("detail-total").textContent   = rp(trx.jumlah_bayar);

      const badge = document.getElementById("detail-badge");
      badge.textContent = lunas ? "Lunas" : "Belum Bayar";
      badge.className   = "badge " + (lunas ? "badge-green" : "badge-red");

      actionsEl.innerHTML = lunas
        ? `<div class="card"><div class="card-body" style="text-align:center;color:var(--c-green);padding:20px;">
            <b>✓ Sudah Lunas</b><br>
            <small style="color:var(--c-text3)">${trx.tgl_bayar || "—"}</small>
           </div></div>`
        : `<button class="btn btn-green" onclick="openModal()">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>Terima Pembayaran
           </button>`;
    } else {
      currentTrx = null;
      document.getElementById("detail-pakai").textContent   = "—";
      document.getElementById("detail-tagihan").textContent = "—";
      document.getElementById("detail-total").textContent   = "—";
      const badge = document.getElementById("detail-badge");
      badge.textContent = "Belum Dicatat";
      badge.className   = "badge badge-amber";
      actionsEl.innerHTML = `<p style="color:var(--c-text3);font-size:13px;text-align:center;padding:16px 0;">
        Meteran bulan ini belum dicatat.
      </p>`;
    }
  } catch (err) {
    console.error("Detail:", err);
    showToast("Gagal memuat tagihan", "error");
  }
}

function openDetailFromDash(id_pelanggan) { openDetail(id_pelanggan, "dashboard"); }

// ════════════════════════════════════════════════════════════════════════
//  CATAT METERAN
// ════════════════════════════════════════════════════════════════════════
let selPelMet    = null;
let metSearchTimer;

function resetMeteranForm() {
  selPelMet = null;
  document.getElementById("met-search").value          = "";
  document.getElementById("met-search-results").innerHTML = "";
  document.getElementById("met-form-card").style.display  = "none";
  document.getElementById("met-already-recorded").classList.add("hidden");
  document.getElementById("met-last-info").classList.add("hidden");
  document.getElementById("met-no-history").classList.add("hidden");
}

function doMetSearch(val) {
  clearTimeout(metSearchTimer);
  if (!val.trim()) {
    document.getElementById("met-search-results").innerHTML = "";
    return;
  }
  metSearchTimer = setTimeout(async () => {
    try {
      let results;
      if (allPelanggan.length) {
        const kw = val.toLowerCase();
        results = allPelanggan.filter(p =>
          p.no_rumah.toLowerCase().includes(kw) || p.nama.toLowerCase().includes(kw)
        );
      } else {
        const res = await api({ action: "searchPelanggan", token: session?.token, keyword: val });
        results = res.status === "ok" ? res.data : [];
      }
      const el = document.getElementById("met-search-results");
      el.innerHTML = results.length
        ? results.map(p => `
          <div class="pel-item" style="padding:10px 0;" onclick="pilihPelMet('${esc(p.id_pelanggan)}')">
            <div class="avatar av-b">${initials(p.nama)}</div>
            <div class="pel-info">
              <div class="pel-name">${escHtml(p.nama)}</div>
              <div class="pel-sub">${escHtml(p.no_rumah)}</div>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>`).join("")
        : `<p style="color:var(--c-text3);font-size:13px;padding:8px 0;">Tidak ditemukan.</p>`;
    } catch (e) { console.error("MetSearch:", e); }
  }, 300);
}

async function pilihPelMet(id) {
  if (!allPelanggan.length) await prefetchPelanggan();
  selPelMet = allPelanggan.find(p => p.id_pelanggan === id);
  if (!selPelMet) return;

  // Reset form state
  document.getElementById("met-nama-lbl").textContent = selPelMet.nama;
  document.getElementById("met-no-lbl").textContent   = selPelMet.no_rumah;
  document.getElementById("met-lalu").value            = "";
  document.getElementById("met-lalu").removeAttribute("readonly");
  document.getElementById("met-jalan").value           = "";
  document.getElementById("met-lalu-hint").textContent = "m³";
  document.getElementById("met-already-recorded").classList.add("hidden");
  document.getElementById("met-last-info").classList.add("hidden");
  document.getElementById("met-no-history").classList.add("hidden");
  document.getElementById("met-simpan-btn").disabled   = false;
  hitungPemakaian();
  document.getElementById("met-form-card").style.display = "block";
  document.getElementById("met-search-results").innerHTML = "";
  document.getElementById("met-search").value = selPelMet.nama;

  // ── Cek 1: apakah sudah dicatat bulan ini? ──────────────────
  try {
    const lapRes = await api({ action: "getLaporan", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI });
    if (lapRes.status === "ok") {
      const existing = lapRes.detail?.find(t => t.id_pelanggan === id);
      if (existing) {
        // Sudah tercatat bulan ini — blokir input
        document.getElementById("met-already-recorded").classList.remove("hidden");
        document.getElementById("met-simpan-btn").disabled = true;
        return; // Tidak perlu fetch last meter
      }
    }
  } catch (e) { console.error("Cek existing:", e); }

  // ── Cek 2: ambil meter berjalan terakhir untuk auto-fill ─────
  try {
    const histRes = await api({ action: "getLastMeter", token: session?.token, id_pelanggan: id });
    if (histRes.status === "ok" && histRes.meter_berjalan != null) {
      document.getElementById("met-lalu").value           = histRes.meter_berjalan;
      document.getElementById("met-lalu").setAttribute("readonly", true);
      document.getElementById("met-lalu-hint").textContent = `m³ — otomatis dari ${histRes.bulan} ${histRes.tahun}`;
      document.getElementById("met-last-bulan").textContent = `${histRes.bulan} ${histRes.tahun}`;
      document.getElementById("met-last-nilai").textContent = histRes.meter_berjalan;
      document.getElementById("met-last-info").classList.remove("hidden");
      hitungPemakaian();
    } else {
      document.getElementById("met-no-history").classList.remove("hidden");
    }
  } catch (e) { console.error("LastMeter:", e); }
}

function hitungPemakaian() {
  const lalu   = parseFloat(document.getElementById("met-lalu").value)  || 0;
  const jalan  = parseFloat(document.getElementById("met-jalan").value) || 0;
  const pakai  = Math.max(0, jalan - lalu);
  const tagihan = pakai * 1500;
  const total   = tagihan + 5000;
  document.getElementById("met-pakai").textContent   = pakai + " m³";
  document.getElementById("met-tagihan").textContent = rp(tagihan);
  document.getElementById("met-total").textContent   = rp(total);
}

async function simpanMeteran() {
  if (!selPelMet) { showToast("Pilih pelanggan dahulu", "error"); return; }

  const lalu  = parseFloat(document.getElementById("met-lalu").value);
  const jalan = parseFloat(document.getElementById("met-jalan").value);

  if (isNaN(lalu) || isNaN(jalan))  { showToast("Isi meter bulan lalu & berjalan", "error"); return; }
  if (jalan < lalu)                  { showToast("Meter berjalan tidak boleh lebih kecil dari bulan lalu", "error"); return; }
  if (jalan === lalu)                { showToast("Pemakaian 0 m³ — periksa kembali angka meteran", "error"); return; }

  const btn = document.getElementById("met-simpan-btn");
  btn.disabled    = true;
  btn.textContent = "Menyimpan…";

  try {
    const ts = Date.now();
    const res = await api({
      action: "saveMeteran",
      token:  session?.token,
      data: {
        id_meteran    : `MET-${ts}`,
        id_transaksi  : `TRX-${ts}`,
        id_pelanggan  : selPelMet.id_pelanggan,
        no_rumah      : selPelMet.no_rumah,
        nama          : selPelMet.nama,
        bulan         : BULAN_INI,
        tahun         : TAHUN_INI,
        meter_lalu    : lalu,
        meter_berjalan: jalan,
        petugas       : session?.nama || "",
      }
    });

    if (res.status === "ok") {
      showToast("Data meteran disimpan ✓", "success");
      resetMeteranForm();
      loadDashboard(); // refresh dashboard stats
    } else {
      showToast(res.message || "Gagal menyimpan", "error");
    }
  } catch (err) {
    console.error("SaveMeteran:", err);
    showToast("Gagal menyimpan data meteran", "error");
  } finally {
    btn.disabled   = false;
    btn.innerHTML  = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2"/>
      <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2"/>
    </svg> Simpan Data Meteran`;
  }
}

// ════════════════════════════════════════════════════════════════════════
//  LAPORAN
// ════════════════════════════════════════════════════════════════════════
function initFilterLaporan() {
  const selTahun = document.getElementById("lap-filter-tahun");
  if (selTahun.options.length) return; // already initialized
  for (let y = TAHUN_INI; y >= TAHUN_INI - 3; y--) {
    const opt = document.createElement("option");
    opt.value = y; opt.textContent = y;
    selTahun.appendChild(opt);
  }
  document.getElementById("lap-filter-bulan").value = BULAN_INI;
  document.getElementById("lap-filter-tahun").value = TAHUN_INI;
}

function terapkanFilterLaporan() {
  const bulan = document.getElementById("lap-filter-bulan").value;
  const tahun = parseInt(document.getElementById("lap-filter-tahun").value);
  pgState.laporan.page = 1;
  loadLaporan(bulan, tahun);
}

async function loadLaporan(bulan = BULAN_INI, tahun = TAHUN_INI) {
  document.getElementById("lap-periode").textContent = `${bulan} ${tahun}`;
  ["lap-total","lap-lunas","lap-belum","lap-terkumpul","lap-piutang"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = "…"; });
  document.getElementById("lap-list").innerHTML =
    `<div class="loading"><div class="spinner"></div> Memuat ${bulan} ${tahun}…</div>`;

  try {
    const res = await api({ action: "getLaporan", token: session?.token, bulan, tahun });
    if (res.status !== "ok") throw new Error(res.message);

    const { laporan, detail } = res;
    document.getElementById("lap-total").textContent     = laporan.total_pelanggan;
    document.getElementById("lap-lunas").textContent     = laporan.sudah_bayar;
    document.getElementById("lap-belum").textContent     = laporan.belum_bayar;
    document.getElementById("lap-terkumpul").textContent = rp(laporan.total_terkumpul);
    document.getElementById("lap-piutang").textContent   = rp(laporan.total_piutang);

    const belum = (detail || []).filter(t => t.status === "Belum Bayar");
    pgState.laporan.data = belum;
    pgState.laporan.page = 1;
    renderLaporanList();

  } catch (err) {
    console.error("Laporan:", err);
    document.getElementById("lap-list").innerHTML =
      `<div class="empty"><p>Gagal memuat data. Coba lagi.</p></div>`;
  }
}

function renderLaporanList() {
  const { data, page } = pgState.laporan;
  const el = document.getElementById("lap-list");

  if (!data.length) {
    el.innerHTML = `<div class="empty"><p>Semua sudah lunas 🎉</p></div>`;
    return;
  }

  const { items, totalPages, start, end } = paginate(data, page);
  el.innerHTML = items.map(t => `
    <div class="pel-item" onclick="openDetail('${esc(t.id_pelanggan)}','laporan')">
      <div class="avatar av-a">${initials(t.nama)}</div>
      <div class="pel-info">
        <div class="pel-name">${escHtml(t.nama)}</div>
        <div class="pel-sub">${escHtml(t.no_rumah)} · ${rp(t.jumlah_bayar)}</div>
      </div>
      <span class="badge badge-red">Belum</span>
    </div>`).join("")
  + renderPagination("laporan", page, totalPages, data.length, start, end);
}

// ════════════════════════════════════════════════════════════════════════
//  MODAL BAYAR
// ════════════════════════════════════════════════════════════════════════
function openModal() {
  if (!currentTrx) return;
  document.getElementById("modal-nama").textContent  = currentPel?.nama || "—";
  document.getElementById("modal-total").textContent = rp(currentTrx.jumlah_bayar);
  pilihMetode("Tunai");
  document.getElementById("modal-bayar").classList.add("show");
}

function closeModal() {
  document.getElementById("modal-bayar").classList.remove("show");
}

function pilihMetode(m) {
  metodeAktif = m;
  ["Tunai","Transfer","QRIS"].forEach(x => {
    document.getElementById("met-" + x.toLowerCase())
      .classList.toggle("active", x === m);
  });
}

async function konfirmasiBayar() {
  const btn = document.getElementById("btn-konfirmasi");
  btn.disabled    = true;
  btn.textContent = "Memproses…";

  try {
    const res = await api({
      action:       "saveTransaksi",
      token:        session?.token,
      id_transaksi: currentTrx.id_transaksi,
      metode_bayar: metodeAktif,
      petugas:      session?.nama || "",   // ← FIX: kirim nama petugas
    });

    closeModal();
    if (res.status === "ok") {
      showToast("Pembayaran berhasil dicatat ✓", "success");
      // Reload detail halaman yang sama
      setTimeout(() => openDetail(currentPel.id_pelanggan, fromPage), 400);
    } else {
      showToast(res.message || "Gagal memproses", "error");
    }
  } catch (err) {
    console.error("Bayar:", err);
    showToast("Gagal memproses pembayaran", "error");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg> Tandai Lunas`;
  }
}

// ════════════════════════════════════════════════════════════════════════
//  PAGINATION HELPER
// ════════════════════════════════════════════════════════════════════════
function paginate(data, page) {
  const total      = data.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const curPage    = Math.min(Math.max(1, page), totalPages);
  const start      = (curPage - 1) * PAGE_SIZE;
  const end        = Math.min(start + PAGE_SIZE, total);
  return { items: data.slice(start, end), totalPages, start: start + 1, end, curPage };
}

function renderPagination(section, page, totalPages, total, start, end) {
  if (totalPages <= 1) return "";
  return `<div class="pagination">
    <span class="pagination-info">${start}–${end} dari ${total}</span>
    <div class="pagination-btns">
      <button class="pg-btn" onclick="changePage('${section}',-1)" ${page <= 1 ? "disabled" : ""}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="pg-btn" onclick="changePage('${section}',1)" ${page >= totalPages ? "disabled" : ""}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════════════════
function rp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function initials(nama) {
  return (nama || "").split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
}

/** Safe attribute value (no quotes break) */
function esc(str) {
  return String(str || "").replace(/'/g, "\\'");
}

/** Safe HTML content */
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let toastTimer;
function showToast(msg, type = "") {
  const el    = document.getElementById("toast");
  el.textContent = msg;
  el.className   = "toast show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 2800);
}
