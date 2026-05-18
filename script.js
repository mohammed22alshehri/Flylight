// ===== الثوابت =====
const expectedPassword = 'PLACEHOLDER_ADMIN_PASS';
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

  // 3. تفعيل زر المساهمة الموجود في الهيرو سيكشن (Hero Section)
  const heroContributeBtn = document.querySelector('.hero-buttons .btn-primary');
  if (heroContributeBtn) {
    heroContributeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchPage('contribute'); 
    });
  }

  // 4. مراقبة زر رفع الملف وإظهار اسم الملف المرفوع وتحديث المعاينة والـ DOM
  const fileInput = document.getElementById('receiptFile');
  const uploadArea = document.getElementById('uploadArea');
  const filePreview = document.getElementById('filePreview');

  // ربط الضغط على المربع المخصص بفتح نافذة تصفح الملفات المخفية
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const fileName = file ? file.name : "لم يتم اختيار ملف";
      console.log("الملف المختار حالياً:", fileName);
      
      if (filePreview && file) {
        filePreview.innerHTML = `<div style="padding: 8px; background: var(--light-bg); border: 1px dashed var(--primary); border-radius: 6px; margin-top: 10px; color: var(--secondary); font-size: 13px;">📄 المرفق الحالي: <strong>${fileName}</strong></div>`;
      }
      showToast(`تم اختيار الملف: ${fileName}`, 'success');
    });
  }

  // 5. تشغيل تشكيل النماذج والفلاتر بشكل آمن
  try { setupForm(); } catch(e) { console.error("خطأ في تهيئة النموذج:", e); }
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
  
  if (ok) loadDashboard();
}

// دالة تسجيل الدخول المرتبطة بـ الـ HTML (adminLogin)
function adminLogin() {
  const passInput = document.getElementById('adminPassword');
  const errorMsg = document.getElementById('loginError');
  if (!passInput) return;

  if (passInput.value === ADMIN_PASS) {
    if (errorMsg) errorMsg.style.display = 'none';
    sessionStorage.setItem('adminLoggedIn', 'true');
    checkAdminSession();
    showToast('تم تسجيل الدخول بنجاح');
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
    showToast('كلمة المرور غير صحيحة', 'danger');
  }
}

// دالة تسجيل الخروج المرتبطة بـ الـ HTML (adminLogout)
function adminLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  checkAdminSession();
  showToast('تم تسجيل الخروج');
}

// ===== معالجة الاستمارة ورفع الملفات لـ Supabase =====
function setupForm() {
  const form = document.getElementById('contributeForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || 'تقديم المساهمة';
    
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

      // مطابقة دقيقة لمعرفات عناصر الإدخال في الـ HTML
      const contributionData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        amount: parseFloat(document.getElementById('amount').value),
        notes: document.getElementById('notes')?.value || '',
        receipt_url: '',
        receipt_name: file.name
      };

      const tempId = 'rec_' + Math.random().toString(36).substr(2, 9);
      
      // رفع الإيصال والحصول على الرابط العام
      const uploadRes = await dbUploadReceipt(file, tempId);
      contributionData.receipt_url = uploadRes.url;

      // إدخال السجل في قاعدة البيانات
      await dbInsert(contributionData);

      showToast('تم إرسال طلب المساهمة بنجاح، شكراً لك!');
      form.reset();
      
      const filePreview = document.getElementById('filePreview');
      if (filePreview) filePreview.innerHTML = '';

      // إظهار رسالة النجاح الثابتة في الصفحة إن وجدت
      const successMsg = document.getElementById('successMsg');
      if (successMsg) {
        successMsg.style.display = 'flex';
        setTimeout(() => { successMsg.style.display = 'none'; }, 5000);
      }

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

// ===== جلب وعرض بيانات لوحة التحكم (loadDashboard) =====
async function loadDashboard() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري تحميل البيانات...</td></tr>';
  
  try {
    allContributions = await dbGetAll();
    renderTable(allContributions);
    updateStats(allContributions);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">فشل في جلب البيانات، يرجى فحص الإعدادات</td></tr>';
  }
}

