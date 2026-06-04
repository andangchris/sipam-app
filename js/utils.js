// ════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════

// Format Rupiah
function formatRupiah(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// Get initials dari nama
function getInitials(nama) {
  if (!nama) return "?";
  return nama.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
}

// Escape HTML untuk keamanan XSS
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Show toast notification
let toastTimer;
function showToast(msg, type = "") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = "toast", 2800);
}

// Pagination helper
function paginateItems(items, currentPage) {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return items.slice(start, end);
}

function renderPagination(totalItems, currentPage, onPageChange) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return '';
  
  let html = '<div class="pagination">';
  html += `<button class="page-prev" ${currentPage === 1 ? 'disabled' : ''}>‹ Sebelumnya</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `<button class="page-num ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += '<span style="padding: 8px;">...</span>';
    }
  }
  
  html += `<button class="page-next" ${currentPage === totalPages ? 'disabled' : ''}>Selanjutnya ›</button>`;
  html += '</div>';
  return html;
}

// Export ke global
window.formatRupiah = formatRupiah;
window.getInitials = getInitials;
window.escapeHtml = escapeHtml;
window.showToast = showToast;
window.paginateItems = paginateItems;
window.renderPagination = renderPagination;
window.ITEMS_PER_PAGE = ITEMS_PER_PAGE;