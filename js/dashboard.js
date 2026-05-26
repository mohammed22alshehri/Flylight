/* ============================================================
   DASHBOARD — Admin panel logic
   ============================================================ */

let selectedContribution = null;
let _isLoggingIn = false;

// ── Admin Session ─────────────────────────────────────────────
function checkAdminSession() {
  const loggedIn = sessionStorage.getItem('adminLoggedIn');
  const loginEl   = document.getElementById('adminLogin');
  const contentEl = document.getElementById('adminContent');

  if (loginEl)   loginEl.style.display   = loggedIn ? 'none' : 'flex';
  if (contentEl) contentEl.style.display = loggedIn ? 'block' : 'none';

  if (loggedIn) loadDashboard();
}

async function adminLogin() {
  if (_isLoggingIn) return;

  const input   = document.getElementById('adminPassword');
  const errorEl = document.getElementById('loginError');
  const btn     = document.querySelector('#adminLogin .btn-primary');
  const password = input?.value || '';

  if (!password) {
    if (errorEl) errorEl.classList.add('visible');
    return;
  }

  _isLoggingIn = true;
  const origHTML = btn?.innerHTML || '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
  }

  const ok = await dbVerifyAdminPassword(password);

  if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
  _isLoggingIn = false;

  if (ok) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    // حفظ كلمة السر مؤقتاً في الجلسة (تُحذف عند الخروج/إغلاق التبويب)
    sessionStorage.setItem('adminPasswordTemp', password);
    if (input) input.value = '';
    if (errorEl) errorEl.classList.remove('visible');
    checkAdminSession();
    showToast('تم تسجيل الدخول بنجاح', 'success');
  } else {
    if (errorEl) errorEl.classList.add('visible');
    if (input) input.value = '';
    showToast('كلمة المرور غير صحيحة', 'error');
  }
}

function adminLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  sessionStorage.removeItem('adminPasswordTemp'); // حذف كلمة السر
  checkAdminSession();
  showToast('تم تسجيل الخروج', 'success');
}

