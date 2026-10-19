/* ============================================================
 * report.js — Ekspor laporan PDF/Word (via server) & Excel (browser)
 * Setiap berkas memuat judul, tanggal, filter aktif, dan catatan estimasi.
 * ============================================================ */
const Report = (function () {
  'use strict';
  const { fmtNum, pct, auto, labelKel, warnaKel, singkatStatus } = U;
  const S = () => App.state;
  const KEL = Pages.KEL5;

  function teksFilter() {
    const f = S().f;
    const bag = [];
    if (f.g) bag.push('Gelombang ' + f.g);
    bag.push(f.st ? 'Status: ' + f.st : 'Semua status');
    bag.push(f.fk ? 'Fakultas: ' + f.fk : 'Semua fakultas');
    bag.push('Arah: ' + Pages.ARAH_LABEL[f.arah]);
    if (f.kl) bag.push('Klaster ' + f.kl);
    return bag.join(' • ');
  }

  function bangunBagian() {
    const b = S().boot, f = S().f;
    const rows = Data.terapkanFilter(b.rows, f);
    const sk = Data.sebaranKelompok(rows, f.arah);
    const rg = Data.ringkas(rows, f, b.asumsi);
    const tot = sk.n || 1;
    const sec = [];
    const g = (fn, w, h) => { try { return Charts.gambar(fn, w || 1000, h || 420); } catch (e) { return null; } };

    sec.push({ judul: '1. Ringkasan angka kunci', teks: ['Sampel: ' + fmtNum(rows.length) + ' responden. ' + fmtNum(rg.nMasuk) + ' responden masuk hitung dampak; ' +
      fmtNum(rg.nKecuali) + ' dikecualikan.'],
      tabel: [['Indikator', 'Nilai'], ['Total responden', fmtNum(rows.length)],
        ...KEL.map(k => ['Kelompok moda utama: ' + labelKel(k), pct(sk.hitung[k] / tot) + ' (' + fmtNum(sk.hitung[k]) + ' ' + sk.satuan + ')']),
        ['Total estimasi emisi', auto(rg.totalKg) + ' kg CO2e/minggu'], ['Rata-rata emisi per responden', auto(rg.rataKg) + ' kg CO2e/minggu'],
        ['Total estimasi energi', auto(rg.totalMJ) + ' MJ/minggu'], ['Rata-rata energi per responden', auto(rg.rataMJ) + ' MJ/minggu'],
        ['Proyeksi tahunan (sampel)', auto(rg.totalKg * b.meta.mingguPerTahun / 1000) + ' ton CO2e (' + b.meta.mingguPerTahun + ' minggu)'],
        ['Responden dikecualikan', fmtNum(rg.nKecuali)]] });

    const kelD = KEL.filter(k => sk.hitung[k] > 0);
    sec.push({ judul: '2. Sebaran kelompok moda utama', teks: ['Moda utama = isian pertama Q10 (pergi) / Q14 (pulang). Arah: ' + Pages.ARAH_LABEL[f.arah] + '.'],
      gambar: g(cv => Charts.donut(cv, kelD.map(labelKel), kelD.map(k => sk.hitung[k]), kelD.map(warnaKel)), 760, 360),
      tabel: [['Kelompok moda', 'Jumlah', 'Persentase']].concat(KEL.map(k => [labelKel(k), fmtNum(sk.hitung[k]), pct(sk.hitung[k] / tot)])) });

    sec.push({ judul: '3. Estimasi emisi dan energi per kelompok moda', teks: ['Emisi tiap leg perjalanan dihitung ke kelompok modanya. Satuan per minggu (total sampel).'],
      gambar: g(cv => Charts.bar(cv, KEL.map(labelKel), [{ label: 'Emisi', data: KEL.map(k => rg.perKelompok[k].g / 1000), colors: KEL.map(warnaKel) }], { horizontal: true, unit: 'kg CO2e', sumbuJudul: 'kg CO2e per minggu' })),
      tabel: [['Kelompok moda', 'Emisi (kg CO2e/mgg)', '% emisi', 'Energi (MJ/mgg)']].concat(KEL.map(k => [labelKel(k), auto(rg.perKelompok[k].g / 1000),
        rg.totalKg ? pct(rg.perKelompok[k].g / 1000 / rg.totalKg) : '—', auto(rg.perKelompok[k].mj)])) });

    const perSt = Data.perDimensi(rows, f.arah, r => r.st);
    const perFk = Data.perDimensi(rows, f.arah, r => r.fk).sort((a, c) => c.kg - a.kg);
    sec.push({ judul: '4. Emisi per status civitas dan fakultas', teks: [],
      tabel: [['Kelompok', 'Dihitung / N', 'Total kg CO2e/mgg', 'Rata-rata kg/orang', 'Total MJ/mgg']]
        .concat(perSt.map(d => [d.kunci, d.nMasuk + ' / ' + d.n, auto(d.kg), auto(d.rataKg), auto(d.mj)]))
        .concat(perFk.map(d => [d.kunci, d.nMasuk + ' / ' + d.n, auto(d.kg), auto(d.rataKg), auto(d.mj)])) });

    const hist = Data.histogramJarak(rows);
    const top = Data.rangkaianTeratas(rows, f.arah === 'pulang' ? 'pulang' : 'pergi', 10);
    sec.push({ judul: '5. Profil dan pola perjalanan', teks: ['Histogram jarak estimasi satu arah ke kampus (' + hist.tanpa + ' responden tanpa jarak tidak ditampilkan).'],
      gambar: g(cv => Charts.bar(cv, hist.bins.map(x => x.label), [{ label: 'Responden', data: hist.bins.map(x => x.n), color: '#2F80ED' }], { unit: 'responden' }), 900, 340),
      tabel: [['No', 'Rangkaian moda terbanyak', 'Pengguna', '% responden']].concat(top.map((t, i) => [i + 1, t.rantai, t.n, pct(t.n / rows.length)])) });

    const lk = Data.distribusiLikert(rows);
    sec.push({ judul: '6. Persepsi civitas (skala 1–5)', teks: ['Persentase setuju = skor 4–5 terhadap jawaban yang terisi.'],
      gambar: g(cv => Charts.bar(cv, lk.map(l => l.kode + ' ' + l.label), Pages.LIK_LABEL.map((lab, i) => ({ label: lab, color: Pages.LIK_WARNA[i], data: lk.map(l => l.n ? l.hitung[i] / l.n * 100 : 0) })),
        { horizontal: true, stacked: true, persen: true, legend: true, maxLabel: 46 }), 1000, 420),
      tabel: [['Kode', 'Pernyataan', 'N', 'STS', 'TS', 'N', 'S', 'SS', '% setuju']].concat(lk.map(l => [l.kode, l.label, l.n].concat(l.hitung).concat([pct(l.setuju)]))) });

    const hb = Data.hambatan(rows);
    sec.push({ judul: '7. Hambatan memakai transportasi umum', teks: ['Maksimal 4 pilihan per responden; persentase terhadap seluruh responden terfilter.'],
      gambar: g(cv => Charts.bar(cv, hb.map(h => h.kunci), [{ label: 'Responden', data: hb.map(h => h.n), color: '#E4572E' }], { horizontal: true, unit: 'responden', maxLabel: 46 }), 1000, 420),
      tabel: [['Hambatan', 'Responden', '%']].concat(hb.map(h => [h.kunci, h.n, pct(h.pct)])) });

    const sim = S().sim; const sr = Data.simulasi(rows, f, b.asumsi, sim.asal, sim.tujuan, sim.p);
    sec.push({ judul: '8. Skenario simulasi peralihan moda (aktif saat ekspor)', teks: ['Metode nilai harapan; skenario tidak disimpan di server.'],
      tabel: [['Parameter / hasil', 'Nilai'], ['Moda asal', sim.asal.replace('*', 'Semua: ')], ['Moda tujuan', sim.tujuan.replace('*', '')], ['Persentase beralih (p)', sim.p + '%'],
        ['Acuan kesediaan (Q22 skor 4–5)', pct(sr.acuan)], ['Emisi baseline', auto(sr.baselineKg) + ' kg CO2e/mgg'], ['Emisi sesudah', auto(sr.sesudahKg) + ' kg CO2e/mgg'],
        ['Selisih', auto(sr.selisihKg) + ' kg CO2e/mgg (' + pct(sr.persen) + ')'], ['Energi baseline → sesudah', auto(sr.baselineMJ) + ' → ' + auto(sr.sesudahMJ) + ' MJ/mgg'],
        ['Perkiraan civitas beralih', fmtNum(sr.perkiraanBeralih) + ' dari ' + fmtNum(sr.nPemakai)]] });

    const gel = f.g || b.meta.gelombang[0];
    const uji = (b.analisis.uji || []).filter(u => u.g === gel);
    const meta = uji.find(u => u.jenis === 'KlasterMeta');
    if (uji.length) {
      const ring = (meta && meta.data && meta.data.ringkasan) || [];
      sec.push({ judul: '9. Analisis statistik (dari berkas tim peneliti)', teks: ['Ditampilkan apa adanya; tidak dihitung ulang oleh aplikasi. ' + (meta ? meta.kesimpulan : '')],
        tabel: [['Klaster', 'Jumlah', '%', 'Q8 terbanyak', 'Moda pergi', 'Moda pulang', 'Q17 terbanyak']].concat(ring.map(r => [r.klaster + (r.label ? ' — ' + r.label : ''), r.jumlah, pct(r.persen), r.q8, r.pergi, r.pulang, r.q17])) });
      sec.push({ judul: '9b. Uji hubungan', teks: [],
        tabel: [['Uji', 'Statistik', 'df / N', 'p-value', 'p Bonferroni', 'Asumsi', 'Kesimpulan (berkas)']].concat(uji.filter(u => u.jenis === 'ChiSquare' || u.jenis === 'Spearman')
          .map(u => [u.jenis === 'Spearman' ? 'Spearman ' + u.judul : u.judul, (u.jenis === 'Spearman' ? 'rho ' : 'χ² ') + fmtNum(Number(u.stat), 3), u.df, String(u.p), String(u.pb || '—'), u.asumsi, u.kesimpulan])) });
    }

    sec.push({ judul: '10. Responden yang dikecualikan dari hitung dampak', teks: [],
      tabel: [['Alasan', 'Responden']].concat(Object.keys(rg.alasan).map(k => [k, rg.alasan[k]])) });

    sec.push({ judul: 'Lampiran: asumsi aktif', teks: ['Versi asumsi: ' + (b.meta.versiAsumsi || '—') + '. Pembagian jarak multimoda: ' + b.meta.aturanPembagian +
      '. Minggu efektif/tahun: ' + b.meta.mingguPerTahun + '. Tabel jarak: ' + b.meta.jarakDraf + ' dari ' + b.meta.jarakTotal + ' wilayah masih berstatus DRAF.',
      'Rumus: emisi arah = jarak satu arah × hari/minggu × Σ[porsi jarak leg × faktor emisi moda leg ÷ pembagi okupansi]. Pembagi = 1 + penumpang untuk basis kendaraan-km; 1 untuk penumpang-km.'],
      tabel: [['Moda baku', 'Kelompok', 'Basis', 'g CO2e/km', 'MJ/km', 'Sumber']].concat(b.asumsi.map(a => [a.m, a.k, a.b, a.ef === null ? '—' : a.ef, a.en === null ? '—' : a.en, a.src || '(belum ada)'])) });
    return sec;
  }

  async function laporan(format) {
    U.loading(true, 'Menyusun laporan ' + format.toUpperCase() + '… (maks. ±30 detik)');
    try {
      const d = await API.call('exportDoc', { format: format, judul: 'Laporan Dashboard Transportasi Hijau Universitas Trisakti',
        filter: teksFilter(), sections: bangunBagian() });
      U.unduhBase64(d.base64, d.namaFile, d.mime);
      U.toast('Laporan diunduh: ' + d.namaFile, 'ok');
    } catch (e) { U.toast(e.message, 'error'); } finally { U.loading(false); }
  }

  function excel() {
    const b = S().boot, f = S().f;
    const rows = Data.terapkanFilter(b.rows, f);
    const peta = Data.petaAsumsi(b.asumsi);
    const rg = Data.ringkas(rows, f, b.asumsi);
    const sk = Data.sebaranKelompok(rows, f.arah);
    const now = new Date().toLocaleString('id-ID');
    const info = [['Laporan Dashboard Transportasi Hijau Universitas Trisakti'], ['Diekspor', now], ['Oleh', b.user.email], ['Filter aktif', teksFilter()],
      ['CATATAN', 'Semua angka energi dan emisi adalah estimasi berbasis asumsi (jarak per wilayah dan faktor emisi standar), bukan hasil pengukuran.'],
      ['Satuan', 'Emisi g/kg CO2e per minggu; energi MJ per minggu; jarak km satu arah.'], ['Versi asumsi', b.meta.versiAsumsi]];
    const ring = [['Kelompok moda', 'Jumlah (' + sk.satuan + ')', '%', 'Emisi kg CO2e/mgg', 'Energi MJ/mgg']]
      .concat(Data.KELOMPOK.map(k => [labelKel(k), sk.hitung[k] || 0, sk.n ? (sk.hitung[k] || 0) / sk.n : 0, (rg.perKelompok[k] || { g: 0 }).g / 1000, (rg.perKelompok[k] || { mj: 0 }).mj]))
      .concat([[], ['Dimensi', 'Kelompok', 'N', 'Dihitung', 'Total kg CO2e/mgg', 'Rata kg/orang', 'Total MJ/mgg']])
      .concat(Data.perDimensi(rows, f.arah, r => r.st).map(d => ['Status', d.kunci, d.n, d.nMasuk, d.kg, d.rataKg, d.mj]))
      .concat(Data.perDimensi(rows, f.arah, r => r.fk).map(d => ['Fakultas', d.kunci, d.n, d.nMasuk, d.kg, d.rataKg, d.mj]))
      .concat(Data.perDimensi(rows, f.arah, r => r.kl ? 'Klaster ' + r.kl : null).map(d => ['Klaster', d.kunci, d.n, d.nMasuk, d.kg, d.rataKg, d.mj]));
    const resp = [['ID', 'Gelombang', 'NoAsli', 'StatusCivitas', 'Fakultas', 'ProgramStudi', 'FrekuensiAsli', 'PerjalananTambahan', 'PernahTransum',
      'Hambatan', 'Q20', 'Q21', 'Q22', 'Q23', 'Q24', 'Q25', 'Klaster', 'Flag']]
      .concat(rows.map(r => [r.id, r.g, r.no, r.st, r.fk, r.ps, r.fq, r.pt, r.tr, r.hb.join('; ')].concat(r.lk).concat([r.kl || '', r.fl.join('; ')])));
    const hasil = [['ID', 'Wilayah', 'KeyakinanPemetaan', 'JarakKm', 'HariPerMinggu', 'RangkaianPergi', 'RangkaianPulang', 'KelompokUtamaPergi', 'KelompokUtamaPulang',
      'PenumpangPergiBersih', 'PenumpangPulangBersih', 'EmisiPergi_g', 'EmisiPulang_g', 'EmisiTotal_g', 'EnergiPergi_MJ', 'EnergiPulang_MJ', 'EnergiTotal_MJ', 'MasukPergi', 'MasukPulang', 'AlasanKecuali']]
      .concat(rows.map(r => [r.id, r.w, r.kp, r.km, r.h, r.lp.map(l => l[0]).join(' → '), r.ll.map(l => l[0]).join(' → '), r.kgp, r.kgl, r.pnp, r.pnl,
        r.okp ? r.ep : '', r.okl ? r.el : '', r.okp && r.okl ? r.ep + r.el : '', r.okp ? r.np : '', r.okl ? r.nl : '', r.okp && r.okl ? r.np + r.nl : '',
        r.okp ? 'Ya' : 'Tidak', r.okl ? 'Ya' : 'Tidak', r.ak]));
    const asumsi = [['ModaBaku', 'Kelompok', 'BasisFaktor', 'FaktorEmisi_gCO2e', 'FaktorEnergi_MJ', 'MaksPenumpang', 'PadananListrik', 'Sumber', 'Dipakai?']]
      .concat(b.asumsi.map(a => [a.m, a.k, a.b, a.ef, a.en, a.mx, a.pl, a.src, peta[a.m].ef !== null ? 'Ya' : 'Tidak (faktor/sumber kosong)']))
      .concat([[], ['Parameter', 'Nilai'], ['MingguPerTahun', b.meta.mingguPerTahun], ['AturanPembagianJarak', b.meta.aturanPembagian], ['JarakAktifKm', b.meta.jarakAktifKm],
        ['Wilayah jarak DRAF', b.meta.jarakDraf + ' dari ' + b.meta.jarakTotal]]);
    const sim = S().sim, sr = Data.simulasi(rows, f, b.asumsi, sim.asal, sim.tujuan, sim.p);
    const skn = [['Skenario simulasi (nilai harapan)'], ['Moda asal', sim.asal], ['Moda tujuan', sim.tujuan], ['p (%)', sim.p], ['Acuan kesediaan Q22', sr.acuan],
      ['Baseline kg CO2e/mgg', sr.baselineKg], ['Sesudah kg CO2e/mgg', sr.sesudahKg], ['Selisih kg CO2e/mgg', sr.selisihKg], ['Persen', sr.persen],
      ['Baseline MJ/mgg', sr.baselineMJ], ['Sesudah MJ/mgg', sr.sesudahMJ], ['Perkiraan beralih', sr.perkiraanBeralih], ['Pemakai moda asal', sr.nPemakai],
      [], ['Status', 'N', 'Baseline kg', 'Sesudah kg']].concat(sr.perStatus.map(s => [s.status, s.n, s.baseKg, s.sesudahKg]));
    const uji = (b.analisis.uji || []).filter(u => u.jenis !== 'Tabulasi' && u.jenis !== 'KlasterMeta');
    const an = [['Gelombang', 'Jenis', 'Judul', 'Statistik', 'df / N', 'p-value', 'p Bonferroni', 'Asumsi', 'Kesimpulan (berkas)']]
      .concat(uji.map(u => [u.g, u.jenis, u.judul, u.stat, u.df, String(u.p), String(u.pb || ''), u.asumsi, u.kesimpulan]));
    Excel.unduhXlsx('Data_Dashboard_Transportasi_Hijau_' + new Date().toISOString().slice(0, 10) + '.xlsx', [
      { nama: 'Info', data: info, lebar: [24, 100] }, { nama: 'Ringkasan', data: ring, lebar: [22, 40, 12, 18, 18, 14, 14] },
      { nama: 'Responden', data: resp }, { nama: 'HasilHitung', data: hasil }, { nama: 'Asumsi', data: asumsi },
      { nama: 'Skenario', data: skn, lebar: [26, 20, 14, 14] }, { nama: 'AnalisisStatistik', data: an }]);
    U.toast('Excel diunduh.', 'ok');
  }

  return { laporan, excel, teksFilter, bangunBagian };
})();
