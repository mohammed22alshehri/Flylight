// ===== قاعدة البيانات (localStorage) =====
const DB_KEY = 'flylight_contributions';
const ADMIN_PASS = 'flylight2024';

function getContributions() {
  return JSON.parse(localStorage.getItem(DB_KEY)) || [];
}

function saveContributions(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

let selectedContribution = null;

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

// تفعيل روابط الهيدر بالتنقل الآمن
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      if(page) switchPage(page);
    });
  });
});

// ===== نظام تسجيل الدخول لوحة التحكم =====
function checkAdminSession() {
  const loggedIn = sessionStorage.getItem('adminLoggedIn');
  document.getElementById('adminLogin').style.display = loggedIn ? 'none' : 'block';
  document.getElementById('adminContent').style.display = loggedIn ? 'block' : 'none';
  if (loggedIn) {
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

// ===== نسخ الـ IBAN =====
function copyIBAN() {
  const iban = 'SA0880000868608016214271';
  navigator.clipboard.writeText(iban).then(() => {
    const btn = document.querySelector('.btn-copy');
    const originalText = btn.textContent;
    btn.textContent = '✓ تم النسخ';
    setTimeout(() => { btn.textContent = originalText; }, 2000);
  });
}

// ===== رفع ومعاينة الملفات =====
document.addEventListener('DOMContentLoaded', function() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('receiptFile');
  const filePreview = document.getElementById('filePreview');

  if(uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        filePreview.innerHTML = `<span>✓ تم اختيار الملف: ${file.name}</span>`;
        filePreview.style.display = 'block';
      }
    });
  }
});

// ===== تقديم نموذج المساهمة محلياً =====
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('contributeForm');
  if(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const amount = parseFloat(document.getElementById('amount').value);
      if (!amount || amount <= 0 || amount % 50 !== 0) {
        showToast('المبلغ يجب أن يكون من مضاعفات 50 ريال', 'error');
        return;
      }

      const fileInput = document.getElementById('receiptFile');
      if (fileInput.files.length === 0) {
        showToast('يرجى رفع صورة إيصال التحويل', 'error');
        return;
      }

      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function(event) {
        const contributions = getContributions();
        const newContribution = {
          id: Date.now(),
          name: document.getElementById('name').value,
          phone: document.getElementById('phone').value,
          email: document.getElementById('email').value,
          amount: amount,
          notes: document.getElementById('notes').value,
          receipt: event.target.result,
          status: 'قيد المراجعة',
          date: new Date().toISOString()
        };

        contributions.push(newContribution);
        saveContributions(contributions);

        const successMsg = document.getElementById('successMsg');
        successMsg.classList.add('active');
        form.reset();
        document.getElementById('filePreview').style.display = 'none';

        setTimeout(() => { successMsg.classList.remove('active'); }, 4000);
      };
      reader.readAsDataURL(file);
    });
  }
});

// ===== تحديث واجهة لوحة التحكم والأرقام =====
function updateDashboard() {
  const contributions = getContributions();
  const approved = contributions.filter(c => c.status === 'تمت الموافقة');
  
  const totalSum = approved.reduce((sum, c) => sum + c.amount, 0);
  const pendingCount = contributions.filter(c => c.status === 'قيد المراجعة').length;
  const approvedCount = approved.length;

  document.getElementById('totalCount').textContent = contributions.length;
  document.getElementById('totalSum').textContent = totalSum.toLocaleString('ar-SA');
  document.getElementById('pendingCount').textContent = pendingCount;
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
      <td><strong>${c.amount} ر.س</strong></td>
      <td>${new Date(c.date).toLocaleDateString('ar-SA')}</td>
      <td><span class="badge ${c.status === 'تمت الموافقة' ? 'approved' : c.status === 'مرفوض' ? 'rejected' : 'pending'}">${c.status}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewDetails(${c.id})">عرض</button>
          ${c.status === 'قيد المراجعة' ? `
            <button class="btn-action btn-approve" onclick="updateStatus(${c.id}, 'تمت الموافقة')">موافق</button>
            <button class="btn-action btn-reject" onclick="updateStatus(${c.id}, 'مرفوض')">رفض</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// ===== تحديث حالة المساهمة محلياً =====
function updateStatus(id, newStatus) {
  let contributions = getContributions();
  contributions = contributions.map(c => c.id === id ? { ...c, status: newStatus } : c);
  saveContributions(contributions);
  updateDashboard();
  showToast(`تم تحديث حالة الطلب إلى: ${newStatus}`);
}

// ===== فتح وعرض المودال بالتفاصيل =====
function viewDetails(id) {
  const contributions = getContributions();
  const c = contributions.find(x => x.id === id);
  if (!c) return;

  selectedContribution = c;
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="modal-details">
      <p><strong>الاسم الفعلي للمشارك:</strong> ${c.name}</p>
      <p><strong>رقم التواصل الجوال:</strong> <span dir="ltr">${c.phone}</span></p>
      <p><strong>البريد الإلكتروني:</strong> ${c.email}</p>
      <p><strong>مبلغ المساهمة:</strong> ${c.amount} ريال سعودي</p>
      <p><strong>حالة الطلب الحالية:</strong> <span class="badge ${c.status === 'تمت الموافقة' ? 'approved' : c.status === 'مرفوض' ? 'rejected' : 'pending'}">${c.status}</span></p>
      ${c.notes ? `<p><strong>ملاحظات المرفقة:</strong> ${c.notes}</p>` : ''}
      ${c.receipt ? `<div class="modal-receipt-preview"><p><strong>إيصال التحويل البنكي:</strong></p><img src="${c.receipt}" alt="Receipt"></div>` : ''}
    </div>
  `;

  document.getElementById('detailsModal').classList.add('active');
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
  selectedContribution = null;
}

// ===== توليد وطباعة الشهادة المعتمدة كمستند PDF الأصلي =====
function downloadReceiptPDF(id) {
  const contributions = getContributions();
  const c = contributions.find(x => x.id === id);
  if (!c) return;

  const totalShares = c.amount / 50;

  const el = document.createElement('div');
  el.style.cssText = 'padding: 40px; font-family: "Segoe UI", sans-serif; direction: rtl; background: #fff;';
  el.innerHTML = `
    <div style="text-align: center; border: 5px solid #1E9196; padding: 30px; border-radius: 10px;">
      <h1 style="color: #1E9196; margin-bottom: 5px;">Fly Light Logistics Solutions</h1>
      <h3 style="color: #0A1C33; margin-top: 0;">شهادة ملكية أسهم مساهمة</h3>
      <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
      <p style="font-size: 18px; line-height: 1.8; color: #0A1C33;">
        تشهد الشركة بأن المكرم / المكرمة: <strong style="font-size: 20px; color: #1E9196;">${c.name}</strong><br>
        قد ساهم في رأس مال الشركة بمبلغ إجمالي قدره: <strong>${c.amount} ريال سعودي</strong><br>
        وجرى تسجيل عدد <strong>(${totalShares}) أسهم</strong> باسمه في سجلات الشركة التعليمية.
      </p>
      <p style="margin-top: 40px; font-size: 14px; color: #6B7280;">طبعت هذه الشهادة بتاريخ ${new Date().toLocaleDateString('ar-SA')}</p>
    </div>
  `;

  html2pdf().set({
    margin: 15,
    filename: `مساهمة_${c.name}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el).save();
}

function downloadPDF() {
  if (selectedContribution) downloadReceiptPDF(selectedContribution.id);
}

// ===== Toast إشعارات =====
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

// ===== تأثيرات التمرير =====
function addScrollEffects() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
}
