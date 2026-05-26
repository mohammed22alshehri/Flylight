/* ============================================================
   HERO FLY — Plane appears ONLY when user starts scrolling
   Hidden at top, visible during scroll, gone before next section
   ============================================================ */

function initHeroFly() {
  const target = document.getElementById('heroFly');
  const image  = document.getElementById('heroFlyImage');
  if (!target || !image) return;

  // Skip on reduced-motion users
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  let screenWidth = window.innerWidth;

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      screenWidth = window.innerWidth;
      update();
    }, 200);
  });

  function update() {
    const rect          = target.getBoundingClientRect();
    const sectionHeight = target.offsetHeight;

    // ── Progress = how much the user has scrolled PAST the section's top ──
    //
    //   At top of page (no scroll):  rect.top = 0   → progress = 0   (plane hidden)
    //   At middle of section:        rect.top = -h/2 → progress = 0.5 (plane in center)
    //   At end of section:           rect.top = -h   → progress = 1   (plane gone)
    //
    const scrolledPast = -rect.top;
    const progress = clamp(scrolledPast / sectionHeight, 0, 1);

    // ── Plane X position ────────────────────────────────────────
    // Travels from off-screen left to off-screen right
    const xStart = -1.4 * screenWidth;
    const xEnd   =  1.4 * screenWidth;
    const x = xStart + progress * (xEnd - xStart);

    // ── Opacity ─────────────────────────────────────────────────
    //   0    → 0.05  : hidden (don't appear at top)
    //   0.05 → 0.20  : fade in
    //   0.20 → 0.80  : visible (full opacity)
    //   0.80 → 0.95  : fade out
    //   0.95 → 1     : hidden (before next section)
    let opacity;
    if (progress < 0.05)       opacity = 0;
    else if (progress < 0.20)  opacity = (progress - 0.05) / 0.15;
    else if (progress < 0.80)  opacity = 1;
    else if (progress < 0.95)  opacity = 1 - (progress - 0.80) / 0.15;
    else                       opacity = 0;

    image.style.transform = `translate3d(${x}px, -50%, 0)`;
    image.style.opacity   = opacity;

    ticking = false;
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial render
  update();
}

console.log('✅ hero-fly.js loaded');
