// ════════════════════════════════════════════════════════
//  KONFIGURASI APLIKASI SiPAM
// ════════════════════════════════════════════════════════

// URL Apps Script yang sudah di-deploy (GANTI DENGAN URL BARU ANDA)
const API_URL_ORIGIN = "https://script.google.com/macros/s/AKfycbwCg8xDe6ZaXpdVf1RZe6D8DDhpoFKoMOknq6PJG39K5wtrOe_Sxl2YOty5e2dc0zX7/exec";

// Gunakan CORS proxy untuk menghindari CORS error
const USE_CORS_PROXY = true;  // Set ke true jika masih kena CORS error

// Pilihan proxy (coba salah satu yang bekerja)
const CORS_PROXY_1 = "https://cors-anywhere.herokuapp.com/";
const CORS_PROXY_2 = "https://api.allorigins.win/raw?url=";
const CORS_PROXY_3 = "https://corsproxy.io/?url=";

// Pilih proxy yang digunakan
const ACTIVE_PROXY = CORS_PROXY_1;  // Ganti dengan CORS_PROXY_2 atau CORS_PROXY_3 jika perlu

// URL akhir yang akan digunakan
const API_URL = USE_CORS_PROXY ? (ACTIVE_PROXY + encodeURIComponent(API_URL_ORIGIN)) : API_URL_ORIGIN;

// Mode demo (untuk testing tanpa internet)
const USE_DEMO_MODE = false;  // Set ke true untuk testing offline

// Bulan dan tahun berjalan
const BULAN_INI = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][new Date().getMonth()];
const TAHUN_INI = new Date().getFullYear();

// Export ke global
window.API_URL = API_URL;
window.USE_DEMO_MODE = USE_DEMO_MODE;
window.BULAN_INI = BULAN_INI;
window.TAHUN_INI = TAHUN_INI;