// ── Dashboard Loading ─────────────────────────────────────────
async function loadDashboard() {
  const contributions = await dbGetAllContributions();

  const approved = contributions.filter(c => c.status === 'تمت الموافقة');
  const pending  = contributions.filter(c => c.status === 'قيد المراجعة');
  const totalAmount = approved.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  setText('totalCount',   contributions.length);
  setText('totalSum',     totalAmount.toLocaleString('ar-SA'));
  setText('pendingCount', pending.length);
  setText('approvedCount',approved.length);

  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (contributions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد مساهمات بعد</td></tr>';
    return;
  }

  tbody.innerHTML = contributions.map(c => `
    <tr>
      <td class="name-cell">${esc(c.name)}</td>
      <td class="phone-cell" dir="ltr">${esc(c.phone)}</td>
      <td>${esc(c.email)}</td>
      <td class="amount-strong">${parseFloat(c.amount).toLocaleString('ar-SA')} ر.س</td>
      <td class="date-cell">${formatDate(c.created_at || c.date)}</td>
      <td>${getStatusBadge(c.status)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" onclick="viewDetails(${c.id})" title="عرض التفاصيل">
            ${svgIcon('eye')} عرض
          </button>
          ${c.status === 'قيد المراجعة' ? `
            <button class="action-btn btn-approve" onclick="approveContribution(${c.id})" title="الموافقة">
              ${svgIcon('check')} موافقة
            </button>
            <button class="action-btn btn-reject" onclick="rejectContribution(${c.id})" title="الرفض">
              ${svgIcon('x')} رفض
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Approve ───────────────────────────────────────────────────
async function approveContribution(id) {
  if (!confirm('تأكيد الموافقة على هذه المساهمة؟')) return;

  const success = await dbUpdateContributionStatus(id, 'تمت الموافقة');
  if (success) {
    const count = await dbIssueCertificates(id);
    loadDashboard();
    if (count > 0) {
      showToast(`تمت الموافقة — تم إصدار ${count} شهادة وحفظها`, 'success');
    } else {
      showToast('تمت الموافقة على المساهمة', 'success');
    }
  }
}

// ── Reject ────────────────────────────────────────────────────
async function rejectContribution(id) {
  if (!confirm('تأكيد رفض هذه المساهمة؟ سيتم حذفها من النظام.')) return;

  const success = await dbUpdateContributionStatus(id, 'مرفوض');
  if (success) {
    loadDashboard();
    showToast('تم رفض المساهمة', 'error');
  }
}

// ── View Details ──────────────────────────────────────────────
async function viewDetails(id) {
  const contributions = await dbGetAllContributions();
  selectedContribution = contributions.find(c => c.id === id);
  if (!selectedContribution) return;

  const c = selectedContribution;
  const receiptData = c.receipt || c.receipt_base64 || null;

  // Build receipt HTML
  let receiptHTML = '<p class="text-muted" style="margin-top:var(--space-3)">لم يتم العثور على الإيصال</p>';

  if (receiptData) {
    const isPDF = receiptData.startsWith('data:application/pdf') ||
                  (c.receipt_name && c.receipt_name.toLowerCase().endsWith('.pdf'));

    if (isPDF) {
      receiptHTML = `
        <div class="receipt-pdf-wrapper" style="margin-top:var(--space-4)">
          <iframe src="${receiptData}" title="إيصال PDF"></iframe>
          <a href="${receiptData}" download="${esc(c.receipt_name || 'receipt.pdf')}" class="receipt-pdf-download">
            📥 تحميل PDF
          </a>
        </div>`;
    } else {
      receiptHTML = `
        <div style="margin-top:var(--space-4)">
          <img src="${receiptData}" class="receipt-image" alt="إيصال التحويل"
               onclick="window.open('${receiptData}', '_blank')">
          <p class="text-muted text-sm" style="text-align:center;margin-top:var(--space-2)">انقر على الصورة للتكبير</p>
        </div>`;
    }
  }

  // Build modal body
  document.getElementById('modalBody').innerHTML = `
    <table class="info-table">
      <tr><td>الاسم</td><td>${esc(c.name)}</td></tr>
      <tr><td>الهاتف</td><td dir="ltr">${esc(c.phone)}</td></tr>
      <tr><td>البريد</td><td>${esc(c.email)}</td></tr>
      <tr><td>المبلغ</td><td><strong>${parseFloat(c.amount).toLocaleString('ar-SA')} ريال سعودي</strong></td></tr>
      <tr><td>التاريخ</td><td>${formatDate(c.created_at || c.date)}</td></tr>
      <tr><td>الحالة</td><td>${getStatusBadge(c.status)}</td></tr>
      ${c.review_date ? `<tr><td>تاريخ المراجعة</td><td>${esc(c.review_date)}</td></tr>` : ''}
      <tr><td>الملاحظات</td><td>${esc(c.notes) || '<span class="text-muted">لا توجد ملاحظات</span>'}</td></tr>
    </table>

    <div class="receipt-block">
      <p class="receipt-block-label">الإيصال:</p>
      ${receiptHTML}
    </div>

    ${c.status === 'قيد المراجعة' ? `
      <div class="modal-actions">
        <button class="btn-approve-full" onclick="approveContribution(${c.id}); closeModal()">
          ${svgIcon('check')} موافقة
        </button>
        <button class="btn-reject-full" onclick="rejectContribution(${c.id}); closeModal()">
          ${svgIcon('x')} رفض
        </button>
      </div>
    ` : ''}

    ${c.status === 'تمت الموافقة' ? `
      <div style="margin-top:var(--space-6)">
        <button class="btn btn-primary btn-block" onclick="downloadCertificates(${c.id})">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          تحميل شهادات الأسهم (${calcShares(c.amount)} شهادة)
        </button>
      </div>
    ` : ''}
  `;

  openModal();
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal() {
  const modal = document.getElementById('detailsModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = document.getElementById('detailsModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ── Utility ──────────────────────────────────────────────────

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('ar-SA');
  } catch {
    return String(val);
  }
}

// ── SVG icon helper ──────────────────────────────────────────
function svgIcon(name, size = '13') {
  const paths = {
    eye:   '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;flex-shrink:0">${paths[name] || ''}</svg>`;
}

// ── Status badge ─────────────────────────────────────────────
const STATUS_SVG = {
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  x:     '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

function getStatusBadge(status) {
  const map = {
    'قيد المراجعة': { cls: 'badge-pending',  icon: STATUS_SVG.clock },
    'تمت الموافقة': { cls: 'badge-approved', icon: STATUS_SVG.check },
    'مرفوض':        { cls: 'badge-rejected', icon: STATUS_SVG.x },
  };
  const b = map[status] || map['قيد المراجعة'];
  return `<span class="badge ${b.cls}">${b.icon} ${esc(status)}</span>`;
}

// ── Keyboard: close modal on Escape ─────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

console.log('✅ dashboard.js loaded');
