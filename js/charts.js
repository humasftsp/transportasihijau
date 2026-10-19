/* ============================================================
 * charts.js — pembungkus Chart.js dengan gaya DESIGN.md
 * ============================================================ */
const Charts = (function () {
  'use strict';
  const aktif = [];
  const GRID = '#E2E8F0', TEKS = '#404942';

  const putih = { id: 'latarPutih', beforeDraw(c, a, o) {
    if (!o || !o.aktif) return;
    const x = c.ctx; x.save(); x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.restore();
  } };

  function siapkan() {
    if (!window.Chart || Chart.__tgm) return;
    Chart.__tgm = true;
    Chart.register(putih);
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = TEKS;
    Chart.defaults.borderColor = GRID;
    Chart.defaults.animation.duration = 250;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1F2933';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.elements.bar.borderRadius = 4;
    Chart.defaults.elements.bar.borderSkipped = 'start';
    Chart.defaults.datasets.bar.maxBarThickness = 30;
  }

  function reset() { while (aktif.length) { try { aktif.pop().destroy(); } catch (e) { } } }

  function make(id, cfg) {
    siapkan();
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el || !window.Chart) return null;
    const c = new Chart(el, cfg); aktif.push(c); return c;
  }

  const fmt = (v, unit, d) => U.fmtNum(v, d === undefined ? (Math.abs(v) < 10 && v % 1 ? 2 : Math.abs(v) < 100 && v % 1 ? 1 : 0) : d) + (unit ? ' ' + unit : '');

  /** Donat ≤ 5 irisan + 'lainnya' (DESIGN.md). */
  function donut(id, labels, values, colors, unit) {
    return make(id, { type: 'doughnut',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#fff', borderWidth: 2, hoverOffset: 4 }] },
      options: { cutout: '68%', plugins: { tooltip: { callbacks: { label: c => {
        const tot = c.dataset.data.reduce((a, b) => a + b, 0);
        return ' ' + c.label + ': ' + fmt(c.parsed, unit, 0) + ' (' + U.pct(tot ? c.parsed / tot : 0) + ')'; } } } } } });
  }

  /**
   * Batang. opsi: { horizontal, stacked, persen, unit, desimal, legend, sumbuJudul, maxLabel }
   * datasets: [{ label, data, color | colors }]
   */
  function bar(id, labels, datasets, o) {
    o = o || {};
    const h = !!o.horizontal;
    const valAxis = { beginAtZero: true, stacked: !!o.stacked, grid: { color: GRID }, border: { display: false },
      ticks: { maxTicksLimit: 7, maxRotation: 0, callback: v => o.persen ? v + '%' : o.tickFmt ? o.tickFmt(v) : U.fmtNum(v, Math.abs(v) < 10 && v % 1 ? 1 : 0) }, max: o.persen ? 100 : o.max,
      title: o.sumbuJudul ? { display: true, text: o.sumbuJudul, color: '#6B7570', font: { size: 11 } } : undefined };
    const catAxis = { stacked: !!o.stacked, grid: { display: false }, border: { color: GRID },
      ticks: { autoSkip: false, callback: function (v) { const l = this.getLabelForValue(v); const m = o.maxLabel || 34;
        return typeof l === 'string' && l.length > m ? l.slice(0, m - 1) + '…' : l; } } };
    return make(id, { type: 'bar',
      data: { labels: labels, datasets: datasets.map(d => ({ label: d.label, data: d.data,
        backgroundColor: d.colors || d.color || '#0F5132', borderColor: '#fff', borderWidth: o.stacked ? { right: h ? 2 : 0, top: h ? 0 : 2 } : 0,
        borderRadius: o.stacked ? 0 : 4, maxBarThickness: o.tebal || 30 })) },
      options: { indexAxis: h ? 'y' : 'x',
        scales: h ? { x: valAxis, y: catAxis } : { x: catAxis, y: valAxis },
        plugins: { legend: { display: !!o.legend, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } },
          tooltip: { callbacks: { title: it => it[0] ? (o.judulTooltip ? o.judulTooltip(it[0]) : it[0].label) : '',
            label: c => ' ' + (datasets.length > 1 || o.stacked ? c.dataset.label + ': ' : '') +
              (o.persen ? U.fmtNum(c.parsed[h ? 'x' : 'y'], 1) + '%' : fmt(c.parsed[h ? 'x' : 'y'], o.unit, o.desimal)) +
              (o.ekstraTooltip ? o.ekstraTooltip(c) : '') } } } } });
  }

  function scatter(id, datasets, o) {
    o = o || {};
    return make(id, { type: 'scatter',
      data: { datasets: datasets.map(d => ({ label: d.label, data: d.data, backgroundColor: d.color, borderColor: '#fff', borderWidth: 1.5,
        pointRadius: 4.5, pointHoverRadius: 7 })) },
      options: { scales: {
        x: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, title: { display: true, text: o.xJudul || '', color: '#6B7570', font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, title: { display: true, text: o.yJudul || '', color: '#6B7570', font: { size: 11 } },
          ticks: { callback: v => U.fmtNum(v, 0) } } },
        plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
          tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ' — ' + U.fmtNum(c.parsed.x, 1) + ' km, ' + U.fmtNum(c.parsed.y, 1) + ' kg CO₂e/minggu' +
            (c.raw && c.raw.id ? ' (' + c.raw.id + ')' : '') } } } } });
  }

  /** Render konfigurasi ke PNG base64 di kanvas tersembunyi (untuk laporan PDF/Word). */
  function gambar(builder, w, h) {
    siapkan();
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + w + 'px;height:' + h + 'px';
    const cv = document.createElement('canvas');
    wrap.appendChild(cv); document.body.appendChild(wrap);
    const lama = Chart.defaults.animation; Chart.defaults.animation = false;
    let c;
    try {
      c = builder(cv);
      if (!c) return null;
      c.options.plugins.latarPutih = { aktif: true };
      c.options.devicePixelRatio = 2; c.update('none');
      return c.toBase64Image('image/png', 1);
    } finally {
      Chart.defaults.animation = lama;
      if (c) { const i = aktif.indexOf(c); if (i >= 0) aktif.splice(i, 1); c.destroy(); }
      wrap.remove();
    }
  }

  return { reset, make, donut, bar, scatter, gambar, siapkan };
})();
