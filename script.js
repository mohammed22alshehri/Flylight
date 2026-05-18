// ===== الثوابت =====
const ADMIN_PASS = 'flylight2024';
let selectedContribution = null;

// ===== Hamburger القائمة المتنقلة =====
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
  
  // تهيئة الفلاتر والعمليات عند تحميل الصفحة أول مرة
  setupFilters();
  setupForm();
});

// ===== التنقل بين الصفحات =====
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById(name);
  if (page) page.classList.add('active');
  const link = document.querySelector(`[data-page=\"${name}\"]`);
  if (link) link.classList.add('active');
  if (name === 'dashboard') checkAdminSession();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// التبديل عند الضغط على أزرار التنقل الأساسية
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.getAttribute('data-page');
    switchPage(page);
  });
});

// ===== Admin Login لوحة الإدارة =====
function checkAdminSession() {
  const ok = sessionStorage.getItem('adminLoggedIn');
  document.getElementById('adminLogin').style.display  = ok ? 'none' : 'flex';
  document.getElementById('adminContent').style.display = ok ? 'block' : 'none';
  if (ok) loadDashboardData();
}

function handleLogin(e) {
  if (e) e.preventDefault();
  const pass = document.getElementById('adminPassword').value;
  if (pass === ADMIN_PASS) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    checkAdminSession();
    showToast('تم تسجيل الدخول بنجاح');
  } else {
    showToast('كلمة المرور غير صحيحة', 'danger');
  }
}

function handleLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  checkAdminSession();
  showToast('تم تسجيل الخروج');
}

