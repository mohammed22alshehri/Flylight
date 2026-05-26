/* ============================================================
   GLOBE — Lightweight pure-canvas globe (no external library)
   Shows Fly Light's global shipping network with rotating dots
   ============================================================ */

function initGlobe(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Fly Light shipping network cities (lat, lng, label)
  const cities = [
    { lat: 24.7136, lng: 46.6753, name: 'الرياض',     primary: true },
    { lat: 24.0889, lng: 38.0617, name: 'ينبع',       primary: true },
    { lat: 21.4858, lng: 39.1925, name: 'جدة',        primary: true },
    { lat: 25.2048, lng: 55.2708, name: 'دبي' },
    { lat: 30.0444, lng: 31.2357, name: 'القاهرة' },
    { lat: 41.0082, lng: 28.9784, name: 'إسطنبول' },
    { lat: 51.5074, lng: -0.1278, name: 'لندن' },
    { lat: 40.7128, lng: -74.006, name: 'نيويورك' },
    { lat: 35.6762, lng: 139.6503, name: 'طوكيو' },
    { lat: 1.3521, lng: 103.8198, name: 'سنغافورة' },
    { lat: 19.4326, lng: -99.1332, name: 'مكسيكو' },
    { lat: -33.8688, lng: 151.2093, name: 'سيدني' },
    { lat: -23.5505, lng: -46.6333, name: 'ساو باولو' },
  ];

  // Shipping arcs (from → to indexes in cities)
  const arcs = [
    [0, 3], // Riyadh → Dubai
    [1, 6], // Yanbu → London
    [2, 5], // Jeddah → Istanbul
    [0, 8], // Riyadh → Tokyo
    [3, 7], // Dubai → NYC
    [2, 9], // Jeddah → Singapore
  ];

  let rotation = 0;
  let size = 0;
  let center = { x: 0, y: 0 };
  let radius = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    size = Math.min(rect.width, rect.height);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    center = { x: size / 2, y: size / 2 };
    radius = size * 0.44;
  }

  function project(lat, lng) {
    // Convert lat/lng to 3D point, then to 2D screen
    const latRad = (lat * Math.PI) / 180;
    const lngRad = ((lng * Math.PI) / 180) + rotation;

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

  function drawGlobe() {
    ctx.clearRect(0, 0, size, size);

    // ── 1. Sphere base with soft gradient ──
    const sphereGrad = ctx.createRadialGradient(
      center.x - radius * 0.3, center.y - radius * 0.3, radius * 0.1,
      center.x, center.y, radius * 1.1
    );
    sphereGrad.addColorStop(0,    '#FFFFFF');
    sphereGrad.addColorStop(0.6,  '#F0F7F9');
    sphereGrad.addColorStop(1,    '#DCEEF1');

    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();

    // Sphere outline
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(30, 145, 150, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── 2. Latitude lines ──
    ctx.strokeStyle = 'rgba(30, 145, 150, 0.1)';
    ctx.lineWidth = 0.6;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      for (let lng = -180; lng <= 180; lng += 5) {
        const p = project(lat, lng);
        if (p.visible) {
          if (lng === -180) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }

    // ── 3. Longitude lines ──
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

    // ── 4. Draw arcs (shipping routes) ──
    arcs.forEach(([fromIdx, toIdx], arcIdx) => {
      const from = cities[fromIdx];
      const to = cities[toIdx];
      const fromP = project(from.lat, from.lng);
      const toP = project(to.lat, to.lng);

      if (!fromP.visible && !toP.visible) return;

      // Arc curve via control point above midpoint
      const midX = (fromP.x + toP.x) / 2;
      const midY = (fromP.y + toP.y) / 2;
      const dx = toP.x - fromP.x;
      const dy = toP.y - fromP.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const controlY = midY - dist * 0.35;

      // Animated dash flow along the arc
      const dashOffset = -((Date.now() / 30 + arcIdx * 50) % 60);

      ctx.beginPath();
      ctx.moveTo(fromP.x, fromP.y);
      ctx.quadraticCurveTo(midX, controlY, toP.x, toP.y);
      ctx.strokeStyle = 'rgba(30, 145, 150, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = dashOffset;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── 5. Draw city dots ──
    cities.forEach((city) => {
      const p = project(city.lat, city.lng);
      if (!p.visible) return;

      const opacity = Math.max(0.3, p.z + 0.3);
      const dotSize = city.primary ? 5 : 3.5;

      // Glow
      const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotSize * 3);
      glowGrad.addColorStop(0,    `rgba(43, 181, 186, ${opacity * 0.6})`);
      glowGrad.addColorStop(1,    'rgba(43, 181, 186, 0)');
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
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
      ctx.fill();
    });

    // ── 6. Highlight ring around the visible disk ──
    const rimGrad = ctx.createRadialGradient(
      center.x, center.y, radius * 0.95,
      center.x, center.y, radius * 1.05
    );
    rimGrad.addColorStop(0,    'rgba(30, 145, 150, 0)');
    rimGrad.addColorStop(1,    'rgba(30, 145, 150, 0.2)');
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
  }

  let animating = false;
  function animate() {
    if (!animating) return;
    rotation += 0.003;
    drawGlobe();
    requestAnimationFrame(animate);
  }

  // Initialize
  resize();
  drawGlobe();
  canvas.style.opacity = '1';

  // Pause animation when off-screen
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !animating) {
        animating = true;
        animate();
      } else if (!e.isIntersecting) {
        animating = false;
      }
    });
  }, { threshold: 0.1 });
  io.observe(canvas);

  // Handle resize
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); drawGlobe(); }, 200);
  });
}

console.log('✅ globe.js loaded (canvas-only)');
