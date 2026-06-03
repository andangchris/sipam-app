// ════════════════════════════════════════════════════════
//  APLIKASI UTAMA SiPAM
// ════════════════════════════════════════════════════════

// State
let session = JSON.parse(sessionStorage.getItem("sipam_session") || "null");
let allPelanggan = [];
let currentPel = null;
let currentTrx = null;
let metodeAktif = "Tunai";
let fromPage = "dashboard";
let DEMO_MET_COUNTER = 11;

// Demo data
const DEMO_USERS = [
  { username: "admin", password: "admin123", nama: "Administrator", role: "admin" },
  { username: "petugas.a", password: "petugas123", nama: "Petugas Lapangan A", role: "petugas" },
];

const DEMO_PEL = [
  { id_pelanggan: "PLG-001", no_rumah: "A-01", nama: "Budi Santoso", alamat: "Jl. Mawar No. 1", no_telpon: "081234567890" },
  { id_pelanggan: "PLG-002", no_rumah: "A-02", nama: "Siti Rahayu", alamat: "Jl. Mawar No. 2", no_telpon: "081234567891" },
  { id_pelanggan: "PLG-003", no_rumah: "A-03", nama: "Ahmad Fauzi", alamat: "Jl. Melati No. 5", no_telpon: "081234567892" },
  { id_pelanggan: "PLG-004", no_rumah: "A-04", nama: "Dewi Lestari", alamat: "Jl. Melati No. 7", no_telpon: "081234567893" },
  { id_pelanggan: "PLG-005", no_rumah: "A-05", nama: "Hendra Wijaya", alamat: "Jl. Anggrek No. 3", no_telpon: "081234567894" },
  { id_pelanggan: "PLG-006", no_rumah: "A-06", nama: "Rina Susanti", alamat: "Jl. Anggrek No. 5", no_telpon: "081234567895" },
  { id_pelanggan: "PLG-007", no_rumah: "A-07", nama: "Joko Prabowo", alamat: "Jl. Kenanga No. 2", no_telpon: "081234567896" },
  { id_pelanggan: "PLG-008", no_rumah: "A-08", nama: "Maya Putri", alamat: "Jl. Kenanga No. 4", no_telpon: "081234567897" },
  { id_pelanggan: "PLG-009", no_rumah: "A-09", nama: "Doni Setiawan", alamat: "Jl. Flamboyan No. 1", no_telpon: "081234567898" },
  { id_pelanggan: "PLG-010", no_rumah: "A-10", nama: "Lia Permata", alamat: "Jl. Flamboyan No. 3", no_telpon: "081234567899" },
];

let DEMO_TRX = [
  { id_transaksi: "TRX-001", id_pelanggan: "PLG-001", no_rumah: "A-01", nama: "Budi Santoso", pemakaian: 15, jumlah_bayar: 27500, status: "Lunas", tgl_bayar: "2026-06-05" },
  { id_transaksi: "TRX-002", id_pelanggan: "PLG-002", no_rumah: "A-02", nama: "Siti Rahayu", pemakaian: 17, jumlah_bayar: 30500, status: "Belum Bayar", tgl_bayar: "" },
  { id_transaksi: "TRX-003", id_pelanggan: "PLG-003", no_rumah: "A-03", nama: "Ahmad Fauzi", pemakaian: 18, jumlah_bayar: 32000, status: "Lunas", tgl_bayar: "2026-06-05" },
  { id_transaksi: "TRX-004", id_pelanggan: "PLG-004", no_rumah: "A-04", nama: "Dewi Lestari", pemakaian: 18, jumlah_bayar: 32000, status: "Lunas", tgl_bayar: "2026-06-06" },
  { id_transaksi: "TRX-005", id_pelanggan: "PLG-005", no_rumah: "A-05", nama: "Hendra Wijaya", pemakaian: 16, jumlah_bayar: 29000, status: "Belum Bayar", tgl_bayar: "" },
  { id_transaksi: "TRX-006", id_pelanggan: "PLG-006", no_rumah: "A-06", nama: "Rina Susanti", pemakaian: 17, jumlah_bayar: 30500, status: "Lunas", tgl_bayar: "2026-06-06" },
  { id_transaksi: "TRX-007", id_pelanggan: "PLG-007", no_rumah: "A-07", nama: "Joko Prabowo", pemakaian: 15, jumlah_bayar: 27500, status: "Belum Bayar", tgl_bayar: "" },
  { id_transaksi: "TRX-008", id_pelanggan: "PLG-008", no_rumah: "A-08", nama: "Maya Putri", pemakaian: 18, jumlah_bayar: 32000, status: "Lunas", tgl_bayar: "2026-06-07" },
  { id_transaksi: "TRX-009", id_pelanggan: "PLG-009", no_rumah: "A-09", nama: "Doni Setiawan", pemakaian: 18, jumlah_bayar: 32000, status: "Lunas", tgl_bayar: "2026-06-07" },
  { id_transaksi: "TRX-010", id_pelanggan: "PLG-010", no_rumah: "A-10", nama: "Lia Permata", pemakaian: 17, jumlah_bayar: 30500, status: "Belum Bayar", tgl_bayar: "" },
];

