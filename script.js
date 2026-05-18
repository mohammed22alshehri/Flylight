// ===== إعداد Supabase =====
const SUPABASE_URL = 'SUPABASE_URL'; 
const SUPABASE_KEY = 'SUPABASE_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASS = 'flylight2024';
let localContributions = []; 
let selectedContribution = null;

// ===== جلب البيانات من Supabase =====
async function fetchContributions() {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    localContributions = data || [];
    return localContributions;
  } catch (err) {
    console.error('Error fetching data:', err);
    return [];
  }
}

// ===== تهيئة الأحداث والعمليات عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function () {
  // 1. نظام القائمة المتجاوبة (Hamburger)
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

  // 2. تفعيل التنقل بين الصفحات لجميع الأزرار والروابط التي تحمل خاصية data-page
  document.body.addEventListener('click', function (e) {
    const targetButton = e.target.closest('[data-page]');
    if (targetButton) {
      e.preventDefault();
      const pageName = targetButton.getAttribute('data-page');
      switchPage(pageName);
    }
  });

  setupFileUpload();
  setupForm();
  switchPage('home'); // تعيين الصفحة الرئيسية كصفحة افتراضية عند الفتح
});

// ===== التنقل بين الصفحات =====
function switchPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const target = document.getElementById(pageName);
  if (target) target.classList.add('active');

  const activeLink = document.querySelector(`.nav-links [data-page="${pageName}"]`);
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

// ===== نسخ IBAN =====
function copyIBAN() {
  const iban = 'SA0880000868608016214271';
  navigator.clipboard.writeText(iban).then(() => {
    const btn = document.querySelector('.btn-copy');
    if(btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ تم النسخ';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }
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
    if (e.target.files.length > 0) {
      filePreview.innerHTML = `<span>✓ تم اختيار: ${e.target.files[0].name}</span>`;
      filePreview.style.display = 'block';
    }
  });
}

// ===== إرسال المساهمة إلى Supabase =====
function setupForm() {
  const form = document.getElementById('contributeForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const amountInput = document.getElementById('amount');
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0 || amount % 50 !== 0) {
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
        receipt: ev.target.result, 
        receipt_name: file.name,
        notes: document.getElementById('notes').value.trim(),
        status: 'قيد المراجعة'
      };

      const { error } = await supabase.from('contributions').insert([contributionData]);

      if (error) {
        showToast('حدث خطأ أثناء الإرسال', 'error');
      } else {
        const successEl = document.getElementById('successMsg');
        successEl.classList.add('active');
        form.reset();
        document.getElementById('filePreview').style.display = 'none';
        setTimeout(() => successEl.classList.remove('active'), 4000);
      }
      
      submitBtn.textContent = 'تقديم المساهمة';
      submitBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  });
}