function renderTable(list) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد مساهمات مسجلة حالياً.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => {
    // التحقق من تفعيل زر الكتيب للطلبات المعتمدة فقط
    const isApproved = item.status === 'approved' || item.status === 'تمت الموافقة';
    const bookletButton = isApproved ? `<button class="btn btn-outline" style="padding:4px 8px; font-size:12px; background:#1E9196; color:white; border-color:#1E9196;" onclick="openBooklet('${item.id}')">📑 الكتيب</button>` : '';

    return `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td>${item.phone}</td>
      <td>${item.email}</td>
      <td>${item.amount} ريال</td>
      <td>${formatDate(item.created_at)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>
        <div style="display:flex; gap:8px; justify-content:center; align-items:center;">
          ${item.receipt ? `<a href="${item.receipt}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; text-decoration:none;">📄 الإيصال</a>` : '—'}
          ${bookletButton}
          <button class="btn btn-primary" style="padding: 4px 8px; font-size:12px;" onclick="openDetails('${item.id}')">إدارة</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function updateStats(list) {
  if(!list) return;
  
  // حساب المبالغ المعتمدة
  const totalAmount = list
    .filter(item => item.status === 'approved' || item.status === 'تمت الموافقة')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalCount = list.length;
  const pendingCount = list.filter(item => item.status === 'pending' || item.status === 'قيد المراجعة').length;
  const approvedCount = list.filter(item => item.status === 'approved' || item.status === 'تمت الموافقة').length;

  // ربط المعرفات المتطابقة مع HTML المعطى
  const statCount = document.getElementById('totalCount');
  const statSum = document.getElementById('totalSum');
  const statPending = document.getElementById('pendingCount');
  const statApproved = document.getElementById('approvedCount');

  if (statCount) statCount.textContent = totalCount;
  if (statSum) statSum.textContent = totalAmount.toLocaleString() + ' ريال';
  if (statPending) statPending.textContent = pendingCount;
  if (statApproved) statApproved.textContent = approvedCount;
}

// ===== المنبثقة الإدارية وتغيير الحالات =====
function openDetails(id) {
  selectedContribution = allContributions.find(c => c.id == id);
  if (!selectedContribution) return;

  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  const receiptLink = selectedContribution.receipt || '#';

  modalBody.innerHTML = `
    <div class="details-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; direction:rtl; text-align:right;">
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
      <p style="margin-bottom:0.5rem;"><strong>الإيصال المرفق:</strong></p>
      ${selectedContribution.receipt ? `<a href="${receiptLink}" target="_blank"><img src="${receiptLink}" style="max-width:100%; max-height:250px; border-radius:8px; border:1px solid #E5E7EB;"></a>` : '<p>لا يوجد إيصال مرفق</p>'}
    </div>
    <div class="status-actions" style="display:flex; gap:0.5rem; justify-content:center;">
      <button class="btn btn-primary" onclick="updateStatusAction('تمت الموافقة')">✅ اعتماد والموافقة</button>
      <button class="btn btn-danger" style="background:#EF4444; color:white;" onclick="updateStatusAction('مرفوض')">❌ رفض الطلب</button>
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
    loadDashboard();
  } catch (err) {
    console.error(err);
    showToast('فشل في تحديث الحالة بقاعدة البيانات', 'danger');
  }
}

