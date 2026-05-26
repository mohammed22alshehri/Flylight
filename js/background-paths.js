/* ============================================================
   BACKGROUND PATHS — Lightweight cinematic SVG
   ============================================================ */

function initBackgroundPaths(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 16 paths total — light enough to perform, rich enough to look premium
  const layer1 = buildLayer(1, 8, '30, 145, 150');
  const layer2 = buildLayer(-1, 8, '43, 181, 186');

  container.innerHTML = `
    <svg class="bg-paths-svg" viewBox="0 0 696 316"
         fill="none" preserveAspectRatio="xMidYMid slice"
         aria-hidden="true">${layer1}${layer2}</svg>
  `;
}

function buildLayer(position, count, rgb) {
  let paths = '';
  for (let i = 0; i < count; i++) {
    const offset  = i * 18 * position;
    const opacity = 0.12 + i * 0.04;
    const width   = 0.6 + i * 0.08;

    const d = `M-${380 - offset} -${189 + i * 18}` +
              `C-${380 - offset} -${189 + i * 18} ` +
              `-${312 - offset} ${216 - i * 18} ` +
              `${152 - offset} ${343 - i * 18}` +
              `C${616 - offset} ${470 - i * 18} ` +
              `${684 - offset} ${875 - i * 18} ` +
              `${684 - offset} ${875 - i * 18}`;

    paths += `<path d="${d}" stroke="rgba(${rgb}, ${opacity})" stroke-width="${width}" fill="none"/>`;
  }
  return paths;
}

// ── Title letter-by-letter reveal (lightweight CSS-only animation) ──
function animateHeroTitle() {
  const title = document.querySelector('.hero-title-animated');
  if (!title || title.dataset.animated) return;
  title.dataset.animated = 'true';

  const text = title.textContent.trim();
  title.innerHTML = '';

  let delay = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') {
      title.appendChild(document.createTextNode(' '));
      continue;
    }
    const span = document.createElement('span');
    span.className = 'hero-letter';
    span.textContent = ch;
    span.style.animationDelay = (delay * 0.04) + 's';
    title.appendChild(span);
    delay++;
  }
}

console.log('✅ background-paths.js loaded (lightweight)');
