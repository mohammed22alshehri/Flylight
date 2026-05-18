// ===== الثوابت =====
const ADMIN_PASS = 'flylight2024';
let selectedContribution = null;

// ===== Hamburger =====
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('.nav-link').forEach(l =>
      l.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      })
    );
  }
});

// ===== التنقل =====
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById(name);
  if (page) page.classList.add('active');
  const link = document.querySelector(`[data-page="${name}"]`);
  if (link) link.classList.add('active');
  if (name === 'dashboard') checkAdminSession();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Admin Login =====
function checkAdminSession() {
  const ok = sessionStorage.getItem('adminLoggedIn');
  document.getElementById('adminLogin').style.display  = ok ? 'none' : 'flex';
  document.getElementById('adminContent').style.display = ok ? 'block' : 'none';
  if (ok) loadDashboard();
}

function adminLogin() {
  const pass = document.getElementById('adminPassword').value;
  const err  = document.getElementById('loginError');
  if (pass === ADMIN_PASS) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    document.getElementById('adminPassword').value = '';
    err.style.display = 'none';
    checkAdminSession();
  } else {
    err.style.display = 'block';
    document.getElementById('adminPassword').value = '';
  }
}

function adminLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  checkAdminSession();
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-link').forEach(l =>
    l.addEventListener('click', e => { e.preventDefault(); switchPage(l.dataset.page); })
  );
  document.querySelectorAll('[data-page]').forEach(b => {
    if (!b.classList.contains('nav-link'))
      b.addEventListener('click', () => switchPage(b.dataset.page));
  });
  document.getElementById('adminPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') adminLogin();
  });
  document.querySelector('#detailsModal .modal-overlay')
    ?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  setupFileUpload();
  setupForm();
  switchPage('home');
  addScrollEffects();
});

// ===== نسخ IBAN =====
function copyIBAN() {
  navigator.clipboard.writeText('SA0880000868608016214271').then(() => {
    const btn = document.querySelector('.btn-copy');
    const orig = btn.textContent;
    btn.textContent = '✓ تم النسخ';
    btn.style.background = 'rgba(255,255,255,0.4)';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
  });
}

// ===== رفع الملفات =====
function setupFileUpload() {
  const area    = document.getElementById('uploadArea');
  const input   = document.getElementById('receiptFile');
  const preview = document.getElementById('filePreview');
  if (!area || !input) return;

  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover', e => {
    e.preventDefault();
    area.classList.add('drag-over');
  });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) { input.files = e.dataTransfer.files; showFile(e.dataTransfer.files[0]); }
  });
  input.addEventListener('change', e => { if (e.target.files[0]) showFile(e.target.files[0]); });

  function showFile(f) {
    preview.innerHTML = `<span>✓</span><span>${f.name}</span><span class="file-size">${fmtSize(f.size)}</span>`;
    preview.classList.add('active');
  }
  function fmtSize(b) {
    return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
  }
}

// ===== التحقق من مضاعفات 50 =====
function isMultipleOf50(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 50 && n % 50 === 0;
}

