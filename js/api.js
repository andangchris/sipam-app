// ════════════════════════════════════════════════════════
//  API CALL MENGGUNAKAN JSONP (SOLUSI CORS)
// ════════════════════════════════════════════════════════

// State session
let session = JSON.parse(sessionStorage.getItem("sipam_session") || "null");

function api(body) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_callback_" + Date.now() + "_" + Math.random().toString(36).substr(2, 8);
    const params = new URLSearchParams();
    
    // Kirim data sebagai parameter GET
    params.append("data", JSON.stringify(body));
    params.append("callback", callbackName);
    
    const url = API_URL + "?" + params.toString();
    
    window[callbackName] = function(response) {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(response);
    };
    
    const script = document.createElement("script");
    script.src = url;
    script.onerror = function() {
      delete window[callbackName];
      reject(new Error("JSONP request failed"));
      showToast("Gagal terhubung ke server", "error");
    };
    
    document.body.appendChild(script);
    
    // Timeout 15 detik
    setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        reject(new Error("Timeout"));
        showToast("Request timeout", "error");
      }
    }, 15000);
  });
}

// Export ke global
window.api = api;
window.session = session;