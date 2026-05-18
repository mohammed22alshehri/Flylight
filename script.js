// ===== إعداد Supabase =====
const SUPABASE_URL = 'SUPABASE_URL';
const SUPABASE_KEY = 'SUPABASE_KEYا';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = 'flylight2024';
let localContributions = []; // تخزين محلي مؤقت للبيانات المسحوبة
let selectedContribution = null;

// ===== جلب البيانات من Supabase =====
async function fetchContributions() {
  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching data:', error);
    return [];
  }
  localContributions = data;
  return data;
}

// ===== Hamburger Menu =====
document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }
});

// ===== التنقل بين الصفحات =====
function switchPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const target = document.getElementById(pageName);
  if (target) target.classList.add('active');

  const activeLink = document.querySelector(`[data-page="${pageName}"]`);
  if (activeLink) activeLink.classList.add('active');

  if (pageName === 'dashboard') {
    checkAdminSession();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== نظام تسجيل دخول الإدارة =====
async function checkAdminSession() {
  const loggedIn = sessionStorage.getItem('adminLoggedIn');
  document.getElementById('adminLogin').style.display = loggedIn ? 'none' : 'flex';
  document.getElementById('adminContent').style.display = loggedIn ? 'block' : 'none';
  if (loggedIn) {
    await fetchContributions();
    updateDashboard();
  }
}

function adminLogin() {
  const pass = document.getElementById('adminPassword').value;
  const errorEl = document.getElementById('loginError');

  if (pass === ADMIN_PASS) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    document.getElementById('adminPassword').value = '';
    errorEl.style.display = 'none';
    checkAdminSession();
  } else {
    errorEl.style.display = 'block';
    document.getElementById('adminPassword').value = '';
  }
}

function adminLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  checkAdminSession();
}

// ===== إعداد الأحداث الأساسية =====
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      switchPage(this.getAttribute('data-page'));
    });
  });

  document.querySelectorAll('[data-page]').forEach(btn => {
    if (!btn.classList.contains('nav-link')) {
      btn.addEventListener('click', function () {
        switchPage(this.getAttribute('data-page'));
      });
    }
  });

  setupFileUpload();
  setupForm();
  switchPage('home');
});

// ===== نسخ IBAN =====
function copyIBAN() {
  const iban = 'SA0880000868608016214271';
  navigator.clipboard.writeText(iban).then(() => {
    const btn = document.querySelector('.btn-copy');
    const orig = btn.textContent;
    btn.textContent = '✓ تم النسخ';
    btn.style.background = 'rgba(255,255,255,0.4)';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = 'rgba(255,255,255,0.2)';
    }, 2000);
  });
}

// ===== إعداد رفع الملفات =====
function setupFileUpload() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('receiptFile');
  const filePreview = document.getElementById('filePreview');
  if (!uploadArea || !fileInput) return;

  uploadArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    if (e.target.files.length > 0) showFileName(e.target.files[0]);
  });

  function showFileName(file) {
    filePreview.innerHTML = `<span style="font-size:20px">✓</span><span>${file.name}</span>`;
    filePreview.classList.add('active');
  }
}

function validateAmount(value) {
  const num = parseFloat(value);
  return num > 0 && num % 50 === 0;
}

// ===== إرسال المساهمة إلى Supabase =====
function setupForm() {
  const form = document.getElementById('contributeForm');
  const amountInput = document.getElementById('amount');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    if (!validateAmount(amount)) {
      showToast('المبلغ يجب أن يكون من مضاعفات 50', 'error');
      return;
    }

    const fileInput = document.getElementById('receiptFile');
    const file = fileInput.files[0];
    if (!file) { showToast('يرجى اختيار ملف الإيصال', 'error'); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'جاري الإرسال...';
    submitBtn.disabled = true;

    const reader = new FileReader();
    reader.onload = async function (ev) {
      const contributionData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        amount: amount,
        receipt: ev.target.result, // لحفظ الإيصال كـ Base64 (يفضل مستقبلاً استخدام Supabase Storage)
        receipt_name: file.name,
        notes: document.getElementById('notes').value.trim(),
        status: 'قيد المراجعة'
      };

      const { data, error } = await supabase.from('contributions').insert([contributionData]);

      if (error) {
        showToast('حدث خطأ أثناء الإرسال', 'error');
      } else {
        document.getElementById('successMsg').classList.add('active');
        form.reset();
        document.getElementById('filePreview').classList.remove('active');
        setTimeout(() => document.getElementById('successMsg').classList.remove('active'), 4000);
      }
      
      submitBtn.textContent = 'تقديم المساهمة';
      submitBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  });
}

