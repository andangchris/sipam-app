/* ═══════════════════════════════════════════════
   SiPAM — app.js
   Sistem Pembayaran Air Minum
═══════════════════════════════════════════════ */

// ── CONFIG ───────────────────────────────────────────────────────────────
// Ganti dengan URL Google Apps Script Anda setelah deploy
const API_URL = "https://script.google.com/macros/s/AKfycbxJGhsa3yDXmS8yxEm07llIJ9HC5x4czNZEK-ARDgUYp2365ShIE_a4S86L7t-X-vWI/exec";

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
let currentPeriode = { bulan: BULAN_INI, tahun: TAHUN_INI };

// Pagination state per section
const PAGE_SIZE = 3;
const pgState = {
  dashboard: { page: 1, data: [] },
  cari:      { page: 1, data: [] },
  catat:     { page: 1, data: [] },
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
  if (el) {
    el.classList.add("active");
    el.scrollTop = 0; // scroll the page element itself, not window
  }
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
  const dest = { meteran: "pg-meteran", pelanggan: "pg-pelanggan", laporan: "pg-laporan", dashboard: "pg-dashboard" };
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
    const [_, res] = await Promise.all([
      prefetchPelanggan(),
      api({ action: "getDashboard", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI })
    ]);
    if (res.status !== "ok") throw new Error(res.message);

    const { laporan, detail } = res;
    const totalPelanggan = allPelanggan.length || laporan.total_pelanggan;

    document.getElementById("s-total").textContent   = totalPelanggan;
    document.getElementById("s-lunas").textContent   = laporan.sudah_bayar;
    document.getElementById("s-belum").textContent   = laporan.belum_bayar;
    document.getElementById("s-nominal").textContent = rp(laporan.total_terkumpul);

    const pct = totalPelanggan
      ? Math.round(laporan.sudah_bayar / totalPelanggan * 100) : 0;
    document.getElementById("s-progress").style.width = pct + "%";
    document.getElementById("s-pct").textContent      = pct + "% lunas";

    const belum = (detail || []).filter(t => t.status !== "Lunas");
    pgState.dashboard.data = belum;
    pgState.dashboard.page = 1;
    renderDashboardList();
    if (session?.role === "admin") {
      loadApprovalGantiMeter();
    } else {
      const card = byId("admin-approval-card");
      if (card) card.classList.add("hidden");
    }

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

  const pg = paginate(data, page);
  pgState.dashboard.page = pg.curPage;

  el.innerHTML =
    pg.items.map(t => {
      const isUnrecorded = t.status === "Belum Dicatat";
      const badge = isUnrecorded
        ? `<span class="badge badge-amber">Belum Dicatat</span>`
        : `<span class="badge badge-red">Belum</span>`;
      const nominal = isUnrecorded ? "Belum dicatat" : rp(t.jumlah_bayar);
      const periode = t.periode_label || `${t.bulan || BULAN_INI} ${t.tahun || TAHUN_INI}`;
      const bulan = esc(t.bulan || BULAN_INI);
      const tahun = esc(t.tahun || TAHUN_INI);

      return `
      <div class="pel-item" onclick="openDetailFromDash('${esc(t.id_pelanggan)}','${bulan}','${tahun}')">
        <div class="avatar av-a">${initials(t.nama)}</div>
        <div class="pel-info">
          <div class="pel-name">${escHtml(t.nama)}</div>
          <div class="pel-sub">${escHtml(t.no_rumah)} · ${escHtml(periode)} · ${nominal}</div>
        </div>
        ${badge}
      </div>`;
    }).join("")
    + renderPagination("dashboard", pg.curPage, pg.totalPages, data.length, pg.start, pg.end);
}


// ════════════════════════════════════════════════════════════════════════
//  ADMIN APPROVAL GANTI METER
// ════════════════════════════════════════════════════════════════════════
async function loadApprovalGantiMeter() {
  const card = byId("admin-approval-card");
  const list = byId("admin-approval-list");
  const count = byId("admin-approval-count");
  if (!card || !list) return;

  card.classList.remove("hidden");
  list.innerHTML = `<div class="loading"><div class="spinner"></div> Memuat approval…</div>`;
  if (count) count.textContent = "—";

  try {
    const res = await api({ action: "getPendingGantiMeter", token: session?.token });
    if (res.status !== "ok") throw new Error(res.message || "Gagal memuat approval");
    renderApprovalGantiMeter(res.data || []);
  } catch (err) {
    console.error("Approval:", err);
    const msg = err?.message || "Gagal memuat approval ganti meter.";
    list.innerHTML = `<div class="empty"><p>${escHtml(msg)}</p></div>`;
  }
}

