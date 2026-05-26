/* ============================================================
   CERTIFICATES — Share certificate PDF generation
   All certificate logic isolated here
   ============================================================ */

const SHARE_VALUE   = 50;
const COMPANY_NAME  = 'Fly Light Logistics';
const COMPANY_CODE  = 'FLLS';
const COMPANY_CITY  = 'ينبع الصناعية';

let _certTemplateImg = null;

// ── Load template image (cached) ──────────────────────────────
function loadCertificateTemplate() {
  if (_certTemplateImg) return Promise.resolve(_certTemplateImg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { _certTemplateImg = img; resolve(img); };
    img.onerror = () => reject(new Error('فشل تحميل قالب الشهادة'));
    img.src = 'certificate_template.png';
  });
}

// ── Calculate share count ──────────────────────────────────────
function calcShares(amount) {
  return Math.max(1, Math.floor(parseFloat(amount || 0) / SHARE_VALUE));
}

// ── Format serial number: 1 → "0001" ──────────────────────────
function formatSerial(n) {
  return String(n).padStart(4, '0');
}

// ── Main download function ────────────────────────────────────
async function downloadCertificates(contributionId) {
  const contributions = await dbGetAllContributions();
  const c = contributions.find(x => x.id === contributionId);
  if (!c) {
    showToast('لم يتم العثور على المساهمة', 'error');
    return;
  }

  // Fetch stored certificates from DB
  let certs = await dbGetCertificates(contributionId);

  // Fallback: issue for old contributions that have no certs yet
  if (certs.length === 0) {
    showToast('جاري إصدار الشهادات لأول مرة...', 'info');
    const issued = await dbIssueCertificates(contributionId);
    if (issued === 0) {
      showToast('تعذّر إصدار الشهادات — تأكد من تشغيل certificates_setup.sql', 'error');
      return;
    }
    certs = await dbGetCertificates(contributionId);
  }

  if (certs.length === 0) {
    showToast('لا توجد شهادات لهذه المساهمة', 'error');
    return;
  }

  const numShares = certs.length;

  // Date in English (DD/MM/YYYY)
  const rawDate = c.created_at ? new Date(c.created_at) : new Date();
  const dd   = String(rawDate.getDate()).padStart(2, '0');
  const mm   = String(rawDate.getMonth() + 1).padStart(2, '0');
  const yyyy = rawDate.getFullYear();
  const dateStr = `${dd}/${mm}/${yyyy}`;

  showToast(`جاري إنشاء ${numShares} شهادة...`, 'info');

  // Load template
  let tpl;
  try {
    tpl = await loadCertificateTemplate();
  } catch {
    showToast('فشل تحميل قالب الشهادة — تأكد من وجود certificate_template.png', 'error');
    return;
  }

  // Wait for fonts
  try {
    await Promise.all([
      document.fonts.load('700 28px Tajawal'),
      document.fonts.load('800 30px Tajawal'),
    ]);
    await document.fonts.ready;
  } catch (_) { /* ignore */ }

  // Get jsPDF
  const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!JsPDF) {
    showToast('مكتبة PDF غير متوفرة', 'error');
    return;
  }

  const W = tpl.naturalWidth  || 1897;
  const H = tpl.naturalHeight || 794;

  try {
    const pdf = new JsPDF({ orientation: 'landscape', unit: 'px', format: [W, H] });

    certs.forEach((cert, idx) => {
      const serialStr = formatSerial(cert.serial_no);
      const canvas = renderCertificateCanvas(tpl, c, serialStr, numShares, dateStr, W, H);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (idx > 0) pdf.addPage([W, H], 'landscape');
      pdf.addImage(imgData, 'JPEG', 0, 0, W, H);
    });

    const safeName = (c.name || 'مساهم').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    pdf.save(`كتيب_اسهم_${safeName}.pdf`);
    showToast(`تم تحميل ${numShares} شهادة بنجاح`, 'success');
  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('خطأ في إنشاء PDF', 'error');
  }
}

// ── Render one certificate on canvas ─────────────────────────
function renderCertificateCanvas(tpl, c, index, total, dateStr, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Draw template background
  ctx.drawImage(tpl, 0, 0, W, H);

  const INK = '#16243f';
  ctx.textBaseline = 'middle';

  function put(x, y, text, opts = {}) {
    const size   = opts.size   || 24;
    const weight = opts.weight || 700;
    const align  = opts.align  || 'right';
    const maxW   = opts.maxW   || 0;
    ctx.fillStyle = opts.color || INK;
    ctx.font      = `${weight} ${size}px Tajawal, 'Segoe UI', sans-serif`;
    ctx.textAlign = align;
    ctx.direction = opts.ltr ? 'ltr' : 'rtl';
    if (maxW) ctx.fillText(String(text), x, y, maxW);
    else      ctx.fillText(String(text), x, y);
  }

  // =========================================================
  // Guide:  x+ → right  x- → left
  //         y+ → down   y- → up
  //         size  = font size in px
  //         maxW  = max width (text is compressed if wider)
  //         ltr:true for English / numeric text
  // =========================================================

  // ── Left section — certificate body (x: 0 → 1370) ──
  put(1095, 273, COMPANY_NAME, { size: 22, ltr: true, maxW: 225 });
  put(210,  273, COMPANY_CODE, { size: 21, ltr: true, align: 'center', maxW: 120 });
  put(1135, 374, dateStr,      { size: 22, ltr: true, maxW: 255 });
  put(270,  383, index,        { size: 30, weight: 800, align: 'center', maxW: 120 });
  put(1048, 490, COMPANY_NAME, { size: 21, ltr: true, maxW: 215 });
  put(588,  490, COMPANY_CITY, { size: 20, maxW: 170 });
  put(335,  490, c.name,       { size: 20, maxW: 275 });

  // ── Right section — stub / holder info (x: 1370 → 1897) ──
  put(1595, 272, COMPANY_NAME, { size: 23, ltr: true, maxW: 250 });
  put(1475, 327, COMPANY_CODE, { size: 22, ltr: true, align: 'center', maxW: 240 });
  put(1685, 380, index,        { size: 28, weight: 800, align: 'center', maxW: 130 });

  // Holder info — unified right-edge at x=1720
  put(1720, 510, c.name,  { size: 22, maxW: 320 });
  put(1720, 562, c.phone, { size: 22, ltr: true, maxW: 320 });
  put(1720, 648, dateStr, { size: 22, ltr: true, maxW: 320 });

  return canvas;
}
