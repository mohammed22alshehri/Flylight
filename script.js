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
    showToast('تم تسجيل الدخول بنجاح', 'success');
  } else {
    errorEl.style.display = 'block';
    document.getElementById('adminPassword').value = '';
    showToast('كلمة المرور غير صحيحة', 'error');
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
    filePreview.innerHTML = `<span style="display:flex;align-items:center">${svgIcon('check','18')}</span><span>${file.name}</span><span style="color:#6B7280">(${formatFileSize(file.size)})</span>`;
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
        
        showToast('تم تقديم مساهمتك بنجاح', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    reader.readAsDataURL(file);
  });
}

// ===== Copy IBAN =====
function copyIBAN() {
  const iban = 'SA0880000868608016214271';
  navigator.clipboard.writeText(iban).then(() => {
    const btn = document.querySelector('.btn-copy');
    const original = btn.innerHTML;
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> تم النسخ';
    btn.style.background = 'rgba(255,255,255,0.4)';
    setTimeout(() => {
      btn.innerHTML = original;
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
          <button class="action-btn" onclick="viewDetails(${c.id})">${svgIcon('eye','14')} عرض</button>
          ${c.status === 'قيد المراجعة' ? `
            <button class="action-btn btn-approve" onclick="approveContribution(${c.id})">${svgIcon('check','14')} موافقة</button>
            <button class="action-btn btn-reject" onclick="rejectContribution(${c.id})">${svgIcon('x','14')} رفض</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

const SVG_ICONS = {
  clock:   '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  check:   '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  x:       '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

function svgIcon(name, size = '14') {
  const paths = {
    eye:   '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">${paths[name]||''}</svg>`;
}

function getStatusBadge(status) {
  const badges = {
    'قيد المراجعة': { class: 'badge-pending',  icon: SVG_ICONS.clock },
    'تمت الموافقة': { class: 'badge-approved', icon: SVG_ICONS.check },
    'مرفوض':        { class: 'badge-rejected', icon: SVG_ICONS.x },
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
      showToast('تمت الموافقة على المساهمة', 'success');
    }
  }
}

// ===== Reject Contribution =====
async function rejectContribution(id) {
  if (confirm('تأكيد رفض هذه المساهمة؟ سيتم حذفها من النظام.')) {
    const success = await dbUpdateContributionStatus(id, 'مرفوض');
    if (success) {
      loadDashboard();
      showToast('تم رفض المساهمة', 'error');
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
        <button class="btn btn-approve-full" onclick="approveContribution(${c.id}); closeModal()">${svgIcon('check','16')} موافقة</button>
        <button class="btn btn-reject-full" onclick="rejectContribution(${c.id}); closeModal()">${svgIcon('x','16')} رفض</button>
      </div>
    ` : ''}
    ${c.status === 'تمت الموافقة' ? `
      <div style="margin-top: 1.5rem;">
        <button class="btn btn-approve-full" onclick="downloadCertificates(${c.id})" style="width: 100%;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          تحميل شهادات الأسهم (${Math.floor(parseFloat(c.amount) / 50)} شهادة)
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
  
  // Create container - visible but off-screen so html2canvas can render it
  const container = document.createElement('div');
  container.id = 'certificates-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 1123px;
    background: white;
    z-index: -1;
    opacity: 0;
    pointer-events: none;
  `;
  
  for (let i = 1; i <= numShares; i++) {
    const ticketNumber = `FL-${String(c.id).padStart(4, '0')}-${String(i).padStart(3, '0')}`;
    container.appendChild(createCertificateHTML(c, ticketNumber, contributionDate, i, numShares));
  }
  
  document.body.appendChild(container);
  
  // Wait for fonts and rendering
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate PDF
  const opt = {
    margin: 0,
    filename: `شهادات_أسهم_${c.name.replace(/\s/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1123,
      windowHeight: 794
    },
    jsPDF: { unit: 'px', format: [1123, 794], orientation: 'landscape', hotfixes: ['px_scaling'] },
    pagebreak: { mode: ['avoid-all', 'css'] }
  };
  
  try {
    await html2pdf().set(opt).from(container).save();
    showToast('تم تحميل الشهادات بنجاح', 'success');
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
  div.className = 'certificate-page';
  div.style.cssText = `
    width: 1123px;
    height: 794px;
    page-break-after: always;
    font-family: 'Tajawal', 'Segoe UI', sans-serif;
    direction: rtl;
    position: relative;
    background: linear-gradient(135deg, #FFFFFF 0%, #F0FAFA 100%);
    padding: 60px;
    box-sizing: border-box;
    overflow: hidden;
    border: 12px solid #1E9196;
  `;
  
  div.innerHTML = `
    <!-- Decorative corners -->
    <div style="position: absolute; top: 30px; right: 30px; width: 80px; height: 80px; border-top: 5px solid #0A1C33; border-right: 5px solid #0A1C33;"></div>
    <div style="position: absolute; top: 30px; left: 30px; width: 80px; height: 80px; border-top: 5px solid #0A1C33; border-left: 5px solid #0A1C33;"></div>
    <div style="position: absolute; bottom: 30px; right: 30px; width: 80px; height: 80px; border-bottom: 5px solid #0A1C33; border-right: 5px solid #0A1C33;"></div>
    <div style="position: absolute; bottom: 30px; left: 30px; width: 80px; height: 80px; border-bottom: 5px solid #0A1C33; border-left: 5px solid #0A1C33;"></div>
    
    <!-- Watermark -->
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 150px;
      color: rgba(30, 145, 150, 0.05);
      font-weight: 900;
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
    ">
      FLY LIGHT
    </div>
    
    <!-- Content wrapper -->
    <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column;">
      
      <!-- Header -->
      <div style="text-align: center; padding-bottom: 25px; border-bottom: 3px double #1E9196;">
        <div style="
          display: inline-block;
          background: linear-gradient(135deg, #0A1C33 0%, #14365C 100%);
          color: white;
          padding: 18px 50px;
          border-radius: 50px;
          font-size: 36px;
          font-weight: 900;
          letter-spacing: 3px;
          box-shadow: 0 8px 20px rgba(30, 145, 150, 0.3);
        ">
          FLY LIGHT LOGISTICS
        </div>
        <p style="font-size: 18px; color: #6B7280; margin-top: 12px; font-weight: 600;">
          حلول لوجستية متكاملة وموثوقة
        </p>
      </div>
      
      <!-- Title -->
      <div style="text-align: center; margin-top: 30px;">
        <h1 style="
          font-size: 56px;
          color: #0A1C33;
          margin: 0;
          font-weight: 900;
          letter-spacing: 4px;
        ">شهادة سهم</h1>
        <div style="
          width: 180px;
          height: 5px;
          background: linear-gradient(135deg, #1E9196 0%, #0D6C70 100%);
          margin: 15px auto;
          border-radius: 5px;
        "></div>
        <p style="font-size: 18px; color: #1E9196; font-weight: 700; letter-spacing: 2px;">SHARE CERTIFICATE</p>
      </div>
      
      <!-- Body -->
      <div style="margin-top: 35px; padding: 0 60px; flex: 1;">
        <p style="font-size: 20px; color: #1F2937; text-align: center; line-height: 1.8; margin: 0 0 25px 0;">
          تشهد شركة <strong style="color: #1E9196;">Fly Light Logistics Solutions</strong> بأن:
        </p>
        
        <div style="
          background: rgba(30, 145, 150, 0.08);
          border-right: 6px solid #1E9196;
          padding: 25px 30px;
          border-radius: 12px;
          margin-bottom: 25px;
        ">
          <div style="display: flex; padding: 8px 0; border-bottom: 1px solid rgba(30, 145, 150, 0.1);">
            <div style="width: 30%; font-weight: 700; color: #0A1C33; font-size: 18px;">الاسم:</div>
            <div style="flex: 1; color: #1F2937; font-weight: 600; font-size: 18px;">${contribution.name}</div>
          </div>
          <div style="display: flex; padding: 8px 0; border-bottom: 1px solid rgba(30, 145, 150, 0.1);">
            <div style="width: 30%; font-weight: 700; color: #0A1C33; font-size: 18px;">رقم الهاتف:</div>
            <div style="flex: 1; color: #1F2937; direction: ltr; text-align: right; font-size: 18px;">${contribution.phone}</div>
          </div>
          <div style="display: flex; padding: 8px 0;">
            <div style="width: 30%; font-weight: 700; color: #0A1C33; font-size: 18px;">التاريخ:</div>
            <div style="flex: 1; color: #1F2937; font-size: 18px;">${dateStr}</div>
          </div>
        </div>
        
        <p style="font-size: 18px; color: #1F2937; text-align: center; line-height: 1.9; margin: 0;">
          يملك <strong style="color: #1E9196; font-size: 22px;">سهماً واحداً</strong> من أسهم رأسمال الشركة،
          <br>
          بقيمة اسمية تبلغ <strong style="color: #1E9196; font-size: 22px;">(٥٠) خمسون ريالاً سعودياً</strong> فقط لا غير.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-top: 30px;
      ">
        <div style="text-align: center;">
          <p style="font-size: 13px; color: #6B7280; margin: 0 0 8px 0;">رقم التذكرة</p>
          <div style="
            background: linear-gradient(135deg, #1E9196 0%, #0D6C70 100%);
            color: white;
            padding: 12px 28px;
            border-radius: 50px;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 2px;
            direction: ltr;
            box-shadow: 0 4px 15px rgba(30, 145, 150, 0.4);
          ">
            ${ticketNumber}
          </div>
        </div>
        
        <div style="text-align: center;">
          <p style="font-size: 13px; color: #6B7280; margin: 0 0 5px 0;">السهم رقم</p>
          <p style="font-size: 36px; font-weight: 900; color: #0A1C33; margin: 0;">${index} / ${total}</p>
        </div>
        
        <div style="text-align: center;">
          <div style="
            width: 180px;
            height: 60px;
            border-bottom: 3px solid #0A1C33;
            margin-bottom: 8px;
          "></div>
          <p style="font-size: 14px; color: #1F2937; font-weight: 700; margin: 0;">توقيع الإدارة المالية</p>
        </div>
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
