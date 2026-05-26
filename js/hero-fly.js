/* ============================================================
   HERO FLY — Scroll-driven plane animation (Vanilla)
   Mirrors the framer-motion behaviour with rAF throttling
   ============================================================ */

function initHeroFly() {
  const target = document.getElementById('heroFly');
  const image  = document.getElementById('heroFlyImage');
  if (!target || !image) return;

  // Skip on reduced-motion users — CSS handles the static fallback
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  let screenWidth = window.innerWidth;

  // Recalculate on resize (debounced)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      screenWidth = window.innerWidth;
      update();
    }, 200);
  });

  function update() {
    const rect = target.getBoundingClientRect();
    const vh = window.innerHeight;

    // Progress: 0 when top of section reaches bottom of viewport,
    //          1 when bottom of section reaches top of viewport.
    const totalDistance = rect.height + vh;
    const scrolled = vh - rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / totalDistance));

    // Translate X: plane flies from off-screen-left to off-screen-right
    // -500vw → +250vw (in pixels)
    const xStart = -5 * screenWidth;
    const xEnd   =  2.5 * screenWidth;
    const xRange = xEnd - xStart;

    // Re-map progress [0.1, 0.8] → [0, 1] for x (so plane is offscreen at edges)
    const xProgress = clamp((progress - 0.1) / (0.8 - 0.1), 0, 1);
    const x = xStart + xProgress * xRange;

    // Opacity: fade in [0.1 → 0.25], hold [0.25 → 0.7], fade out [0.7 → 0.8]
    let opacity;
    if (progress < 0.1)      opacity = 0;
    else if (progress < 0.25) opacity = (progress - 0.1) / 0.15;
    else if (progress < 0.7)  opacity = 1;
    else if (progress < 0.8)  opacity = 1 - (progress - 0.7) / 0.1;
    else                       opacity = 0;

    image.style.transform = `translate3d(${x}px, 0, 0)`;
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
