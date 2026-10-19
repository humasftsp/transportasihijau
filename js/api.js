/* ============================================================
 * api.js — komunikasi dengan Google Apps Script (fetch + JSON)
 * POST memakai Content-Type text/plain agar tidak memicu
 * CORS preflight yang ditolak Apps Script.
 * ============================================================ */
const API = (function () {
  'use strict';
  let token = U.store.get('tgm_token');
  let onAuthFail = () => {};

  async function call(action, data, extra) {
    if (!GAS_URL || /GANTI_DENGAN/.test(GAS_URL)) throw new Error('GAS_URL belum diisi di js/config.js.');
    let res;
    try {
      res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action, token: token, data: data || {} }, extra || {}))
      });
    } catch (e) {
      throw new Error('Tidak dapat menghubungi server. Periksa koneksi internet atau URL Web App.');
    }
    let json;
    try { json = await res.json(); } catch (e) {
      throw new Error('Respons server bukan JSON. Pastikan deployment Web App diatur "Anyone" dan URL berakhiran /exec.');
    }
    if (!json.success) {
      if (json.auth) { setToken(null); onAuthFail(json.message); }
      const err = new Error(json.message || 'Terjadi kesalahan di server.');
      err.auth = !!json.auth;
      throw err;
    }
    return json.data !== undefined ? json.data : json;
  }

  function setToken(t) { token = t; if (t) U.store.set('tgm_token', t); else U.store.del('tgm_token'); }

  return {
    call: call,
    login: async (email, kode) => { const d = await call('login', null, { email: email, kode: kode }); setToken(d.token); return d.user; },
    logout: async () => { try { await call('logout'); } catch (e) { } setToken(null); },
    hasToken: () => !!token,
    onAuthFail: fn => { onAuthFail = fn; }
  };
})();
