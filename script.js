// ===== Configuration =====
const ADMIN_PASSWORD = 'flylight2024';
const APP_VERSION = '2.0.0';

let selectedContribution = null;
let isInitialized = false;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async function() {
  console.log(`🚀 Fly Light Logistics v${APP_VERSION} initializing...`);
  
  await initSupabase();
  isInitialized = true;
  
  setupHamburgerMenu();
  setupNavigationLinks();
  setupFileUpload();
  setupForm();
  setupScrollEffects();
  
  switchPage('home');
  
  console.log('✅ Application ready');
});

// ===== Hamburger Menu =====
function setupHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function() {
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
}

// ===== Navigation =====
function setupNavigationLinks() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      switchPage(this.getAttribute('data-page'));
    });
  });
  
  document.querySelectorAll('[data-page]:not(.nav-link)').forEach(btn => {
    btn.addEventListener('click', function() {
      switchPage(this.getAttribute('data-page'));
    });
  });
}

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

// ===== Admin Authentication =====
function checkAdminSession() {
  const loggedIn = sessionStorage.getItem('adminLoggedIn');
  document.getElementById('adminLogin').style.display = loggedIn ? 'none' : 'flex';
  document.getElementById('adminContent').style.display = loggedIn ? 'block' : 'none';
  if (loggedIn) loadDashboard();
}

function adminLogin() {
  const password = document.getElementById('adminPassword').value;
  const errorEl = document.getElementById('loginError');
  
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    document.getElementById('adminPassword').value = '';
    errorEl.style.display = 'none';
    checkAdminSession();
    showToast('✅ تم تسجيل الدخول بنجاح', 'success');
  } else {
    errorEl.style.display = 'block';
    document.getElementById('adminPassword').value = '';
    showToast('❌ كلمة المرور غير صحيحة', 'error');
  }
}

function adminLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  checkAdminSession();
  showToast('تم تسجيل الخروج', 'success');
}

document.addEventListener('DOMContentLoaded', function() {
  const passInput = document.getElementById('adminPassword');
  if (passInput) {
    passInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') adminLogin();
    });
  }
});

// ===== File Upload Setup =====
function setupFileUpload() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('receiptFile');
  const filePreview = document.getElementById('filePreview');
  if (!uploadArea || !fileInput) return;
  
  uploadArea.addEventListener('click', () => fileInput.click());
  
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.style.borderColor = '#0D6C70';
    uploadArea.style.background = 'rgba(30,145,150,0.12)';
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#1E9196';
    uploadArea.style.background = 'rgba(30,145,150,0.03)';
  });
  
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.style.borderColor = '#1E9196';
    uploadArea.style.background = 'rgba(30,145,150,0.03)';
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      showFileName(e.dataTransfer.files[0]);
    }
  });
  
  fileInput.addEventListener('change', e => {
    if (e.target.files.length > 0) showFileName(e.target.files[0]);
  });
  
  function showFileName(file) {
    filePreview.innerHTML = `<span style="font-size:20px">✓</span><span>${file.name}</span><span style="color:#6B7280">(${formatFileSize(file.size)})</span>`;
    filePreview.classList.add('active');
  }
  
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}

// ===== Amount Validation =====
function validateAmount(value) {
  const num = parseFloat(value);
  return num > 0 && num % 50 === 0;
}