// ===== تهيئة ومعالجة النموذج (Form Handling) =====
function setupForm() {
  const form = document.getElementById('contributeForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري إرسال البيانات...';

    try {
      const fileInput = document.getElementById('receiptFile');
      const file = fileInput ? fileInput.files[0] : null;

      if (!file) {
        throw new Error('الرجاء إرفاق صورة أو ملف إيصال التحويل المالي.');
      }

      // 1. إعداد تفاصيل المساهمة المبدئية
      const contributionData = {
        name: document.getElementById('fullName').value,
        phone: document.getElementById('phoneNumber').value,
        email: document.getElementById('emailAddress').value,
        amount: parseFloat(document.getElementById('stockAmount').value),
        notes: document.getElementById('notes').value || '',
        receipt_url: '',
        receipt_name: file.name
      };

      // توليد معرف عشوائي مؤقت لاسم الملف
      const tempId = 'rec_' + Math.random().toString(36).substr(2, 9);
      
      // 2. رفع الإيصال إلى الـ Storage
      const uploadRes = await dbUploadReceipt(file, tempId);
      contributionData.receipt_url = uploadRes.url;

      // 3. إدخال البيانات في الجدول (Database)
      await dbInsert(contributionData);

      showToast('تم إرسال طلب المساهمة بنجاح، شكراً لك!');
      form.reset();
      switchPage('home');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'حدث خطأ أثناء معالجة الطلب', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// ===== إدارة وعرض لوحة التحكم (Dashboard) =====
let allContributions = [];

async function loadDashboardData() {
  const tbody = document.getElementById('dashboardTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري تحميل البيانات...</td></tr>';
  
  try {
    allContributions = await dbGetAll();
    renderTable(allContributions);
    updateStats(allContributions);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">فشل تحميل البيانات من السيرفر</td></tr>';
  }
}

function renderTable(list) {
  const tbody = document.getElementById('dashboardTableBody');
  if (!tbody) return;
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد مساهمات مسجلة حالياً.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${item.id}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.amount} ريال</td>
      <td>${formatDate(item.created_at)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>
        ${item.receipt ? `<a href="${item.receipt}" target="_blank" class="btn-link">📄 عرض الإيصال</a>` : '—'}
      </td>
      <td>
        <button class="btn btn-outline" style="padding: 4px 10px; font-size:13px;" onclick="openDetails(${item.id})">إدارة</button>
      </td>
    </tr>
  `).join('');
}

function updateStats(list) {
  const totalAmount = list
    .filter(item => item.status === 'approved' || item.status === 'تمت الموافقة')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalCount = list.length;
  const pendingCount = list.filter(item => item.status === 'pending' || item.status === 'قيد المراجعة').length;

  const statAmount = document.getElementById('statTotalAmount');
  const statCount = document.getElementById('statTotalCount');
  const statPending = document.getElementById('statPendingCount');

  if (statAmount) statAmount.textContent = totalAmount.toLocaleString() + ' ريال';
  if (statCount) statCount.textContent = totalCount;
  if (statPending) statPending.textContent = pendingCount;
}

function setupFilters() {
  const searchInput = document.getElementById('tableSearch');
  const filterSelect = document.getElementById('tableFilter');

  if (searchInput) {
    searchInput.addEventListener('input', () => filterAndSearch());
  }
  if (filterSelect) {
    filterSelect.addEventListener('change', () => filterAndSearch());
  }
}

function filterAndSearch() {
  const query = document.getElementById('tableSearch').value.toLowerCase();
  const filterValue = document.getElementById('tableFilter').value;

  let filtered = allContributions.filter(item => {
    const matchQuery = item.name.toLowerCase().includes(query) || item.phone.includes(query);
    
    let matchFilter = true;
    if (filterValue === 'pending') {
      matchFilter = (item.status === 'pending' || item.status === 'قيد المراجعة');
    } else if (filterValue === 'approved') {
      matchFilter = (item.status === 'approved' || item.status === 'تمت الموافقة');
    } else if (filterValue === 'rejected') {
      matchFilter = (item.status === 'rejected' || item.status === 'مرفوض');
    }

    return matchQuery && matchFilter;
  });

  renderTable(filtered);
}

// ===== تفاصيل المنبثقة وإدارة الحالات =====
function openDetails(id) {
  selectedContribution = allContributions.find(c => c.id === id);
  if (!selectedContribution) return;

  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  // الحفاظ على مرونة قراءة الرابط من حقل receipt الجديد
  const receiptLink = selectedContribution.receipt || '#';

  modalBody.innerHTML = `
    <div class="details-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; direction:rtl;">
      <div><p><strong>اسم المساهم:</strong> ${selectedContribution.name}</p></div>
      <div><p><strong>رقم الهاتف:</strong> ${selectedContribution.phone}</p></div>
      <div><p><strong>البريد الإلكتروني:</strong> ${selectedContribution.email}</p></div>
      <div><p><strong>قيمة المساهمة:</strong> ${selectedContribution.amount} ريال</p></div>
      <div><p><strong>تاريخ الطلب:</strong> ${formatDate(selectedContribution.created_at)}</p></div>
      <div><p><strong>حالة الطلب الحالية:</strong> ${statusBadge(selectedContribution.status)}</p></div>
      <div style="grid-column: span 2;"><p><strong>ملاحظات:</strong> ${selectedContribution.notes || 'لا توجد ملاحظات'}</p></div>
    </div>
    <hr style="margin:1.5rem 0; border:0; border-top:1px solid var(--border);">
    <div style="text-align:center; margin-bottom:1.5rem;">
      <p style="margin-bottom:0.5rem;"><strong>إيصال المرفق:</strong></p>
      ${selectedContribution.receipt ? `<a href="${receiptLink}" target="_blank"><img src="${receiptLink}" style="max-width:100%; max-height:250px; border-radius:8px; border:1px solid var(--border); box-shadow:var(--shadow-sm);"></a>` : '<p>لا يوجد إيصال مرفق</p>'}
    </div>
    <div class="status-actions" style="display:flex; gap:0.5rem; justify-content:center;">
      <button class="btn btn-primary" onclick="updateStatusAction('تمت الموافقة')">✅ اعتماد والموافقة</button>
      <button class="btn btn-danger" style="background:#EF4444;" onclick="updateStatusAction('مرفوض')">❌ رفض الطلب</button>
    </div>
  `;

  document.getElementById('detailsModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function updateStatusAction(newStatus) {
  if (!selectedContribution) return;
  try {
    await dbUpdateStatus(selectedContribution.id, newStatus);
    showToast('تم تحديث حالة الطلب بنجاح');
    closeModal();
    loadDashboardData();
  } catch (err) {
    console.error(err);
    showToast('فشل في تحديث الحالة', 'danger');
  }
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// ===== Helpers الدوال المساعدة المحدثة بالعربية للتوافق التام =====
function statusBadge(s) {
  // الخريطة البرمجية لربط النصوص بفئات التصميم والتلوين CSS
  const map = { 
    'pending': 'badge-pending', 
    'قيد المراجعة': 'badge-pending', 
    'approved': 'badge-approved', 
    'تمت الموافقة': 'badge-approved', 
    'rejected': 'badge-rejected', 
    'مرفوض': 'badge-rejected' 
  };
  
  // لتوحيد العرض بالنص العربي النظيف داخل لوحة التحكم لمدير النظام
  const ar = { 
    'pending': 'قيد المراجعة', 
    'قيد المراجعة': 'قيد المراجعة', 
    'approved': 'تمت الموافقة', 
    'تمت الموافقة': 'تمت الموافقة', 
    'rejected': 'مرفوض', 
    'مرفوض': 'مرفوض' 
  };
  
  return `<span class="badge ${map[s] || 'badge-pending'}">${ar[s] || s}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
}

function showToast(msg, type = 'success') {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;\n  t.textContent = msg;\n  document.body.appendChild(t);\n  setTimeout(() => t.classList.add('show'), 10);\n  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);\n}
