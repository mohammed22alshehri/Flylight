// ===== Configuration =====
const ADMIN_PASSWORD_HASH = '80006ef1653e4cc657cff3b177b35c99c83ba8887aa7fa28249637633a88728f'; // SHA-256 hash
const APP_VERSION = '2.0.0';

let selectedContribution = null;
let isInitialized = false;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async function() {
  console.log(`🚀 Fly Light Logistics v${APP_VERSION} initializing...`);
  
  // Initialize Supabase
  await initSupabase();
  isInitialized = true;
  
  // Setup event listeners
  setupHamburgerMenu();
  setupNavigationLinks();
  setupFileUpload();
  setupForm();
  setupScrollEffects();
  
  // Load initial page
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
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  
  // Show selected page
  const target = document.getElementById(pageName);
  if (target) target.classList.add('active');
  
  // Mark nav link as active
  const activeLink = document.querySelector(`[data-page="${pageName}"]`);
  if (activeLink) activeLink.classList.add('active');
  
  // Handle dashboard
  if (pageName === 'dashboard') {
    checkAdminSession();
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Admin Authentication =====
function checkAdminSession() {
  const loggedIn = sessionStorage.getItem('adminLoggedIn');
  document.getElementById('adminLogin').style.display = loggedIn ? 'none' : 'flex';
  document.getElementById('adminContent').style.display = loggedIn ? 'block' : 'none';
  if (loggedIn) loadDashboard();
}

// Hash function for password security
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function adminLogin() {
  const password = document.getElementById('adminPassword').value;
  const errorEl = document.getElementById('loginError');
  
  // Hash the entered password
  const hashedPassword = await hashPassword(password);
  
  if (hashedPassword === ADMIN_PASSWORD_HASH) {
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

// Handle Enter key on password input
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
  
  // Drag and drop
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
  
  // Real-time validation
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
  
  // Form submission
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
      
      // Insert to Supabase
      const result = await dbInsertContribution(contribution);
      if (result) {
        // Show success message
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
  
  // Calculate statistics - FIXED: Only count approved contributions in total
  const approved = contributions.filter(c => c.status === 'تمت الموافقة');
  const pending = contributions.filter(c => c.status === 'قيد المراجعة');
  
  const totalAmount = approved.reduce((sum, c) => sum + (c.amount || 0), 0);
  
  // Update stat cards
  document.getElementById('totalCount').textContent = contributions.length;
  document.getElementById('totalSum').textContent = totalAmount.toLocaleString('ar-SA');
  document.getElementById('pendingCount').textContent = pending.length;
  document.getElementById('approvedCount').textContent = approved.length;
  
  // Update table
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
      <td><strong>${c.amount.toLocaleString('ar-SA')} ر.س</strong></td>
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
  const receiptHTML = c.receipt_base64
    ? `<img src="${c.receipt_base64}" class="receipt-image" alt="إيصال" style="max-width: 100%; border-radius: 8px; margin-top: 1rem;">`
    : '<p style="color: #6B7280;">لم يتم العثور على الإيصال</p>';
  
  document.getElementById('modalBody').innerHTML = `
    <table class="info-table">
      <tr><td>الاسم</td><td>${c.name}</td></tr>
      <tr><td>الهاتف</td><td dir="ltr">${c.phone}</td></tr>
      <tr><td>البريد</td><td>${c.email}</td></tr>
      <tr><td>المبلغ</td><td><strong>${c.amount.toLocaleString('ar-SA')} ريال سعودي</strong></td></tr>
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
  `;
  
  document.getElementById('detailsModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Close on ESC or overlay click
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