// ===== تحديث لوحة التحكم وعرض الحساب الصحيح للمبالغ المعتمدة فقط =====
function updateDashboard() {
  const contributions = localContributions;
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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">لا توجد مساهمات بعد</td></tr>';
    return;
  }

  tbody.innerHTML = contributions.map(c => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding:1rem;">${c.name}</td>
      <td style="padding:1rem;" dir="ltr">${c.phone}</td>
      <td style="padding:1rem;">${c.email}</td>
      <td style="padding:1rem;"><strong>${c.amount.toLocaleString('ar-SA')} ر.س</strong></td>
      <td style="padding:1rem;">${new Date(c.created_at).toLocaleDateString('ar-SA')}</td>
      <td style="padding:1rem;"><span class="badge badge-${c.status === 'تمت الموافقة' ? 'approved' : c.status === 'مرفوض' ? 'rejected' : 'pending'}">${c.status}</span></td>
      <td style="padding:1rem;">
        <div style="display:flex; gap:0.5rem;">
          <button class="action-btn" onclick="viewDetails(${c.id})" style="padding:0.25rem 0.75rem; cursor:pointer;">عرض</button>
          ${c.status === 'قيد المراجعة' ? `
            <button class="action-btn" onclick="updateStatus(${c.id}, 'تمت الموافقة')" style="background:var(--success); color:#fff; border:none; padding:0.25rem 0.5rem; cursor:pointer; border-radius:4px;">✓ موافقة</button>
            <button class="action-btn" onclick="updateStatus(${c.id}, 'مرفوض')" style="background:#EF4444; color:#fff; border:none; padding:0.25rem 0.5rem; cursor:pointer; border-radius:4px;">✗ رفض</button>
          ` : ''}
          ${c.status === 'تمت الموافقة' ? `<button class="action-btn" onclick="downloadReceiptPDF(${c.id})" style="background:var(--primary); color:#fff; border:none; padding:0.25rem 0.5rem; cursor:pointer; border-radius:4px;">الشهادة PDF</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// ===== تحديث حالة المساهمة المرفوضة والمقبولة عاجلاً لخصم الحساب أو اعتمادها =====
async function updateStatus(id, newStatus) {
  const { error } = await supabase
    .from('contributions')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    showToast('حدث خطأ أثناء التحديث', 'error');
    return;
  }

  showToast(newStatus === 'تمت الموافقة' ? '✓ تم قبول المساهمة واعتماد المبلغ' : '✗ تم رفض المساهمة واستبعاد المبلغ', newStatus === 'تمت الموافقة' ? 'success' : 'error');
  await fetchContributions();
  updateDashboard();
  
  if (newStatus === 'تمت الموافقة') {
    downloadReceiptPDF(id);
  }
}

function viewDetails(id) {
  selectedContribution = localContributions.find(c => c.id === id);
  if (!selectedContribution) return;
  const c = selectedContribution;

  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.75rem;">
      <p><strong>الاسم:</strong> ${c.name}</p>
      <p><strong>المبلغ:</strong> ${c.amount.toLocaleString('ar-SA')} ريال سعودي</p>
      <p><strong>الهاتف:</strong> ${c.phone}</p>
      <p><strong>الحالة:</strong> ${c.status}</p>
      ${c.notes ? `<p><strong>ملاحظات:</strong> ${c.notes}</p>` : ''}
      ${c.receipt ? `<div style="margin-top:1rem;"><p><strong>صورة الإيصال:</strong></p><img src="${c.receipt}" style="width:100%; max-height:250px; object-fit:contain; border-radius:6px; border:1px solid var(--border);"></div>` : ''}
    </div>
  `;
  document.getElementById('detailsModal').classList.add('active');
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
}

// ===== طباعة كتيب الأسهم ومطابقة المدخلات =====
function downloadReceiptPDF(id) {
  const c = localContributions.find(x => x.id === id);
  if (!c || c.status !== 'تمت الموافقة') return;

  const sharesCount = c.amount / 50; 
  const dateFormatted = new Date(c.created_at).toLocaleDateString('ar-SA');

  const el = document.createElement('div');
  el.style.cssText = 'padding:50px; font-family: "Segoe UI", Arial, sans-serif; direction:rtl; background:#fff; color:#0A1C33; border: 12px solid #1E9196; border-radius: 8px; position:relative;';
  
  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; border-bottom:2px solid #1E9196; padding-bottom:15px; margin-bottom:30px;">
        <div style="text-align:right;">
            <p style="margin:4px 0; color:#1E9196; font-weight:bold;">برنامج الشركة</p>
            <p style="margin:4px 0;">رقم الشهادة: <strong>${c.id}</strong></p>
            <p style="margin:4px 0;">التاريخ: <strong>${dateFormatted}</strong></p>
        </div>
        <div style="text-align:left;">
            <h2 style="margin:0; color:#0A1C33;">Fly Light Logistics Solutions</h2>
            <p style="margin:4px 0; font-size:12px; color:#6B7280;">إنجاز السعودية</p>
        </div>
    </div>

    <div style="text-align:center; margin:40px 0;">
      <h2 style="font-size:28px; color:#1E9196; margin-bottom:20px;">شهادة الأسهم</h2>
      <p style="font-size:18px; line-height:2;">
        تشهد شركة <strong>Fly Light Logistics Solutions</strong><br>
        بأن المساهم: <strong style="color:#1E9196; font-size:22px;">${c.name}</strong><br>
        يملك عدد (<strong style="color:#1E9196; font-size:20px;">${sharesCount}</strong>) سهم من أسهم رأس المال،<br>
        بقيمة إجمالية تبلغ ( <strong>${c.amount}</strong> ) ريالاً سعودياً لا غير.
      </p>
    </div>

    <div style="background: rgba(30,145,150,0.04); padding: 15px; border-radius: 6px; margin-bottom:30px;">
        <h4 style="color:#1E9196; margin:0 0 10px 0;">معلومات المساهم</h4>
        <p style="margin:5px 0;">الاسم الفعلي للمشارك: <strong>${c.name}</strong></p>
        <p style="margin:5px 0;">رقم التواصل الجوال: <strong dir="ltr">${c.phone}</strong></p>
    </div>

    <div style="margin-top: 50px; display:flex; justify-content:space-between;">
        <div>
            <p style="font-size:14px; color:#1E9196; font-weight:bold;">توقيع مدير المالية</p>
            <div style="border-bottom: 1px dashed #0A1C33; width: 150px; margin-top:30px;"></div>
        </div>
    </div>

    <div style="margin-top:50px; padding-top:15px; border-top: 1px solid #E5E7EB; text-align:center; font-size:11px; color:#6B7280; line-height:1.5;">
        يعين المساهم مدير المالية كوكيل له في كافة اجتماعات مجلس الإدارة.<br>
        <strong>تنويه وإخلاء مسؤولية:</strong> طبعت هذه الشهادة لأغراض تعليمية وتطويرية داخل إطار برنامج مؤسسة إنجاز السعودية لتدريب الطلاب واكتساب المهارة فقط ولا تمثل أي التزام مالي خارج البرنامج.
    </div>
  `;

  html2pdf().set({
    margin: 10,
    filename: `كتيب_أسهم_${c.name}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
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
