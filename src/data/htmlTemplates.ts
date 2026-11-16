import { HtmlTemplate, ResolutionPreset } from '../types/converter';

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { id: '1280x720', label: '1280 × 720 (HD 16:9)', width: 1280, height: 720, aspect: '16:9' },
  { id: '1920x1080', label: '1920 × 1080 (Full HD)', width: 1920, height: 1080, aspect: '16:9' },
  { id: '1080x1080', label: '1080 × 1080 (Square)', width: 1080, height: 1080, aspect: '1:1' },
  { id: '1080x1920', label: '1080 × 1920 (Portrait 9:16)', width: 1080, height: 1920, aspect: '9:16' },
  { id: '800x600', label: '800 × 600 (4:3 Classic)', width: 800, height: 600, aspect: '4:3' },
];

export const HTML_TEMPLATES: HtmlTemplate[] = [
  {
    id: 'kinetic-typography',
    title: 'Kinetic Editorial Title',
    category: 'CSS Keyframes',
    recommendedDuration: 4,
    description: 'Layered geometric mask reveal with staggered CSS keyframe choreography and smooth cubic-bezier easing.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .stage {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 7%;
      background: radial-gradient(circle at 82% 18%, rgba(37, 99, 235, 0.35), transparent 52%),
                  radial-gradient(circle at 18% 84%, rgba(14, 165, 233, 0.22), transparent 48%),
                  #0f172a;
    }
    .grid-lines {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
      background-size: 80px 80px;
      animation: panGrid 4s linear infinite;
    }
    .kicker {
      position: relative;
      font-size: clamp(14px, 1.8vw, 22px);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #60a5fa;
      font-weight: 600;
      animation: fadeSlideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .headline-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.12em;
    }
    .line {
      overflow: hidden;
    }
    .line span {
      display: inline-block;
      font-size: clamp(44px, 7.2vw, 108px);
      font-weight: 700;
      line-height: 1.02;
      letter-spacing: -0.03em;
      animation: riseIn 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .line-2 span {
      color: #93c5fd;
      animation-delay: 0.22s;
    }
    .line-3 span {
      animation-delay: 0.42s;
    }
    .footer-row {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(148, 163, 184, 0.24);
      padding-top: 24px;
      font-size: clamp(13px, 1.4vw, 18px);
      color: #94a3b8;
      animation: fadeSlideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both;
    }
    .progress-bar {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 5px;
      width: 100%;
      background: #2563eb;
      transform-origin: left center;
      animation: barFill 4s linear infinite;
    }
    @keyframes riseIn {
      0% { transform: translateY(115%); opacity: 0; }
      100% { transform: translateY(0%); opacity: 1; }
    }
    @keyframes fadeSlideUp {
      0% { transform: translateY(18px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes panGrid {
      0% { transform: translate(0, 0); }
      100% { transform: translate(80px, 80px); }
    }
    @keyframes barFill {
      0% { transform: scaleX(0); }
      100% { transform: scaleX(1); }
    }
  </style>
</head>
<body>
  <div class="stage">
    <div class="grid-lines"></div>
    <div class="kicker">Motion Architecture</div>
    <div class="headline-wrap">
      <div class="line line-1"><span>Design in Markup.</span></div>
      <div class="line line-2"><span>Render Every Frame.</span></div>
      <div class="line line-3"><span>Zero Compromise.</span></div>
    </div>
    <div class="footer-row">
      <span>Deterministic DOM Rasterization</span>
      <span>60 FPS Vector &amp; Typography Pipeline</span>
    </div>
    <div class="progress-bar"></div>
  </div>
</body>
</html>`,
  },
  {
    id: 'canvas-harmonic-wave',
    title: 'Harmonic Ribbon Field',
    category: 'HTML5 Canvas',
    recommendedDuration: 5,
    description: 'Procedural multi-band sine ribbon animation driven by requestAnimationFrame and deterministic time stepping.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #090d16;
      font-family: system-ui, -apple-system, sans-serif;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 6%;
    }
    .title {
      color: #f8fafc;
      font-size: clamp(28px, 4.2vw, 56px);
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .sub {
      color: #94a3b8;
      font-size: clamp(14px, 1.5vw, 20px);
      margin-top: 8px;
    }
    .caption {
      display: flex;
      justify-content: space-between;
      color: #cbd5e1;
      font-size: clamp(12px, 1.3vw, 16px);
      font-variant-numeric: tabular-nums;
      border-top: 1px solid rgba(255,255,255,0.12);
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <canvas id="scene"></canvas>
  <div class="overlay">
    <div>
      <div class="title">Acoustic Harmonic Synthesis</div>
      <div class="sub">Procedural Canvas2D multi-octave ribbon displacement</div>
    </div>
    <div class="caption">
      <span>Phase-Locked Timebase</span>
      <span id="clock">t = 0.00s</span>
    </div>
  </div>
  <script>
    const canvas = document.getElementById('scene');
    const ctx = canvas.getContext('2d');
    const clockEl = document.getElementById('clock');

    function resize() {
      canvas.width = window.innerWidth || 1280;
      canvas.height = window.innerHeight || 720;
    }
    resize();

    function draw(nowMs) {
      const t = nowMs * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      clockEl.textContent = 't = ' + t.toFixed(2) + 's';

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      const bands = 14;
      for (let b = 0; b < bands; b++) {
        const ratio = b / (bands - 1);
        ctx.beginPath();
        const amp = h * (0.06 + ratio * 0.14);
        const freq = 0.0032 + ratio * 0.0018;
        const speed = 1.6 + ratio * 1.4;
        for (let x = 0; x <= w; x += 8) {
          const y = h * 0.54
            + Math.sin(x * freq + t * speed + b * 0.35) * amp
            + Math.cos(x * freq * 0.55 - t * 0.9 + b * 0.2) * (amp * 0.42);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const hue = 205 + ratio * 42;
        ctx.strokeStyle = 'hsla(' + hue + ', 85%, ' + (52 + ratio * 18) + '%, ' + (0.28 + (1 - ratio) * 0.55) + ')';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  </script>
</body>
</html>`,
  },
  {
    id: 'svg-orbital-telemetry',
    title: 'SVG Orbital Vector Dial',
    category: 'SVG & CSS',
    recommendedDuration: 5,
    description: 'Precision vector rings with animated stroke-dashoffset paths and rotating orbital markers.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #ffffff;
      color: #0f172a;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .frame {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      padding: 6% 8%;
      gap: 4%;
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
    }
    .copy h1 {
      font-size: clamp(32px, 4.4vw, 62px);
      line-height: 1.06;
      letter-spacing: -0.03em;
      font-weight: 700;
      margin-bottom: 18px;
    }
    .copy p {
      font-size: clamp(15px, 1.6vw, 22px);
      line-height: 1.5;
      color: #475569;
      max-width: 34ch;
    }
    .metric-row {
      margin-top: 32px;
      display: flex;
      gap: 36px;
      border-top: 1px solid #cbd5e1;
      padding-top: 20px;
    }
    .metric-val {
      font-size: clamp(22px, 2.8vw, 38px);
      font-weight: 700;
      color: #2563eb;
      font-variant-numeric: tabular-nums;
    }
    .metric-lbl {
      font-size: clamp(12px, 1.1vw, 15px);
      color: #64748b;
      margin-top: 4px;
    }
    .dial-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: min(82%, 440px);
      height: auto;
      overflow: visible;
    }
    .ring-outer {
      transform-origin: 200px 200px;
      animation: spinCW 5s linear infinite;
    }
    .ring-inner {
      transform-origin: 200px 200px;
      animation: spinCCW 5s linear infinite;
    }
    .arc-draw {
      stroke-dasharray: 754;
      animation: drawArc 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    @keyframes spinCW {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes spinCCW {
      from { transform: rotate(360deg); }
      to { transform: rotate(0deg); }
    }
    @keyframes drawArc {
      0% { stroke-dashoffset: 754; }
      50% { stroke-dashoffset: 140; }
      100% { stroke-dashoffset: 754; }
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="copy">
      <h1>Precision Vector Cadence</h1>
      <p>Clean SVG stroke choreography and typographic hierarchy captured at exact frame intervals.</p>
      <div class="metric-row">
        <div>
          <div class="metric-val">360°</div>
          <div class="metric-lbl">Continuous Orbit</div>
        </div>
        <div>
          <div class="metric-val">100%</div>
          <div class="metric-lbl">Vector Sharpness</div>
        </div>
      </div>
    </div>
    <div class="dial-wrap">
      <svg viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="165" fill="none" stroke="#e2e8f0" stroke-width="2" />
        <g class="ring-outer">
          <circle cx="200" cy="200" r="165" fill="none" stroke="#2563eb" stroke-width="6" stroke-dasharray="90 28 24 28" stroke-linecap="round" />
          <circle cx="200" cy="35" r="9" fill="#2563eb" />
        </g>
        <circle class="arc-draw" cx="200" cy="200" r="120" fill="none" stroke="#0f172a" stroke-width="10" stroke-linecap="round" />
        <g class="ring-inner">
          <circle cx="200" cy="200" r="76" fill="none" stroke="#60a5fa" stroke-width="3" stroke-dasharray="14 14" />
          <circle cx="276" cy="200" r="7" fill="#0f172a" />
        </g>
        <circle cx="200" cy="200" r="24" fill="#2563eb" />
      </svg>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'product-showcase-card',
    title: 'Architectural Feature Reveal',
    category: 'UI Motion',
    recommendedDuration: 4,
    description: 'Clean split-panel UI showcase with animated chart bars and sliding callout cards.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f1f5f9;
      color: #0f172a;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .wrap {
      width: 100%;
      height: 100%;
      padding: 6%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .panel {
      width: 100%;
      height: 100%;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 5%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
      animation: cardIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .header h2 {
      font-size: clamp(24px, 3vw, 42px);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .header span {
      font-size: clamp(13px, 1.3vw, 18px);
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .bars {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      align-items: end;
      gap: 2.5%;
      height: 56%;
      padding: 24px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .bar {
      background: #2563eb;
      border-radius: 8px 8px 0 0;
      transform-origin: bottom center;
      animation: growBar 4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
    }
    .bar:nth-child(1) { height: 42%; animation-delay: 0.05s; opacity: 0.45; }
    .bar:nth-child(2) { height: 64%; animation-delay: 0.12s; opacity: 0.6; }
    .bar:nth-child(3) { height: 52%; animation-delay: 0.19s; opacity: 0.7; }
    .bar:nth-child(4) { height: 84%; animation-delay: 0.26s; opacity: 0.85; }
    .bar:nth-child(5) { height: 72%; animation-delay: 0.33s; opacity: 0.78; }
    .bar:nth-child(6) { height: 95%; animation-delay: 0.40s; opacity: 1; }
    .bar:nth-child(7) { height: 68%; animation-delay: 0.47s; opacity: 0.72; }
    .bar:nth-child(8) { height: 88%; animation-delay: 0.54s; opacity: 0.92; }
    .legend {
      display: flex;
      justify-content: space-between;
      font-size: clamp(13px, 1.3vw, 17px);
      color: #475569;
    }
    @keyframes cardIn {
      from { transform: translateY(24px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes growBar {
      0% { transform: scaleY(0.12); }
      45% { transform: scaleY(1); }
      75% { transform: scaleY(0.92); }
      100% { transform: scaleY(0.12); }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="panel">
      <div class="header">
        <h2>Throughput Telemetry</h2>
        <span>Q1 — Q4 Benchmark</span>
      </div>
      <div class="bars">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      </div>
      <div class="legend">
        <span>Sampled at 30 frames per second</span>
        <span>Peak Efficiency: 95.4%</span>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'particle-constellation',
    title: 'Geometric Lattice Network',
    category: 'HTML5 Canvas',
    recommendedDuration: 5,
    description: 'Connected geometric node constellation rendered with crisp anti-aliased lines on Canvas2D.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0b1120;
      font-family: system-ui, -apple-system, sans-serif;
    }
    canvas { display: block; width: 100%; height: 100%; }
    .label {
      position: absolute;
      left: 6%;
      bottom: 8%;
      color: #f8fafc;
    }
    .label h1 {
      font-size: clamp(28px, 4vw, 54px);
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .label p {
      color: #94a3b8;
      font-size: clamp(14px, 1.5vw, 19px);
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <canvas id="net"></canvas>
  <div class="label">
    <h1>Spatial Mesh Topology</h1>
    <p>Deterministic orbital node positions and dynamic edge weights</p>
  </div>
  <script>
    const canvas = document.getElementById('net');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth || 1280;
    canvas.height = window.innerHeight || 720;

    const nodes = Array.from({ length: 28 }, (_, i) => ({
      bx: ((i * 137.5) % 100) / 100,
      by: ((i * 73.1 + 19) % 100) / 100,
      rx: 0.04 + (i % 5) * 0.015,
      ry: 0.04 + ((i + 2) % 4) * 0.018,
      speed: 0.6 + (i % 7) * 0.18,
      phase: i * 0.8
    }));

    function frame(ms) {
      const t = ms * 0.001;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0b1120');
      grad.addColorStop(1, '#172554');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const pts = nodes.map(n => ({
        x: (n.bx * 0.8 + 0.1 + Math.cos(t * n.speed + n.phase) * n.rx) * w,
        y: (n.by * 0.72 + 0.08 + Math.sin(t * n.speed * 0.9 + n.phase) * n.ry) * h
      }));

      const maxDist = Math.min(w, h) * 0.28;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < maxDist) {
            const alpha = (1 - d / maxDist) * 0.55;
            ctx.strokeStyle = 'rgba(96, 165, 250, ' + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < pts.length; i++) {
        ctx.fillStyle = i % 4 === 0 ? '#60a5fa' : '#f8fafc';
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, i % 4 === 0 ? 5 : 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  </script>
</body>
</html>`,
  },
];