let DEMO_MET_DATA = [
  { id_pelanggan: "PLG-001", meter_berjalan: 135, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-002", meter_berjalan: 102, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-003", meter_berjalan: 218, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-004", meter_berjalan: 328, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-005", meter_berjalan: 61, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-006", meter_berjalan: 195, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-007", meter_berjalan: 107, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-008", meter_berjalan: 278, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-009", meter_berjalan: 151, bulan: "Mei", tahun: 2026, urutan: 1 },
  { id_pelanggan: "PLG-010", meter_berjalan: 84, bulan: "Mei", tahun: 2026, urutan: 1 },
];

// ════════════════════════════════════════════════════════
//  API CALL
// ════════════════════════════════════════════════════════
async function api(body) {
  if (USE_DEMO_MODE) return demoApi(body);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      mode: "cors"
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    showToast("Koneksi ke server gagal, menggunakan data demo", "error");
    return demoApi(body);
  }
}

async function demoApi(body) {
  await new Promise(r => setTimeout(r, 350));
  const { action } = body;

  if (action === "login") {
    const u = DEMO_USERS.find(x => x.username === body.username && x.password === body.password);
    if (!u) return { status: "error", message: "Username atau password salah." };
    return { status: "ok", token: "demo-token", nama: u.nama, role: u.role, id_user: "USR-DEMO" };
  }
  if (action === "getPelanggan") return { status: "ok", data: DEMO_PEL };
  if (action === "searchPelanggan") {
    const kw = body.keyword.toLowerCase();
    return { status: "ok", data: DEMO_PEL.filter(p => p.no_rumah.toLowerCase().includes(kw) || p.nama.toLowerCase().includes(kw)) };
  }
  if (action === "getLastMeter") {
    const found = DEMO_MET_DATA.filter(m => m.id_pelanggan === body.id_pelanggan).sort((a, b) => b.urutan - a.urutan)[0];
    if (found) return { status: "ok", meter_berjalan: found.meter_berjalan, bulan: found.bulan, tahun: found.tahun };
    return { status: "ok", meter_berjalan: null };
  }
  if (action === "saveMeteran") {
    const d = body.data;
    const pakai = d.meter_berjalan - d.meter_lalu;
    const tagihan = pakai * 1500;
    const existing = DEMO_TRX.find(t => t.id_pelanggan === d.id_pelanggan);
    if (existing) {
      existing.pemakaian = pakai;
      existing.jumlah_bayar = tagihan + 5000;
      existing.status = "Belum Bayar";
    } else {
      DEMO_TRX.push({
        id_transaksi: `TRX-0${DEMO_TRX.length + 1}`,
        id_pelanggan: d.id_pelanggan,
        no_rumah: d.no_rumah,
        nama: d.nama,
        pemakaian: pakai,
        jumlah_bayar: tagihan + 5000,
        status: "Belum Bayar",
        tgl_bayar: ""
      });
    }
    const existMet = DEMO_MET_DATA.findIndex(m => m.id_pelanggan === d.id_pelanggan);
    const newMet = { id_pelanggan: d.id_pelanggan, meter_berjalan: d.meter_berjalan, bulan: d.bulan, tahun: d.tahun, urutan: Date.now() };
    if (existMet >= 0) DEMO_MET_DATA[existMet] = newMet;
    else DEMO_MET_DATA.push(newMet);
    return { status: "ok", message: "Data meteran berhasil disimpan." };
  }
  if (action === "saveTransaksi") {
    const t = DEMO_TRX.find(x => x.id_transaksi === body.id_transaksi);
    if (t) { t.status = "Lunas"; t.tgl_bayar = new Date().toISOString().split("T")[0]; }
    return { status: "ok", message: "Pembayaran berhasil dicatat." };
  }
  if (action === "getLaporan") {
    const lunas = DEMO_TRX.filter(t => t.status === "Lunas");
    const belum = DEMO_TRX.filter(t => t.status === "Belum Bayar");
    const terkumpul = lunas.reduce((s, t) => s + t.jumlah_bayar, 0);
    const piutang = belum.reduce((s, t) => s + t.jumlah_bayar, 0);
    return {
      status: "ok",
      laporan: {
        bulan: BULAN_INI, tahun: TAHUN_INI,
        total_pelanggan: DEMO_TRX.length,
        sudah_bayar: lunas.length,
        belum_bayar: belum.length,
        total_terkumpul: terkumpul,
        total_piutang: piutang,
      },
      detail: DEMO_TRX
    };
  }
  return { status: "error", message: "Action tidak dikenal" };
}

