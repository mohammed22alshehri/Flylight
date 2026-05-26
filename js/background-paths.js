/* ============================================================
   BACKGROUND PATHS — Cinematic animated SVG paths
   Vanilla JS implementation (no React/framer-motion needed)
   Light theme — matches Fly Light logo colors
   ============================================================ */

function initBackgroundPaths(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const {
    pathCount = 36,
    primaryColor = '30, 145, 150',   // teal-700 — matches logo
    accentColor  = '43, 181, 186',   // teal-500
  } = options;

  // Build two layered SVGs for crossing path effect
  const layer1 = createPathLayer(1, pathCount, primaryColor);
  const layer2 = createPathLayer(-1, pathCount, accentColor);

  container.innerHTML = `
    <div class="bg-paths-wrapper">
      ${layer1}
      ${layer2}
    </div>
  `;

  // Trigger animation
  requestAnimationFrame(() => {
    container.querySelectorAll('.bg-path').forEach((path, i) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray  = len;
      path.style.strokeDashoffset = len * 0.7;
      path.style.animationDelay   = `${i * 0.05}s`;
    });
  });
}

function createPathLayer(position, count, rgb) {
  const paths = [];
  for (let i = 0; i < count; i++) {
    const d = `M-${380 - i * 5 * position} -${189 + i * 6}` +
              `C-${380 - i * 5 * position} -${189 + i * 6} ` +
              `-${312 - i * 5 * position} ${216 - i * 6} ` +
              `${152 - i * 5 * position} ${343 - i * 6}` +
              `C${616 - i * 5 * position} ${470 - i * 6} ` +
              `${684 - i * 5 * position} ${875 - i * 6} ` +
              `${684 - i * 5 * position} ${875 - i * 6}`;

    const opacity = 0.08 + i * 0.022;
    const width   = 0.5 + i * 0.04;
    const dur     = 20 + Math.random() * 10;

    paths.push(`
      <path class="bg-path"
            d="${d}"
            stroke="rgba(${rgb}, ${opacity})"
            stroke-width="${width}"
            fill="none"
            style="animation-duration: ${dur}s;"/>
    `);
  }

  return `
    <svg class="bg-paths-svg" viewBox="0 0 696 316"
         fill="none" preserveAspectRatio="xMidYMid slice"
         aria-hidden="true">
      ${paths.join('')}
    </svg>
  `;
}

// ── Title letter-by-letter reveal ─────────────────────────────
function animateHeroTitle() {
  const title = document.querySelector('.hero-title-animated');
  if (!title || title.dataset.animated) return;
  title.dataset.animated = 'true';

  const words = title.textContent.trim().split(' ');
  title.innerHTML = '';

  let totalDelay = 0;
  words.forEach((word, wi) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'hero-word';

    [...word].forEach((letter, li) => {
      const letterSpan = document.createElement('span');
      letterSpan.className = 'hero-letter';
      letterSpan.textContent = letter;
      letterSpan.style.animationDelay = `${totalDelay}s`;
      totalDelay += 0.03;
      wordSpan.appendChild(letterSpan);
    });

    title.appendChild(wordSpan);
    if (wi < words.length - 1) {
      title.appendChild(document.createTextNode(' '));
    }
    totalDelay += 0.05;
  });
}

console.log('✅ background-paths.js loaded');
