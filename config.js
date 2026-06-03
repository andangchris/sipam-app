// ════════════════════════════════════════════════════════
//  KONFIGURASI APLIKASI SiPAM - FINAL
// ════════════════════════════════════════════════════════

// GANTI DENGAN URL DARI DEPLOY MENGGUNAKAN AKUN andangchris91
const API_URL_ORIGIN = "https://script.google.com/macros/s/AKfycbyFBST8V6Ztf73USATcMsyfS-hPBv-6BVeSzJVUA8_LVAT9WutU72frAhw0EmsBYur4/exec";

// Gunakan JSONP (sudah terbukti berhasil dengan akun 91)
const USE_JSONP = true;
const USE_DEMO_MODE = false;

const BULAN_INI = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][new Date().getMonth()];
const TAHUN_INI = new Date().getFullYear();

window.API_URL_ORIGIN = API_URL_ORIGIN;
window.USE_JSONP = USE_JSONP;
window.USE_DEMO_MODE = USE_DEMO_MODE;
window.BULAN_INI = BULAN_INI;
window.TAHUN_INI = TAHUN_INI;

console.log("✅ Config loaded - Using account andangchris91");