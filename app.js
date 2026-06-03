// ════════════════════════════════════════════════════════
//  API CALL - JSONP Version (Solusi CORS)
// ════════════════════════════════════════════════════════
async function api(body) {
  if (USE_DEMO_MODE) {
    console.log("Using DEMO mode");
    return demoApi(body);
  }

  return new Promise((resolve, reject) => {
    try {
      const callbackName = "jsonp_callback_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const params = new URLSearchParams();
      params.append("data", JSON.stringify(body));
      params.append("callback", callbackName);
      
      const url = API_URL_ORIGIN + "?" + params.toString();
      console.log("JSONP Request:", url);
      
      // Buat fungsi callback global
      window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      
      // Buat script tag
      const script = document.createElement("script");
      script.src = url;
      script.onerror = function() {
        delete window[callbackName];
        document.body.removeChild(script);
        console.error("JSONP Request failed");
        reject(new Error("JSONP request failed"));
        // Fallback ke demo
        resolve(demoApi(body));
      };
      
      document.body.appendChild(script);
      
      // Timeout
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          console.warn("JSONP timeout");
          resolve(demoApi(body));
        }
      }, 10000);
      
    } catch (error) {
      console.error("API Error:", error);
      resolve(demoApi(body));
    }
  });
}