// ===== تحديث لوحة التحكم (مع الحساب الصحيح للمبالغ المقبولة فقط) =====
function updateDashboard() {
  const contributions = localContributions;
  
  // حساب المبالغ للمساهمات المقبولة فقط لعدم حساب المرفوض
  const approvedContributions = contributions.filter(c => c.status === 'تمت الموافقة');
  const totalSum = approvedContributions.reduce((s, c) => s + Number(c.amount), 0);
  
  const pending = contributions.filter(c => c.status === 'قيد المراجعة').length;
  const approvedCount = approvedContributions.length;

  document.getElementById('totalCount').textContent = contributions.length;
  document.getElementById('totalSum').textContent = totalSum.toLocaleString('ar-SA');
  document.getElementById('pendingCount').textContent = pending;
  document.getElementById('approvedCount').textContent = approvedCount;

  const tbody = document.getElementById('tableBody');
  if (contributions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد مساهمات بعد</td></tr>';
    return;
  }

  tbody.innerHTML = contributions.map(c => `
    <tr>
      <td>${c.name}</td>
      <td dir="ltr">${c.phone}</td>
      <td>${c.email}</td>
      <td><strong>${c.amount.toLocaleString('ar-SA')} ر.س</strong></td>
      <td>${new Date(c.created_at).toLocaleDateString('ar-SA')}</td>
      <td>${statusBadge(c.status)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" onclick="viewDetails(${c.id})">عرض</button>
          ${c.status === 'قيد المراجعة' ? `
            <button class="action-btn btn-approve" onclick="updateStatus(${c.id}, 'تمت الموافقة')">✓ موافقة</button>
            <button class="action-btn btn-reject" onclick="updateStatus(${c.id}, 'مرفوض')">✗ رفض</button>
          ` : ''}
          ${c.status === 'تمت الموافقة' ? `<button class="action-btn" onclick="downloadReceiptPDF(${c.id})">شهادة</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function statusBadge(status) {
  const map = {
    'قيد المراجعة': 'badge-pending',
    'تمت الموافقة': 'badge-approved',
    'مرفوض': 'badge-rejected'
  };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`;
}

// ===== تحديث حالة المساهمة =====
async function updateStatus(id, newStatus) {
  const { error } = await supabase
    .from('contributions')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    showToast('حدث خطأ أثناء التحديث', 'error');
    return;
  }

  showToast(newStatus === 'تمت الموافقة' ? '✓ تمت الموافقة على المساهمة' : '✗ تم رفض المساهمة', newStatus === 'تمت الموافقة' ? 'success' : 'error');
  await fetchContributions();
  updateDashboard();
  
  // إذا تمت الموافقة، اعرض الشهادة تلقائياً للمدير أو أتح تحميلها
  if (newStatus === 'تمت الموافقة') {
      downloadReceiptPDF(id);
  }
}

function viewDetails(id) {
  selectedContribution = localContributions.find(c => c.id === id);
  if (!selectedContribution) return;
  const c = selectedContribution;

  document.getElementById('modalBody').innerHTML = `
    <table class="info-table">
      <tr><td>الاسم</td><td>${c.name}</td></tr>
      <tr><td>المبلغ</td><td><strong>${c.amount.toLocaleString('ar-SA')} ريال سعودي</strong></td></tr>
      <tr><td>الحالة</td><td>${statusBadge(c.status)}</td></tr>
    </table>
    <div style="margin-top:1.5rem">
      <p style="font-weight:700;margin-bottom:0.75rem;color:#0A1C33">الإيصال:</p>
      ${c.receipt ? `<img src="${c.receipt}" class="receipt-image" alt="إيصال">` : 'لا يوجد إيصال'}
    </div>
    ${c.status === 'قيد المراجعة' ? `
    <div style="display:flex;gap:1rem;margin-top:1.5rem">
      <button class="btn btn-approve-full" onclick="updateStatus(${c.id},'تمت الموافقة');closeModal()">✓ موافقة على المساهمة</button>
      <button class="btn btn-reject-full" onclick="updateStatus(${c.id},'مرفوض');closeModal()">✗ رفض المساهمة</button>
    </div>` : ''}
  `;
  document.getElementById('detailsModal').classList.add('active');
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
}

// ===== توليد كتيب الأسهم (الشهادة) بصيغة PDF ومطابقة للمرفق =====
function downloadReceiptPDF(id) {
  const c = localContributions.find(x => x.id === id);
  if (!c || c.status !== 'تمت الموافقة') return;

  const sharesCount = c.amount / 50; // حساب عدد الأسهم
  const dateFormatted = new Date(c.created_at).toLocaleDateString('ar-SA');

  const el = document.createElement('div');
  el.style.cssText = 'padding:60px; font-family: "Segoe UI", Arial, sans-serif; direction:rtl; background:#fff; color:#0A1C33; position:relative; min-height: 800px; border: 15px solid #1E9196; border-radius: 10px; background-image: radial-gradient(circle, rgba(30,145,150,0.05) 0%, transparent 100%);';
  
  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; border-bottom:3px solid #1E9196; padding-bottom:20px; margin-bottom:40px;">
        <div style="text-align:right;">
            <p style="margin:5px 0; font-size:18px; font-weight:bold; color:#1E9196;">برنامج الشركة [cite: 5]</p>
            <p style="margin:5px 0;">رقم الشهادة: <strong>${c.id}</strong> [cite: 19]</p>
            <p style="margin:5px 0;">التاريخ: <strong>${dateFormatted}</strong> [cite: 14]</p>
        </div>
        <div style="text-align:left;">
            <h1 style="color:#0A1C33; font-size:32px; margin:0;">Fly Light Logistics Solutions</h1>
            <p style="margin:5px 0; font-size:14px; color:#6B7280;">إنجاز السعودية [cite: 3]</p>
        </div>
    </div>

    <div style="text-align:center; margin-bottom:50px;">
      <h2 style="font-size:36px; color:#1E9196; text-decoration: underline; margin-bottom:20px;">شهادة الأسهم </h2>
      <p style="font-size:22px; line-height:2;">
        تشهد شركة <strong>Fly Light Logistics Solutions</strong> [cite: 21]<br>
        بأن المساهم: <strong style="color:#1E9196; font-size:26px;">${c.name}</strong> [cite: 20]<br>
        يملك عدد (<strong style="color:#1E9196; font-size:24px;">${sharesCount}</strong>) سهم من أسهم رأس المال،<br>
        بقيمة إجمالية تبلغ ( <strong>${c.amount}</strong> ) ريالاً سعودياً لا غير. [cite: 21]
      </p>
    </div>

    <div style="margin-bottom: 40px; padding: 20px; background: rgba(30,145,150,0.05); border-radius: 8px;">
        <h3 style="color:#1E9196; margin-top:0;">معلومات المساهم </h3>
        <p style="margin:10px 0; font-size:18px;">الاسم: <strong>${c.name}</strong> [cite: 10]</p>
        <p style="margin:10px 0; font-size:18px;">رقم الهاتف: <strong dir="ltr">${c.phone}</strong> [cite: 11]</p>
    </div>

    <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
            <p style="font-size:16px; color:#1E9196; font-weight:bold;">توقيع مدير المالية [cite: 24]</p>
            <div style="border-bottom: 2px dashed #0A1C33; width: 200px; margin-top: 40px;"></div>
        </div>
    </div>

    <div style="position:absolute; bottom: 30px; left: 40px; right: 40px; text-align:center; padding-top:20px; border-top: 1px solid #E5E7EB;">
      <p style="font-size:12px; color:#6B7280; line-height: 1.6;">
        يعين المساهم مدير المالية كوكيل له في كافة اجتماعات مجلس الإدارة. [cite: 22]<br>
        <strong>تنويه وإخلاء مسؤولية:</strong> هذه الشهادة تثبت المساهمة في شركة Fly Light Logistics Solutions. وقد طبعت لأغراض تعليمية وتطويرية ضمن برنامج إنجاز ولا تمثل أي التزام أو ذمم مالية رسمية خارج إطار الاتفاق الداخلي للبرنامج. [cite: 23]
      </p>
    </div>
  `;

  html2pdf().set({
    margin: 0,
    filename: `شهادة_أسهم_${c.name}.pdf`,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 3, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el).save();
}

function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}