// ════════════════════════════════════════════════════════
//  LOGIN / LOGOUT
// ════════════════════════════════════════════════════════
async function doLogin() {
  const username = document.getElementById("inp-username").value.trim();
  const password = document.getElementById("inp-password").value;
  const errEl = document.getElementById("login-err");
  const btn = document.getElementById("btn-login");

  if (!username || !password) {
    showErr("Username dan password wajib diisi.");
    return;
  }

  btn.textContent = "Memverifikasi…";
  btn.disabled = true;

  const res = await api({ action: "login", username, password });

  btn.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Masuk`;
  btn.disabled = false;

  if (res.status !== "ok") {
    showErr(res.message);
    return;
  }

  errEl.style.display = "none";
  session = { token: res.token, nama: res.nama, role: res.role, id_user: res.id_user };
  sessionStorage.setItem("sipam_session", JSON.stringify(session));
  showApp();
}

function showErr(msg) {
  const e = document.getElementById("login-err");
  e.textContent = msg;
  e.style.display = "block";
}

function doLogout() {
  sessionStorage.removeItem("sipam_session");
  session = null;
  showPage("pg-login");
  document.getElementById("inp-username").value = "";
  document.getElementById("inp-password").value = "";
}

// ════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function showApp() {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  document.getElementById("dash-greeting").textContent = greeting + ", " + (session?.role === "admin" ? "Admin" : "Petugas");
  document.getElementById("dash-nama").textContent = session?.nama || "—";
  showPage("pg-dashboard");
  loadDashboard();
}

function goPage(page) {
  const map = { dashboard: "pg-dashboard", pelanggan: "pg-pelanggan", meteran: "pg-meteran", laporan: "pg-laporan" };
  showPage(map[page]);
  if (page === "dashboard") loadDashboard();
  if (page === "laporan") { initFilterLaporan(); loadLaporan(); }
  if (page === "pelanggan") { document.getElementById("search-input").value = ""; renderSearchResults([]); }
  if (page === "meteran") {
    document.getElementById("met-search").value = "";
    document.getElementById("met-search-results").innerHTML = "";
    document.getElementById("met-form-card").style.display = "none";
  }
}

function goBack() {
  showPage(fromPage === "meteran" ? "pg-meteran" : fromPage === "pelanggan" ? "pg-pelanggan" : "pg-dashboard");
}

// ════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════
async function loadDashboard() {
  const res = await api({ action: "getLaporan", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI });
  if (res.status !== "ok") return;

  const { laporan, detail } = res;
  document.getElementById("s-total").textContent = laporan.total_pelanggan;
  document.getElementById("s-lunas").textContent = laporan.sudah_bayar;
  document.getElementById("s-belum").textContent = laporan.belum_bayar;
  document.getElementById("s-nominal").textContent = rp(laporan.total_terkumpul);

  const pct = laporan.total_pelanggan ? Math.round(laporan.sudah_bayar / laporan.total_pelanggan * 100) : 0;
  document.getElementById("s-progress").style.width = pct + "%";
  document.getElementById("s-pct").textContent = pct + "% lunas";

  const belum = (detail || []).filter(t => t.status === "Belum Bayar");
  const listEl = document.getElementById("dash-belum-list");

  if (!belum.length) {
    listEl.innerHTML = `<div class="empty"><svg fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><p>Semua pelanggan sudah lunas! 🎉</p></div>`;
    return;
  }

  listEl.innerHTML = belum.map(t => `
    <div class="pel-item" onclick="openDetailFromDash('${t.id_pelanggan}','${t.id_transaksi}')">
      <div class="avatar av-a">${initials(t.nama)}</div>
      <div class="pel-info">
        <div class="pel-name">${escapeHtml(t.nama)}</div>
        <div class="pel-sub">${t.no_rumah} · ${rp(t.jumlah_bayar)}</div>
      </div>
      <span class="badge badge-red">Belum</span>
    </div>`).join("");
}

// ════════════════════════════════════════════════════════
//  CARI PELANGGAN
// ════════════════════════════════════════════════════════
let searchTimer;

function doSearch(val) {
  clearTimeout(searchTimer);
  if (!val.trim()) {
    renderSearchResults([]);
    return;
  }
  searchTimer = setTimeout(async () => {
    const res = await api({ action: "searchPelanggan", token: session?.token, keyword: val });
    if (res.status === "ok") renderSearchResults(res.data);
  }, 300);
}

function renderSearchResults(list) {
  const el = document.getElementById("search-results");
  if (!list.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `<div class="card"><div class="card-body" style="padding:0 16px;">${list.map((p, i) => `
      <div class="pel-item" onclick="openDetail('${p.id_pelanggan}','pelanggan')">
        <div class="avatar ${['av-b', 'av-g', 'av-a'][i % 3]}">${initials(p.nama)}</div>
        <div class="pel-info">
          <div class="pel-name">${escapeHtml(p.nama)}</div>
          <div class="pel-sub">${p.no_rumah} · ${escapeHtml(p.alamat)}</div>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>`).join("")}</div></div>`;
}

// ════════════════════════════════════════════════════════
//  DETAIL PELANGGAN
// ════════════════════════════════════════════════════════
async function openDetail(id_pelanggan, from = "dashboard") {
  fromPage = from;
  if (!allPelanggan.length) {
    const res = await api({ action: "getPelanggan", token: session?.token });
    if (res.status === "ok") allPelanggan = res.data;
  }

  const pel = allPelanggan.find(p => p.id_pelanggan === id_pelanggan);
  if (!pel) return;

  currentPel = pel;
  document.getElementById("detail-nama").textContent = pel.nama;
  document.getElementById("detail-norumah").textContent = pel.no_rumah;
  document.getElementById("detail-alamat").textContent = pel.alamat;
  document.getElementById("detail-telp").textContent = pel.no_telpon || "—";
  document.getElementById("detail-id").textContent = pel.id_pelanggan;

  const lapRes = await api({ action: "getLaporan", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI });
  const trx = lapRes.status === "ok" ? lapRes.detail?.find(t => t.id_pelanggan === id_pelanggan) : null;
  const actionsEl = document.getElementById("detail-actions");

  if (trx) {
    currentTrx = trx;
    const lunas = trx.status === "Lunas";
    document.getElementById("detail-pakai").textContent = trx.pemakaian + " m³";
    document.getElementById("detail-tagihan").textContent = rp(trx.pemakaian * 1500);
    document.getElementById("detail-total").textContent = rp(trx.jumlah_bayar);

    const badge = document.getElementById("detail-badge");
    badge.textContent = lunas ? "Lunas" : "Belum Bayar";
    badge.className = "badge " + (lunas ? "badge-green" : "badge-red");

    actionsEl.innerHTML = lunas
      ? `<div class="card"><div class="card-body" style="text-align:center;color:var(--c-green);padding:20px;"><b>✓ Sudah Lunas</b><br><small style="color:var(--c-text3)">${trx.tgl_bayar}</small></div></div>`
      : `<button class="btn btn-green" onclick="openModal()"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Terima Pembayaran</button>`;
  } else {
    document.getElementById("detail-pakai").textContent = "—";
    document.getElementById("detail-tagihan").textContent = "—";
    document.getElementById("detail-total").textContent = "—";
    document.getElementById("detail-badge").textContent = "Belum Dicatat";
    document.getElementById("detail-badge").className = "badge badge-amber";
    actionsEl.innerHTML = `<p style="color:var(--c-text3);font-size:13px;text-align:center;padding:16px 0;">Meteran bulan ini belum dicatat.</p>`;
  }

  showPage("pg-detail");
}

function openDetailFromDash(id_pelanggan, id_transaksi) {
  openDetail(id_pelanggan, "dashboard");
}

// ════════════════════════════════════════════════════════
//  CATAT METERAN
// ════════════════════════════════════════════════════════
let selPelMet = null;
let metSearchTimer;

function doMetSearch(val) {
  clearTimeout(metSearchTimer);
  if (!val.trim()) {
    document.getElementById("met-search-results").innerHTML = "";
    return;
  }
  metSearchTimer = setTimeout(async () => {
    const res = await api({ action: "searchPelanggan", token: session?.token, keyword: val });
    if (res.status !== "ok") return;
    const el = document.getElementById("met-search-results");
    el.innerHTML = res.data.length ? res.data.map(p => `
      <div class="pel-item" style="padding:10px 0;cursor:pointer;" onclick="pilihPelMet('${p.id_pelanggan}')">
        <div class="avatar av-b">${initials(p.nama)}</div>
        <div class="pel-info">
          <div class="pel-name">${escapeHtml(p.nama)}</div>
          <div class="pel-sub">${p.no_rumah}</div>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>`).join("") : `<p style="color:var(--c-text3);font-size:13px;">Tidak ditemukan.</p>`;
  }, 300);
}

async function pilihPelMet(id) {
  if (!allPelanggan.length) {
    const res = await api({ action: "getPelanggan", token: session?.token });
    if (res.status === "ok") allPelanggan = res.data;
  }

  selPelMet = allPelanggan.find(p => p.id_pelanggan === id);
  if (!selPelMet) return;

  document.getElementById("met-nama-lbl").textContent = selPelMet.nama;
  document.getElementById("met-no-lbl").textContent = selPelMet.no_rumah;
  document.getElementById("met-lalu").value = "";
  document.getElementById("met-jalan").value = "";
  document.getElementById("met-last-info").style.display = "none";
  document.getElementById("met-no-history").style.display = "none";
  hitungPemakaian();
  document.getElementById("met-form-card").style.display = "block";
  document.getElementById("met-search-results").innerHTML = "";
  document.getElementById("met-search").value = selPelMet.nama;

  const histRes = await api({ action: "getLastMeter", token: session?.token, id_pelanggan: id });
  if (histRes.status === "ok" && histRes.meter_berjalan != null) {
    document.getElementById("met-lalu").value = histRes.meter_berjalan;
    document.getElementById("met-lalu").setAttribute("readonly", true);
    document.getElementById("met-lalu-hint").textContent = `m³ — otomatis dari ${histRes.bulan}`;
    document.getElementById("met-last-bulan").textContent = histRes.bulan + " " + histRes.tahun;
    document.getElementById("met-last-nilai").textContent = histRes.meter_berjalan;
    document.getElementById("met-last-info").style.display = "flex";
    hitungPemakaian();
  } else {
    document.getElementById("met-lalu").removeAttribute("readonly");
    document.getElementById("met-lalu-hint").textContent = "m³ — isi manual";
    document.getElementById("met-no-history").style.display = "flex";
  }
}

function hitungPemakaian() {
  const lalu = parseFloat(document.getElementById("met-lalu").value) || 0;
  const jalan = parseFloat(document.getElementById("met-jalan").value) || 0;
  const pakai = Math.max(0, jalan - lalu);
  const tagihan = pakai * 1500;
  const total = tagihan + 5000;

  document.getElementById("met-pakai").textContent = pakai + " m³";
  document.getElementById("met-tagihan").textContent = rp(tagihan);
  document.getElementById("met-total").textContent = rp(total);
}

async function simpanMeteran() {
  if (!selPelMet) {
    showToast("Pilih pelanggan dahulu", "error");
    return;
  }

  const lalu = parseFloat(document.getElementById("met-lalu").value);
  const jalan = parseFloat(document.getElementById("met-jalan").value);

  if (isNaN(lalu) || isNaN(jalan)) {
    showToast("Isi meter bulan lalu & berjalan", "error");
    return;
  }
  if (jalan < lalu) {
    showToast("Meter berjalan tidak boleh lebih kecil", "error");
    return;
  }

  const idMeteran = `MET-${Date.now()}`;
  const idTransaksi = `TRX-${Date.now()}`;

  const res = await api({
    action: "saveMeteran",
    token: session?.token,
    data: {
      id_meteran: idMeteran,
      id_transaksi: idTransaksi,
      id_pelanggan: selPelMet.id_pelanggan,
      no_rumah: selPelMet.no_rumah,
      nama: selPelMet.nama,
      bulan: BULAN_INI,
      tahun: TAHUN_INI,
      meter_lalu: lalu,
      meter_berjalan: jalan,
      petugas: session?.nama,
    }
  });

  if (res.status === "ok") {
    DEMO_MET_COUNTER++;
    showToast("Data meteran disimpan ✓", "success");
    document.getElementById("met-form-card").style.display = "none";
    document.getElementById("met-search").value = "";
    document.getElementById("met-search-results").innerHTML = "";
    selPelMet = null;
    if (fromPage === "meteran") loadDashboard();
  } else {
    showToast(res.message, "error");
  }
}

// ════════════════════════════════════════════════════════
//  LAPORAN
// ════════════════════════════════════════════════════════
function initFilterLaporan() {
  const selTahun = document.getElementById("lap-filter-tahun");
  selTahun.innerHTML = "";
  for (let y = TAHUN_INI; y >= TAHUN_INI - 3; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    selTahun.appendChild(opt);
  }
  document.getElementById("lap-filter-bulan").value = BULAN_INI;
  document.getElementById("lap-filter-tahun").value = TAHUN_INI;
}

function terapkanFilterLaporan() {
  const bulan = document.getElementById("lap-filter-bulan").value;
  const tahun = parseInt(document.getElementById("lap-filter-tahun").value);
  loadLaporan(bulan, tahun);
}

async function loadLaporan(bulan = BULAN_INI, tahun = TAHUN_INI) {
  document.getElementById("lap-periode").textContent = `${bulan} ${tahun}`;

  ["lap-total", "lap-lunas", "lap-belum", "lap-terkumpul", "lap-piutang"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "…";
  });

  document.getElementById("lap-list").innerHTML = `<div class="loading"><div class="spinner"></div> Memuat data ${bulan} ${tahun}…</div>`;

  const res = await api({ action: "getLaporan", token: session?.token, bulan, tahun });
  if (res.status !== "ok") {
    document.getElementById("lap-list").innerHTML = `<div class="empty"><p>Gagal memuat data. Coba lagi.</p></div>`;
    return;
  }

  const { laporan, detail } = res;
  document.getElementById("lap-total").textContent = laporan.total_pelanggan;
  document.getElementById("lap-lunas").textContent = laporan.sudah_bayar;
  document.getElementById("lap-belum").textContent = laporan.belum_bayar;
  document.getElementById("lap-terkumpul").textContent = rp(laporan.total_terkumpul);
  document.getElementById("lap-piutang").textContent = rp(laporan.total_piutang);

  const belum = (detail || []).filter(t => t.status === "Belum Bayar");
  const el = document.getElementById("lap-list");

  el.innerHTML = belum.length ? belum.map(t => `
      <div class="pel-item">
        <div class="avatar av-a">${initials(t.nama)}</div>
        <div class="pel-info">
          <div class="pel-name">${escapeHtml(t.nama)}</div>
          <div class="pel-sub">${t.no_rumah} · ${rp(t.jumlah_bayar)}</div>
        </div>
        <span class="badge badge-red">Belum</span>
      </div>`).join("") : `<div class="empty"><p>Semua sudah lunas pada ${bulan} ${tahun} 🎉</p></div>`;
}

// ════════════════════════════════════════════════════════
//  MODAL BAYAR
// ════════════════════════════════════════════════════════
function openModal() {
  if (!currentTrx) return;
  document.getElementById("modal-nama").textContent = currentPel?.nama || "—";
  document.getElementById("modal-total").textContent = rp(currentTrx.jumlah_bayar);
  pilihMetode("Tunai");
  document.getElementById("modal-bayar").classList.add("show");
}

function closeModal() {
  document.getElementById("modal-bayar").classList.remove("show");
}

function pilihMetode(m) {
  metodeAktif = m;
  ["Tunai", "Transfer", "QRIS"].forEach(x => {
    document.getElementById("met-" + x.toLowerCase()).classList.toggle("active", x === m);
  });
}

async function konfirmasiBayar() {
  const res = await api({
    action: "saveTransaksi",
    token: session?.token,
    id_transaksi: currentTrx.id_transaksi,
    metode_bayar: metodeAktif,
    petugas: session?.nama
  });

  closeModal();
  if (res.status === "ok") {
    showToast("Pembayaran berhasil dicatat ✓", "success");
    setTimeout(() => openDetail(currentPel.id_pelanggan, fromPage), 500);
  } else {
    showToast(res.message, "error");
  }
}

// ════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════
function rp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function initials(nama) {
  return (nama || "").split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

let toastTimer;

function showToast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = "toast", 2800);
}

// Event listener untuk tombol Enter di login
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("inp-password");
  if (passwordInput) {
    passwordInput.addEventListener("keydown", e => {
      if (e.key === "Enter") doLogin();
    });
  }
});

// Inisialisasi
window.onload = () => {
  if (session?.token) {
    showApp();
  } else {
    showPage("pg-login");
  }
};