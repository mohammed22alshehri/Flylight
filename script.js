// ===== الثوابت =====
const ADMIN_PASS = 'ADMIN_PASS';
let selectedContribution = null;
let allContributions = [];

// ===== عند تحميل الصفحة بالكامل =====
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. تشغيل وتفعيل القائمة المتنقلة للموبايل (Hamburger Menu)
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

  // 2. ربط أزرار القائمة العلوية بالتنقل بين الصفحات
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      switchPage(page);
    });
  });

  // 3. تفعيل زر المساهمة الموجود في الهيرو سيكشن (إصلاح المشكلة الخامسة)
  const heroContributeBtn = document.querySelector('.hero-buttons .btn-primary');
  if (heroContributeBtn) {
    heroContributeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchPage('contribute'); // ينقلك فوراً لصفحة الاستمارة
    });
  }

  // 4. تحسين استجابة شكل زر رفع الملف وإظهار اسم الملف المرفوع للمستخدم
  const fileInput = document.getElementById('receiptFile');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const fileName = e.target.files[0]?.name || "لم يتم اختيار ملف";
      // إذا كان لديك عنصر لعرض اسم الملف، سيتم تحديثه هنا
      console.log("الملف المختار حالياً:", fileName);
    });
  }

  // 5. تشغيل النماذج والفلاتر بشكل آمن لا يعطل المتصفح
  try { setupFilters(); } catch(e) { console.error(e); }
  try { setupForm(); }    catch(e) { console.error(e); }
});

// ===== آلية التنقل الفوري المتوافقة مع الموبايل =====
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

// ===== التحقق من لوحة التحكم والإدارة =====
function checkAdminSession() {
  const ok = sessionStorage.getItem('adminLoggedIn');
  const loginForm = document.getElementById('adminLogin');
  const dashboardContent = document.getElementById('adminContent');
  
  if(loginForm) loginForm.style.display = ok ? 'none' : 'flex';
  if(dashboardContent) dashboardContent.style.display = ok ? 'block' : 'none';
  
  if (ok) loadDashboardData();
}

function handleLogin(e) {
  if (e) e.preventDefault();
  const passInput = document.getElementById('adminPassword');
  if (!passInput) return;

  if (passInput.value === ADMIN_PASS) {
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

// ===== معالجة الاستمارة ورفع الملفات =====
function setupForm() {
  const form = document.getElementById('contributeForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || 'إرسال';
    
    try {
      const fileInput = document.getElementById('receiptFile');
      const file = fileInput ? fileInput.files[0] : null;

      if (!file) {
        throw new Error('الرجاء إرفاق صورة أو ملف إيصال التحويل المالي.');
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري إرسال البيانات...';
      }

      // إعداد كائن البيانات الموجه لـ Supabase
      const contributionData = {
        name: document.getElementById('fullName').value,
        phone: document.getElementById('phoneNumber').value,
        email: document.getElementById('emailAddress').value,
        amount: parseFloat(document.getElementById('stockAmount').value),
        notes: document.getElementById('notes')?.value || '',
        receipt_url: '',
        receipt_name: file.name
      };

      const tempId = 'rec_' + Math.random().toString(36).substr(2, 9);
      
      // رفع الملف إلى كبسولة التخزين أولاً
      const uploadRes = await dbUploadReceipt(file, tempId);
      contributionData.receipt_url = uploadRes.url;

      // حفظ البيانات بالجدول الرئيسي
      await dbInsert(contributionData);

      showToast('تم إرسال طلب المساهمة بنجاح، شكراً لك!');
      form.reset();
      switchPage('home');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'حدث خطأ أثناء إرسال الطلب', 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

// ===== جلب وعرض بيانات لوحة التحكم =====
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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">فشل في جلب البيانات، يرجى فحص إعدادات السيرفر</td></tr>';
  }
}

function renderTable(list) {
  const tbody = document.getElementById('dashboardTableBody');
  if (!tbody) return;
  
  if (!list || list.length === 0) {
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
  if(!list) return;
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

  if (searchInput) searchInput.addEventListener('input', () => filterAndSearch());
  if (filterSelect) filterSelect.addEventListener('change', () => filterAndSearch());
}

function filterAndSearch() {
  const query = document.getElementById('tableSearch')?.value.toLowerCase() || '';
  const filterValue = document.getElementById('tableFilter')?.value || 'all';

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

// ===== المنبثقة الإدارية وتغيير الحالات =====
function openDetails(id) {
  selectedContribution = allContributions.find(c => c.id === id);
  if (!selectedContribution) return;

  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

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
      ${selectedContribution.receipt ? `<a href="${receiptLink}" target="_blank"><img src="${receiptLink}" style="max-width:100%; max-height:250px; border-radius:8px; border:1px solid var(--border);"></a>` : '<p>لا يوجد إيصال مرفق</p>'}
    </div>
    <div class="status-actions" style="display:flex; gap:0.5rem; justify-content:center;">
      <button class="btn btn-primary" onclick="updateStatusAction('تمت الموافقة')">✅ اعتماد والموافقة</button>
      <button class="btn btn-danger" style="background:#EF4444;" onclick="updateStatusAction('مرفوض')">❌ رفض الطلب</button>
    </div>
  `;

  document.getElementById('detailsModal')?.classList.add('active');
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
    showToast('فشل في تحديث الحالة بقاعدة البيانات', 'danger');
  }
}

function closeModal() {
  document.getElementById('detailsModal')?.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// ===== الحالات والدوال المساعدة للـ Toast والتواريخ =====
function statusBadge(s) {
  const map = { 
    'pending': 'badge-pending', 'قيد المراجعة': 'badge-pending', 
    'approved': 'badge-approved', 'تمت الموافقة': 'badge-approved', 
    'rejected': 'badge-rejected', 'مرفوض': 'badge-rejected' 
  };
  const ar = { 
    'pending': 'قيد المراجعة', 'قيد المراجعة': 'قيد المراجعة', 
    'approved': 'تمت الموافقة', 'تمت الموافقة': 'تمت الموافقة', 
    'rejected': 'مرفوض', 'مرفوض': 'مرفوض' 
  };
  return `<span class="badge ${map[s] || 'badge-pending'}">${ar[s] || s}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-SA', { year:'numeric', month:'short', day:'numeric' });
}

// 🛠️ تم حقن خصائص ستايل حمائية مدمجة لضمان ظهور رسالة الخطأ والـ Toast أعلى جميع الطبقات (المشكلة الثانية)
function showToast(msg, type = 'success') {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  
  // فرض ظهور الرسالة في الأعلى فوق كل شيء بشكل حاسم
  t.style.position = 'fixed';
  t.style.zIndex = '999999'; 
  
  t.textContent = msg;
  document.body.appendChild(t);
  
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { 
    t.classList.remove('show'); 
    setTimeout(() => t.remove(), 300); 
  }, 3500);
}
