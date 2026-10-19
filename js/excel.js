/* ============================================================
 * excel.js — membaca & membuat berkas Excel di browser (SheetJS)
 * PRIVASI: kolom Q1 (nama), Q3 (NIM/NIP), Q4 (unit), Q7 (email)
 * dibaca hanya di browser dan TIDAK PERNAH dikirim ke server.
 * Email dipakai sesaat untuk menandai pengisian ganda.
 * ============================================================ */
(function (root) {
  'use strict';
  const X = () => root.XLSX || (typeof XLSX !== 'undefined' ? XLSX : null);

  const KOLOM_RESPONDEN = ['NoAsli', 'StatusCivitas', 'Fakultas', 'ProgramStudi', 'FrekuensiAsli', 'AsalAsli',
    'ModaPergi1', 'ModaPergi2', 'ModaPergi3', 'ModaPergi4', 'ModaPergi5', 'BerangkatSendiri', 'PenumpangPergiAsli',
    'RuteSama', 'ModaPulang1', 'ModaPulang2', 'ModaPulang3', 'ModaPulang4', 'ModaPulang5', 'PulangSendiri',
    'PenumpangPulangAsli', 'PerjalananTambahan', 'PernahTransum', 'Hambatan1', 'Hambatan2', 'Hambatan3', 'Hambatan4',
    'P_Emisi', 'P_AksesTransum', 'P_PindahModa', 'P_Shuttle', 'P_Parkir', 'P_WFH', 'FlagEmailDuplikat'];

  // Pemetaan kode pertanyaan (header sheet Olahan) → kolom aplikasi (PRD 4.3)
  const PETA_Q = { 2: 'StatusCivitas', 5: 'Fakultas', 6: 'ProgramStudi', 8: 'FrekuensiAsli', 9: 'AsalAsli',
    11: 'BerangkatSendiri', 12: 'PenumpangPergiAsli', 13: 'RuteSama', 15: 'PulangSendiri', 16: 'PenumpangPulangAsli',
    17: 'PerjalananTambahan', 18: 'PernahTransum', 20: 'P_Emisi', 21: 'P_AksesTransum', 22: 'P_PindahModa',
    23: 'P_Shuttle', 24: 'P_Parkir', 25: 'P_WFH' };
  const MULTI_Q = { 10: ['ModaPergi', 5], 14: ['ModaPulang', 5], 19: ['Hambatan', 4] };
  const Q_IDENTITAS = { 1: 'Q1 (nama)', 3: 'Q3 (NIM/NIP)', 4: 'Q4 (unit)', 7: 'Q7 (email)' };

  const HEADER_TABEL = {
    TabelJarak: ['Wilayah', 'JarakKm', 'Keyakinan', 'Status', 'Sumber', 'Catatan'],
    KamusWilayah: ['AsalAsli', 'Wilayah', 'KeyakinanPemetaan'],
    AsumsiEmisi: ['ModaBaku', 'Kelompok', 'BasisFaktor', 'FaktorEmisi_gCO2e', 'FaktorEnergi_MJ', 'MaksPenumpang',
      'PadananListrik', 'Sumber', 'Catatan']
  };

  function bacaWorkbook(arrayBuffer) {
    return X().read(arrayBuffer, { type: 'array', cellDates: true });
  }
  function aoa(ws) { return X().utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: true }); }
  const teks = v => (v === null || v === undefined) ? '' : String(v).trim();
  const cariSheet = (wb, re) => wb.SheetNames.find(n => re.test(n.trim()));

  /** Nilai sel kosong/placeholder ("0" moda kosong, "—" Likert kosong) dijadikan ''. */
  function bersih(v, kolom) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString();
    let s = typeof v === 'string' ? v.replace(/ /g, ' ').trim() : v;
    if (s === '—' || s === '-' && /^P_/.test(kolom)) return '';
    if (/^(ModaPergi|ModaPulang|Hambatan)/.test(kolom) && (s === 0 || s === '0')) return '';
    return s;
  }

  /**
   * Responden: format sheet "Olahan" (header No., Q1…Q25) atau template kolom aplikasi.
   * Mengembalikan { rows, info } — rows sudah tanpa identitas.
   */
  function parseResponden(wb, namaSheet) {
    const nama = namaSheet || cariSheet(wb, /^olahan$/i) || cariSheet(wb, /^responden$/i) || wb.SheetNames[0];
    const data = aoa(wb.Sheets[nama]);
    let hIdx = data.findIndex(r => r.some(c => /^Q2$/i.test(teks(c))) || r.some(c => teks(c) === 'StatusCivitas'));
    if (hIdx < 0) throw new Error('Baris header tidak ditemukan di sheet "' + nama + '". Pastikan ada kolom Q2…Q25 (format Olahan) atau StatusCivitas (template).');
    const header = data[hIdx].map(teks);
    const peta = {};          // indeks kolom → nama kolom aplikasi
    let idxEmail = -1;
    const dibuang = [];
    const kanonik = header.indexOf('StatusCivitas') >= 0;
    if (kanonik) {
      header.forEach((h, i) => { if (KOLOM_RESPONDEN.indexOf(h) >= 0) peta[i] = h; });
    } else {
      const multiCount = {};
      header.forEach((h, i) => {
        if (/^no\.?$/i.test(h) || /^noasli$/i.test(h)) { peta[i] = 'NoAsli'; return; }
        const m = h.match(/^Q(\d+)\b/i);
        if (!m) return;
        const q = Number(m[1]);
        if (Q_IDENTITAS[q]) { if (dibuang.indexOf(Q_IDENTITAS[q]) < 0) dibuang.push(Q_IDENTITAS[q]); if (q === 7) idxEmail = i; return; }
        if (MULTI_Q[q]) {
          multiCount[q] = (multiCount[q] || 0) + 1;
          if (multiCount[q] <= MULTI_Q[q][1]) peta[i] = MULTI_Q[q][0] + multiCount[q];
          return;
        }
        if (PETA_Q[q] && Object.values(peta).indexOf(PETA_Q[q]) < 0) peta[i] = PETA_Q[q];
      });
    }
    const wajib = ['NoAsli', 'StatusCivitas', 'Fakultas', 'FrekuensiAsli', 'AsalAsli', 'ModaPergi1', 'ModaPulang1'];
    const ada = Object.values(peta);
    const hilang = wajib.filter(k => ada.indexOf(k) < 0);
    if (hilang.length) throw new Error('Kolom wajib tidak ditemukan: ' + hilang.join(', '));

    const baris = data.slice(hIdx + 1).filter(r => {
      const iNo = Object.keys(peta).find(i => peta[i] === 'NoAsli');
      return teks(r[iNo]) !== '';
    });
    // Tandai email ganda (email tidak ikut dikirim)
    const hitungEmail = {};
    if (idxEmail >= 0) baris.forEach(r => { const e = teks(r[idxEmail]).toLowerCase(); if (e) hitungEmail[e] = (hitungEmail[e] || 0) + 1; });
    let nDup = 0;
    const rows = baris.map(r => {
      const o = {};
      KOLOM_RESPONDEN.forEach(k => { o[k] = ''; });
      Object.keys(peta).forEach(i => { o[peta[i]] = bersih(r[i], peta[i]); });
      if (idxEmail >= 0) {
        const e = teks(r[idxEmail]).toLowerCase();
        o.FlagEmailDuplikat = e && hitungEmail[e] > 1 ? 'Ya' : 'Tidak';
        if (o.FlagEmailDuplikat === 'Ya') nDup++;
      } else if (!kanonik) o.FlagEmailDuplikat = 'Tidak';
      return o;
    });
    return { rows: rows, info: { sheet: nama, jumlah: rows.length, kolomDibuang: dibuang, emailGanda: nDup, format: kanonik ? 'Template aplikasi' : 'Olahan (Q1–Q25)' } };
  }

  /** Clustering: ringkasan klaster + klaster per responden (sheet "Clustering"). */
  function parseClustering(wb) {
    const nama = cariSheet(wb, /^clustering$/i) || wb.SheetNames.find(n => /cluster|klaster/i.test(n) &&
      aoa(wb.Sheets[n]).some(r => /ringkasan klaster/i.test(teks(r[0]))));
    if (!nama) return null;
    const d = aoa(wb.Sheets[nama]);
    const iRing = d.findIndex(r => /^ringkasan klaster/i.test(teks(r[0])));
    const iResp = d.findIndex(r => /^data klaster per responden/i.test(teks(r[0])));
    const meta = d.slice(0, iRing < 0 ? 4 : iRing).map(r => teks(r[0])).filter(Boolean);
    const ringkasan = [];
    if (iRing >= 0) {
      for (let i = iRing + 2; i < d.length; i++) {
        const r = d[i];
        if (!teks(r[0]) || /^total/i.test(teks(r[0]))) break;
        ringkasan.push({ klaster: Number(r[0]), jumlah: Number(r[1]), persen: Number(r[2]),
          q8: teks(r[3]), pergi: teks(r[4]), pulang: teks(r[5]), q17: teks(r[6]) });
      }
    }
    const responden = [];
    if (iResp >= 0) {
      const h = d[iResp + 1].map(teks);
      const ix = re => h.findIndex(x => re.test(x));
      const c = { no: ix(/^no/i), q8: ix(/^Q8/i), pergi: ix(/^Q10/i), pulang: ix(/^Q14/i), q17: ix(/^Q17/i),
        kl: ix(/^klaster/i), kel: ix(/^kelompok/i) };
      for (let i = iResp + 2; i < d.length; i++) {
        const r = d[i];
        if (teks(r[c.no]) === '' || isNaN(Number(r[c.no]))) continue;
        responden.push({ NoAsli: Number(r[c.no]), q8: teks(r[c.q8]), pergi: teks(r[c.pergi]), pulang: teks(r[c.pulang]),
          q17: teks(r[c.q17]), klaster: Number(r[c.kl]), kelompok: c.kel >= 0 ? teks(r[c.kel]) : '' });
      }
    }
    // Label klaster = nilai Kelompok terbanyak di klaster tsb.
    ringkasan.forEach(k => {
      const m = {};
      responden.filter(r => r.klaster === k.klaster).forEach(r => { m[r.kelompok] = (m[r.kelompok] || 0) + 1; });
      k.label = Object.keys(m).sort((a, b) => m[b] - m[a])[0] || '';
    });
    const catatan = meta.find(m => /eksploratif/i.test(m)) || 'Klaster bersifat eksploratif.';
    return { sheet: nama, meta: meta, catatan: catatan, ringkasan: ringkasan, responden: responden };
  }

  /** Uji Hubungan: blok Chi-Square (tabel amatan, harapan, ringkasan) dan tabel korelasi Spearman. */
  function parseUji(wb) {
    const nama = cariSheet(wb, /uji hubungan/i) || cariSheet(wb, /^uji/i);
    if (!nama) return [];
    const d = aoa(wb.Sheets[nama]);
    const out = [];
    for (let i = 0; i < d.length; i++) {
      const a = teks(d[i][0]);
      if (/^chi-?square\s*:/i.test(a)) {
        const variabel = a.replace(/^chi-?square\s*:\s*/i, '');
        const h = d[i + 1] || [];
        let kolomEnd = h.findIndex((c, j) => j > 0 && teks(c) === '');
        if (kolomEnd < 0) kolomEnd = h.length;
        const kolom = h.slice(1, kolomEnd).map(teks);
        const iHar = kolomEnd + 1;  // tabel harapan dimulai setelah kolom kosong
        const baris = [], harapan = [];
        let j = i + 2;
        for (; j < d.length; j++) {
          const r = d[j];
          const lab = teks(r[0]);
          if (!lab) break;
          baris.push({ label: lab, nilai: r.slice(1, kolomEnd).map(Number) });
          if (!/^total/i.test(lab) && teks(r[iHar]) === lab) harapan.push({ label: lab, nilai: r.slice(iHar + 1, iHar + 1 + kolom.length).map(Number) });
          if (/^total/i.test(lab)) break;
        }
        // cari blok "Ringkasan …" setelahnya
        const ring = {};
        let k = j + 1;
        while (k < d.length && !/^ringkasan/i.test(teks(d[k][0])) && !/^(chi-?square|korelasi)/i.test(teks(d[k][0]))) k++;
        if (k < d.length && /^ringkasan/i.test(teks(d[k][0]))) {
          for (k = k + 1; k < d.length && teks(d[k][0]); k++) ring[teks(d[k][0])] = d[k][1];
        }
        const get = re => { const key = Object.keys(ring).find(x => re.test(x)); return key ? ring[key] : ''; };
        const nSel = get(/^sel dengan frekuensi harapan/i), pctSel = get(/^persentase sel/i), minE = get(/^frekuensi harapan minimum/i);
        const asumsiTeks = get(/^asumsi/i);
        const asumsi = [asumsiTeks ? 'Asumsi: ' + asumsiTeks : '',
          nSel !== '' ? 'Sel harapan < 5: ' + nSel + (get(/^jumlah sel/i) !== '' ? ' dari ' + get(/^jumlah sel/i) : '') +
            (pctSel !== '' ? ' (' + (Number(pctSel) * 100).toFixed(1).replace('.', ',') + '%)' : '') : '',
          minE !== '' ? 'Harapan minimum: ' + Number(minE).toFixed(2).replace('.', ',') : ''].filter(Boolean).join(' • ');
        out.push({ jenis: 'ChiSquare', judul: 'Chi-Square: ' + variabel, variabel: variabel,
          stat: Number(get(/^nilai chi/i)), df: Number(get(/^derajat bebas/i)), p: get(/^p-?value/i), pb: '',
          asumsi: asumsi, kesimpulan: teks(get(/^kesimpulan/i)),
          data: { kolom: kolom, baris: baris, harapan: harapan, ringkasan: ring } });
        i = Math.max(i, k - 1);
      } else if (/^korelasi spearman/i.test(a)) {
        const judulBlok = a;
        const h = (d[i + 1] || []).map(teks);
        const ix = re => h.findIndex(x => re.test(x));
        const c = { pas: ix(/^pasangan/i), n: ix(/^n$/i), rho: ix(/rho/i), p: ix(/^p-?value(?!.*bonf)/i), pb: ix(/bonferroni/i), kes: ix(/^kesimpulan/i) };
        const awal = out.length;
        let j = i + 2;
        for (; j < d.length && teks(d[j][c.pas]); j++) {
          const r = d[j];
          out.push({ jenis: 'Spearman', judul: teks(r[c.pas]), variabel: judulBlok.replace(/^korelasi spearman\s*:\s*/i, ''),
            stat: Number(r[c.rho]), df: Number(r[c.n]), p: teks(r[c.p]), pb: c.pb >= 0 ? teks(r[c.pb]) : '',
            asumsi: '', kesimpulan: c.kes >= 0 ? teks(r[c.kes]) : '', data: { n: Number(r[c.n]) } });
        }
        // catatan di bawah tabel (mis. metode p-value)
        for (let k = j; k < Math.min(d.length, j + 3); k++) {
          const t = teks(d[k][0]);
          if (t) { for (let q = awal; q < out.length; q++) out[q].asumsi = t; break; }
        }
        i = j;
      }
    }
    return out;
  }

  /** Tabulasi silang: blok berjudul "A × B" diikuti header dan baris sampai "Total". */
  function parseTabulasi(wb) {
    const nama = cariSheet(wb, /tabulasi/i);
    if (!nama) return [];
    const d = aoa(wb.Sheets[nama]);
    const out = [];
    for (let i = 0; i < d.length; i++) {
      const a = teks(d[i][0]);
      if (!/×/.test(a) || !d[i + 1]) continue;
      const h = d[i + 1].map(teks);
      let end = h.findIndex((c, j) => j > 0 && c === ''); if (end < 0) end = h.length;
      const kolom = h.slice(1, end);
      const baris = [];
      let j = i + 2;
      for (; j < d.length && teks(d[j][0]); j++) {
        baris.push({ label: teks(d[j][0]), nilai: d[j].slice(1, end).map(Number) });
        if (/^total/i.test(teks(d[j][0]))) break;
      }
      let catatan = '';
      for (let k = j + 1; k < Math.min(d.length, j + 4); k++) { const t = teks(d[k][0]); if (t && !/×/.test(t)) { catatan = t; break; } if (/×/.test(t)) break; }
      out.push({ judul: a, kolom: kolom, baris: baris, catatan: catatan });
      i = j;
    }
    return out;
  }

  function parseAnalisis(wb) {
    const klaster = parseClustering(wb);
    const uji = parseUji(wb);
    const tabulasi = parseTabulasi(wb);
    if (!klaster && !uji.length) throw new Error('Sheet "Clustering" atau "Uji Hubungan" tidak ditemukan di berkas ini.');
    return { klaster: klaster || { meta: [], ringkasan: [], responden: [] }, uji: uji, tabulasi: tabulasi };
  }

  /** Tabel asumsi (TabelJarak, KamusWilayah, AsumsiEmisi): baris pertama = header kolom aplikasi. */
  function parseTabel(wb, jenis) {
    const nama = cariSheet(wb, new RegExp('^' + jenis + '$', 'i')) || wb.SheetNames[0];
    const d = aoa(wb.Sheets[nama]);
    const hIdx = d.findIndex(r => r.map(teks).indexOf(HEADER_TABEL[jenis][0]) >= 0);
    if (hIdx < 0) throw new Error('Header "' + HEADER_TABEL[jenis][0] + '" tidak ditemukan. Gunakan template.');
    const h = d[hIdx].map(teks);
    const rows = d.slice(hIdx + 1).filter(r => teks(r[h.indexOf(HEADER_TABEL[jenis][0])]) !== '').map(r => {
      const o = {}; HEADER_TABEL[jenis].forEach(k => { const i = h.indexOf(k); o[k] = i >= 0 ? bersih(r[i], k) : ''; }); return o;
    });
    return { rows: rows, info: { sheet: nama, jumlah: rows.length } };
  }

  /** Template kosong untuk diunduh. */
  function buatTemplate(jenis) {
    const XL = X();
    const wb = XL.utils.book_new();
    if (jenis === 'Responden') {
      const h = ['No.', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10 (MODA UTAMA)', 'Q10 (moda kedua)',
        'Q10 (moda ketiga)', 'Q10 (moda keempat)', 'Q10 (moda kelima)', 'Q11', 'Q12', 'Q13', 'Q14 (MODA UTAMA)',
        'Q14 (moda kedua)', 'Q14 (moda ketiga)', 'Q14 (moda keempat)', 'Q14 (moda kelima)', 'Q15', 'Q16', 'Q17', 'Q18',
        'Q19 (Hambatan Utama)', 'Q19 (hambatan kedua)', 'Q19 (hambatan ketiga)', 'Q19 (hambatan keempat)',
        'Q20', 'Q21', 'Q22', 'Q23', 'Q24', 'Q25'];
      XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet([h]), 'Olahan');
      XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet([
        ['Petunjuk'], ['Isi sheet "Olahan" dengan format yang sama seperti Response_Olahan (satu baris per responden).'],
        ['Q1 (nama), Q3 (NIM/NIP), Q4 (unit), Q7 (email) dibaca hanya di browser dan tidak pernah dikirim ke server.'],
        ['Q7 dipakai untuk menandai pengisian ganda (flag EmailDuplikat).'],
        ['Q8, Q9, Q10, Q14 dicocokkan dengan KamusFrekuensi, KamusWilayah, dan KamusModa di Pengaturan Asumsi.'],
        ['Q20–Q25 berisi skor 1–5; "—" atau kosong dianggap tidak menjawab.']]), 'Petunjuk');
    } else if (jenis === 'AnalisisStatistik') {
      XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet([
        ['Clustering Pola Perjalanan'], ['Metode: k-modes, 3 klaster'], ['Variabel: Q8, Q10 moda utama, Q14 moda utama, Q17'],
        ['Klaster bersifat eksploratif.'], ['Ringkasan Klaster'],
        ['Klaster', 'Jumlah Responden', 'Persentase', 'Q8 terbanyak', 'Moda pergi utama', 'Moda pulang utama', 'Q17 terbanyak'],
        ['Total'], ['Data Klaster per Responden'], ['No.', 'Q8', 'Q10 Moda Utama', 'Q14 Moda Utama', 'Q17', 'Klaster', 'Kelompok']]), 'Clustering');
      XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet([
        ['Uji Hubungan'], [], ['Chi-Square: Q17 × Q2'], ['Pola perjalanan', 'Kategori 1', 'Kategori 2', 'Total', '', 'Pola perjalanan', 'Kategori 1', 'Kategori 2'],
        ['Total'], [], ['Ringkasan Q17 × Q2'], ['Nilai Chi-Square', ''], ['Derajat bebas', ''], ['p-value', ''],
        ['Frekuensi harapan minimum', ''], ['Sel dengan frekuensi harapan < 5', ''], ['Asumsi Chi-Square', ''], ['Kesimpulan', ''], [],
        ['Korelasi Spearman: Q20–Q25 dengan Q22'], ['Pasangan variabel', 'N', 'Spearman (rho)', 'p-value (aproks.)', 'p-value Bonferroni', 'Kesimpulan']]), 'Uji Hubungan');
      XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet([['Q17 × Q2: Judul tabulasi'], ['Pola perjalanan', 'Kolom 1', 'Kolom 2', 'Total'], ['Total']]), 'Tabulasi Silang');
    } else {
      XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet([HEADER_TABEL[jenis]]), jenis);
    }
    XL.writeFile(wb, 'Template_' + jenis + '.xlsx');
  }

  /** Tulis beberapa tabel (array of arrays) menjadi satu .xlsx dan unduh. */
  function unduhXlsx(namaFile, sheets) {
    const XL = X();
    const wb = XL.utils.book_new();
    sheets.forEach(s => {
      const ws = XL.utils.aoa_to_sheet(s.data);
      if (s.lebar) ws['!cols'] = s.lebar.map(w => ({ wch: w }));
      XL.utils.book_append_sheet(wb, ws, s.nama.slice(0, 31));
    });
    XL.writeFile(wb, namaFile);
  }

  const api = { bacaWorkbook, parseResponden, parseClustering, parseUji, parseTabulasi, parseAnalisis, parseTabel,
    buatTemplate, unduhXlsx, HEADER_TABEL, KOLOM_RESPONDEN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Excel = api;
})(this);