function renderApprovalGantiMeter(data) {
  const list = byId("admin-approval-list");
  const count = byId("admin-approval-count");
  if (!list) return;
  if (count) count.textContent = data.length;

  if (!data.length) {
    list.innerHTML = `<div class="empty" style="padding:18px 0;"><p>Tidak ada approval ganti meter yang menunggu.</p></div>`;
    return;
  }

  list.innerHTML = data.map(item => `
    <div class="approval-item">
      <div class="approval-main">
        <div class="pel-name">${escHtml(item.nama)}</div>
        <div class="pel-sub">${escHtml(item.no_rumah)} · ${escHtml(item.bulan)} ${escHtml(item.tahun)} · ${escHtml(item.alasan_ganti_meter || "-")}</div>
        <div class="approval-metrics">
          <span>Lalu: <b>${escHtml(item.meter_lalu)}</b></span>
          <span>Akhir lama: <b>${escHtml(item.meter_akhir_lama)}</b></span>
          <span>Awal baru: <b>${escHtml(item.meter_awal_baru)}</b></span>
          <span>Berjalan baru: <b>${escHtml(item.meter_berjalan)}</b></span>
          <span>Pakai: <b>${escHtml(item.pemakaian)} m³</b></span>
        </div>
        ${item.bukti_ganti_meter ? `<div class="approval-note">Bukti: ${escHtml(item.bukti_ganti_meter)}</div>` : ""}
        ${item.catatan_pengajuan ? `<div class="approval-note">Catatan: ${escHtml(item.catatan_pengajuan)}</div>` : ""}
      </div>
      <div class="approval-actions">
        <button class="btn btn-green btn-sm" onclick="setApprovalGantiMeter('${esc(item.id_meteran)}','Disetujui')">Setujui</button>
        <button class="btn btn-red btn-sm" onclick="setApprovalGantiMeter('${esc(item.id_meteran)}','Ditolak')">Tolak</button>
      </div>
    </div>
  `).join("");
}

async function setApprovalGantiMeter(id_meteran, status_approval) {
  const catatan = prompt(status_approval === "Disetujui"
    ? "Catatan approval admin (opsional):"
    : "Alasan penolakan wajib diisi:", "");
  if (catatan === null) return;
  if (status_approval === "Ditolak" && !catatan.trim()) {
    showToast("Alasan penolakan wajib diisi", "error");
    return;
  }

  try {
    const res = await api({
      action: "approveGantiMeter",
      token: session?.token,
      id_meteran,
      status_approval,
      admin: session?.nama || "Admin",
      catatan
    });
    if (res.status !== "ok") throw new Error(res.message || "Approval gagal");
    showToast(res.message || "Approval berhasil", "success");
    loadApprovalGantiMeter();
    loadDashboard();
  } catch (err) {
    showToast(err.message || "Approval gagal", "error");
  }
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
  const pg = paginate(list, pgState.cari.page);
  pgState.cari.page = pg.curPage;

  el.innerHTML = `<div class="card"><div class="card-body" style="padding:0 16px;">
    ${pg.items.map((p, i) => `
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
    ${renderPagination("cari", pg.curPage, pg.totalPages, list.length, pg.start, pg.end)}
  </div></div>`;
}

function changePage(section, dir) {
  pgState[section].page += dir;
  if (section === "dashboard") renderDashboardList();
  if (section === "cari")      renderSearchResults(pgState.cari.data);
  if (section === "catat")     renderMetSearchResults(pgState.catat.data);
  if (section === "laporan")   renderLaporanList();
}

// ════════════════════════════════════════════════════════════════════════
//  DETAIL PELANGGAN
// ════════════════════════════════════════════════════════════════════════
function isGantiMeterTransaksi(trx) {
  return String(trx?.tipe_pencatatan || "") === "Ganti Meter";
}

function approvalStatus(trx) {
  return String(trx?.status_approval || (isGantiMeterTransaksi(trx) ? "Menunggu" : "Tidak Perlu"));
}

function isApprovalBlocked(trx) {
  return isGantiMeterTransaksi(trx) && approvalStatus(trx) !== "Disetujui";
}

function approvalBadgeClass(status) {
  if (status === "Disetujui") return "badge-green";
  if (status === "Ditolak") return "badge-red";
  if (status === "Menunggu") return "badge-amber";
  return "badge-blue";
}

function renderApprovalInfo(trx) {
  if (!isGantiMeterTransaksi(trx)) return "";
  const status = approvalStatus(trx);
  const cls = status === "Ditolak" ? "alert-red" : status === "Disetujui" ? "alert-green" : "alert-amber";
  const msg = status === "Disetujui"
    ? "Ganti meter sudah disetujui admin. Pembayaran bisa diproses."
    : status === "Ditolak"
      ? "Ganti meter ditolak admin. Pembayaran belum bisa diproses."
      : "Ganti meter masih menunggu approval admin. Pembayaran belum bisa diproses.";
  return `<div class="alert ${cls}" style="display:flex;align-items:flex-start;">
    <svg fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <div>
      <b>Kontrol ganti meter: ${escHtml(status)}</b><br>
      ${escHtml(msg)}
      <div class="audit-mini" style="margin-top:8px;">
        <span>Meter akhir lama: <b>${escHtml(String(trx.meter_akhir_lama ?? "—"))}</b></span>
        <span>Meter awal baru: <b>${escHtml(String(trx.meter_awal_baru ?? "—"))}</b></span>
        <span>Meter berjalan baru: <b>${escHtml(String(trx.meter_berjalan ?? "—"))}</b></span>
      </div>
    </div>
  </div>`;
}

async function openDetail(id_pelanggan, from = "dashboard", bulan = BULAN_INI, tahun = TAHUN_INI) {
  fromPage = from;
  currentPeriode = { bulan, tahun };

  if (!allPelanggan.length) await prefetchPelanggan();
  const pel = allPelanggan.find(p => p.id_pelanggan === id_pelanggan);
  if (!pel) return;

  currentPel = pel;
  document.getElementById("detail-nama").textContent    = pel.nama;
  document.getElementById("detail-norumah").textContent = pel.no_rumah;
  document.getElementById("detail-alamat").textContent  = pel.alamat;
  document.getElementById("detail-telp").textContent    = pel.no_telpon || "—";
  document.getElementById("detail-id").textContent      = pel.id_pelanggan;

  const titleEl = document.getElementById("detail-title") || document.querySelector("#pg-detail .card:nth-of-type(2) .card-title");
  if (titleEl) titleEl.textContent = `Tagihan ${bulan} ${tahun}`;

  showPage("pg-detail");
  document.getElementById("detail-actions").innerHTML =
    `<div class="loading"><div class="spinner"></div> Memuat tagihan…</div>`;

  try {
    const lapRes = await api({ action: "getLaporan", token: session?.token, bulan, tahun });
    const trx = lapRes.status === "ok"
      ? lapRes.detail?.find(t => t.id_pelanggan === id_pelanggan) : null;

    const actionsEl = document.getElementById("detail-actions");
    const badge = document.getElementById("detail-badge");
    const adminEl = document.getElementById("detail-admin");
    const auditEl = document.getElementById("detail-audit");

    if (trx && trx.status !== "Belum Dicatat" && trx.id_transaksi) {
      const trxBulan = trx.bulan || bulan;
      const trxTahun = trx.tahun || tahun;
      currentPeriode = { bulan: trxBulan, tahun: trxTahun };
      currentTrx = { ...trx, bulan: trxBulan, tahun: trxTahun };
      if (titleEl) titleEl.textContent = `Tagihan ${trxBulan} ${trxTahun}`;

      const lunas = currentTrx.status === "Lunas";
      document.getElementById("detail-pakai").textContent   = currentTrx.pemakaian + " m³";
      document.getElementById("detail-tagihan").textContent = rp(currentTrx.tagihan);
      if (adminEl) adminEl.textContent = rp(currentTrx.admin || 5000);
      document.getElementById("detail-total").textContent   = rp(currentTrx.jumlah_bayar);

      const stApproval = approvalStatus(currentTrx);
      if (isGantiMeterTransaksi(currentTrx)) {
        badge.textContent = lunas ? "Lunas" : `Ganti Meter: ${stApproval}`;
        badge.className = "badge " + (lunas ? "badge-green" : approvalBadgeClass(stApproval));
      } else {
        badge.textContent = lunas ? "Lunas" : "Belum Bayar";
        badge.className   = "badge " + (lunas ? "badge-green" : "badge-red");
      }

      if (auditEl) auditEl.innerHTML = renderApprovalInfo(currentTrx);

      if (lunas) {
        actionsEl.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;color:var(--c-green);padding:20px;">
            <b>✓ Sudah Lunas</b><br>
            <small style="color:var(--c-text3)">${currentTrx.tgl_bayar || "—"}</small>
           </div></div>`;
      } else if (isApprovalBlocked(currentTrx)) {
        actionsEl.innerHTML = `<button class="btn btn-outline" disabled>Menunggu Approval Admin</button>`;
      } else {
        actionsEl.innerHTML = `<button class="btn btn-green" onclick="openModal()">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>Terima Pembayaran
           </button>`;
      }
    } else {
      const periodeBulan = trx?.bulan || bulan;
      const periodeTahun = trx?.tahun || tahun;
      currentPeriode = { bulan: periodeBulan, tahun: periodeTahun };
      if (titleEl) titleEl.textContent = `Tagihan ${periodeBulan} ${periodeTahun}`;

      currentTrx = null;
      document.getElementById("detail-pakai").textContent   = "—";
      document.getElementById("detail-tagihan").textContent = "—";
      if (adminEl) adminEl.textContent = "—";
      document.getElementById("detail-total").textContent   = "—";
      if (auditEl) auditEl.innerHTML = "";
      badge.textContent = "Belum Dicatat";
      badge.className   = "badge badge-amber";
      actionsEl.innerHTML = `<p style="color:var(--c-text3);font-size:13px;text-align:center;padding:16px 0;">
        Meteran ${periodeBulan} ${periodeTahun} belum dicatat.
      </p>`;
    }
  } catch (err) {
    console.error("Detail:", err);
    showToast("Gagal memuat tagihan", "error");
  }
}

