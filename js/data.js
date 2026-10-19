/* ============================================================
 * data.js — filter, agregasi, dan simulasi (murni, tanpa DOM)
 * Semua perhitungan dashboard terjadi di browser dari data
 * per responden yang sudah dihitung server (HasilHitung).
 * ============================================================ */
(function (root) {
  'use strict';

  const KELOMPOK = ['Pribadi BBM', 'Transportasi Umum', 'Ojol & Taksi', 'Kendaraan Listrik', 'Aktif', 'Tidak Spesifik'];
  const LIKERT = [
    { k: 0, kode: 'Q20', label: 'Mempertimbangkan dampak emisi saat memilih moda' },
    { k: 1, kode: 'Q21', label: 'Akses transportasi umum ke kampus mudah' },
    { k: 2, kode: 'Q22', label: 'Bersedia pindah ke moda rendah emisi' },
    { k: 3, kode: 'Q23', label: 'Mendukung shuttle kampus' },
    { k: 4, kode: 'Q24', label: 'Mendukung kebijakan parkir' },
    { k: 5, kode: 'Q25', label: 'Mendukung kebijakan WFH / kuliah daring sebagian' }
  ];

  /** Peta asumsi: faktor hanya dipakai bila Sumber terisi (sama dengan aturan server). */
  function petaAsumsi(asumsi) {
    const m = {};
    (asumsi || []).forEach(a => {
      m[a.m] = { k: a.k, b: a.b, ef: a.src ? a.ef : null, en: a.src ? a.en : null, mx: a.mx, pl: a.pl, src: a.src };
    });
    return m;
  }

  function terapkanFilter(rows, f) {
    return rows.filter(r =>
      (!f.g || r.g === f.g) &&
      (!f.st || r.st === f.st) &&
      (!f.fk || r.fk === f.fk) &&
      (!f.kl || String(r.kl) === String(f.kl)));
  }

  /** Apakah responden masuk hitung dampak untuk arah terpilih. */
  function masuk(r, arah) {
    if (arah === 'pergi') return r.okp;
    if (arah === 'pulang') return r.okl;
    return r.okp && r.okl;
  }
  function emisi(r, arah) {   // g CO2e / minggu
    if (arah === 'pergi') return r.ep || 0;
    if (arah === 'pulang') return r.el || 0;
    return (r.ep || 0) + (r.el || 0);
  }
  function energi(r, arah) {  // MJ / minggu
    if (arah === 'pergi') return r.np || 0;
    if (arah === 'pulang') return r.nl || 0;
    return (r.np || 0) + (r.nl || 0);
  }
  function arahList(arah) { return arah === 'pergi' ? ['p'] : arah === 'pulang' ? ['l'] : ['p', 'l']; }

  /** Sebaran kelompok moda utama. Arah total = dihitung per perjalanan (pergi + pulang). */
  function sebaranKelompok(rows, arah) {
    const c = {}; KELOMPOK.forEach(k => { c[k] = 0; });
    let n = 0;
    rows.forEach(r => arahList(arah).forEach(a => {
      const k = a === 'p' ? r.kgp : r.kgl;
      if (!k) return;
      c[k] = (c[k] || 0) + 1; n++;
    }));
    return { hitung: c, n: n, satuan: arah === 'total' ? 'perjalanan' : 'responden' };
  }

  /** Emisi & energi per leg dari data leg server; total per responden = jumlah leg. */
  function legEmisi(r, arah, peta) {
    const out = [];
    arahList(arah).forEach(a => {
      const ok = a === 'p' ? r.okp : r.okl;
      if (!ok) return;
      (a === 'p' ? r.lp : r.ll).forEach(l => {
        const as = peta[l[0]];
        if (!as || as.ef === null || l[1] === null) return;
        out.push({ moda: l[0], kelompok: as.k, km: l[1], pembagi: l[2],
          g: l[1] * r.h * as.ef / l[2], mj: l[1] * r.h * as.en / l[2] });
      });
    });
    return out;
  }

  function ringkas(rows, f, asumsi) {
    const arah = f.arah || 'total';
    const peta = petaAsumsi(asumsi);
    const inc = rows.filter(r => masuk(r, arah));
    const totG = inc.reduce((s, r) => s + emisi(r, arah), 0);
    const totMJ = inc.reduce((s, r) => s + energi(r, arah), 0);
    const perKel = {}; KELOMPOK.forEach(k => { perKel[k] = { g: 0, mj: 0 }; });
    inc.forEach(r => legEmisi(r, arah, peta).forEach(l => {
      perKel[l.kelompok] = perKel[l.kelompok] || { g: 0, mj: 0 };
      perKel[l.kelompok].g += l.g; perKel[l.kelompok].mj += l.mj;
    }));
    const alasan = {};
    rows.filter(r => !masuk(r, arah)).forEach(r => {
      const unik = {};
      (r.ak || 'Lainnya').split('; ').forEach(a => { unik[a.replace(/:.*$/, '')] = 1; });
      Object.keys(unik).forEach(k => { alasan[k] = (alasan[k] || 0) + 1; });
    });
    return {
      n: rows.length, nMasuk: inc.length, nKecuali: rows.length - inc.length,
      totalKg: totG / 1000, rataKg: inc.length ? totG / 1000 / inc.length : null,
      totalMJ: totMJ, rataMJ: inc.length ? totMJ / inc.length : null,
      perKelompok: perKel, alasan: alasan
    };
  }

  /** Agregat emisi per dimensi (status/fakultas/klaster). */
  function perDimensi(rows, arah, kunciFn) {
    const m = {};
    rows.forEach(r => {
      const k = kunciFn(r);
      if (k === null || k === undefined || k === '') return;
      m[k] = m[k] || { n: 0, nMasuk: 0, g: 0, mj: 0 };
      m[k].n++;
      if (masuk(r, arah)) { m[k].nMasuk++; m[k].g += emisi(r, arah); m[k].mj += energi(r, arah); }
    });
    return Object.keys(m).map(k => Object.assign({ kunci: k }, m[k], {
      kg: m[k].g / 1000, rataKg: m[k].nMasuk ? m[k].g / 1000 / m[k].nMasuk : null,
      rataMJ: m[k].nMasuk ? m[k].mj / m[k].nMasuk : null
    }));
  }

  function hitungNilai(rows, fn) {
    const m = {};
    rows.forEach(r => { const v = fn(r); if (v === null || v === undefined || v === '') return; m[v] = (m[v] || 0) + 1; });
    return Object.keys(m).map(k => ({ kunci: k, n: m[k] })).sort((a, b) => b.n - a.n);
  }

  const BIN_JARAK = [[0, 5, '< 5 km'], [5, 10, '5–10 km'], [10, 20, '10–20 km'], [20, 30, '20–30 km'], [30, 50, '30–50 km'], [50, Infinity, '≥ 50 km']];
  function histogramJarak(rows) {
    const c = BIN_JARAK.map(b => ({ label: b[2], n: 0 }));
    let tanpa = 0;
    rows.forEach(r => {
      if (r.km === null || r.km === undefined) { tanpa++; return; }
      const i = BIN_JARAK.findIndex(b => r.km >= b[0] && r.km < b[1]);
      if (i >= 0) c[i].n++;
    });
    return { bins: c, tanpa: tanpa };
  }

  function rangkaianTeratas(rows, arah, n) {
    const m = {};
    rows.forEach(r => {
      const legs = arah === 'pulang' ? r.ll : r.lp;
      const kel = arah === 'pulang' ? r.kgl : r.kgp;
      const key = legs.map(l => l[0]).join(' → ');
      if (!key) return;
      m[key] = m[key] || { rantai: key, n: 0, km: 0, nKm: 0, kel: kel, status: {} };
      m[key].n++;
      if (r.km !== null) { m[key].km += r.km; m[key].nKm++; }
      m[key].status[r.st] = (m[key].status[r.st] || 0) + 1;
    });
    return Object.values(m).sort((a, b) => b.n - a.n).slice(0, n || 10).map(x => Object.assign(x, {
      rataKm: x.nKm ? x.km / x.nKm : null, jumlahLeg: x.rantai.split(' → ').length,
      statusDominan: Object.keys(x.status).sort((a, b) => x.status[b] - x.status[a])[0]
    }));
  }

  function distribusiLikert(rows) {
    return LIKERT.map(it => {
      const c = [0, 0, 0, 0, 0]; let n = 0;
      rows.forEach(r => { const v = r.lk[it.k]; if (v >= 1 && v <= 5) { c[v - 1]++; n++; } });
      return Object.assign({}, it, { hitung: c, n: n, setuju: n ? (c[3] + c[4]) / n : null });
    });
  }

  function hambatan(rows) {
    const m = {};
    rows.forEach(r => (r.hb || []).forEach(h => { const k = String(h).replace(/\.$/, ''); m[k] = (m[k] || 0) + 1; }));
    return Object.keys(m).map(k => ({ kunci: k, n: m[k], pct: rows.length ? m[k] / rows.length : 0 }))
      .sort((a, b) => b.n - a.n);
  }

  /**
   * Simulasi peralihan moda (FR-05) — nilai harapan.
   * asal: nama ModaBaku atau '*Pribadi BBM' (semua moda kelompok itu)
   * tujuan: nama ModaBaku atau '*Padanan listrik'
   * Selisih = p × Σ leg asal [km × hari × (EF_asal/pembagi − EF_tujuan/pembagi_tujuan)]
   */
  function simulasi(rows, f, asumsi, asal, tujuan, p) {
    const arah = f.arah || 'total';
    const peta = petaAsumsi(asumsi);
    const cocokAsal = m => asal.charAt(0) === '*' ? (peta[m] && peta[m].k === asal.slice(1)) : m === asal;
    const inc = rows.filter(r => masuk(r, arah));
    let baseG = 0, baseMJ = 0, potG = 0, potMJ = 0, tanpaTujuan = 0;
    const pemakai = new Set();
    const perStatus = {};
    inc.forEach(r => {
      const g0 = emisi(r, arah), mj0 = energi(r, arah);
      baseG += g0; baseMJ += mj0;
      let dg = 0, dmj = 0;
      arahList(arah).forEach(a => {
        (a === 'p' ? r.lp : r.ll).forEach(l => {
          if (!cocokAsal(l[0])) return;
          const as = peta[l[0]];
          const tj = tujuan === '*Padanan listrik' ? (as && as.pl) : tujuan;
          const at = peta[tj];
          if (!as || as.ef === null) return;
          pemakai.add(r.id);
          if (!at || at.ef === null) { tanpaTujuan++; return; }
          const pembagiT = at.b === 'kendaraan-km' ? l[2] : 1;
          dg += l[1] * r.h * (as.ef / l[2] - at.ef / pembagiT);
          dmj += l[1] * r.h * (as.en / l[2] - at.en / pembagiT);
        });
      });
      potG += dg; potMJ += dmj;
      const s = perStatus[r.st] = perStatus[r.st] || { base: 0, pot: 0, n: 0 };
      s.base += g0; s.pot += dg; s.n++;
    });
    // Garis acuan: % pemakai moda asal yang setuju/sangat setuju bersedia pindah (Q22 skor 4-5)
    const grup = rows.filter(r => pemakai.has(r.id));
    const nJawab = grup.filter(r => r.lk[2] >= 1).length;
    const bersedia = grup.filter(r => r.lk[2] >= 4).length;
    const pp = p / 100;
    return {
      nPemakai: pemakai.size, acuan: nJawab ? bersedia / nJawab : null, nAcuan: nJawab,
      baselineKg: baseG / 1000, sesudahKg: (baseG - pp * potG) / 1000, selisihKg: pp * potG / 1000,
      baselineMJ: baseMJ, sesudahMJ: baseMJ - pp * potMJ, selisihMJ: pp * potMJ,
      persen: baseG ? pp * potG / baseG : null, persenMJ: baseMJ ? pp * potMJ / baseMJ : null,
      perkiraanBeralih: Math.round(pemakai.size * pp), legTanpaTujuan: tanpaTujuan,
      perStatus: Object.keys(perStatus).map(k => ({ status: k, n: perStatus[k].n,
        baseKg: perStatus[k].base / 1000, sesudahKg: (perStatus[k].base - pp * perStatus[k].pot) / 1000 }))
    };
  }

  const api = { KELOMPOK, LIKERT, BIN_JARAK, petaAsumsi, terapkanFilter, masuk, emisi, energi, sebaranKelompok,
    legEmisi, ringkas, perDimensi, hitungNilai, histogramJarak, rangkaianTeratas, distribusiLikert, hambatan, simulasi };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Data = api;
})(this);
