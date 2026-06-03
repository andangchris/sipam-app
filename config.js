// ════════════════════════════════════════════════════════
//  KONFIGURASI APLIKASI SiPAM - JSONP VERSION
// ════════════════════════════════════════════════════════

//const API_URL_ORIGIN = "https://script.google.com/macros/s/URL_BARU_ANDA/exec";
const API_URL_ORIGIN = "https://script.google.com/macros/s/AKfycbzcaNYpKdBTyWoKIOMRWxJBbFwwaEn18DL9c4Xw5bAv4u5dTj-IMg5lzGNGSWV2GyRq/exec";
const USE_JSONP = true;  // Gunakan JSONP untuk CORS
const USE_DEMO_MODE = false;

const BULAN_INI = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][new Date().getMonth()];
const TAHUN_INI = new Date().getFullYear();

window.API_URL_ORIGIN = API_URL_ORIGIN;
window.USE_JSONP = USE_JSONP;
window.USE_DEMO_MODE = USE_DEMO_MODE;
window.BULAN_INI = BULAN_INI;
window.TAHUN_INI = TAHUN_INI;