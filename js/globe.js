/* ============================================================
   GLOBE — Pure canvas globe (no external library)
   Shows Fly Light's global shipping network
   ============================================================ */

function initGlobe(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn('Globe: canvas not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Fly Light cities (lat, lng)
  const cities = [
    { lat: 24.7136, lng: 46.6753, primary: true },   // الرياض
    { lat: 24.0889, lng: 38.0617, primary: true },   // ينبع
    { lat: 21.4858, lng: 39.1925, primary: true },   // جدة
    { lat: 25.2048, lng: 55.2708 },                  // دبي
    { lat: 30.0444, lng: 31.2357 },                  // القاهرة
    { lat: 41.0082, lng: 28.9784 },                  // إسطنبول
    { lat: 51.5074, lng: -0.1278 },                  // لندن
    { lat: 40.7128, lng: -74.006 },                  // نيويورك
    { lat: 35.6762, lng: 139.6503 },                 // طوكيو
    { lat: 1.3521,  lng: 103.8198 },                 // سنغافورة
    { lat: 19.4326, lng: -99.1332 },                 // مكسيكو
    { lat: -33.8688, lng: 151.2093 },                // سيدني
    { lat: -23.5505, lng: -46.6333 },                // ساو باولو
  ];

  const arcs = [
    [0, 3], [1, 6], [2, 5], [0, 8], [3, 7], [2, 9]
  ];

  let rotation = 0;
  let size = 320;
  let center = { x: 160, y: 160 };
  let radius = 140;
  let animating = false;
  let initialized = false;

  function setup(w) {
    size = w;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.scale(dpr, dpr);
    center = { x: size / 2, y: size / 2 };
    radius = size * 0.44;
    initialized = true;
  }

  function project(lat, lng) {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180 + rotation;
    const x = Math.cos(latRad) * Math.sin(lngRad);
    const y = -Math.sin(latRad);
    const z = Math.cos(latRad) * Math.cos(lngRad);
    return {
      x: center.x + x * radius,
      y: center.y + y * radius * 0.95,
      z: z,
      visible: z > -0.1
    };
  }

  function draw() {
    if (!initialized || size === 0) return;
    ctx.clearRect(0, 0, size, size);

    // ── Sphere base ──
    const sphereGrad = ctx.createRadialGradient(
      center.x - radius * 0.3, center.y - radius * 0.3, radius * 0.1,
      center.x, center.y, radius * 1.1
    );
    sphereGrad.addColorStop(0, '#FFFFFF');
    sphereGrad.addColorStop(0.6, '#F0F7F9');
    sphereGrad.addColorStop(1, '#DCEEF1');

    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();

    // Outline
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(30, 145, 150, 0.3)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // ── Latitude lines ──
    ctx.strokeStyle = 'rgba(30, 145, 150, 0.15)';
    ctx.lineWidth = 0.7;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let started = false;
      for (let lng = -180; lng <= 180; lng += 5) {
        const p = project(lat, lng);
        if (p.visible) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }

    // ── Longitude lines ──
    for (let lng = 0; lng < 360; lng += 30) {
      ctx.beginPath();
      let started = false;
      for (let lat = -85; lat <= 85; lat += 5) {
        const p = project(lat, lng);
        if (p.visible) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }

    // ── Arcs (shipping routes) ──
    arcs.forEach(([fromIdx, toIdx], arcIdx) => {
      const from = cities[fromIdx];
      const to = cities[toIdx];
      const fromP = project(from.lat, from.lng);
      const toP = project(to.lat, to.lng);
      if (!fromP.visible && !toP.visible) return;

      const midX = (fromP.x + toP.x) / 2;
      const midY = (fromP.y + toP.y) / 2;
      const dx = toP.x - fromP.x;
      const dy = toP.y - fromP.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const controlY = midY - dist * 0.35;
      const dashOffset = -((Date.now() / 30 + arcIdx * 40) % 60);

      ctx.beginPath();
      ctx.moveTo(fromP.x, fromP.y);
      ctx.quadraticCurveTo(midX, controlY, toP.x, toP.y);
      ctx.strokeStyle = 'rgba(30, 145, 150, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = dashOffset;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── City dots ──
    cities.forEach((city) => {
      const p = project(city.lat, city.lng);
      if (!p.visible) return;
      const opacity = Math.max(0.4, p.z + 0.4);
      const dotSize = city.primary ? 5 : 3.5;

      // Glow
      const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotSize * 3);
      glowGrad.addColorStop(0, `rgba(43, 181, 186, ${opacity * 0.7})`);
      glowGrad.addColorStop(1, 'rgba(43, 181, 186, 0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Solid dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = city.primary
        ? `rgba(13, 108, 112, ${opacity})`
        : `rgba(30, 145, 150, ${opacity})`;
      ctx.fill();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(p.x - dotSize * 0.3, p.y - dotSize * 0.3, dotSize * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
      ctx.fill();
    });
  }

  function animate() {
    if (!animating) return;
    rotation += 0.003;
    draw();
    requestAnimationFrame(animate);
  }

  function tryInit() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width);
    if (w > 0) {
      setup(w);
      draw();
      canvas.style.opacity = '1';
      if (!animating) {
        animating = true;
        animate();
      }
      return true;
    }
    return false;
  }

  // Initial attempt
  if (!tryInit()) {
    // If canvas has 0 width, wait for it to be sized
    const ro = new ResizeObserver(() => {
      if (tryInit()) ro.disconnect();
    });
    ro.observe(canvas);

    // Fallback: retry after delays
    setTimeout(() => { if (!initialized) tryInit(); }, 100);
    setTimeout(() => { if (!initialized) tryInit(); }, 500);
    setTimeout(() => { if (!initialized) tryInit(); }, 1500);
  }

  // Handle resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width);
      if (w > 0) {
        setup(w);
        draw();
      }
    }, 200);
  });

  // Pause when off-screen
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && initialized && !animating) {
        animating = true;
        animate();
      } else if (!e.isIntersecting) {
        animating = false;
      }
    });
  }, { threshold: 0.05 });
  io.observe(canvas);
}

console.log('✅ globe.js loaded');
