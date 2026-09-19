/* ===== radar.js — Glowing SVG Radar Chart ===== */
const RadarChart = (() => {
  let container = null;
  let currentPeriod = 7; // 7 or 30 days

  function init(elementId) {
    container = document.getElementById(elementId);
  }

  function setPeriod(p) {
    currentPeriod = p;
    render();
  }

  function getPeriod() {
    return currentPeriod;
  }

  function render() {
    if (!container) return;

    const series = radarSeries(currentPeriod);
    const curr = series[0] && series[0].vals ? series[0].vals : [0, 0, 0, 0, 0, 0, 0];
    const prev = series[1] && series[1].vals ? series[1].vals : null;

    const size = 340;
    const center = size / 2;
    const radius = 110;
    const N = AREAS.length;

    // Helper to calculate coordinates
    const getPoint = (index, value) => {
      const angle = (Math.PI * 2 / N) * index - Math.PI / 2;
      const r = (value / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        angle
      };
    };

    // Concentric web levels (25%, 50%, 75%, 100%)
    let gridPolygons = '';
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const pt = getPoint(i, level * 100);
        pts.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
      }
      gridPolygons += `
        <polygon points="${pts.join(' ')}" 
                 fill="none" 
                 stroke="${level === 1 ? 'rgba(255, 122, 26, 0.35)' : 'rgba(255, 255, 255, 0.08)'}" 
                 stroke-dasharray="${level === 1 ? 'none' : '3,3'}"
                 stroke-width="${level === 1 ? '1.5' : '1'}" />
      `;
    });

    // Axis spokes and labels
    let spokes = '';
    let labels = '';
    for (let i = 0; i < N; i++) {
      const outerPt = getPoint(i, 100);
      spokes += `
        <line x1="${center}" y1="${center}" x2="${outerPt.x.toFixed(1)}" y2="${outerPt.y.toFixed(1)}" 
              stroke="rgba(255, 255, 255, 0.12)" stroke-width="1" />
      `;

      // Label positioning slightly outside radius
      const labelAngle = (Math.PI * 2 / N) * i - Math.PI / 2;
      const labelR = radius + 32;
      const lx = center + labelR * Math.cos(labelAngle);
      const ly = center + labelR * Math.sin(labelAngle) + 4;
      const area = AREAS[i];
      const val = curr[i] || 0;

      labels += `
        <g class="radar-label" data-area="${area.key}" transform="translate(${lx.toFixed(1)}, ${ly.toFixed(1)})">
          <text text-anchor="middle" fill="#999" font-size="11" font-weight="600" class="radar-lbl-text">
            ${area.ico} ${area.label}
          </text>
          <text y="13" text-anchor="middle" fill="#ff9d3d" font-size="10" font-weight="700">
            ${val}%
          </text>
        </g>
      `;
    }

    // Previous period polygon (dashed grey/dim orange)
    let prevPoly = '';
    if (prev && prev.some(v => v > 0)) {
      const prevPts = prev.map((v, i) => {
        const pt = getPoint(i, Math.max(v, 4));
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }).join(' ');

      prevPoly = `
        <polygon points="${prevPts}"
                 fill="rgba(255, 255, 255, 0.03)"
                 stroke="rgba(255, 255, 255, 0.28)"
                 stroke-width="1.5"
                 stroke-dasharray="4,4" />
      `;
    }

    // Current period polygon (Glowing ember orange)
    const currPts = curr.map((v, i) => {
      const pt = getPoint(i, Math.max(v, 4));
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

    // Glowing vertices
    let vertices = '';
    curr.forEach((v, i) => {
      const pt = getPoint(i, Math.max(v, 4));
      const area = AREAS[i];
      vertices += `
        <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4.5"
                fill="#ff7a1a" stroke="#fff" stroke-width="1.5"
                class="radar-dot"
                data-tooltip="${area.label}: ${v}%"
                filter="url(#radar-glow)" />
      `;
    });

    const periodLabel = currentPeriod === 7 ? '7-Day Life Balance' : '30-Day Life Balance';
    const hasPrev = prev && prev.some(v => v > 0);

    const svgHtml = `
      <div class="radar-header">
        <div class="radar-title-box">
          <span class="radar-title">${periodLabel}</span>
          <div class="radar-legend">
            <span class="legend-item"><span class="legend-chip curr-chip"></span> Current</span>
            ${hasPrev ? '<span class="legend-item"><span class="legend-chip prev-chip"></span> Previous</span>' : ''}
          </div>
        </div>
        <div class="radar-period-toggle">
          <button type="button" class="radar-tab-btn ${currentPeriod === 7 ? 'active' : ''}" data-p="7">7 Days</button>
          <button type="button" class="radar-tab-btn ${currentPeriod === 30 ? 'active' : ''}" data-p="30">30 Days</button>
        </div>
      </div>

      <div class="radar-svg-wrap">
        <svg viewBox="0 0 ${size} ${size}" class="radar-svg" role="img" aria-label="Life balance radar chart">
          <defs>
            <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="radar-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(255, 122, 26, 0.45)" />
              <stop offset="70%" stop-color="rgba(255, 90, 10, 0.22)" />
              <stop offset="100%" stop-color="rgba(255, 70, 0, 0.05)" />
            </radialGradient>
          </defs>

          <!-- Web Grid -->
          ${gridPolygons}
          <!-- Radial Spokes -->
          ${spokes}
          <!-- Previous Period Polygon -->
          ${prevPoly}
          <!-- Current Period Glowing Polygon -->
          <polygon points="${currPts}"
                   fill="url(#radar-gradient)"
                   stroke="#ff7a1a"
                   stroke-width="2.5"
                   filter="url(#radar-glow)"
                   class="radar-main-polygon" />
          <!-- Vertex Points -->
          ${vertices}
          <!-- Labels -->
          ${labels}
        </svg>
      </div>
    `;

    container.innerHTML = svgHtml;

    // Attach button events
    container.querySelectorAll('.radar-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const p = parseInt(btn.getAttribute('data-p'), 10);
        if (p !== currentPeriod) {
          AudioFX.click();
          setPeriod(p);
        }
      });
    });
  }

  return {
    init,
    render,
    setPeriod,
    getPeriod
  };
})();