// ===== Form Setup =====
function setupForm() {
  const form = document.getElementById('contributeForm');
  const amountInput = document.getElementById('amount');
  if (!form) return;
  
  amountInput.addEventListener('input', function() {
    const hint = this.closest('.form-group').querySelector('.field-hint');
    if (this.value && !validateAmount(this.value)) {
      this.style.borderColor = '#EF4444';
      hint.style.color = '#EF4444';
    } else {
      this.style.borderColor = '';
      hint.style.color = '';
    }
  });
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const amount = parseFloat(amountInput.value);
    if (!validateAmount(amount)) {
      amountInput.style.borderColor = '#EF4444';
      amountInput.focus();
      showToast('المبلغ يجب أن يكون من مضاعفات 50 ريال', 'error');
      return;
    }
    
    const fileInput = document.getElementById('receiptFile');
    const file = fileInput.files[0];
    if (!file) {
      showToast('يرجى اختيار ملف الإيصال', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الملف يجب أن يكون أقل من 5MB', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(ev) {
      const contribution = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        amount: amount,
        receipt: ev.target.result,
        receiptName: file.name,
        notes: document.getElementById('notes').value.trim(),
        date: new Date().toLocaleDateString('ar-SA')
      };
      
      const result = await dbInsertContribution(contribution);
      if (result) {
        document.getElementById('successMsg').style.display = 'flex';
        form.reset();
        document.getElementById('filePreview').classList.remove('active');
        document.getElementById('filePreview').innerHTML = '';
        amountInput.style.borderColor = '';
        
        setTimeout(() => {
          document.getElementById('successMsg').style.display = 'none';
        }, 5000);
        
        showToast('✅ تم تقديم مساهمتك بنجاح', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    reader.readAsDataURL(file);
  });
}

// ===== Copy IBAN =====
function copyIBAN() {
  const iban = 'SA08 8000 0868 6080 1621 4271';
  navigator.clipboard.writeText(iban).then(() => {
    const btn = document.querySelector('.btn-copy');
    const originalText = btn.textContent;
    btn.textContent = '✓ تم النسخ';
    btn.style.background = 'rgba(255,255,255,0.4)';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = 'rgba(255,255,255,0.2)';
    }, 2000);
  });
}

