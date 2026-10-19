/* ============================================================
 * app.js — inisialisasi, login, navigasi (hash), filter global
 * ============================================================ */
const App = (function () {
  'use strict';
  const { $, $$, esc, fmtNum, toast, loading, singkatStatus } = U;

  const state = {
    boot: null, page: 'beranda',
    f: { g: '', st: '', fk: '', arah: 'total', kl: '' },
    satuan: 'total', statTab: 'klaster',
    sim: { asal: '*Pribadi BBM', tujuan: '*Padanan listrik', p: 20 },
    tabel: { q: '', kel: '', kual: '', hitung: '', sort: 'id', dir: 1, hal: 1 },
    unggah: { jenis: 'Responden', mode: 'Tambah', gel: 'G1' },
    asm: { data: null, tab: 'AsumsiEmisi', edits: {}, dirty: {}, cari: '' }
  };

  const HALAMAN = {
    beranda: ['Trisakti Green Mobility', 'Beranda ringkasan', () => Pages.beranda(), true],
    profil: ['Profil & Pola Perjalanan', 'Modul 01', () => Pages.profil(), true],
    dampak: ['Dampak Energi & Emisi', 'Modul 02', () => Pages.dampak(), true],
    simulasi: ['Simulasi Peralihan Moda', 'Modul 03', () => Pages.simulasi(), true],
    persepsi: ['Persepsi & Hambatan', 'Modul 04', () => Pages.persepsi(), true],
    statistik: ['Analisis Statistik', 'Klaster & uji hubungan', () => Pages.statistik(), 'gel'],
    tabel: ['Tabel Data', 'Modul 05 • Katalog responden', () => Pages.tabel(), true],
    unggah: ['Unggah Berkas', 'Administrasi', () => Admin.unggah(), false],
    pengaturan: ['Pengaturan Asumsi', 'Administrasi', () => Admin.pengaturan(), false],
    pengguna: ['Pengguna & Log', 'Administrasi', () => Admin.pengguna(), false]
  };

  // ---------------- Login ----------------
  function tampilLogin(pesan) {
    $('#app').classList.add('hidden');
    $('#login').classList.remove('hidden');
    $('#login-err').textContent = pesan || '';
    document.body.classList.remove('presentasi', 'nav-open');
    setTimeout(() => $('#login-email').focus(), 50);
  }

  async function onLogin(e) {
    e.preventDefault();
    const btn = $('#login-btn');
    btn.disabled = true; btn.textContent = 'Memeriksa…'; $('#login-err').textContent = '';
    try {
      await API.login($('#login-email').value.trim(), $('#login-kode').value);
      $('#login-kode').value = '';
      $('#login').classList.add('hidden');
      await muat(false);
    } catch (err) {
      $('#login-err').textContent = err.message;
    } finally {
      btn.disabled = false; btn.innerHTML = '<svg class="ic ic-sm"><use href="#i-lock"/></svg> Masuk';
    }
  }

  // ---------------- Data ----------------
  async function muat(segarkan) {
    loading(true, segarkan ? 'Memuat ulang data…' : 'Memuat dashboard…');
    try {
      state.boot = await API.call('bootstrap', { segarkan: !!segarkan });
      const u = state.boot.user;
      $('#sb-nama').textContent = u.nama || u.email;
      $('#sb-peran').textContent = u.peran + ' • ' + u.email;
      $('#sb-avatar').textContent = (u.nama || u.email).replace(/\b(dr|ir|prof|drs|hj)\.\s*/gi, '').trim().charAt(0).toUpperCase();
      $('#sb-status').textContent = 'Sheets: terkoneksi (' + fmtNum(state.boot.meta.n) + ' data)';
      // buang filter yang tidak lagi valid
      const g = state.boot.meta.gelombang;
      if (state.f.g && g.indexOf(state.f.g) < 0) state.f.g = '';
      $('#app').classList.remove('hidden');
      route();
    } catch (err) {
      if (!err.auth) {
        if (!state.boot) tampilLogin(err.message); else toast(err.message, 'error');
      }
    } finally { loading(false); }
  }

  // ---------------- Filter global ----------------
  function filterbar(mode) {
    const fb = $('#filterbar');
    if (!mode || !state.boot || !state.boot.rows.length) { fb.classList.add('hidden'); return; }
    const rows = state.boot.rows, f = state.f;
    const uniq = fn => Array.from(new Set(rows.map(fn).filter(v => v !== null && v !== '' && v !== undefined))).sort();
    const gels = state.boot.meta.gelombang;
    const opt = (arr, v, semua, lab) => `<option value="">${semua}</option>` + arr.map(x => `<option value="${esc(x)}" ${String(v) === String(x) ? 'selected' : ''}>${esc(lab ? lab(x) : x)}</option>`).join('');
    const kls = uniq(r => r.kl);
    const n = Data.terapkanFilter(rows, f).length;
    let html = '';
    if (gels.length > 1 || mode === 'gel') html += `<label>Gelombang<select data-f="g">${opt(gels, f.g, mode === 'gel' ? 'Pertama (' + gels[0] + ')' : 'Semua gelombang')}</select></label>`;
    if (mode !== 'gel') {
      html += `<label>Status civitas<select data-f="st">${opt(uniq(r => r.st), f.st, 'Semua status', singkatStatus)}</select></label>
        <label>Fakultas / unit<select data-f="fk">${opt(uniq(r => r.fk), f.fk, 'Semua fakultas')}</select></label>
        ${kls.length ? `<label>Klaster<select data-f="kl">${opt(kls, f.kl, 'Semua klaster', k => 'Klaster ' + k + Pages.klLabel('Klaster ' + k))}</select></label>` : ''}
        <label>Arah perjalanan<div class="seg" id="seg-arah">${['total', 'pergi', 'pulang'].map(a => `<button data-a="${a}" class="${f.arah === a ? 'on' : ''}">${a === 'total' ? 'Pergi + Pulang' : a === 'pergi' ? 'Pergi' : 'Pulang'}</button>`).join('')}</div></label>
        <div class="fb-info"><b>${fmtNum(n)}</b> dari ${fmtNum(rows.length)} responden ${(f.st || f.fk || f.kl || f.g) ? '<button class="btn sm ghost no-print" id="fb-reset">Reset filter</button>' : ''}</div>`;
    }
    fb.innerHTML = html;
    fb.classList.toggle('hidden', !html);
    $$('#filterbar select').forEach(s => s.onchange = () => { state.f[s.dataset.f] = s.value; state.tabel.hal = 1; render(); });
    $$('#seg-arah button').forEach(b => b.onclick = () => { state.f.arah = b.dataset.a; render(); });
    const r = $('#fb-reset'); if (r) r.onclick = () => { Object.assign(state.f, { g: '', st: '', fk: '', kl: '' }); render(); };
  }

  // ---------------- Render ----------------
  function route() {
    const h = (location.hash || '#beranda').slice(1);
    state.page = HALAMAN[h] ? h : 'beranda';
    render();
  }

  function render() {
    if (!state.boot) return;
    const def = HALAMAN[state.page];
    Charts.reset();
    $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.page === state.page));
    $('#top-title').textContent = def[0];
    $('#top-sub').textContent = def[1] + ' • Kajian Dampak Transportasi Kampus FTSP';
    document.title = def[0] + ' — Trisakti Green Mobility';
    filterbar(def[3]);
    $('#print-head').innerHTML = `<b>${esc(def[0])}</b> — Dashboard Transportasi Hijau Universitas Trisakti • ${new Date().toLocaleString('id-ID')} • ${esc(Report.teksFilter())}<br>
      <i>Semua angka energi dan emisi adalah estimasi berbasis asumsi, bukan hasil pengukuran.</i>`;
    const scroll = window.scrollY;
    let p;
    try { p = def[2](); } catch (e) { console.error(e); p = { html: Pages.card('', '', Pages.kosong('Halaman gagal ditampilkan', esc(e.message))) }; }
    $('#view').innerHTML = p.html;
    try { if (p.after) p.after(); } catch (e) { console.error(e); toast('Sebagian grafik gagal digambar: ' + e.message, 'error'); }
    window.scrollTo(0, scroll);
    document.body.classList.remove('nav-open');
  }

  function drawer(html) {
    const ov = $('#overlay');
    ov.innerHTML = `<div class="drawer-bg"></div><aside class="drawer" role="dialog" aria-modal="true">${html}</aside>`;
    const tutup = () => { ov.innerHTML = ''; document.removeEventListener('keydown', esc_); };
    const esc_ = e => { if (e.key === 'Escape') tutup(); };
    ov.querySelector('.drawer-bg').onclick = tutup;
    $$('[data-close]', ov).forEach(b => b.onclick = tutup);
    document.addEventListener('keydown', esc_);
  }

  // ---------------- Init ----------------
  function init() {
    API.onAuthFail(msg => { state.boot = null; tampilLogin(msg); });
    $('#login-form').onsubmit = onLogin;
    $('#btn-logout').onclick = async () => { await API.logout(); state.boot = null; tampilLogin('Anda telah keluar.'); };
    $('#btn-refresh').onclick = () => muat(true);
    $('#btn-menu').onclick = () => document.body.classList.toggle('nav-open');
    $('#btn-present').onclick = () => {
      const on = document.body.classList.toggle('presentasi');
      if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setTimeout(render, 60);
    };
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && document.body.classList.contains('presentasi')) { document.body.classList.remove('presentasi'); setTimeout(render, 60); }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('presentasi') && !document.fullscreenElement) { document.body.classList.remove('presentasi'); render(); }
    });
    const menu = $('#export-menu');
    $('#btn-export').onclick = e => { e.stopPropagation(); menu.classList.toggle('hidden'); };
    document.addEventListener('click', () => menu.classList.add('hidden'));
    $$('#export-menu [data-exp]').forEach(b => b.onclick = () => {
      menu.classList.add('hidden');
      const t = b.dataset.exp;
      if (!state.boot) return;
      if (t === 'print') window.print();
      else if (t === 'xlsx') Report.excel();
      else Report.laporan(t);
    });
    let hashLama = location.hash;
    window.addEventListener('hashchange', () => {
      const dirty = Object.keys(state.asm.dirty).some(k => state.asm.dirty[k]);
      if (state.page === 'pengaturan' && dirty && location.hash !== '#pengaturan' &&
        !confirm('Ada perubahan asumsi yang belum disimpan. Tinggalkan halaman?')) { history.replaceState(null, '', hashLama); return; }
      hashLama = location.hash; route();
    });
    window.addEventListener('beforeunload', e => {
      if (Object.keys(state.asm.dirty).some(k => state.asm.dirty[k])) { e.preventDefault(); e.returnValue = ''; }
    });

    if (API.hasToken()) muat(false); else tampilLogin();
  }

  document.addEventListener('DOMContentLoaded', init);
  return { state, render, muat, drawer, route };
})();