// ===== النموذج =====
function setupForm() {
  const form   = document.getElementById('contributeForm');
  const amtInp = document.getElementById('amount');
  if (!form) return;

  amtInp.addEventListener('input', () => {
    const hint = amtInp.closest('.form-group').querySelector('.field-hint');
    const valid = !amtInp.value || isMultipleOf50(amtInp.value);
    amtInp.style.borderColor = valid ? '' : '#EF4444';
    if (hint) hint.style.color = valid ? '' : '#EF4444';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // ===== التحقق من المبلغ =====
    const amount = parseFloat(amtInp.value);
    if (!isMultipleOf50(amount)) {
      amtInp.style.borderColor = '#EF4444';
      amtInp.focus();
      showToast('المبلغ يجب أن يكون من مضاعفات 50', 'error');
      return;
    }

    const file = document.getElementById('receiptFile').files[0];
    if (!file)                        { showToast('يرجى إرفاق إيصال التحويل', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('حجم الملف يجب أن يكون أقل من 5MB', 'error'); return; }

    const submitBtn = form.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الإرسال...';

    try {
      // رفع الإيصال إلى Supabase Storage
      const tempId = Date.now();
      const receiptUrl = await dbUploadReceipt(file, tempId);

      // حفظ البيانات في Supabase
      await dbInsert({
        name:         document.getElementById('name').value.trim(),
        phone:        document.getElementById('phone').value.trim(),
        email:        document.getElementById('email').value.trim(),
        amount:       amount,          // ← المبلغ الصحيح كاملاً
        notes:        document.getElementById('notes').value.trim(),
        receipt_url:  receiptUrl,
        receipt_name: file.name
      });

      document.getElementById('successMsg').classList.add('active');
      form.reset();
      document.getElementById('filePreview').classList.remove('active');
      document.getElementById('filePreview').innerHTML = '';
      amtInp.style.borderColor = '';
      setTimeout(() => document.getElementById('successMsg').classList.remove('active'), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء الإرسال، يرجى المحاولة مجدداً', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'تقديم المساهمة';
    }
  });
}

// ===== تحميل لوحة التحكم =====
async function loadDashboard() {
  showTableLoading();
  try {
    const rows = await dbGetAll();
    renderDashboard(rows);
  } catch (err) {
    console.error(err);
    showToast('تعذّر تحميل البيانات من قاعدة البيانات', 'error');
  }
}

function renderDashboard(rows) {
  // ===== الإحصائيات - فقط المبالغ المعتمدة تُحسب =====
  const approved = rows.filter(r => r.status === 'approved');
  const pending  = rows.filter(r => r.status === 'pending');
  const rejected = rows.filter(r => r.status === 'rejected');

  // المبلغ الكلي = مجموع المبالغ المعتمدة فقط
  const totalApprovedAmount = approved.reduce((s, r) => s + Number(r.amount), 0);

  document.getElementById('totalCount').textContent    = rows.length;
  document.getElementById('totalSum').textContent      = totalApprovedAmount.toLocaleString('ar-SA');
  document.getElementById('pendingCount').textContent  = pending.length;
  document.getElementById('approvedCount').textContent = approved.length;

  const tbody = document.getElementById('tableBody');
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد مساهمات بعد</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr class="row-${r.status}">
      <td><span class="td-name">${r.name}</span></td>
      <td dir="ltr" class="td-phone">${r.phone}</td>
      <td class="td-email">${r.email}</td>
      <td><strong class="td-amount">${Number(r.amount).toLocaleString('ar-SA')} ر.س</strong></td>
      <td class="td-date">${formatDate(r.created_at)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn btn-view" onclick="viewDetails('${r.id}')">👁 عرض</button>
          ${r.status === 'pending' ? `
            <button class="action-btn btn-approve" onclick="handleApprove('${r.id}')">✓</button>
            <button class="action-btn btn-reject"  onclick="handleReject('${r.id}')">✗</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function showTableLoading() {
  const tbody = document.getElementById('tableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty-state loading-state">⏳ جاري التحميل...</td></tr>';
}

// ===== الموافقة =====
async function handleApprove(id) {
  if (!confirm('هل تريد الموافقة على هذه المساهمة؟')) return;
  try {
    await dbUpdateStatus(id, 'approved');
    showToast('✓ تمت الموافقة على المساهمة', 'success');
    await loadDashboard();
    // عرض كتيب الأسهم
    const rows = await dbGetAll();
    const contribution = rows.find(r => r.id == id);
    if (contribution) showShareBooklet(contribution);
  } catch (err) {
    showToast('حدث خطأ، يرجى المحاولة مجدداً', 'error');
  }
}

// ===== الرفض - يُزيل المبلغ من الإحصائيات =====
async function handleReject(id) {
  if (!confirm('هل تريد رفض هذه المساهمة؟ سيتم حذف مبلغها من الإجمالي.')) return;
  try {
    await dbUpdateStatus(id, 'rejected');
    showToast('✗ تم رفض المساهمة وحذف مبلغها من الإجمالي', 'error');
    await loadDashboard();
  } catch (err) {
    showToast('حدث خطأ، يرجى المحاولة مجدداً', 'error');
  }
}

// ===== عرض كتيب الأسهم عند الموافقة =====
function showShareBooklet(c) {
  const shares = Math.floor(Number(c.amount) / 50); // كل 50 ريال = سهم واحد
  const modal  = document.getElementById('bookletModal');
  const body   = document.getElementById('bookletBody');

  body.innerHTML = `
    <div class="booklet-wrapper" id="bookletContent">
      <div class="booklet-header">
        <img src="logo-removebg-preview.png" alt="Fly Light" class="booklet-logo">
        <div class="booklet-title-block">
          <h1>كتيب الأسهم</h1>
          <p>Fly Light Logistics Solutions</p>
        </div>
      </div>

      <div class="booklet-seal">✦ وثيقة مساهمة رسمية ✦</div>

      <div class="booklet-info-grid">
        <div class="booklet-field">
          <span class="booklet-label">اسم المساهم</span>
          <span class="booklet-value">${c.name}</span>
        </div>
        <div class="booklet-field">
          <span class="booklet-label">رقم الهاتف</span>
          <span class="booklet-value" dir="ltr">${c.phone}</span>
        </div>
        <div class="booklet-field">
          <span class="booklet-label">البريد الإلكتروني</span>
          <span class="booklet-value">${c.email}</span>
        </div>
        <div class="booklet-field">
          <span class="booklet-label">تاريخ المساهمة</span>
          <span class="booklet-value">${formatDate(c.created_at)}</span>
        </div>
        <div class="booklet-field booklet-field-full">
          <span class="booklet-label">مبلغ المساهمة</span>
          <span class="booklet-value booklet-amount">${Number(c.amount).toLocaleString('ar-SA')} ريال سعودي</span>
        </div>
        <div class="booklet-field booklet-field-full">
          <span class="booklet-label">عدد الأسهم</span>
          <span class="booklet-value booklet-shares">${shares.toLocaleString('ar-SA')} سهم</span>
        </div>
        ${c.notes ? `
        <div class="booklet-field booklet-field-full">
          <span class="booklet-label">ملاحظات</span>
          <span class="booklet-value">${c.notes}</span>
        </div>` : ''}
      </div>

      <div class="booklet-status-banner">
        <span>✓ تمت الموافقة على المساهمة</span>
        <span class="booklet-date">بتاريخ: ${new Date().toLocaleDateString('ar-SA')}</span>
      </div>

      <div class="booklet-footer">
        <div class="booklet-sig">
          <div class="booklet-sig-line"></div>
          <p>توقيع الإدارة</p>
        </div>
        <div class="booklet-sig">
          <div class="booklet-sig-line"></div>
          <p>توقيع المساهم</p>
        </div>
      </div>

      <p class="booklet-note">هذه الوثيقة صادرة من Fly Light Logistics Solutions وتُعدّ دليلاً على مساهمتك في الشركة</p>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBooklet() {
  document.getElementById('bookletModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

function printBooklet() {
  const content = document.getElementById('bookletContent').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html><html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كتيب الأسهم - Fly Light</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Tahoma,sans-serif; background:#fff; padding:20px; }
        .booklet-wrapper { max-width:700px; margin:0 auto; border:2px solid #1E9196; border-radius:16px; padding:40px; }
        .booklet-header { display:flex; align-items:center; gap:20px; margin-bottom:24px; border-bottom:3px solid #1E9196; padding-bottom:20px; }
        .booklet-logo { height:70px; width:auto; }
        .booklet-title-block h1 { font-size:28px; color:#0A1C33; }
        .booklet-title-block p { color:#1E9196; font-size:16px; }
        .booklet-seal { text-align:center; color:#1E9196; font-size:18px; font-weight:700; margin:20px 0; letter-spacing:2px; }
        .booklet-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:24px 0; }
        .booklet-field { background:#F7F9FA; padding:14px 18px; border-radius:10px; border-right:4px solid #1E9196; }
        .booklet-field-full { grid-column:1/-1; }
        .booklet-label { display:block; font-size:12px; color:#6B7280; font-weight:600; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; }
        .booklet-value { font-size:16px; color:#0A1C33; font-weight:700; }
        .booklet-amount { font-size:22px; color:#1E9196; }
        .booklet-shares { font-size:22px; color:#0A1C33; }
        .booklet-status-banner { background:linear-gradient(135deg,#1E9196,#0D6C70); color:#fff; padding:16px 24px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; margin:24px 0; font-weight:700; }
        .booklet-footer { display:flex; justify-content:space-around; margin:32px 0 16px; }
        .booklet-sig { text-align:center; }
        .booklet-sig-line { width:160px; height:2px; background:#0A1C33; margin-bottom:8px; }
        .booklet-sig p { font-size:13px; color:#6B7280; }
        .booklet-note { text-align:center; font-size:12px; color:#9CA3AF; margin-top:16px; }
        @media print { body { padding:0; } }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

// ===== عرض التفاصيل =====
async function viewDetails(id) {
  try {
    const rows = await dbGetAll();
    const c = rows.find(r => r.id == id);
    if (!c) return;
    selectedContribution = c;

    document.getElementById('modalBody').innerHTML = `
      <table class="info-table">
        <tr><td>الاسم</td><td>${c.name}</td></tr>
        <tr><td>الهاتف</td><td dir="ltr">${c.phone}</td></tr>
        <tr><td>البريد</td><td>${c.email}</td></tr>
        <tr><td>المبلغ</td><td><strong>${Number(c.amount).toLocaleString('ar-SA')} ريال</strong></td></tr>
        <tr><td>التاريخ</td><td>${formatDate(c.created_at)}</td></tr>
        <tr><td>الحالة</td><td>${statusBadge(c.status)}</td></tr>
        ${c.reviewed_at ? `<tr><td>تاريخ المراجعة</td><td>${formatDate(c.reviewed_at)}</td></tr>` : ''}
        ${c.notes ? `<tr><td>ملاحظات</td><td>${c.notes}</td></tr>` : ''}
      </table>
      <div style="margin-top:1.5rem">
        <p style="font-weight:700;margin-bottom:0.75rem;color:#0A1C33">الإيصال:</p>
        ${c.receipt_url
          ? `<a href="${c.receipt_url}" target="_blank" class="btn btn-outline" style="display:inline-flex;gap:0.5rem">
               📎 عرض الإيصال
             </a>`
          : '<p style="color:#9CA3AF">لا يوجد إيصال</p>'}
      </div>
      ${c.status === 'pending' ? `
      <div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap">
        <button class="btn-approve-full" onclick="handleApprove('${c.id}');closeModal()">✓ موافقة</button>
        <button class="btn-reject-full"  onclick="handleReject('${c.id}');closeModal()">✗ رفض</button>
      </div>` : ''}
      ${c.status === 'approved' ? `
      <div style="margin-top:1.5rem">
        <button class="btn btn-primary" onclick="showShareBooklet(selectedContribution)">📋 عرض كتيب الأسهم</button>
      </div>` : ''}
    `;

    document.getElementById('detailsModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    showToast('تعذّر تحميل التفاصيل', 'error');
  }
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// ===== Helpers =====
function statusBadge(s) {
  const map = { pending:'badge-pending', approved:'badge-approved', rejected:'badge-rejected' };
  const ar  = { pending:'قيد المراجعة', approved:'تمت الموافقة', rejected:'مرفوض' };
  return `<span class="badge ${map[s]||'badge-pending'}">${ar[s]||s}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
}

function showToast(msg, type = 'success') {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

function addScrollEffects() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.service-card,.value-card,.stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    obs.observe(el);
  });
}
