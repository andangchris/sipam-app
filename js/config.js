// ════════════════════════════════════════════════════════
//  KONFIGURASI APLIKASI SiPAM
// ════════════════════════════════════════════════════════

// GANTI DENGAN URL APPS SCRIPT ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbzTE5Vs2foRmYnue3A93Rj8bYzAWkZKKi4O0L13zve0xF3ihD-cn1hdCg4xpYi-vV6G/exec";

// Konfigurasi Pagination
const ITEMS_PER_PAGE = 10;  // Jumlah item per halaman

// Bulan dan tahun berjalan
const BULAN_INI = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][new Date().getMonth()];
const TAHUN_INI = new Date().getFullYear();

// Export ke global
window.API_URL = API_URL;
window.ITEMS_PER_PAGE = ITEMS_PER_PAGE;
window.BULAN_INI = BULAN_INI;
window.TAHUN_INI = TAHUN_INI;