// ════════════════════════════════════════════════════════
//  APLIKASI UTAMA SiPAM
// ════════════════════════════════════════════════════════

// State
let allPelanggan = [];
let currentPel = null;
let currentTrx = null;
let metodeAktif = "Tunai";
let fromPage = "dashboard";

// State untuk pagination
let currentPageDashboard = 1;
let currentPageSearch = 1;
let currentPageLaporan = 1;
let searchResults = [];

// ════════════════════════════════════════════════════════
//  LOGIN / LOGOUT
// ════════════════════════════════════════════════════════

async function doLogin() {
  const username = document.getElementById("inp-username").value.trim();
  const password = document.getElementById("inp-password").value;
  const errEl = document.getElementById("login-err");
  const btn = document.getElementById("btn-login");
  
  if (!username || !password) {
    errEl.textContent = "Username dan password wajib diisi.";
    errEl.style.display = "block";
    return;
  }
  
  btn.textContent = "Memverifikasi…";
  btn.disabled = true;
  
  try {
    const res = await api({ action: "login", username, password });
    
    if (res.status !== "ok") {
      errEl.textContent = res.message;
      errEl.style.display = "block";
      return;
    }
    
    errEl.style.display = "none";
    session = { token: res.token, nama: res.nama, role: res.role, id_user: res.id_user };
    sessionStorage.setItem("sipam_session", JSON.stringify(session));
    window.session = session;
    showApp();
    showToast("Login berhasil! Selamat datang " + session.nama, "success");
  } catch (error) {
    errEl.textContent = "Gagal terhubung ke server: " + error.message;
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Masuk`;
  }
}

function doLogout() {
  sessionStorage.removeItem("sipam_session");
  session = null;
  window.session = null;
  showPage("pg-login");
  document.getElementById("inp-username").value = "";
  document.getElementById("inp-password").value = "";
  showToast("Anda telah logout", "success");
}

// ════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
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
  currentPageDashboard = 1;
  currentPageSearch = 1;
  currentPageLaporan = 1;
  
  if (page === "dashboard") loadDashboard();
  if (page === "laporan") { initFilterLaporan(); loadLaporan(); }
  if (page === "pelanggan") { document.getElementById("search-input").value = ""; renderSearchResults([]); }
  if (page === "meteran") {
    document.getElementById("met-search").value = "";
    document.getElementById("met-search-results").innerHTML = "";
    document.getElementById("met-form-card").style.display = "none";
    selPelMet = null;
  }
}

function goBack() {
  showPage(fromPage === "meteran" ? "pg-meteran" : fromPage === "pelanggan" ? "pg-pelanggan" : "pg-dashboard");
}

// ════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════

async function loadDashboard() {
  try {
    const res = await api({ action: "getLaporan", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI });
    if (res.status !== "ok") return;
    
    const { laporan, detail } = res;
    document.getElementById("s-total").textContent = laporan.total_pelanggan || 0;
    document.getElementById("s-lunas").textContent = laporan.sudah_bayar || 0;
    document.getElementById("s-belum").textContent = laporan.belum_bayar || 0;
    document.getElementById("s-nominal").textContent = formatRupiah(laporan.total_terkumpul || 0);
    
    const pct = laporan.total_pelanggan ? Math.round((laporan.sudah_bayar / laporan.total_pelanggan) * 100) : 0;
    document.getElementById("s-progress").style.width = pct + "%";
    document.getElementById("s-pct").textContent = pct + "% lunas";
    
    const belum = (detail || []).filter(t => t.status === "Belum Bayar");
    renderDashboardWithPagination(belum);
  } catch (error) {
    console.error("Dashboard error:", error);
    showToast("Gagal memuat dashboard", "error");
  }
}

function renderDashboardWithPagination(items) {
  const paginatedItems = paginateItems(items, currentPageDashboard);
  const listEl = document.getElementById("dash-belum-list");
  
  if (!items.length) {
    listEl.innerHTML = `<div class="empty"><svg fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><p>Semua pelanggan sudah lunas! 🎉</p></div>`;
    return;
  }
  
  let html = '';
  paginatedItems.forEach(t => {
    html += `
      <div class="pel-item" onclick="openDetailFromDash('${t.id_pelanggan}','${t.id_transaksi}')">
        <div class="avatar av-a">${getInitials(t.nama)}</div>
        <div class="pel-info">
          <div class="pel-name">${escapeHtml(t.nama)}</div>
          <div class="pel-sub">${t.no_rumah} · ${formatRupiah(t.jumlah_bayar)}</div>
        </div>
        <span class="badge badge-red">Belum</span>
      </div>
    `;
  });
  
  // Tambahkan pagination
  if (items.length > ITEMS_PER_PAGE) {
    html += renderPagination(items.length, currentPageDashboard, (page) => {
      currentPageDashboard = page;
      renderDashboardWithPagination(items);
    });
    
    // Attach event listeners for pagination buttons
    setTimeout(() => {
      document.querySelectorAll('#dash-belum-list .page-num, #dash-belum-list .page-prev, #dash-belum-list .page-next').forEach(btn => {
        btn.onclick = () => {
          if (btn.classList.contains('page-prev') && currentPageDashboard > 1) {
            currentPageDashboard--;
          } else if (btn.classList.contains('page-next') && currentPageDashboard < Math.ceil(items.length / ITEMS_PER_PAGE)) {
            currentPageDashboard++;
          } else if (btn.classList.contains('page-num')) {
            currentPageDashboard = parseInt(btn.dataset.page);
          }
          renderDashboardWithPagination(items);
        };
      });
    }, 10);
  }
  
  listEl.innerHTML = html;
}

// ════════════════════════════════════════════════════════
//  CARI PELANGGAN
// ════════════════════════════════════════════════════════

let searchTimer;
const searchInput = document.getElementById("search-input");
if (searchInput) {
  searchInput.oninput = function() {
    clearTimeout(searchTimer);
    const val = this.value;
    if (!val.trim()) {
      renderSearchResults([]);
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const res = await api({ action: "searchPelanggan", token: session?.token, keyword: val });
        if (res.status === "ok") {
          searchResults = res.data;
          currentPageSearch = 1;
          renderSearchResults(searchResults);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }, 300);
  };
}

function renderSearchResults(list) {
  const el = document.getElementById("search-results");
  if (!list.length) {
    el.innerHTML = "";
    return;
  }
  
  const paginatedItems = paginateItems(list, currentPageSearch);
  let html = `<div class="card"><div class="card-body" style="padding:0 16px;">`;
  
  paginatedItems.forEach((p, i) => {
    html += `
      <div class="pel-item" onclick="openDetail('${p.id_pelanggan}','pelanggan')">
        <div class="avatar ${['av-b', 'av-g', 'av-a'][i % 3]}">${getInitials(p.nama)}</div>
        <div class="pel-info">
          <div class="pel-name">${escapeHtml(p.nama)}</div>
          <div class="pel-sub">${p.no_rumah} · ${escapeHtml(p.alamat)}</div>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </div>
    `;
  });
  
  html += `</div></div>`;
  
  if (list.length > ITEMS_PER_PAGE) {
    html += renderPagination(list.length, currentPageSearch, (page) => {
      currentPageSearch = page;
      renderSearchResults(list);
    });
    
    setTimeout(() => {
      document.querySelectorAll('#search-results .page-num, #search-results .page-prev, #search-results .page-next').forEach(btn => {
        btn.onclick = () => {
          if (btn.classList.contains('page-prev') && currentPageSearch > 1) {
            currentPageSearch--;
          } else if (btn.classList.contains('page-next') && currentPageSearch < Math.ceil(list.length / ITEMS_PER_PAGE)) {
            currentPageSearch++;
          } else if (btn.classList.contains('page-num')) {
            currentPageSearch = parseInt(btn.dataset.page);
          }
          renderSearchResults(list);
        };
      });
    }, 10);
  }
  
  el.innerHTML = html;
}

// ════════════════════════════════════════════════════════
//  DETAIL PELANGGAN
// ════════════════════════════════════════════════════════

async function openDetail(id_pelanggan, from = "dashboard") {
  fromPage = from;
  if (!allPelanggan.length) {
    try {
      const res = await api({ action: "getPelanggan", token: session?.token });
      if (res.status === "ok") allPelanggan = res.data;
    } catch (error) {
      console.error("Get pelanggan error:", error);
    }
  }
  
  const pel = allPelanggan.find(p => p.id_pelanggan === id_pelanggan);
  if (!pel) return;
  
  currentPel = pel;
  document.getElementById("detail-nama").textContent = pel.nama;
  document.getElementById("detail-norumah").textContent = pel.no_rumah;
  document.getElementById("detail-alamat").textContent = pel.alamat;
  document.getElementById("detail-telp").textContent = pel.no_telpon || "—";
  document.getElementById("detail-id").textContent = pel.id_pelanggan;
  
  try {
    const lapRes = await api({ action: "getLaporan", token: session?.token, bulan: BULAN_INI, tahun: TAHUN_INI });
    const trx = lapRes.status === "ok" ? lapRes.detail?.find(t => t.id_pelanggan === id_pelanggan) : null;
    const actionsEl = document.getElementById("detail-actions");
    
    if (trx) {
      currentTrx = trx;
      const lunas = trx.status === "Lunas";
      document.getElementById("detail-pakai").textContent = trx.pemakaian + " m³";
      document.getElementById("detail-tagihan").textContent = formatRupiah(trx.pemakaian * 1500);
      document.getElementById("detail-total").textContent = formatRupiah(trx.jumlah_bayar);
      
      const badge = document.getElementById("detail-badge");
      badge.textContent = lunas ? "Lunas" : "Belum Bayar";
      badge.className = "badge " + (lunas ? "badge-green" : "badge-red");
      
      actionsEl.innerHTML = lunas
        ? `<div class="card"><div class="card-body" style="text-align:center;color:var(--c-green);padding:20px;"><b>✓ Sudah Lunas</b><br><small style="color:var(--c-text3)">${trx.tgl_bayar || "-"}</small></div></div>`
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
  } catch (error) {
    console.error("Open detail error:", error);
    showToast("Gagal memuat detail pelanggan", "error");
  }
}

function openDetailFromDash(id_pelanggan, id_transaksi) {
  openDetail(id_pelanggan, "dashboard");
}

// ════════════════════════════════════════════════════════
//  CATAT METERAN
// ════════════════════════════════════════════════════════

let selPelMet = null;
let metSearchTimer;
const metSearchInput = document.getElementById("met-search");
if (metSearchInput) {
  metSearchInput.oninput = function() {
    clearTimeout(metSearchTimer);
    const val = this.value;
    if (!val.trim()) {
      document.getElementById("met-search-results").innerHTML = "";
      return;
    }
    metSearchTimer = setTimeout(async () => {
      try {
        const res = await api({ action: "searchPelanggan", token: session?.token, keyword: val });
        if (res.status !== "ok") return;
        const el = document.getElementById("met-search-results");
        el.innerHTML = res.data.length ? res.data.map(p => `
          <div class="pel-item" style="padding:10px 0;cursor:pointer;" onclick="pilihPelMet('${p.id_pelanggan}')">
            <div class="avatar av-b">${getInitials(p.nama)}</div>
            <div class="pel-info">
              <div class="pel-name">${escapeHtml(p.nama)}</div>
              <div class="pel-sub">${p.no_rumah}</div>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </div>
        `).join("") : `<p style="color:var(--c-text3);font-size:13px;">Tidak ditemukan.</p>`;
      } catch (error) {
        console.error("Search meter error:", error);
      }
    }, 300);
  };
}

async function pilihPelMet(id) {
  if (!allPelanggan.length) {
    try {
      const res = await api({ action: "getPelanggan", token: session?.token });
      if (res.status === "ok") allPelanggan = res.data;
    } catch (error) {
      console.error("Get pelanggan error:", error);
    }
  }
  
  selPelMet = allPelanggan.find(p => p.id_pelanggan === id);
  if (!selPelMet) return;
  
  // CEK APAKAH SUDAH ADA METERAN DI BULAN INI
  try {
    const checkRes = await api({ 
      action: "getLastMeter", 
      token: session?.token, 
      id_pelanggan: id,
      bulan: BULAN_INI,
      tahun: TAHUN_INI
    });
    
    // Jika sudah ada meteran di bulan ini
    if (checkRes.status === "ok" && checkRes.meter_berjalan !== null && checkRes.bulan === BULAN_INI && checkRes.tahun == TAHUN_INI) {
      showToast(`Pelanggan ${selPelMet.nama} sudah tercatat meteran untuk bulan ${BULAN_INI} ${TAHUN_INI}`, "error");
      return;
    }
  } catch (error) {
    console.error("Check existing meter error:", error);
  }
  
  document.getElementById("met-nama-lbl").textContent = selPelMet.nama;
  document.getElementById("met-no-lbl").textContent = selPelMet.no_rumah;
  document.getElementById("met-lalu").value = "";
  document.getElementById("met-jalan").value = "";
  document.getElementById("met-last-info").style.display = "none";
  document.getElementById("met-no-history").style.display = "none";
  hitungPemakaian();
  document.getElementById("met-form-card").style.display = "block";
  document.getElementById("met-search-results").innerHTML = "";
  metSearchInput.value = selPelMet.nama;
  
  try {
    const histRes = await api({ action: "getLastMeter", token: session?.token, id_pelanggan: id });
    if (histRes.status === "ok" && histRes.meter_berjalan != null) {
      document.getElementById("met-lalu").value = histRes.meter_berjalan;
      document.getElementById("met-lalu").setAttribute("readonly", true);
      document.getElementById("met-lalu-hint").textContent = `m³ — otomatis dari ${histRes.bulan} ${histRes.tahun}`;
      document.getElementById("met-last-bulan").textContent = histRes.bulan + " " + histRes.tahun;
      document.getElementById("met-last-nilai").textContent = histRes.meter_berjalan;
      document.getElementById("met-last-info").style.display = "flex";
      hitungPemakaian();
    } else {
      document.getElementById("met-lalu").removeAttribute("readonly");
      document.getElementById("met-lalu-hint").textContent = "m³ — isi manual";
      document.getElementById("met-no-history").style.display = "flex";
    }
  } catch (error) {
    console.error("Get last meter error:", error);
  }
}

function hitungPemakaian() {
  const lalu = parseFloat(document.getElementById("met-lalu").value) || 0;
  const jalan = parseFloat(document.getElementById("met-jalan").value) || 0;
  const pakai = Math.max(0, jalan - lalu);
  const tagihan = pakai * 1500;
  const total = tagihan + 5000;
  
  document.getElementById("met-pakai").textContent = pakai + " m³";
  document.getElementById("met-tagihan").textContent = formatRupiah(tagihan);
  document.getElementById("met-total").textContent = formatRupiah(total);
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
  
  // CEK LAGI SEBELUM SAVE (DOUBLE CHECK)
  try {
    const checkRes = await api({ 
      action: "getLastMeter", 
      token: session?.token, 
      id_pelanggan: selPelMet.id_pelanggan,
      bulan: BULAN_INI,
      tahun: TAHUN_INI
    });
    
    if (checkRes.status === "ok" && checkRes.meter_berjalan !== null && checkRes.bulan === BULAN_INI && checkRes.tahun == TAHUN_INI) {
      showToast(`Data meteran untuk bulan ${BULAN_INI} ${TAHUN_INI} sudah ada!`, "error");
      document.getElementById("met-form-card").style.display = "none";
      selPelMet = null;
      return;
    }
  } catch (error) {
    console.error("Check before save error:", error);
  }
  
  const idMeteran = `MET-${Date.now()}`;
  const idTransaksi = `TRX-${Date.now()}`;
  
  try {
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
        petugas: session?.nama
      }
    });
    
    if (res.status === "ok") {
      showToast("Data meteran disimpan ✓", "success");
      document.getElementById("met-form-card").style.display = "none";
      metSearchInput.value = "";
      document.getElementById("met-search-results").innerHTML = "";
      selPelMet = null;
      if (fromPage === "meteran") loadDashboard();
    } else {
      showToast(res.message, "error");
    }
  } catch (error) {
    console.error("Save meteran error:", error);
    showToast("Gagal menyimpan data meteran", "error");
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
  currentPageLaporan = 1;
  loadLaporan(bulan, tahun);
}

async function loadLaporan(bulan = BULAN_INI, tahun = TAHUN_INI) {
  document.getElementById("lap-periode").textContent = `${bulan} ${tahun}`;
  
  ["lap-total", "lap-lunas", "lap-belum", "lap-terkumpul", "lap-piutang"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "…";
  });
  document.getElementById("lap-list").innerHTML = `<div class="loading"><div class="spinner"></div> Memuat data ${bulan} ${tahun}…</div>`;
  
  try {
    const res = await api({ action: "getLaporan", token: session?.token, bulan, tahun });
    if (res.status !== "ok") {
      document.getElementById("lap-list").innerHTML = `<div class="empty"><p>Gagal memuat data. Coba lagi.</p></div>`;
      return;
    }
    
    const { laporan, detail } = res;
    document.getElementById("lap-total").textContent = laporan.total_pelanggan;
    document.getElementById("lap-lunas").textContent = laporan.sudah_bayar;
    document.getElementById("lap-belum").textContent = laporan.belum_bayar;
    document.getElementById("lap-terkumpul").textContent = formatRupiah(laporan.total_terkumpul);
    document.getElementById("lap-piutang").textContent = formatRupiah(laporan.total_piutang);
    
    const belum = (detail || []).filter(t => t.status === "Belum Bayar");
    renderLaporanWithPagination(belum, bulan, tahun);
  } catch (error) {
    console.error("Load laporan error:", error);
    document.getElementById("lap-list").innerHTML = `<div class="empty"><p>Gagal memuat data. Periksa koneksi.</p></div>`;
  }
}

function renderLaporanWithPagination(items, bulan, tahun) {
  const paginatedItems = paginateItems(items, currentPageLaporan);
  const el = document.getElementById("lap-list");
  
  if (!items.length) {
    el.innerHTML = `<div class="empty"><p>Semua sudah lunas pada ${bulan} ${tahun} 🎉</p></div>`;
    return;
  }
  
  let html = '';
  paginatedItems.forEach(t => {
    html += `
      <div class="pel-item" onclick="openDetail('${t.id_pelanggan}', 'laporan')">
        <div class="avatar av-a">${getInitials(t.nama)}</div>
        <div class="pel-info">
          <div class="pel-name">${escapeHtml(t.nama)}</div>
          <div class="pel-sub">${t.no_rumah} · ${formatRupiah(t.jumlah_bayar)}</div>
        </div>
        <span class="badge badge-red">Belum</span>
      </div>
    `;
  });
  
  if (items.length > ITEMS_PER_PAGE) {
    html += renderPagination(items.length, currentPageLaporan, (page) => {
      currentPageLaporan = page;
      renderLaporanWithPagination(items, bulan, tahun);
    });
    
    setTimeout(() => {
      document.querySelectorAll('#lap-list .page-num, #lap-list .page-prev, #lap-list .page-next').forEach(btn => {
        btn.onclick = () => {
          if (btn.classList.contains('page-prev') && currentPageLaporan > 1) {
            currentPageLaporan--;
          } else if (btn.classList.contains('page-next') && currentPageLaporan < Math.ceil(items.length / ITEMS_PER_PAGE)) {
            currentPageLaporan++;
          } else if (btn.classList.contains('page-num')) {
            currentPageLaporan = parseInt(btn.dataset.page);
          }
          renderLaporanWithPagination(items, bulan, tahun);
        };
      });
    }, 10);
  }
  
  el.innerHTML = html;
}

// ════════════════════════════════════════════════════════
//  MODAL BAYAR
// ════════════════════════════════════════════════════════

function openModal() {
  if (!currentTrx) return;
  document.getElementById("modal-nama").textContent = currentPel?.nama || "—";
  document.getElementById("modal-total").textContent = formatRupiah(currentTrx.jumlah_bayar);
  pilihMetode("Tunai");
  document.getElementById("modal-bayar").classList.add("show");
}

function closeModal() {
  document.getElementById("modal-bayar").classList.remove("show");
}

function pilihMetode(m) {
  metodeAktif = m;
  document.querySelectorAll(".metode-btn").forEach(btn => {
    const metode = btn.getAttribute("data-metode");
    if (metode === m) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

async function konfirmasiBayar() {
  try {
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
  } catch (error) {
    console.error("Konfirmasi bayar error:", error);
    showToast("Gagal memproses pembayaran", "error");
  }
}

// ════════════════════════════════════════════════════════
//  EVENT LISTENERS & INIT
// ════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  // Login button
  const loginBtn = document.getElementById("btn-login");
  if (loginBtn) loginBtn.onclick = doLogin;
  
  // Logout button
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) logoutBtn.onclick = doLogout;
  
  // Enter key on password
  const passwordInput = document.getElementById("inp-password");
  if (passwordInput) {
    passwordInput.addEventListener("keypress", e => {
      if (e.key === "Enter") doLogin();
    });
  }
  
  // Back button
  const backBtn = document.getElementById("detail-back");
  if (backBtn) backBtn.onclick = goBack;
  
  // Simpan meteran button
  const simpanMeteranBtn = document.getElementById("btn-simpan-meteran");
  if (simpanMeteranBtn) simpanMeteranBtn.onclick = simpanMeteran;
  
  // Filter laporan button
  const filterBtn = document.getElementById("btn-filter-laporan");
  if (filterBtn) filterBtn.onclick = terapkanFilterLaporan;
  
  // Konfirmasi bayar button
  const konfirmasiBtn = document.getElementById("btn-konfirmasi-bayar");
  if (konfirmasiBtn) konfirmasiBtn.onclick = konfirmasiBayar;
  
  // Close modal button
  const closeModalBtn = document.getElementById("btn-close-modal");
  if (closeModalBtn) closeModalBtn.onclick = closeModal;
  
  // Overlay click to close modal
  const overlay = document.getElementById("modal-bayar");
  if (overlay) {
    overlay.onclick = function(e) {
      if (e.target === this) closeModal();
    };
  }
  
  // Bottom navigation
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.onclick = () => {
      const page = btn.getAttribute("data-page");
      if (page) goPage(page);
    };
  });
  
  // Hitung pemakaian on input
  const metLalu = document.getElementById("met-lalu");
  const metJalan = document.getElementById("met-jalan");
  if (metLalu) metLalu.oninput = hitungPemakaian;
  if (metJalan) metJalan.oninput = hitungPemakaian;
  
  // Pilih metode pembayaran
  document.querySelectorAll(".metode-btn").forEach(btn => {
    btn.onclick = () => {
      const metode = btn.getAttribute("data-metode");
      if (metode) pilihMetode(metode);
    };
  });
  
  // Check existing session
  if (session?.token) {
    window.session = session;
    showApp();
  } else {
    showPage("pg-login");
  }
});

// Export functions ke global untuk onclick di HTML
window.doLogin = doLogin;
window.doLogout = doLogout;
window.goPage = goPage;
window.goBack = goBack;
window.openDetail = openDetail;
window.openDetailFromDash = openDetailFromDash;
window.pilihPelMet = pilihPelMet;
window.simpanMeteran = simpanMeteran;
window.hitungPemakaian = hitungPemakaian;
window.terapkanFilterLaporan = terapkanFilterLaporan;
window.openModal = openModal;
window.closeModal = closeModal;
window.pilihMetode = pilihMetode;
window.konfirmasiBayar = konfirmasiBayar;