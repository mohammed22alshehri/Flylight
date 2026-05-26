/* ============================================================
   FORM — Contribution form & file upload
   ============================================================ */

// ── Copy IBAN ─────────────────────────────────────────────────
function copyIBAN() {
  const iban = 'SA0880000868608016214271';
  const btn  = document.getElementById('copyIbanBtn');

  navigator.clipboard.writeText(iban).then(() => {
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg> تم النسخ`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg> نسخ`;
      }, 2000);
    }
    showToast('تم نسخ رقم الحساب', 'success');
  }).catch(() => {
    showToast('تعذّر نسخ الرقم', 'error');
  });
}

// ── Amount validation ─────────────────────────────────────────
function validateAmount(value) {
  const num = parseFloat(value);
  return num > 0 && num % 50 === 0;
}

// ── File upload setup ─────────────────────────────────────────
function setupFileUpload() {
  const uploadArea  = document.getElementById('uploadArea');
  const fileInput   = document.getElementById('receiptFile');
  const filePreview = document.getElementById('filePreview');
  if (!uploadArea || !fileInput) return;

  // Click to open file picker
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  // Drag over
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  // Drop
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      showFilePreview(file, filePreview);
    }
  });

  // File input change
  fileInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) showFilePreview(file, filePreview);
  });
}

function showFilePreview(file, previewEl) {
  if (!previewEl) return;
  const size = formatFileSize(file.size);
  previewEl.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>${file.name}</span>
    <span style="color:var(--clr-text-muted);font-weight:400">(${size})</span>
  `;
  previewEl.classList.add('active');
}

function formatFileSize(bytes) {
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Share calculator ──────────────────────────────────────────
function setupShareCalculator() {
  const amountInput = document.getElementById('amount');
  const calcEl      = document.getElementById('shareCalc');
  const calcValue   = document.getElementById('shareCalcValue');
  if (!amountInput) return;

  amountInput.addEventListener('input', function () {
    const val = parseFloat(this.value);
    const hint = this.closest('.form-group')?.querySelector('.field-hint');

    if (this.value && !validateAmount(this.value)) {
      this.style.borderColor = 'var(--clr-error)';
      if (hint) hint.style.color = 'var(--clr-error)';
      if (calcEl) calcEl.style.display = 'none';
    } else {
      this.style.borderColor = '';
      if (hint) hint.style.color = '';
      if (val && validateAmount(this.value) && calcEl && calcValue) {
        const shares = Math.max(1, Math.floor(val / 50));
        calcValue.innerHTML = `${shares} <span>سهم</span>`;
        calcEl.style.display = 'flex';
      } else if (calcEl) {
        calcEl.style.display = 'none';
      }
    }
  });
}

// ── Form setup ────────────────────────────────────────────────
function setupForm() {
  const form        = document.getElementById('contributeForm');
  const amountInput = document.getElementById('amount');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const amount = parseFloat(amountInput?.value || '0');
    if (!validateAmount(amount)) {
      if (amountInput) amountInput.style.borderColor = 'var(--clr-error)';
      amountInput?.focus();
      showToast('المبلغ يجب أن يكون من مضاعفات 50 ريال', 'error');
      return;
    }

    const fileInput = document.getElementById('receiptFile');
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast('يرجى اختيار ملف الإيصال', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الملف يجب أن يكون أقل من 5MB', 'error');
      return;
    }

    // Submit button loading state
    const submitBtn = form.querySelector('[type="submit"]');
    const origHTML  = submitBtn?.innerHTML || '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span>';
    }

    const reader = new FileReader();
    reader.onload = async function (ev) {
      const contribution = {
        name:        document.getElementById('name')?.value.trim() || '',
        phone:       document.getElementById('phone')?.value.trim() || '',
        email:       document.getElementById('email')?.value.trim() || '',
        amount:      amount,
        receipt:     ev.target.result,
        receiptName: file.name,
        notes:       document.getElementById('notes')?.value.trim() || '',
        date:        new Date().toLocaleDateString('ar-SA'),
      };

      const result = await dbInsertContribution(contribution);

      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origHTML; }

      if (result) {
        // Show success
        const successMsg = document.getElementById('successMsg');
        if (successMsg) {
          successMsg.style.display = 'flex';
          setTimeout(() => { successMsg.style.display = 'none'; }, 6000);
        }

        // Reset form
        form.reset();
        const filePreview = document.getElementById('filePreview');
        if (filePreview) { filePreview.classList.remove('active'); filePreview.innerHTML = ''; }
        const calcEl = document.getElementById('shareCalc');
        if (calcEl) calcEl.style.display = 'none';
        if (amountInput) amountInput.style.borderColor = '';

        showToast('تم تقديم مساهمتك بنجاح', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origHTML; }
      }
    };

    reader.onerror = () => {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origHTML; }
      showToast('فشل قراءة الملف، حاول مرة أخرى', 'error');
    };

    reader.readAsDataURL(file);
  });
}

console.log('✅ form.js loaded');