function openDetailFromDash(id_pelanggan, bulan = BULAN_INI, tahun = TAHUN_INI) {
  openDetail(id_pelanggan, "dashboard", bulan, tahun);
}

// ════════════════════════════════════════════════════════════════════════
//  CATAT METERAN
// ════════════════════════════════════════════════════════════════════════
let selPelMet    = null;
let metSearchTimer;
let metLastMeter  = null;
let metLockedExisting = false;

function byId(id) { return document.getElementById(id); }
function numVal(id) {
  const el = byId(id);
  if (!el) return 0;
  const n = parseFloat(el.value);
  return isNaN(n) ? 0 : n;
}
function strVal(id) {
  const el = byId(id);
  return el ? el.value.trim() : "";
}
function setVal(id, val) {
  const el = byId(id);
  if (el) el.value = val;
}
function setHidden(id, hidden) {
  const el = byId(id);
  if (el) el.classList.toggle("hidden", hidden);
}
function setDisabled(id, disabled) {
  const el = byId(id);
  if (el) el.disabled = disabled;
}

function resetMeteranForm() {
  selPelMet = null;
  metLastMeter = null;
  metLockedExisting = false;
  pgState.catat.data = [];
  pgState.catat.page = 1;
  byId("met-search").value = "";
  byId("met-search-results").innerHTML = "";
  byId("met-form-card").style.display = "none";
  byId("met-already-recorded").classList.add("hidden");
  byId("met-last-info").classList.add("hidden");
  byId("met-no-history").classList.add("hidden");
  setResetMeterVisible(false);
  setGantiMeterDetailVisible(false);
  resetGantiMeterFields();

  const metLalu  = byId("met-lalu");
  const metJalan = byId("met-jalan");
  metLalu.removeAttribute("readonly");
  metJalan.removeAttribute("readonly");
  metLalu.disabled = false;
  metJalan.disabled = false;
  metLalu.value  = "";
  metJalan.value = "";
  byId("met-lalu-hint").textContent = "m³";
  byId("met-jalan-label").textContent = "Meter Berjalan";
  byId("met-jalan-hint").textContent = "m³ — baca dari alat";
  setMeterCalc(0, 0, 0, 0, 0);

  byId("met-simpan-btn").disabled = false;
  setDisabled("met-bayar-btn", false);
}

