/* ============================================================
   GLOBE — Interactive 3D globe (vanilla JS using cobe library)
   Displays Fly Light's global shipping network
   ============================================================ */

function initGlobe(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof createGlobe === 'undefined') {
    console.warn('Globe init skipped: canvas or cobe library missing');
    return;
  }

  // Fly Light shipping network cities
  const markers = [
    { location: [24.7136, 46.6753], size: 0.08 },  // الرياض
    { location: [24.0889, 38.0617], size: 0.08 },  // ينبع
    { location: [21.4858, 39.1925], size: 0.08 },  // جدة
    { location: [25.2048, 55.2708], size: 0.08 },  // دبي
    { location: [30.0444, 31.2357], size: 0.06 },  // القاهرة
    { location: [41.0082, 28.9784], size: 0.06 },  // إسطنبول
    { location: [51.5074, -0.1278], size: 0.06 },  // لندن
    { location: [40.7128, -74.0060], size: 0.06 }, // نيويورك
    { location: [35.6762, 139.6503], size: 0.06 }, // طوكيو
    { location: [1.3521, 103.8198], size: 0.06 },  // سنغافورة
  ];

  let phi = 0;
  let width = 0;

  function onResize() {
    if (canvas) width = canvas.offsetWidth;
  }
  window.addEventListener('resize', onResize);
  onResize();

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const globe = createGlobe(canvas, {
    devicePixelRatio: dpr,
    width:  width * 2,
    height: width * 2,
    phi: 0,
    theta: 0.3,
    dark: 0,
    diffuse: 1.2,
    mapSamples: 12000,
    mapBrightness: 8,
    baseColor:   [0.98, 0.98, 0.98], // off-white globe
    markerColor: [0.12, 0.57, 0.59], // teal-700 #1E9196
    glowColor:   [0.85, 0.95, 0.95], // soft teal glow
    markers: markers,
    onRender: (state) => {
      // Auto-rotate
      state.phi = phi;
      phi += 0.0035;
      state.width  = width * 2;
      state.height = width * 2;
    }
  });

  // Fade in once ready
  setTimeout(() => { canvas.style.opacity = '1'; }, 100);

  return globe;
}

console.log('✅ globe.js loaded');
