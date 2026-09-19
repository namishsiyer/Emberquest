/* ===== analytics.js — Detailed Activity Performance & 7-Day Trend Chart ===== */
const ActivityAnalytics = (() => {
  let activeType = null;

  function open(type) {
    activeType = type;
    render();
    const modal = document.getElementById('modal-activity-details');
    if (modal) modal.classList.add('active');
  }

  function close() {
    const modal = document.getElementById('modal-activity-details');
    if (modal) modal.classList.remove('active');
    activeType = null;
  }

  function render() {
    if (!activeType) return;
    const data = calcActivityTrend(activeType);
    const def = data.def;

    const modalBody = document.getElementById('activity-details-content');
    if (!modalBody) return;

    // Determine status color palette
    let statusTheme = {
      color: '#2bd47d',
      bgGlow: 'rgba(43, 212, 125, 0.3)',
      chipBg: 'rgba(43, 212, 125, 0.15)',
      label: 'Improving',
      sign: '+'
    };

    if (data.status === 'yellow') {
      statusTheme = {
        color: '#facc15',
        bgGlow: 'rgba(250, 204, 21, 0.3)',
        chipBg: 'rgba(250, 204, 21, 0.15)',
        label: 'Stable / Moderate',
        sign: data.pctChange > 0 ? '+' : ''
      };
    } else if (data.status === 'red') {
      statusTheme = {
        color: '#ef4444',
        bgGlow: 'rgba(239, 68, 68, 0.3)',
        chipBg: 'rgba(239, 68, 68, 0.15)',
        label: 'Decreasing',
        sign: ''
      };
    }

    // Generate SVG Trend Chart
    const svgW = 460;
    const svgH = 200;
    const padL = 36;
    const padR = 24;
    const padT = 24;
    const padB = 40;
    const chartW = svgW - padL - padR;
    const chartH = svgH - padT - padB;

    const maxVal = Math.max(1, ...data.recentDays.map(d => d.val));
    const stepX = chartW / (data.recentDays.length - 1 || 1);

    const points = data.recentDays.map((d, i) => {
      const x = padL + i * stepX;
      const y = padT + chartH - (d.val / maxVal) * chartH;
      return { x, y, val: d.val, label: d.label, date: d.date };
    });

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)},${(padT + chartH).toFixed(1)} L ${points[0].x.toFixed(1)},${(padT + chartH).toFixed(1)} Z`;

    // SVG Bar columns behind line
    let barsHtml = '';
    const barWidth = 24;
    points.forEach(pt => {
      const bh = (pt.val / maxVal) * chartH;
      const by = padT + chartH - bh;
      barsHtml += `
        <rect x="${(pt.x - barWidth / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${barWidth}" height="${bh.toFixed(1)}"
              rx="4" fill="${statusTheme.color}" opacity="0.22" />
        <text x="${pt.x.toFixed(1)}" y="${(padT + chartH + 18).toFixed(1)}" text-anchor="middle"
              fill="#9ca3af" font-size="10" font-family="'Outfit', sans-serif">
          ${pt.label.split(',')[0]}
        </text>
        <text x="${pt.x.toFixed(1)}" y="${Math.max(14, pt.y - 8).toFixed(1)}" text-anchor="middle"
              fill="#fff" font-size="11" font-weight="700" font-family="'Outfit', sans-serif">
          ${trimNum(pt.val, def.dec || 0)}
        </text>
      `;
    });

    // Recent 7 entries log table
    let entriesHtml = '';
    if (data.recentEntries && data.recentEntries.length > 0) {
      entriesHtml = data.recentEntries.map(e => `
        <tr class="log-entry-row">
          <td>${e.date}</td>
          <td><strong>+${e.val} ${def.unit}</strong></td>
          <td style="color: var(--orange-400); font-weight: 700;">+${e.xp} XP</td>
          <td>${e.note ? esc(e.note) : '—'}</td>
          <td style="text-align: right;">
            <button type="button" class="btn-delete-entry" data-id="${e.id}" title="Delete log">✕</button>
          </td>
        </tr>
      `).join('');
    } else {
      entriesHtml = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">No logged entries found yet.</td></tr>`;
    }

    const priorityBadge = `
      <div class="priority-selector-box">
        <label class="form-label" style="margin-bottom: 0;">Priority:</label>
        <select id="select-activity-priority" class="priority-select priority-${data.priority}">
          <option value="high" ${data.priority === 'high' ? 'selected' : ''}>🔥 High (1.35x XP)</option>
          <option value="med" ${data.priority === 'med' ? 'selected' : ''}>⚡ Medium (1.0x XP)</option>
          <option value="low" ${data.priority === 'low' ? 'selected' : ''}>🌱 Low (0.8x XP)</option>
        </select>
      </div>
    `;

    const customDeleteBtn = def.isCustom ? `
      <button type="button" id="btn-delete-custom-act" class="chip-btn" style="color: var(--red-danger); border-color: rgba(239, 68, 68, 0.4);">
        🗑️ Remove Activity
      </button>
    ` : '';

    modalBody.innerHTML = `
      <div class="act-detail-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="act-ico" style="font-size: 28px; width: 48px; height: 48px;">${def.ico}</div>
          <div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: #fff;">${def.label}</h3>
            <div style="font-size: 12px; color: var(--text-dim);">Unit: ${def.unit || 'units'} &bull; Step: +${def.step}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          ${priorityBadge}
          ${customDeleteBtn}
        </div>
      </div>

      <!-- Trend Stat Chips -->
      <div class="act-metrics-grid">
        <div class="metric-card">
          <div class="metric-lbl">7-Day Trend</div>
          <div class="metric-val" style="color: ${statusTheme.color};">
            ${statusTheme.sign}${data.pctChange}%
          </div>
          <div class="metric-sub" style="color: ${statusTheme.color};">${statusTheme.label}</div>
        </div>

        <div class="metric-card">
          <div class="metric-lbl">7-Day Total</div>
          <div class="metric-val">${trimNum(data.currTotal, def.dec || 0)} <span style="font-size: 13px; color: var(--text-dim);">${def.unit}</span></div>
          <div class="metric-sub">Prev 7d: ${trimNum(data.prevTotal, def.dec || 0)} ${def.unit}</div>
        </div>

        <div class="metric-card">
          <div class="metric-lbl">Daily Average</div>
          <div class="metric-val">${data.currAvg} <span style="font-size: 13px; color: var(--text-dim);">${def.unit}/d</span></div>
          <div class="metric-sub">Best: ${trimNum(data.bestDay, def.dec || 0)} ${def.unit}</div>
        </div>
      </div>

      <!-- Trend SVG Chart -->
      <div class="trend-chart-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
            7-Day Performance Curve
          </span>
          <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${statusTheme.chipBg}; color: ${statusTheme.color};">
            ${statusTheme.label}
          </span>
        </div>

        <div class="svg-container">
          <svg viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; overflow: visible;">
            <defs>
              <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${statusTheme.color}" stop-opacity="0.3" />
                <stop offset="100%" stop-color="${statusTheme.color}" stop-opacity="0.0" />
              </linearGradient>
              <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Grid horizontal baseline -->
            <line x1="${padL}" y1="${padT + chartH}" x2="${svgW - padR}" y2="${padT + chartH}" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
            <line x1="${padL}" y1="${padT + chartH / 2}" x2="${svgW - padR}" y2="${padT + chartH / 2}" stroke="rgba(255, 255, 255, 0.05)" stroke-dasharray="3,3" stroke-width="1" />

            <!-- Bars -->
            ${barsHtml}

            <!-- Area Fill -->
            <path d="${areaD}" fill="url(#trend-grad)" />

            <!-- Smooth Trend Line -->
            <path d="${pathD}" fill="none" stroke="${statusTheme.color}" stroke-width="3" filter="url(#glow-filter)" stroke-linecap="round" stroke-linejoin="round" />

            <!-- Point Dots -->
            ${points.map(pt => `
              <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4.5" fill="${statusTheme.color}" stroke="#fff" stroke-width="1.5" />
            `).join('')}
          </svg>
        </div>
      </div>

      <!-- Recent 7 Logs Table -->
      <div style="margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 13px; font-weight: 700; color: #fff;">Recent Logged Sessions</span>
          <span style="font-size: 11px; color: var(--text-muted);">(Last 7 entries)</span>
        </div>
        <div style="max-height: 180px; overflow-y: auto;">
          <table class="recent-logs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>XP</th>
                <th>Note</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${entriesHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Attach Priority Change Listener
    const selectPriority = document.getElementById('select-activity-priority');
    if (selectPriority) {
      selectPriority.addEventListener('change', (e) => {
        setActivityPriority(activeType, e.target.value);
        AudioFX.click();
        render();
        if (window.renderActivities) window.renderActivities();
      });
    }

    // Attach Custom Activity Delete Listener
    const deleteCustomBtn = document.getElementById('btn-delete-custom-act');
    if (deleteCustomBtn) {
      deleteCustomBtn.addEventListener('click', () => {
        if (confirm(`Remove "${def.label}" from your activities?`)) {
          deleteCustomActivity(activeType);
          close();
          AudioFX.click();
          if (window.renderActivities) window.renderActivities();
        }
      });
    }

    // Attach Delete Entry Listeners
    modalBody.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteEntry(id);
        AudioFX.click();
        render();
        if (window.renderAll) window.renderAll();
      });
    });
  }

  return {
    open,
    close,
    render
  };
})();