function setResetMeterVisible(show) {
  const wrap = byId("met-reset-wrap");
  if (wrap) wrap.classList.toggle("hidden", !show);
}

function setGantiMeterDetailVisible(show) {
  setHidden("met-ganti-detail", !show);
  setHidden("met-pakai-lama-row", !show);
  setHidden("met-pakai-baru-row", !show);
  setHidden("met-bayar-note", !show);
}

function resetGantiMeterFields() {
  const cb = byId("met-reset-meter");
  if (cb) cb.checked = false;
  ["met-akhir-lama","met-awal-baru","met-no-lama","met-no-baru","met-bukti-ganti","met-catatan-ganti"].forEach(id => setVal(id, ""));
  const alasan = byId("met-alasan-ganti");
  if (alasan) alasan.value = "";
  if (byId("met-pakai-lama")) byId("met-pakai-lama").textContent = "0 m³";
  if (byId("met-pakai-baru")) byId("met-pakai-baru").textContent = "0 m³";
}

function setMeterCalc(pakai, tagihan, total, pakaiLama = 0, pakaiBaru = 0) {
  byId("met-pakai").textContent   = (pakai || 0) + " m³";
  byId("met-tagihan").textContent = rp(tagihan || 0);
  byId("met-total").textContent   = rp(total || 0);
  if (byId("met-pakai-lama")) byId("met-pakai-lama").textContent = (pakaiLama || 0) + " m³";
  if (byId("met-pakai-baru")) byId("met-pakai-baru").textContent = (pakaiBaru || 0) + " m³";
}

function isGantiMeter() {
  const cb = byId("met-reset-meter");
  return !!(cb && cb.checked);
}

function toggleGantiMeter() {
  if (metLockedExisting) return;

  const metLalu = byId("met-lalu");
  const hintLalu = byId("met-lalu-hint");
  const labelJalan = byId("met-jalan-label");
  const hintJalan = byId("met-jalan-hint");

  if (isGantiMeter()) {
    setGantiMeterDetailVisible(true);
    if (metLastMeter) {
      metLalu.value = metLastMeter.meter_berjalan;
      metLalu.setAttribute("readonly", true);
      setVal("met-akhir-lama", metLastMeter.meter_berjalan);
      if (!strVal("met-no-lama") && metLastMeter.no_meter_baru) setVal("met-no-lama", metLastMeter.no_meter_baru);
      hintLalu.textContent = `m³ — meter terakhir ${metLastMeter.bulan} ${metLastMeter.tahun}`;
    }
    if (!strVal("met-awal-baru")) setVal("met-awal-baru", 0);
    labelJalan.textContent = "Meter Berjalan Baru";
    hintJalan.textContent = "m³ — baca dari meter baru";
    setDisabled("met-bayar-btn", true);
  } else {
    setGantiMeterDetailVisible(false);
    if (metLastMeter) {
      metLalu.value = metLastMeter.meter_berjalan;
      metLalu.setAttribute("readonly", true);
      hintLalu.textContent = `m³ — otomatis dari ${metLastMeter.bulan} ${metLastMeter.tahun}`;
    } else {
      metLalu.value = "";
      metLalu.removeAttribute("readonly");
      hintLalu.textContent = "m³";
    }
    labelJalan.textContent = "Meter Berjalan";
    hintJalan.textContent = "m³ — baca dari alat";
    setDisabled("met-bayar-btn", false);
  }

  hitungPemakaian();
}

function doMetSearch(val) {
  clearTimeout(metSearchTimer);
  if (!val.trim()) {
    byId("met-search-results").innerHTML = "";
    pgState.catat.data = [];
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
      pgState.catat.data  = results;
      pgState.catat.page  = 1;
      renderMetSearchResults(results);
    } catch (e) { console.error("MetSearch:", e); }
  }, 300);
}

