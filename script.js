// ===== البيانات المحلية =====
let contributions = JSON.parse(localStorage.getItem('contributions')) || [];
let selectedContribution = null;

// ===== التنقل بين الصفحات =====
function switchPage(pageName) {
  // إخفاء جميع الصفحات
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // إزالة الحالة النشطة من جميع الروابط
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });

  // إظهار الصفحة المطلوبة
  const targetPage = document.getElementById(pageName);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // تفعيل الرابط المناسب
  const activeLink = document.querySelector(`[data-page="${pageName}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  // تحديث لوحة التحكم إذا كانت الصفحة المطلوبة
  if (pageName === 'dashboard') {
    updateDashboard();
  }

  // التمرير للأعلى
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== معالجة النقر على الروابط =====
document.addEventListener('DOMContentLoaded', function() {
  // روابط التنقل
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const pageName = this.getAttribute('data-page');
      switchPage(pageName);
    });
  });

  // أزرار Hero
  document.querySelectorAll('[data-page]').forEach(btn => {
    if (!btn.classList.contains('nav-link')) {
      btn.addEventListener('click', function() {
        const pageName = this.getAttribute('data-page');
        switchPage(pageName);
      });
    }
  });

  // معالجة رفع الملفات
  setupFileUpload();

  // معالجة النموذج
  setupForm();
});

// ===== نسخ IBAN =====
function copyIBAN() {
  const iban = 'SA03 8000 0000 6080 1016 7519';
  navigator.clipboard.writeText(iban).then(() => {
    const btn = document.querySelector('.btn-copy');
    const originalText = btn.textContent;
    btn.textContent = '✓ تم النسخ';
    btn.style.background = 'rgba(255, 255, 255, 0.4)';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = 'rgba(255, 255, 255, 0.2)';
    }, 2000);
  });
}

// ===== إعداد رفع الملفات =====
function setupFileUpload() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('receiptFile');
  const filePreview = document.getElementById('filePreview');

  if (!uploadArea || !fileInput) return;

  // النقر على منطقة الرفع
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  // السحب والإفلات
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#0D6C70';
    uploadArea.style.background = 'rgba(30, 145, 150, 0.12)';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#1E9196';
    uploadArea.style.background = 'rgba(30, 145, 150, 0.03)';
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#1E9196';
    uploadArea.style.background = 'rgba(30, 145, 150, 0.03)';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      displayFileName(files[0]);
    }
  });

  // تغيير الملف
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      displayFileName(e.target.files[0]);
    }
  });

  function displayFileName(file) {
    filePreview.innerHTML = `
      <span style="font-size: 24px; margin-left: 0.5rem;">✓</span>
      <span>${file.name}</span>
      <span style="margin-right: 0.5rem; color: #6B7280;">(${formatFileSize(file.size)})</span>
    `;
    filePreview.classList.add('active');
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

// ===== إعداد النموذج =====
function setupForm() {
  const form = document.getElementById('contributeForm');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('receiptFile');
    const file = fileInput.files[0];

    if (!file) {
      alert('يرجى اختيار ملف الإيصال');
      return;
    }

    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الملف يجب أن يكون أقل من 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const contribution = {
        id: Date.now(),
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        amount: parseFloat(document.getElementById('amount').value),
        receipt: e.target.result,
        notes: document.getElementById('notes').value,
        date: new Date().toLocaleDateString('ar-SA'),
        status: 'قيد المراجعة'
      };

      contributions.push(contribution);
      localStorage.setItem('contributions', JSON.stringify(contributions));

      // إظهار رسالة النجاح
      const successMsg = document.getElementById('successMsg');
      successMsg.classList.add('active');

      // إعادة تعيين النموذج
      form.reset();
      document.getElementById('filePreview').classList.remove('active');
      document.getElementById('filePreview').innerHTML = '';

      // إخفاء رسالة النجاح بعد 4 ثواني
      setTimeout(() => {
        successMsg.classList.remove('active');
      }, 4000);

      // التمرير للأعلى
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    reader.readAsDataURL(file);
  });
}

// ===== تحديث لوحة التحكم =====
function updateDashboard() {
  const total = contributions.reduce((sum, c) => sum + c.amount, 0);
  const pending = contributions.filter(c => c.status === 'قيد المراجعة').length;

  document.getElementById('totalCount').textContent = contributions.length;
  document.getElementById('totalSum').textContent = total.toLocaleString('ar-SA');
  document.getElementById('pendingCount').textContent = pending;

  const tbody = document.getElementById('tableBody');
  
  if (contributions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد مساهمات</td></tr>';
    return;
  }

  tbody.innerHTML = contributions.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td><strong>${c.amount.toLocaleString('ar-SA')} ر.س</strong></td>
      <td>${c.date}</td>
      <td><span class="badge badge-pending">${c.status}</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" onclick="viewDetails(${c.id})">عرض</button>
          <button class="action-btn" onclick="downloadReceiptPDF(${c.id})">PDF</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===== عرض تفاصيل المساهمة =====
function viewDetails(id) {
  selectedContribution = contributions.find(c => c.id === id);
  if (!selectedContribution) return;

  const modal = document.getElementById('detailsModal');
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <table class="info-table">
      <tr>
        <td>الاسم</td>
        <td>${selectedContribution.name}</td>
      </tr>
      <tr>
        <td>الهاتف</td>
        <td>${selectedContribution.phone}</td>
      </tr>
      <tr>
        <td>البريد الإلكتروني</td>
        <td>${selectedContribution.email}</td>
      </tr>
      <tr>
        <td>المبلغ</td>
        <td><strong>${selectedContribution.amount.toLocaleString('ar-SA')} ريال سعودي</strong></td>
      </tr>
      <tr>
        <td>التاريخ</td>
        <td>${selectedContribution.date}</td>
      </tr>
      <tr>
        <td>الحالة</td>
        <td><span class="badge badge-pending">${selectedContribution.status}</span></td>
      </tr>
      <tr>
        <td>الملاحظات</td>
        <td>${selectedContribution.notes || 'لا توجد ملاحظات'}</td>
      </tr>
    </table>
    <div style="margin-top: 2rem;">
      <p style="font-weight: 700; margin-bottom: 1rem; color: #0A1C33; font-size: 16px;">الإيصال:</p>
      <img src="${selectedContribution.receipt}" class="receipt-image" alt="إيصال التحويل">
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ===== إغلاق المودال =====
function closeModal() {
  const modal = document.getElementById('detailsModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// إغلاق المودال عند النقر على الخلفية
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('detailsModal');
  const overlay = modal.querySelector('.modal-overlay');
  
  if (overlay) {
    overlay.addEventListener('click', closeModal);
  }
});

// إغلاق المودال بزر ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// ===== تحميل PDF للإيصال =====
function downloadReceiptPDF(id) {
  const contribution = contributions.find(c => c.id === id);
  if (!contribution) return;

  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.direction = 'rtl';
  element.style.background = '#ffffff';

  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #0A1C33; font-size: 32px; margin-bottom: 10px;">شهادة مساهمة</h1>
      <h2 style="color: #1E9196; font-size: 24px; font-weight: normal;">Fly Light Logistics Solutions</h2>
    </div>
    
    <div style="border: 3px solid #1E9196; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 15px 10px; font-weight: bold; color: #0A1C33; width: 40%;">الاسم:</td>
          <td style="padding: 15px 10px; color: #0A1C33;">${contribution.name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 15px 10px; font-weight: bold; color: #0A1C33;">رقم الهاتف:</td>
          <td style="padding: 15px 10px; color: #0A1C33;">${contribution.phone}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 15px 10px; font-weight: bold; color: #0A1C33;">البريد الإلكتروني:</td>
          <td style="padding: 15px 10px; color: #0A1C33;">${contribution.email}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 15px 10px; font-weight: bold; color: #0A1C33;">المبلغ:</td>
          <td style="padding: 15px 10px; color: #1E9196; font-size: 20px; font-weight: bold;">${contribution.amount.toLocaleString('ar-SA')} ريال سعودي</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 15px 10px; font-weight: bold; color: #0A1C33;">التاريخ:</td>
          <td style="padding: 15px 10px; color: #0A1C33;">${contribution.date}</td>
        </tr>
        <tr>
          <td style="padding: 15px 10px; font-weight: bold; color: #0A1C33;">رقم الحساب البنكي:</td>
          <td style="padding: 15px 10px; color: #0A1C33; font-family: 'Courier New', monospace; font-weight: bold;">SA03 8000 0000 6080 1016 7519</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; padding: 20px; background: #F8FAFB; border-radius: 8px;">
      <p style="color: #6B7280; font-size: 14px; margin: 0;">شكراً لمساهمتك في نمو Fly Light Logistics Solutions</p>
      <p style="color: #6B7280; font-size: 12px; margin-top: 10px;">تم إنشاء هذه الشهادة بتاريخ ${new Date().toLocaleDateString('ar-SA')}</p>
    </div>
  `;

  const options = {
    margin: 15,
    filename: `مساهمة_${contribution.name}_${contribution.id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(options).from(element).save();
}

// ===== تحميل PDF من المودال =====
function downloadPDF() {
  if (selectedContribution) {
    downloadReceiptPDF(selectedContribution.id);
  }
}

// ===== تهيئة الصفحة عند التحميل =====
document.addEventListener('DOMContentLoaded', function() {
  // التأكد من عرض الصفحة الرئيسية
  switchPage('home');
  
  // إضافة تأثيرات التمرير
  addScrollEffects();
});

// ===== تأثيرات التمرير =====
function addScrollEffects() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // مراقبة العناصر
  document.querySelectorAll('.service-card, .value-card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}