function closeModal() {
  document.getElementById('detailsModal')?.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// ===== دالة نسخ الآيبان المربوطة بالـ HTML =====
function copyIBAN() {
  const ibanText = "SA0880000868608016214271";
  navigator.clipboard.writeText(ibanText).then(() => {
    showToast('تم نسخ رقم الآيبان بنجاح');
  }).catch(err => {
    console.error("فشل النسخ تلقائياً:", err);
    showToast('فشل في النسخ التلقائي، يرجى نسخه يدوياً', 'danger');
  });
}

// ===== دالات المساعدة للـ Booklet وتوليد شهادة الأسهم التعليمية لبرنامج إنجاز =====
function openBooklet(id) {
  const contribution = allContributions.find(c => c.id == id);
  if (!contribution) return;

  const sharesCount = Math.floor(Number(contribution.amount) / 50) || 1;
  const bookletBody = document.getElementById('bookletBody');
  if (!bookletBody) return;

  bookletBody.innerHTML = `
    <div id="bookletPrintArea" style="padding: 25px; border: 3px double #1E9196; border-radius: 12px; background: #fff; font-family: 'Tajawal', sans-serif; color: #0A1C33; direction: rtl; text-align: right; box-shadow: var(--shadow-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1E9196; padding-bottom: 10px; margin-bottom: 20px;">
        <div>
          <h2 style="color: #1E9196; margin: 0; font-size: 22px;">إنجاز السعودية</h2>
          <p style="font-size: 12px; margin: 4px 0 0 0; color: #6B7280;">برنامج الشركة للتدريب العملي</p>
        </div>
        <div style="text-align: left;">
          <h3 style="margin:0; color:#0A1C33; font-size: 16px;">شهادة الأسهم التعليمية</h3>
          <p style="font-size: 12px; margin: 4px 0 0 0; color: #6B7280;">التاريخ: ${formatDate(contribution.created_at)}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px; line-height: 1.8;">
        <p style="font-size: 15px;">اسم الشركة الناشئة: <span style="color: #0D6C70; font-weight: bold;">Fly Light Logistics Solutions</span></p>
        <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 12px 0;">
        <p>تشهد إدارة الشركة بأن شريك النجاح المساهم:</p>
        <p style="font-size: 18px; color: #1E9196; font-weight: bold; margin: 10px 0; padding-right: 15px; border-right: 4px solid #1E9196;">${contribution.name}</p>
        <p>رقم الهاتف الموثق: <strong>${contribution.phone}</strong></p>
        <p>يملك عدد <span style="font-size: 18px; color: #0D6C70; font-weight: bold;">(${sharesCount})</span> أسهماً من أسهم رأس مال الشركة بقيمة إسمية قدرها <strong>( ٥٠ ) خمسون ريالاً سعودياً</strong> للسهم الواحد، لتبلغ القيمة الإجمالية للمساهمة المعتمدة <strong>${contribution.amount} ريال سعودي</strong>.</p>
      </div>

      <div style="background: #F7F9FA; padding: 12px; border-radius: 8px; font-size: 13px; color: #4B5563; border-left: 4px solid #1E9196; margin-bottom: 15px;">
        <p style="margin: 0 0 5px 0;">• السهم الواحد غير قابل للنقل ويصبح لاغياً بمجرد تصفية وانتهاء نشاط الشركة لغرض التدريب.</p>
        <p style="margin: 0;">• يعين المساهم بموجب هذه الشهادة مدير المالية كوكيل قانوني له في كافة اجتماعات مجلس الإدارة.</p>
      </div>

      <div style="margin-top: 25px; border-top: 1px dashed #CDD5DF; padding-top: 12px; font-size: 11px; color: #9CA3AF; text-align: justify; line-height: 1.5;">
        <strong>تنويه وإخلاء مسؤولية:</strong> إن برنامج إنجاز السعودية غير مسؤول عن أي معلومات واردة في هذه الشهادة، وقد طُبعت وحُفظت بالكامل لأغراض تعليمية وتدريبية بحتة ولا تمثل أي التزام مالي أو ذمم حقيقية على البرنامج أو طاقمه، واعتُبرت فقط كجزء متمم لاكتساب المهارات التطبيقية للطلاب المتدربين.
      </div>
    </div>
  `;

  document.getElementById('bookletModal')?.classList.add('active');
}

function printBooklet() {
  const element = document.getElementById('bookletPrintArea');
  if (!element) {
    showToast('لا توجد بيانات لطباعتها', 'danger');
    return;
  }
  
  // تشغيل مكتبة html2pdf المرفقة بالـ HTML لتوليد ملف PDF عالي الجودة وحفظه فوراً
  const opt = {
    margin:       10,
    filename:     `شهادة_أسهم_FlyLight_${Date.now()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save()
    .then(() => showToast('تم تجهيز الملف وتحميله كـ PDF'))
    .catch(err => {
      console.error(err);
      showToast('حدث خطأ أثناء توليد الـ PDF، جاري الطباعة الاعتيادية', 'warning');
      window.print();
    });
}

function closeBooklet() {
  document.getElementById('bookletModal')?.classList.remove('active');
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

function showToast(msg, type = 'success') {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  
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
