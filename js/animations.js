/* ============================================================
   ANIMATIONS — Scroll-reveal, canvas particles, nav scroll
   ============================================================ */

// ── Nav scroll effect ─────────────────────────────────────────
function setupNavScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial call
}

// ── IntersectionObserver reveal ───────────────────────────────
function setupScrollReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left');
  if (!els.length) return;

  const io = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target); // once only
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  els.forEach(el => io.observe(el));
}

// ── Particle canvas — DISABLED for light theme (using SVG paths instead) ──
function setupParticleCanvas() {
  return; // skip — light hero uses SVG paths, no need for canvas particles
  // eslint-disable-next-line no-unreachable
  const canvas  = document.getElementById('hero-canvas');
  const homePage = document.getElementById('home');
  if (!canvas || !homePage) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [], animId;

  function resize() {
    W = canvas.width  = homePage.offsetWidth  || window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.reset();
  }

  Particle.prototype.reset = function () {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.r  = Math.random() * 1.5 + 0.5;
    this.a  = Math.random() * 0.5 + 0.1;
  };

  Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
  };

  function init() {
    resize();
    const count = Math.min(90, Math.floor((W * H) / 12000));
    particles = Array.from({ length: count }, () => new Particle());
  }

  const LINE_DIST = 120;
  const TEAL = '30,145,150';

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Update + draw dots
    particles.forEach(p => {
      p.update();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${TEAL},${p.a})`;
      ctx.fill();
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINE_DIST) {
          const opacity = (1 - dist / LINE_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${TEAL},${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  // Only run when home page is visible
  const pageObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!animId) { init(); draw(); }
      } else {
        if (animId) { cancelAnimationFrame(animId); animId = null; }
      }
    });
  }, { threshold: 0.01 });

  pageObserver.observe(homePage);

  // Resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      init();
      draw();
    }, 200);
  });
}

// ── "Learn more" button smooth scroll to about ───────────────
function setupLearnMore() {
  const btn = document.getElementById('learnMoreBtn');
  const target = document.getElementById('aboutSection');
  if (btn && target) {
    btn.addEventListener('click', () => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

// ── Footer links navigation ───────────────────────────────────
function setupFooterLinks() {
  document.querySelectorAll('.site-footer [data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchPage(link.getAttribute('data-page'));
    });
  });
}

// ── Init all animations ───────────────────────────────────────
function initAnimations() {
  setupNavScroll();
  setupScrollReveal();
  setupParticleCanvas();
  setupLearnMore();
  setupFooterLinks();
}

console.log('✅ animations.js loaded');
