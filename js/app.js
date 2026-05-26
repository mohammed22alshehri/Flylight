/* ============================================================
   APP — Main entry point, navigation, toast, global init
   ============================================================ */

const APP_VERSION = '3.0.0';

// ── Toast ─────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  // Remove existing
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);

  // Force reflow then animate
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  const DURATION = 3500;
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, DURATION);
}

// ── Page navigation ───────────────────────────────────────────
function switchPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Deactivate all nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Show target page
  const target = document.getElementById(pageName);
  if (target) target.classList.add('active');

  // Activate matching nav link
  document.querySelectorAll(`[data-page="${pageName}"]`).forEach(el => {
    if (el.classList.contains('nav-link')) el.classList.add('active');
  });

  // Dashboard: check admin session
  if (pageName === 'dashboard') {
    checkAdminSession();
  }

  // Re-run scroll reveal for newly visible elements
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.visible), .reveal-left:not(.visible)').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        el.classList.add('visible');
      }
    });
    setupScrollReveal();
  }, 50);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Hamburger menu ────────────────────────────────────────────
function setupHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', function () {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close on nav link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── Nav link setup ────────────────────────────────────────────
function setupNavLinks() {
  // Nav links (all elements with data-page)
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', function (e) {
      if (this.tagName === 'A') e.preventDefault();
      switchPage(this.getAttribute('data-page'));
    });
  });
}

// ── Admin password: Enter key ─────────────────────────────────
function setupAdminKeyboard() {
  const passInput = document.getElementById('adminPassword');
  if (passInput) {
    passInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') adminLogin();
    });
  }
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
  console.log(`🚀 Fly Light Logistics v${APP_VERSION} initializing...`);

  // ── Setup UI FIRST so the page is interactive even if Supabase fails ──
  try { setupHamburgerMenu();    } catch (e) { console.error('Hamburger setup failed:', e); }
  try { setupNavLinks();         } catch (e) { console.error('Nav links setup failed:', e); }
  try { setupFileUpload();       } catch (e) { console.error('File upload setup failed:', e); }
  try { setupAmountStepper();    } catch (e) { console.error('Amount stepper setup failed:', e); }
  try { setupShareCalculator();  } catch (e) { console.error('Share calc setup failed:', e); }
  try { setupForm();             } catch (e) { console.error('Form setup failed:', e); }
  try { setupAdminKeyboard();    } catch (e) { console.error('Admin keyboard setup failed:', e); }
  try { initAnimations();        } catch (e) { console.error('Animations init failed:', e); }

  // Start on home (HTML already has .active class as fallback)
  try { switchPage('home'); } catch (e) { console.error('switchPage failed:', e); }

  console.log('✅ UI ready');

  // Initialize Supabase in the background — doesn't block UI
  try {
    if (typeof initSupabase === 'function') {
      await initSupabase();
      console.log('✅ Supabase connected');
    }
  } catch (e) {
    console.warn('⚠️ Supabase init failed (page still usable):', e);
  }

  console.log('✅ Application ready');
});

console.log('✅ app.js loaded');
