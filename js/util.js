/* ============================================================
 * util.js — format angka Indonesia, DOM, warna kelompok moda
 * ============================================================ */
const U = (function () {
  'use strict';
  const nf = {};
  const fmtNum = (v, d) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    d = d === undefined ? 0 : d;
    nf[d] = nf[d] || new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
    return nf[d].format(v);
  };
  const pct = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—' : fmtNum(v * 100, d === undefined ? 1 : d) + '%';
  /** Angka ringkas otomatis: 2 desimal di bawah 10, 1 di bawah 100, selebihnya 0. */
  const auto = v => (v === null || v === undefined || isNaN(v)) ? '—' :
    fmtNum(v, Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0);
  const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  const WARNA = {
    'Pribadi BBM': '#E4572E', 'Transportasi Umum': '#2F80ED', 'Ojol & Taksi': '#D4961A',
    'Kendaraan Listrik': '#2BB673', 'Aktif': '#7B61C9', 'Tidak Spesifik': '#8A94A0'
  };
  const LABEL_KEL = {
    'Pribadi BBM': 'Kendaraan Pribadi BBM', 'Transportasi Umum': 'Transportasi Umum', 'Ojol & Taksi': 'Ojol / Taksi',
    'Kendaraan Listrik': 'Kendaraan Listrik', 'Aktif': 'Jalan Kaki & Sepeda', 'Tidak Spesifik': 'Tidak Spesifik'
  };
  const warnaKel = k => WARNA[k] || '#8A94A0';
  const labelKel = k => LABEL_KEL[k] || k || '—';
  const modeChip = (teks, kelompok) => `<span class="mode-chip" style="--c:${warnaKel(kelompok)}">${esc(teks)}</span>`;
  // Warna fakultas/status/klaster: urutan tetap (tidak diputar ulang)
  const URUT = ['#0F5132', '#2F80ED', '#D4961A', '#7B61C9', '#E4572E', '#2BB673', '#00458e', '#8A94A0'];
  const STATUS_WARNA = { 'Mahasiswa': '#0F5132', 'Dosen': '#2F80ED', 'Tenaga Kependidikan (Tendik)': '#D4961A' };
  const singkatStatus = s => /tendik|kependidikan/i.test(s) ? 'Tendik' : s;
  const singkatFak = s => String(s || '').replace(/^Fakultas /, 'F. ');

  let toastT;
  function toast(msg, type) {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast show ' + (type || '');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), type === 'error' ? 7000 : 3500);
  }
  function loading(on, text) {
    $('#loading').classList.toggle('hidden', !on);
    if (text) $('#loading-text').textContent = text;
  }
  const tanggal = iso => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return String(iso);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const unduhBase64 = (b64, nama, mime) => {
    const bin = atob(b64); const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([buf], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  };
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { } }
  };
  return { fmtNum, pct, auto, esc, $, $$, icon, WARNA, warnaKel, labelKel, modeChip, URUT, STATUS_WARNA, singkatStatus,
    singkatFak, toast, loading, tanggal, unduhBase64, store };
})();
