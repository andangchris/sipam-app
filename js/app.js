// ════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════

function showPage(pageId) {
  // Jika pageId adalah pg-login atau pg-main, toggle antar halaman utama
  if (pageId === "pg-login") {
    document.getElementById("pg-login").classList.add("active");
    document.getElementById("pg-main").classList.remove("active");
    return;
  }
  
  if (pageId === "pg-main") {
    document.getElementById("pg-login").classList.remove("active");
    document.getElementById("pg-main").classList.add("active");
    return;
  }
  
  // Untuk navigasi dalam pg-main (subpage)
  document.querySelectorAll(".subpage").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  
  // Update active class pada bottom nav
  const pageName = pageId.replace("pg-", "");
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-page") === pageName) {
      btn.classList.add("active");
    }
  });
}

function showApp() {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  document.getElementById("dash-greeting").textContent = greeting + ", " + (session?.role === "admin" ? "Admin" : "Petugas");
  document.getElementById("dash-nama").textContent = session?.nama || "—";
  
  // Tampilkan main app, hide login
  showPage("pg-main");
  showPage("pg-dashboard");
  loadDashboard();
}

function goPage(page) {
  const map = { 
    dashboard: "pg-dashboard", 
    pelanggan: "pg-pelanggan", 
    meteran: "pg-meteran", 
    laporan: "pg-laporan" 
  };
  
  currentPageDashboard = 1;
  currentPageSearch = 1;
  currentPageLaporan = 1;
  
  showPage(map[page]);
  
  if (page === "dashboard") loadDashboard();
  if (page === "laporan") { initFilterLaporan(); loadLaporan(); }
  if (page === "pelanggan") { 
    document.getElementById("search-input").value = ""; 
    renderSearchResults([]); 
  }
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