function renderMetSearchResults(list) {
  const el = byId("met-search-results");
  if (!list.length) {
    el.innerHTML = `<p style="color:var(--c-text3);font-size:13px;padding:8px 0;">Tidak ditemukan.</p>`;
    return;
  }
  const pg = paginate(list, pgState.catat.page);
  pgState.catat.page = pg.curPage;

  el.innerHTML =
    pg.items.map(p => `
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
    + renderPagination("catat", pg.curPage, pg.totalPages, list.length, pg.start, pg.end);
}

async function pilihPelMet(id) {
  if (!allPelanggan.length) await prefetchPelanggan();
  selPelMet = allPelanggan.find(p => p.id_pelanggan === id);
  if (!selPelMet) return;

  metLastMeter = null;
  metLockedExisting = false;
  byId("met-nama-lbl").textContent = selPelMet.nama;
  byId("met-no-lbl").textContent   = selPelMet.no_rumah;
  byId("met-lalu").value = "";
  byId("met-lalu").removeAttribute("readonly");
  byId("met-lalu").disabled = false;
  byId("met-jalan").value = "";
  byId("met-jalan").removeAttribute("readonly");
  byId("met-jalan").disabled = false;
  byId("met-lalu-hint").textContent = "m³";
  byId("met-jalan-label").textContent = "Meter Berjalan";
  byId("met-jalan-hint").textContent = "m³ — baca dari alat";
  byId("met-already-recorded").classList.add("hidden");
  byId("met-last-info").classList.add("hidden");
  byId("met-no-history").classList.add("hidden");
  setResetMeterVisible(false);
  setGantiMeterDetailVisible(false);
  resetGantiMeterFields();
  byId("met-simpan-btn").disabled = false;
  setDisabled("met-bayar-btn", false);
  setMeterCalc(0, 0, 5000, 0, 0);

  byId("met-form-card").style.display = "block";
  byId("met-search-results").innerHTML = "";
  byId("met-search").value = selPelMet.nama;

  let lastMeter = null;
  try {
    const histRes = await api({ action: "getLastMeter", token: session?.token, id_pelanggan: id });
    if (histRes.status === "ok" && histRes.meter_berjalan != null) {
      lastMeter = histRes;
      metLastMeter = histRes;
    }
  } catch (e) { console.error("LastMeter:", e); }

  try {
    const lapRes = await api({ action: "getLaporan", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI });
    if (lapRes.status === "ok") {
      const existing = (lapRes.detail || []).find(t =>
        t.id_pelanggan === id &&
        t.id_meteran &&
        t.id_transaksi &&
        t.status !== "Belum Dicatat" &&
        !t.is_unrecorded &&
        t.bulan === BULAN_INI &&
        String(t.tahun) === String(TAHUN_INI)
      );

      if (existing) {
        metLockedExisting = true;
        byId("met-already-recorded").classList.remove("hidden");
        byId("met-recorded-bulan").textContent = `${existing.bulan} ${existing.tahun}`;
        byId("met-simpan-btn").disabled = true;
        setDisabled("met-bayar-btn", true);
        setResetMeterVisible(false);
        setGantiMeterDetailVisible(false);

        if (lastMeter) {
          byId("met-last-bulan").textContent = `${lastMeter.bulan} ${lastMeter.tahun}`;
          byId("met-last-nilai").textContent = lastMeter.meter_berjalan;
          byId("met-last-info").classList.remove("hidden");
        }

        const metLalu = byId("met-lalu");
        const metJalan = byId("met-jalan");
        metLalu.value = 0;
        metJalan.value = 0;
        metLalu.setAttribute("readonly", true);
        metJalan.setAttribute("readonly", true);
        metLalu.disabled = true;
        metJalan.disabled = true;
        byId("met-lalu-hint").textContent = "m³ — sudah tercatat, input dikunci";
        byId("met-jalan-hint").textContent = "m³ — sudah tercatat, input dikunci";
        setMeterCalc(0, 0, 0, 0, 0);
        return;
      }
    }
  } catch (e) { console.error("Cek existing:", e); }

  if (lastMeter) {
    setResetMeterVisible(true);
    byId("met-lalu").value = lastMeter.meter_berjalan;
    byId("met-lalu").setAttribute("readonly", true);
    byId("met-lalu-hint").textContent = `m³ — otomatis dari ${lastMeter.bulan} ${lastMeter.tahun}`;
    byId("met-last-bulan").textContent = `${lastMeter.bulan} ${lastMeter.tahun}`;
    byId("met-last-nilai").textContent = lastMeter.meter_berjalan;
    byId("met-last-info").classList.remove("hidden");
    hitungPemakaian();
  } else {
    setResetMeterVisible(false);
    byId("met-no-history").classList.remove("hidden");
  }
}

function hitungPemakaian() {
  if (metLockedExisting) {
    setMeterCalc(0, 0, 0, 0, 0);
    return;
  }

  const lalu = numVal("met-lalu");
  const jalan = numVal("met-jalan");
  let pakai = 0;
  let pakaiLama = 0;
  let pakaiBaru = 0;

  if (isGantiMeter()) {
    const akhirLama = numVal("met-akhir-lama");
    const awalBaru = numVal("met-awal-baru");
    pakaiLama = Math.max(0, akhirLama - lalu);
    pakaiBaru = Math.max(0, jalan - awalBaru);
    pakai = pakaiLama + pakaiBaru;
  } else {
    pakai = Math.max(0, jalan - lalu);
  }

  const tagihan = pakai * 1500;
  const total = tagihan + 5000;
  setMeterCalc(pakai, tagihan, total, pakaiLama, pakaiBaru);
}

function validasiFormGantiMeter(lalu, jalan) {
  const akhirLama = numVal("met-akhir-lama");
  const awalBaru = numVal("met-awal-baru");
  const alasan = strVal("met-alasan-ganti");
  const noBaru = strVal("met-no-baru");

  if (!metLastMeter) return "Mode ganti meter butuh riwayat meter sebelumnya.";
  if (!alasan) return "Alasan ganti meter wajib dipilih.";
  if (!noBaru) return "No meter baru wajib diisi.";
  if (akhirLama < lalu) return "Meter akhir lama tidak boleh lebih kecil dari meter bulan lalu.";
  if (jalan < awalBaru) return "Meter berjalan baru tidak boleh lebih kecil dari meter awal baru.";
  return "";
}

async function simpanMeteran(lanjutBayar = false) {
  if (!selPelMet) { showToast("Pilih pelanggan dahulu", "error"); return; }

  const lalu = parseFloat(byId("met-lalu").value);
  const jalan = parseFloat(byId("met-jalan").value);

  if (metLockedExisting) { showToast("Data bulan ini sudah tercatat", "error"); return; }
  if (isNaN(lalu) || isNaN(jalan)) { showToast("Isi meter bulan lalu & berjalan", "error"); return; }

  if (isGantiMeter()) {
    if (lanjutBayar) { showToast("Ganti meter harus disimpan dan menunggu approval admin sebelum pembayaran.", "error"); return; }
    const pesan = validasiFormGantiMeter(lalu, jalan);
    if (pesan) { showToast(pesan, "error"); return; }
  } else if (jalan < lalu) {
    showToast("Meter berjalan lebih kecil. Aktifkan mode Ganti Meter jika mesin meter diganti.", "error");
    return;
  }

  const btnSimpan = byId("met-simpan-btn");
  const btnBayar = byId("met-bayar-btn");
  const activeBtn = lanjutBayar && btnBayar ? btnBayar : btnSimpan;

  btnSimpan.disabled = true;
  if (btnBayar) btnBayar.disabled = true;
  activeBtn.textContent = lanjutBayar ? "Menyimpan tagihan…" : "Menyimpan…";

  const akhirLama = isGantiMeter() ? numVal("met-akhir-lama") : "";
  const awalBaru = isGantiMeter() ? numVal("met-awal-baru") : "";
  const pakaiLama = isGantiMeter() ? Math.max(0, akhirLama - lalu) : 0;
  const pakaiBaru = isGantiMeter() ? Math.max(0, jalan - awalBaru) : 0;
  const pemakaian = isGantiMeter() ? pakaiLama + pakaiBaru : Math.max(0, jalan - lalu);
  const tagihan = pemakaian * 1500;
  const admin = 5000;
  const total = tagihan + admin;

  try {
    const ts = Date.now();
    const idMeteran = `MET-${ts}`;
    const idTransaksi = `TRX-${ts}`;
    const tipe = isGantiMeter() ? "Ganti Meter" : "Normal";

    const payload = {
      id_meteran: idMeteran,
      id_transaksi: idTransaksi,
      id_pelanggan: selPelMet.id_pelanggan,
      no_rumah: selPelMet.no_rumah,
      nama: selPelMet.nama,
      bulan: BULAN_INI,
      tahun: TAHUN_INI,
      meter_lalu: lalu,
      meter_berjalan: jalan,
      tipe_pencatatan: tipe,
      meter_akhir_lama: akhirLama,
      meter_awal_baru: awalBaru,
      pemakaian_meter_lama: pakaiLama,
      pemakaian_meter_baru: pakaiBaru,
      no_meter_lama: strVal("met-no-lama"),
      no_meter_baru: strVal("met-no-baru"),
      alasan_ganti_meter: strVal("met-alasan-ganti"),
      bukti_ganti_meter: strVal("met-bukti-ganti"),
      catatan_ganti_meter: strVal("met-catatan-ganti"),
      petugas: session?.nama || "",
    };

    const res = await api({ action: "saveMeteran", token: session?.token, data: payload });

    if (res.status === "ok") {
      currentPel = selPelMet;
      currentTrx = {
        id_transaksi: idTransaksi,
        id_meteran: idMeteran,
        id_pelanggan: selPelMet.id_pelanggan,
        no_rumah: selPelMet.no_rumah,
        nama: selPelMet.nama,
        bulan: BULAN_INI,
        tahun: TAHUN_INI,
        pemakaian,
        tagihan,
        admin,
        jumlah_bayar: total,
        status: "Belum Bayar",
        tgl_bayar: "",
        tipe_pencatatan: tipe,
        status_approval: isGantiMeter() ? "Menunggu" : "Tidak Perlu",
        meter_lalu: lalu,
        meter_berjalan: jalan,
        meter_akhir_lama: akhirLama,
        meter_awal_baru: awalBaru,
        pemakaian_meter_lama: pakaiLama,
        pemakaian_meter_baru: pakaiBaru,
      };
      currentPeriode = { bulan: BULAN_INI, tahun: TAHUN_INI };
      fromPage = "meteran";

      if (lanjutBayar) {
        showToast("Data meteran disimpan. Lanjut pembayaran.", "success");
        openModal();
      } else {
        showToast(isGantiMeter() ? "Data ganti meter tersimpan. Menunggu approval admin." : "Data meteran disimpan ✓", "success");
        resetMeteranForm();
        loadDashboard();
      }
    } else {
      showToast(res.message || "Gagal menyimpan", "error");
      btnSimpan.disabled = false;
      if (btnBayar) btnBayar.disabled = isGantiMeter();
    }
  } catch (err) {
    console.error("SaveMeteran:", err);
    showToast("Gagal menyimpan data meteran", "error");
    btnSimpan.disabled = false;
    if (btnBayar) btnBayar.disabled = isGantiMeter();
  } finally {
    btnSimpan.innerHTML  = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2"/>
      <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2"/>
    </svg> Simpan Data Meteran`;

    if (btnBayar) {
      btnBayar.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg> Terima Pembayaran`;
    }
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
  ["lap-total","lap-lunas","lap-belum","lap-terkumpul","lap-subsidi","lap-setoran","lap-piutang"]
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
    const subsidiEl = document.getElementById("lap-subsidi");
    const setoranEl = document.getElementById("lap-setoran");
    if (subsidiEl) subsidiEl.textContent = rp(laporan.total_subsidi);
    if (setoranEl) setoranEl.textContent = rp(laporan.total_setoran);
    document.getElementById("lap-piutang").textContent   = rp(laporan.total_piutang);

    const belum = (detail || []).filter(t => t.status !== "Lunas");
    pgState.laporan.data = belum;
    pgState.laporan.page = 1;
    renderLaporanList();

  } catch (err) {
    console.error("Laporan:", err);
    document.getElementById("lap-list").innerHTML =
      `<div class="empty"><p>Gagal memuat data. Coba lagi.</p></div>`;
  }
}

async function exportLaporanExcel() {
  const bulan = document.getElementById("lap-filter-bulan").value;
  const tahun = parseInt(document.getElementById("lap-filter-tahun").value);
  const btn = document.getElementById("btn-export-laporan");
  const oldHtml = btn ? btn.innerHTML : "";

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Membuat Excel…`;
  }

  try {
    const res = await api({ action: "getLaporan", token: session?.token, bulan, tahun });
    if (res.status !== "ok") throw new Error(res.message || "Data laporan gagal dimuat");

    if (!Array.isArray(res.export_detail)) {
      throw new Error("Data export_detail belum tersedia. Update Apps Script ke versi v5, lalu deploy New version.");
    }
    const rows = res.export_detail;
    const subsidiRows = Array.isArray(res.subsidi_rows) ? res.subsidi_rows : [];
    const laporan = res.laporan || {};
    const fileName = `Export Laporan ${bulan} ${tahun}.xlsx`;

    if (typeof XLSX === "undefined") {
      downloadLaporanExcelXml(rows, subsidiRows, laporan, bulan, tahun);
      showToast("Export Excel dibuat dalam format .xls", "success");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(buildSheet1Laporan(rows, bulan, tahun));
    const ws2 = XLSX.utils.aoa_to_sheet(buildSheet2Setoran(subsidiRows, laporan, bulan, tahun));

    ws1["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }
    ];
    ws2["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }
    ];

    ws1["!cols"] = [
      { wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 16 },
      { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 15 },
      { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }
    ];
    ws2["!cols"] = [
      { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 34 }
    ];

    applyNumberFormat(ws1, "E", 4, rows.length + 3, "#,##0");
    applyNumberFormat(ws1, "F", 4, rows.length + 3, "#,##0");
    applyNumberFormat(ws1, "G", 4, rows.length + 3, "#,##0");
    applyNumberFormat(ws1, "H", 4, rows.length + 3, "#,##0");
    applyNumberFormat(ws1, "I", 4, rows.length + 3, "#,##0");
    applyNumberFormat(ws1, "J", 4, rows.length + 3, "#,##0");
    applyNumberFormat(ws1, "K", 4, rows.length + 3, "#,##0");

    const totalSubsidiRow = 6 + Math.max(subsidiRows.length, 1);
    const totalSetoranRow = totalSubsidiRow + 2;
    if (subsidiRows.length) {
      ws2[`C${totalSubsidiRow}`] = { t: "n", f: `SUM(C6:C${totalSubsidiRow - 1})` };
    }
    ws2[`C${totalSetoranRow}`] = { t: "n", f: `C3-C${totalSubsidiRow}` };
    applyNumberFormat(ws2, "C", 3, totalSetoranRow, "#,##0");

    XLSX.utils.book_append_sheet(wb, ws1, "Sheet1");
    XLSX.utils.book_append_sheet(wb, ws2, "Sheet2");
    XLSX.writeFile(wb, fileName);

    showToast("Export Excel berhasil diunduh", "success");
  } catch (err) {
    console.error("ExportLaporan:", err);
    showToast(err.message || "Gagal export Excel", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  }
}

function buildSheet1Laporan(rows, bulan, tahun) {
  const data = [
    ["DAFTAR PELANGGAN RT.005/01"],
    [`LAPORAN BULAN : ${String(bulan).toUpperCase()} ${tahun}`],
    [
      "No",
      "No Rumah",
      "Nama",
      "Periode Tagihan",
      "Meter Berjalan (m³)",
      "Meter Bulan Lalu (m³)",
      "Pemakaian (m³)",
      "Tagihan (Rp)",
      "Biaya Admin (Rp)",
      "Piutang (Rp)",
      "Jumlah Bayar (Rp)",
      "Status Bayar",
      "Tgl Bayar",
      "Metode Bayar"
    ]
  ];

  rows.forEach((r, i) => {
    const status = String(r.status || "").trim();
    const nominal = toNumber(r.jumlah_bayar);
    const jumlahDibayar = status === "Lunas" ? nominal : 0;
    const piutang = status === "Belum Bayar" ? nominal : 0;

    data.push([
      i + 1,
      r.no_rumah || "",
      r.nama || "",
      r.periode_label || `${r.bulan || bulan} ${r.tahun || tahun}`,
      excelNumberOrBlank(r.meter_berjalan),
      excelNumberOrBlank(r.meter_lalu),
      excelNumberOrBlank(r.pemakaian),
      toNumber(r.tagihan),
      toNumber(r.admin),
      piutang,
      jumlahDibayar,
      status || "",
      formatTanggalLaporan(r.tgl_bayar),
      r.metode_bayar || ""
    ]);
  });

  return data;
}

function buildSheet2Setoran(subsidiRows, laporan, bulan, tahun) {
  const data = [
    [`RINGKASAN SETORAN ${String(bulan).toUpperCase()} ${tahun}`],
    [],
    ["Total Pembayaran", "", toNumber(laporan.total_terkumpul), "Terkumpul berdasarkan tanggal bayar"],
    [],
    ["Subsidi", "Kategori", "Nominal", "Nama"]
  ];

  if (subsidiRows.length) {
    subsidiRows.forEach(r => {
      data.push(["", r.kategori || "", toNumber(r.nominal), r.nama || ""]);
    });
  } else {
    data.push(["", "", 0, "Tidak ada data subsidi"]);
  }

  data.push(["Total Subsidi", "", toNumber(laporan.total_subsidi), "Diambil dari sheet subsidi"]);
  data.push([]);
  data.push(["Total Setoran", "", toNumber(laporan.total_setoran), "Total Pembayaran - Total Subsidi"]);

  return data;
}

function applyNumberFormat(ws, col, startRow, endRow, fmt) {
  for (let r = startRow; r <= endRow; r++) {
    const cell = ws[`${col}${r}`];
    if (cell && typeof cell.v === "number") cell.z = fmt;
  }
}

function excelNumberOrBlank(value) {
  if (value === "" || value === null || value === undefined) return "";
  return toNumber(value);
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (value === "" || value === null || value === undefined) return 0;
  const clean = String(value).replace(/[^0-9,-]/g, "").replace(",", ".");
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}

function formatTanggalLaporan(value) {
  if (!value) return "";
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return String(value);
}

function downloadLaporanExcelXml(rows, subsidiRows, laporan, bulan, tahun) {
  const sheet1 = buildSheet1Laporan(rows, bulan, tahun);
  const sheet2 = buildSheet2Setoran(subsidiRows, laporan, bulan, tahun);
  const xml = buildExcelXmlWorkbook(sheet1, sheet2);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Export Laporan ${bulan} ${tahun}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildExcelXmlWorkbook(sheet1, sheet2) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1"><Table>${sheet1.map(rowToExcelXml).join("")}</Table></Worksheet>
 <Worksheet ss:Name="Sheet2"><Table>${sheet2.map(rowToExcelXml).join("")}</Table></Worksheet>
</Workbook>`;
}

function rowToExcelXml(row) {
  return `<Row>${row.map(cellToExcelXml).join("")}</Row>`;
}

function cellToExcelXml(value) {
  const type = typeof value === "number" ? "Number" : "String";
  return `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLaporanList() {
  const { data, page } = pgState.laporan;
  const el = document.getElementById("lap-list");

  if (!data.length) {
    el.innerHTML = `<div class="empty"><p>Semua sudah lunas 🎉</p></div>`;
    return;
  }

  const pg = paginate(data, page);
  pgState.laporan.page = pg.curPage;

  el.innerHTML = pg.items.map(t => {
    const isUnrecorded = t.status === "Belum Dicatat";
    const badge = isUnrecorded
      ? `<span class="badge badge-amber">Belum Dicatat</span>`
      : `<span class="badge badge-red">Belum</span>`;
    const nominal = isUnrecorded ? "Belum dicatat" : rp(t.jumlah_bayar);
    const bulan = esc(t.bulan || document.getElementById("lap-filter-bulan").value || BULAN_INI);
    const tahun = esc(t.tahun || document.getElementById("lap-filter-tahun").value || TAHUN_INI);

    return `
    <div class="pel-item" onclick="openDetail('${esc(t.id_pelanggan)}','laporan','${bulan}','${tahun}')">
      <div class="avatar av-a">${initials(t.nama)}</div>
      <div class="pel-info">
        <div class="pel-name">${escHtml(t.nama)}</div>
        <div class="pel-sub">${escHtml(t.no_rumah)} · ${escHtml(t.periode_label || `${bulan} ${tahun}`)} · ${nominal}</div>
      </div>
      ${badge}
    </div>`;
  }).join("")
  + renderPagination("laporan", pg.curPage, pg.totalPages, data.length, pg.start, pg.end);
}

// ════════════════════════════════════════════════════════════════════════
//  MODAL BAYAR
// ════════════════════════════════════════════════════════════════════════
function openModal() {
  if (!currentTrx) return;
  if (isApprovalBlocked(currentTrx)) {
    showToast("Pembayaran ganti meter harus menunggu approval admin", "error");
    return;
  }
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
  if (isApprovalBlocked(currentTrx)) {
    closeModal();
    showToast("Pembayaran ganti meter harus menunggu approval admin", "error");
    return;
  }
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
      loadDashboard();
      // Reload detail halaman yang sama
      setTimeout(() => openDetail(currentPel.id_pelanggan, fromPage, currentPeriode.bulan, currentPeriode.tahun), 400);
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