// ===== Dashboard Loading =====
async function loadDashboard() {
  const contributions = await dbGetAllContributions();
  
  const approved = contributions.filter(c => c.status === 'تمت الموافقة');
  const pending = contributions.filter(c => c.status === 'قيد المراجعة');
  
  const totalAmount = approved.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  
  document.getElementById('totalCount').textContent = contributions.length;
  document.getElementById('totalSum').textContent = totalAmount.toLocaleString('ar-SA');
  document.getElementById('pendingCount').textContent = pending.length;
  document.getElementById('approvedCount').textContent = approved.length;
  
  const tbody = document.getElementById('tableBody');
  if (contributions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد مساهمات</td></tr>';
    return;
  }
  
  tbody.innerHTML = contributions.map(c => `
    <tr>
      <td>${c.name}</td>
      <td dir="ltr">${c.phone}</td>
      <td>${c.email}</td>
      <td><strong>${parseFloat(c.amount).toLocaleString('ar-SA')} ر.س</strong></td>
      <td>${c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : c.date || '-'}</td>
      <td>${getStatusBadge(c.status)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" onclick="viewDetails(${c.id})">👁 عرض</button>
          ${c.status === 'قيد المراجعة' ? `
            <button class="action-btn btn-approve" onclick="approveContribution(${c.id})">✓ موافقة</button>
            <button class="action-btn btn-reject" onclick="rejectContribution(${c.id})">✗ رفض</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function getStatusBadge(status) {
  const badges = {
    'قيد المراجعة': { class: 'badge-pending', icon: '⏳' },
    'تمت الموافقة': { class: 'badge-approved', icon: '✅' },
    'مرفوض': { class: 'badge-rejected', icon: '❌' }
  };
  const badge = badges[status] || badges['قيد المراجعة'];
  return `<span class="badge ${badge.class}">${badge.icon} ${status}</span>`;
}

// ===== Approve Contribution =====
async function approveContribution(id) {
  if (confirm('تأكيد الموافقة على هذه المساهمة؟')) {
    const success = await dbUpdateContributionStatus(id, 'تمت الموافقة');
    if (success) {
      loadDashboard();
      showToast('✅ تمت الموافقة على المساهمة', 'success');
    }
  }
}

// ===== Reject Contribution =====
async function rejectContribution(id) {
  if (confirm('تأكيد رفض هذه المساهمة؟ سيتم حذفها من النظام.')) {
    const success = await dbUpdateContributionStatus(id, 'مرفوض');
    if (success) {
      loadDashboard();
      showToast('✗ تم رفض المساهمة وحذفها', 'success');
    }
  }
}

// ===== View Details =====
async function viewDetails(id) {
  const contributions = await dbGetAllContributions();
  selectedContribution = contributions.find(c => c.id === id);
  if (!selectedContribution) return;
  
  const c = selectedContribution;
  
  // Support both old (receipt_base64) and new (receipt) column names
  const receiptData = c.receipt || c.receipt_base64 || null;
  
  // Determine receipt type (image or PDF)
  let receiptHTML = '<p style="color: #6B7280;">لم يتم العثور على الإيصال</p>';
  if (receiptData) {
    const isPDF = receiptData.startsWith('data:application/pdf') || 
                  (c.receipt_name && c.receipt_name.toLowerCase().endsWith('.pdf'));
    
    if (isPDF) {
      receiptHTML = `
        <div style="border: 2px solid #1E9196; border-radius: 12px; overflow: hidden; margin-top: 1rem; background: #f8fafc;">
          <iframe src="${receiptData}" 
                  style="width: 100%; height: 500px; border: none;"
                  title="إيصال PDF"></iframe>
          <div style="padding: 0.8rem; text-align: center; background: white; border-top: 1px solid #E5E7EB;">
            <a href="${receiptData}" download="${c.receipt_name || 'receipt.pdf'}" 
               style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.5rem; background: #1E9196; color: white; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 14px;">
              📥 تحميل PDF
            </a>
          </div>
        </div>`;
    } else {
      receiptHTML = `
        <div style="margin-top: 1rem;">
          <img src="${receiptData}" 
               class="receipt-image" 
               alt="إيصال" 
               style="max-width: 100%; border-radius: 12px; border: 2px solid #E5E7EB; cursor: zoom-in;"
               onclick="window.open('${receiptData}', '_blank')">
          <p style="text-align: center; margin-top: 0.5rem; font-size: 13px; color: #6B7280;">انقر على الصورة للتكبير</p>
        </div>`;
    }
  }
  
  document.getElementById('modalBody').innerHTML = `
    <table class="info-table">
      <tr><td>الاسم</td><td>${c.name}</td></tr>
      <tr><td>الهاتف</td><td dir="ltr">${c.phone}</td></tr>
      <tr><td>البريد</td><td>${c.email}</td></tr>
      <tr><td>المبلغ</td><td><strong>${parseFloat(c.amount).toLocaleString('ar-SA')} ريال سعودي</strong></td></tr>
      <tr><td>التاريخ</td><td>${c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : c.date}</td></tr>
      <tr><td>الحالة</td><td>${getStatusBadge(c.status)}</td></tr>
      ${c.review_date ? `<tr><td>تاريخ المراجعة</td><td>${c.review_date}</td></tr>` : ''}
      <tr><td>الملاحظات</td><td>${c.notes || 'لا توجد ملاحظات'}</td></tr>
    </table>
    <div style="margin-top: 1.5rem;">
      <p style="font-weight: 700; margin-bottom: 1rem; color: #0A1C33;">الإيصال:</p>
      ${receiptHTML}
    </div>
    ${c.status === 'قيد المراجعة' ? `
      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button class="btn btn-approve-full" onclick="approveContribution(${c.id}); closeModal()">✓ موافقة</button>
        <button class="btn btn-reject-full" onclick="rejectContribution(${c.id}); closeModal()">✗ رفض</button>
      </div>
    ` : ''}
    ${c.status === 'تمت الموافقة' ? `
      <div style="margin-top: 1.5rem;">
        <button class="btn btn-approve-full" onclick="downloadCertificates(${c.id})" style="width: 100%;">
          📜 تحميل شهادات الأسهم (${Math.floor(parseFloat(c.amount) / 50)} شهادة)
        </button>
      </div>
    ` : ''}
  `;
  
  document.getElementById('detailsModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ===== Download Share Certificates =====
async function downloadCertificates(contributionId) {
  const contributions = await dbGetAllContributions();
  const c = contributions.find(x => x.id === contributionId);
  if (!c) {
    showToast('لم يتم العثور على المساهمة', 'error');
    return;
  }
  
  const numShares = Math.floor(parseFloat(c.amount) / 50);
  const contributionDate = c.created_at 
    ? new Date(c.created_at).toLocaleDateString('ar-SA')
    : (c.date || new Date().toLocaleDateString('ar-SA'));
  
  showToast(`جاري إنشاء ${numShares} شهادة...`, 'success');
  
  // Create container with all certificates
  const container = document.createElement('div');
  container.style.cssText = 'position: absolute; left: -9999px; top: 0; background: white;';
  
  for (let i = 1; i <= numShares; i++) {
    const ticketNumber = `FL-${String(c.id).padStart(4, '0')}-${String(i).padStart(3, '0')}`;
    container.appendChild(createCertificateHTML(c, ticketNumber, contributionDate, i, numShares));
  }
  
  document.body.appendChild(container);
  
  // Generate PDF
  const opt = {
    margin: 0,
    filename: `شهادات_أسهم_${c.name.replace(/\s/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: 'avoid-all' }
  };
  
  try {
    await html2pdf().set(opt).from(container).save();
    showToast('✅ تم تحميل الشهادات بنجاح', 'success');
  } catch (error) {
    console.error('PDF generation error:', error);
    showToast('خطأ في إنشاء PDF', 'error');
  } finally {
    document.body.removeChild(container);
  }
}

// Create certificate HTML element
function createCertificateHTML(contribution, ticketNumber, dateStr, index, total) {
  const div = document.createElement('div');
  div.style.cssText = `
    width: 297mm;
    height: 210mm;
    page-break-after: always;
    font-family: 'Tajawal', 'Segoe UI', sans-serif;
    direction: rtl;
    position: relative;
    background: #ffffff;
    padding: 0;
    box-sizing: border-box;
    overflow: hidden;
  `;
  
  div.innerHTML = `
    <div style="
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #FFFFFF 0%, #F0FAFA 100%);
      position: relative;
      padding: 20mm;
      box-sizing: border-box;
      border: 8px solid #1E9196;
      border-radius: 0;
    ">
      <!-- Decorative corners -->
      <div style="position: absolute; top: 15mm; right: 15mm; width: 30mm; height: 30mm; border-top: 4px solid #0A1C33; border-right: 4px solid #0A1C33;"></div>
      <div style="position: absolute; top: 15mm; left: 15mm; width: 30mm; height: 30mm; border-top: 4px solid #0A1C33; border-left: 4px solid #0A1C33;"></div>
      <div style="position: absolute; bottom: 15mm; right: 15mm; width: 30mm; height: 30mm; border-bottom: 4px solid #0A1C33; border-right: 4px solid #0A1C33;"></div>
      <div style="position: absolute; bottom: 15mm; left: 15mm; width: 30mm; height: 30mm; border-bottom: 4px solid #0A1C33; border-left: 4px solid #0A1C33;"></div>
      
      <!-- Header -->
      <div style="text-align: center; margin-top: 15mm; padding-bottom: 8mm; border-bottom: 3px double #1E9196;">
        <div style="
          display: inline-block;
          background: linear-gradient(135deg, #0A1C33 0%, #14365C 100%);
          color: white;
          padding: 8mm 15mm;
          border-radius: 50px;
          font-size: 28pt;
          font-weight: 900;
          letter-spacing: 2px;
          box-shadow: 0 8px 20px rgba(30, 145, 150, 0.3);
        ">
          FLY LIGHT LOGISTICS
        </div>
        <p style="font-size: 14pt; color: #6B7280; margin-top: 5mm; font-weight: 600;">
          حلول لوجستية متكاملة وموثوقة
        </p>
      </div>
      
      <!-- Title -->
      <div style="text-align: center; margin-top: 10mm;">
        <h1 style="
          font-size: 42pt;
          color: #0A1C33;
          margin: 0;
          font-weight: 900;
          letter-spacing: 3px;
        ">شهادة سهم</h1>
        <div style="
          width: 60mm;
          height: 4px;
          background: linear-gradient(135deg, #1E9196 0%, #0D6C70 100%);
          margin: 4mm auto;
          border-radius: 4px;
        "></div>
        <p style="font-size: 14pt; color: #1E9196; font-weight: 700;">Share Certificate</p>
      </div>
      
      <!-- Body -->
      <div style="margin-top: 12mm; padding: 0 20mm;">
        <p style="font-size: 14pt; color: #1F2937; text-align: center; line-height: 2; margin-bottom: 8mm;">
          تشهد شركة <strong style="color: #1E9196;">Fly Light Logistics Solutions</strong> بأن:
        </p>
        
        <div style="
          background: rgba(30, 145, 150, 0.08);
          border-right: 5px solid #1E9196;
          padding: 8mm 10mm;
          border-radius: 12px;
          margin-bottom: 8mm;
        ">
          <table style="width: 100%; border-collapse: collapse; font-size: 13pt;">
            <tr>
              <td style="padding: 3mm 5mm; font-weight: 700; color: #0A1C33; width: 30%;">الاسم:</td>
              <td style="padding: 3mm 5mm; color: #1F2937; font-weight: 600;">${contribution.name}</td>
            </tr>
            <tr>
              <td style="padding: 3mm 5mm; font-weight: 700; color: #0A1C33;">رقم الهاتف:</td>
              <td style="padding: 3mm 5mm; color: #1F2937; direction: ltr; text-align: right;">${contribution.phone}</td>
            </tr>
            <tr>
              <td style="padding: 3mm 5mm; font-weight: 700; color: #0A1C33;">التاريخ:</td>
              <td style="padding: 3mm 5mm; color: #1F2937;">${dateStr}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 13pt; color: #1F2937; text-align: center; line-height: 2;">
          يملك <strong style="color: #1E9196; font-size: 16pt;">سهماً واحداً</strong> من أسهم رأسمال الشركة،
          <br>
          بقيمة اسمية تبلغ <strong style="color: #1E9196; font-size: 16pt;">(٥٠) خمسون ريالاً سعودياً</strong> فقط لا غير.
        </p>
      </div>
      
      <!-- Ticket Number & Footer -->
      <div style="
        position: absolute;
        bottom: 25mm;
        right: 25mm;
        left: 25mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="text-align: center;">
          <p style="font-size: 10pt; color: #6B7280; margin-bottom: 2mm;">رقم التذكرة</p>
          <div style="
            background: linear-gradient(135deg, #1E9196 0%, #0D6C70 100%);
            color: white;
            padding: 4mm 10mm;
            border-radius: 50px;
            font-size: 14pt;
            font-weight: 800;
            letter-spacing: 2px;
            direction: ltr;
            box-shadow: 0 4px 15px rgba(30, 145, 150, 0.4);
          ">
            ${ticketNumber}
          </div>
        </div>
        
        <div style="text-align: center;">
          <p style="font-size: 10pt; color: #6B7280;">السهم رقم</p>
          <p style="font-size: 24pt; font-weight: 900; color: #0A1C33; margin: 0;">${index} / ${total}</p>
        </div>
        
        <div style="text-align: center;">
          <div style="
            width: 50mm;
            height: 20mm;
            border-bottom: 2px solid #0A1C33;
            margin-bottom: 2mm;
          "></div>
          <p style="font-size: 11pt; color: #1F2937; font-weight: 700;">توقيع الإدارة المالية</p>
        </div>
      </div>
      
      <!-- Watermark -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 80pt;
        color: rgba(30, 145, 150, 0.04);
        font-weight: 900;
        pointer-events: none;
        white-space: nowrap;
      ">
        FLY LIGHT
      </div>
    </div>
  `;
  
  return div;
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.querySelector('#detailsModal .modal-overlay');
  if (overlay) overlay.addEventListener('click', closeModal);
});

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===== Scroll Effects =====
function setupScrollEffects() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  document.querySelectorAll('.service-card, .value-card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

console.log('✅ Script loaded successfully');
