/* ============================================================
 * pages.js — halaman analisis (Beranda … Tabel Data)
 * Setiap halaman: html() → string, lalu after() menggambar grafik.
 * ============================================================ */
const Pages = (function () {
  'use strict';
  const { esc, fmtNum, pct, auto, icon, warnaKel, labelKel, modeChip, singkatStatus, singkatFak } = U;
  const S = () => App.state;
  const rowsF = () => Data.terapkanFilter(S().boot.rows, S().f);
  const ARAH_LABEL = { total: 'Pergi + Pulang', pergi: 'Pergi ke kampus', pulang: 'Pulang dari kampus' };
  const KEL5 = ['Pribadi BBM', 'Transportasi Umum', 'Ojol & Taksi', 'Kendaraan Listrik', 'Aktif'];

  // ---------- komponen ----------
  function kpi(o) {
    return `<div class="kpi ${o.val === '—' ? 'kosong' : ''}" style="--kpi-accent:${o.color || 'transparent'}">
      <div class="lab">${o.icon ? icon(o.icon, 'ic-sm') : ''}${esc(o.lab)}</div>
      <div class="val">${o.val}${o.unit ? `<small>${o.unit}</small>` : ''}</div>
      ${o.sub ? `<div class="sub">${o.sub}</div>` : ''}</div>`;
  }
  function card(judul, sub, isi, opsi) {
    opsi = opsi || {};
    return `<section class="card ${opsi.cls || ''}" ${opsi.id ? `id="${opsi.id}"` : ''}>
      ${judul ? `<div class="card-head"><div><h2>${judul}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${opsi.aksi || ''}</div>` : ''}
      ${isi}${opsi.foot ? `<div class="card-foot">${opsi.foot}</div>` : ''}</section>`;
  }
  function head(crumb, judul, desk, kanan) {
    return `<div class="page-head"><div><div class="crumb">${esc(crumb)}</div><h1>${esc(judul)}</h1>${desk ? `<p>${desk}</p>` : ''}</div>${kanan || ''}</div>`;
  }
  function kosong(judul, teks, aksi) {
    return `<div class="empty">${icon('info')}<b>${esc(judul)}</b><p>${teks}</p>${aksi ? `<p style="margin-top:12px">${aksi}</p>` : ''}</div>`;
  }
  const canvas = (id, cls) => `<div class="chart ${cls || ''}"><canvas id="${id}" role="img" aria-label="Grafik"></canvas></div>`;
  const legenda = items => `<div class="legend">${items.map(i => `<span><i style="background:${i[1]}"></i>${esc(i[0])}</span>`).join('')}</div>`;
  const tabel = (kepala, baris, opsi) => `<div class="table-wrap"><table class="t"><thead><tr>${kepala.map(k =>
    `<th class="${k.num ? 'num' : ''}">${esc(k.t || k)}</th>`).join('')}</tr></thead><tbody>${baris.join('') ||
    `<tr><td colspan="${kepala.length}" class="muted">Tidak ada data.</td></tr>`}</tbody></table></div>`;
  const nInfo = rows => `N = ${fmtNum(rows.length)} responden`;

  /** Label pendek jawaban Q17 untuk sumbu grafik (teks lengkap tetap di tooltip). */
  function labelQ17(t) {
    t = String(t || '');
    if (/^tidak/i.test(t)) return 'Tidak pernah (langsung)';
    if (/pulang/i.test(t)) return 'Mampir saat pulang';
    if (/pergi/i.test(t)) return 'Mampir saat pergi';
    if (/sela|keluar kampus/i.test(t)) return 'Keluar kampus di sela jam';
    return t.length > 26 ? t.slice(0, 25) + '…' : t;
  }
  function adaFaktor() { return S().boot.rows.some(r => r.okp || r.okl) && S().boot.asumsi.some(a => a.ef > 0 && a.src); }

  function bannerEstimasi() {
    const m = S().boot.meta;
    const tanpa = m.modaTanpaFaktor || [];
    return `<div class="banner">${icon('info')}<div><b>Estimasi, bukan pengukuran</b>
      <p>Semua angka energi dan emisi dihitung dari jarak rata-rata per wilayah asal ke ${esc(m.namaKampus)} dan faktor emisi
      standar per moda. Hasil berupa total sampel dan rata-rata per responden, bukan ekstrapolasi ke seluruh civitas.</p>
      <div class="meta">
        <span class="chip info">Asumsi: ${esc(m.versiAsumsi || '—')}</span>
        <span class="chip info">Pembagian jarak multimoda: ${esc(m.aturanPembagian === 'AktifTetap' ? 'jalan/sepeda ' + fmtNum(m.jarakAktifKm, 1) + ' km tetap' : 'dibagi rata')}</span>
        <span class="chip info">Okupansi: 1 + penumpang (kendaraan-km)</span>
        <span class="chip info">${fmtNum(m.mingguPerTahun)} minggu/tahun</span>
        ${m.jarakDraf ? `<span class="chip warn">${m.jarakDraf} dari ${m.jarakTotal} wilayah: jarak DRAF</span>` : ''}
        ${tanpa.length ? `<span class="chip warn" title="${esc(tanpa.join(', '))}">${tanpa.length} moda belum punya faktor + sumber</span>` : ''}
      </div></div></div>`;
  }
  function bannerFaktorKosong() {
    if (adaFaktor()) return '';
    return `<div class="banner warn">${icon('alert')}<div><b>Faktor emisi belum diisi</b>
      <p>Belum ada moda bermotor yang memiliki faktor emisi dan energi beserta sumber rujukan, sehingga hampir semua responden
      dikecualikan dari hitung dampak. Isi di <a href="#pengaturan">Pengaturan Asumsi → Faktor Emisi &amp; Energi</a>.</p></div></div>`;
  }

  // =========================================================
  // BERANDA
  // =========================================================
  function beranda() {
    const rows = rowsF(), f = S().f, b = S().boot;
    if (!b.rows.length) return { html: head('Beranda', 'Belum ada data') + card('', '', kosong('Data responden belum diunggah',
      'Unggah berkas Response_Olahan (sheet Olahan) di menu Unggah Berkas.', '<a class="btn primary" href="#unggah">Buka Unggah Berkas</a>')) };
    const sk = Data.sebaranKelompok(rows, f.arah);
    const rg = Data.ringkas(rows, f, b.asumsi);
    const st = Data.hitungNilai(rows, r => r.st);
    const stTeks = st.map(s => fmtNum(s.n) + ' ' + singkatStatus(s.kunci)).join(', ');
    const tot = sk.n || 1;
    const modeKpi = KEL5.map(k => kpi({ lab: labelKel(k), val: pct(sk.hitung[k] / tot), color: warnaKel(k),
      sub: fmtNum(sk.hitung[k]) + ' ' + sk.satuan })).join('');
    const ts = sk.hitung['Tidak Spesifik'];
    const alasan = Object.keys(rg.alasan).map(k => k + ' (' + rg.alasan[k] + ')').join(', ');
    const donutLabels = KEL5.concat(ts ? ['Tidak Spesifik'] : []);
    const fk = adaFaktor();
    const em = v => fk ? auto(v) : '—';
    const listMode = donutLabels.map(k => `<div class="mode-row" style="--c:${warnaKel(k)}"><b>${esc(labelKel(k))}</b>
      <div class="pct">${pct(sk.hitung[k] / tot)}</div><span>${fmtNum(sk.hitung[k])} ${sk.satuan}</span></div>`).join('');

    const html = bannerEstimasi() + bannerFaktorKosong() +
      `<section class="card lg"><div class="grid g-2-1" style="align-items:center">
        <div><div class="crumb chip ok wrap" style="margin-bottom:10px">Laporan analisis mobilitas rendah emisi • ${esc(b.meta.namaKampus)}</div>
          <h1>Hasil Survei Kebiasaan Perjalanan Civitas Universitas Trisakti</h1>
          <p class="muted" style="margin-top:8px;font-size:1rem;line-height:1.6rem">Analisis ${fmtNum(rows.length)} responden (${esc(stTeks)}).
          Sebaran moda dihitung dari moda utama (isian pertama Q10/Q14), arah: ${esc(ARAH_LABEL[f.arah].toLowerCase())}.</p></div>
        ${kpi({ lab: 'Total estimasi emisi sampel', val: em(rg.totalKg), unit: 'kg CO₂e/minggu', icon: 'cloud', color: '#0F5132',
          sub: fk ? 'Rata-rata ' + auto(rg.rataKg) + ' kg/responden • ' + fmtNum(rg.nMasuk) + ' responden dihitung' : 'Menunggu faktor emisi diisi di Pengaturan Asumsi' })}
      </div></section>
      <div class="kpis k6">${kpi({ lab: 'Sampel', val: fmtNum(rows.length), unit: 'responden', icon: 'users', sub: 'Filter aktif' })}${modeKpi}</div>
      <div class="kpis">
        ${kpi({ lab: 'Total emisi', val: em(rg.totalKg), unit: 'kg CO₂e/mgg', sub: fk ? 'Proyeksi ' + auto(rg.totalKg * b.meta.mingguPerTahun / 1000) + ' ton/tahun' : 'Faktor emisi belum diisi' })}
        ${kpi({ lab: 'Rata-rata emisi', val: em(rg.rataKg), unit: 'kg/orang/mgg', sub: 'Per responden yang dihitung' })}
        ${kpi({ lab: 'Total energi', val: em(rg.totalMJ), unit: 'MJ/mgg', sub: fk ? 'Rata-rata ' + auto(rg.rataMJ) + ' MJ/orang' : 'Faktor energi belum diisi' })}
        ${kpi({ lab: 'Dikecualikan', val: fmtNum(rg.nKecuali), unit: 'responden', color: rg.nKecuali ? '#D4961A' : '', sub: esc(alasan || 'Tidak ada') })}
      </div>
      <div class="grid g-1-2">
        ${card('Sebaran kelompok moda utama', nInfo(rows) + ' • ' + fmtNum(sk.n) + ' ' + sk.satuan,
          `<div class="donut-wrap">${canvas('c-donut', 'short')}<div class="donut-center"><div><b>${fmtNum(sk.n)}</b><span>${sk.satuan}</span></div></div></div>
           <div class="mode-list" style="margin-top:14px">${listMode}</div>`)}
        ${card('Estimasi emisi per kelompok moda', 'Kontribusi tiap leg perjalanan ke kelompok modanya (kg CO₂e per minggu)',
          fk ? canvas('c-emkel', 'tall') : kosong('Belum ada faktor emisi', 'Grafik muncul setelah faktor emisi & energi beserta sumbernya diisi.', '<a class="btn" href="#pengaturan">Isi faktor emisi</a>'), { foot: `<span>${rg.nMasuk} dari ${rows.length} responden dihitung</span><a href="#dampak">Rincian dampak →</a>` })}
      </div>`;
    return { html: html, after: () => {
      Charts.donut('c-donut', donutLabels.map(labelKel), donutLabels.map(k => sk.hitung[k]), donutLabels.map(warnaKel), sk.satuan);
      const kel = KEL5.concat(rg.perKelompok['Tidak Spesifik'].g ? ['Tidak Spesifik'] : []);
      if (fk) Charts.bar('c-emkel', kel.map(labelKel), [{ label: 'Emisi', data: kel.map(k => rg.perKelompok[k].g / 1000), colors: kel.map(warnaKel) }],
        { horizontal: true, unit: 'kg CO₂e', sumbuJudul: 'kg CO₂e per minggu',
          ekstraTooltip: c => rg.totalKg ? ' (' + pct(c.parsed.x / rg.totalKg) + ')' : '' });
    } };
  }

  // =========================================================
  // PROFIL & POLA PERJALANAN
  // =========================================================
  function profil() {
    const rows = rowsF(), f = S().f;
    if (!rows.length) return { html: head('Modul 01', 'Profil & Pola Perjalanan') + card('', '', kosong('Tidak ada responden', 'Ubah filter atau unggah data.')) };
    const st = Data.hitungNilai(rows, r => r.st);
    const fk = Data.hitungNilai(rows, r => r.fk);
    const km = rows.map(r => r.km).filter(v => v !== null).sort((a, b) => a - b);
    const median = km.length ? (km.length % 2 ? km[(km.length - 1) / 2] : (km[km.length / 2 - 1] + km[km.length / 2]) / 2) : null;
    const mean = km.length ? km.reduce((a, b) => a + b, 0) / km.length : null;
    const hari = rows.map(r => r.h).filter(v => v !== null);
    const multi = rows.filter(r => (f.arah === 'pulang' ? r.ll : r.lp).length > 1).length;
    const tambah = rows.filter(r => r.pt && !/^tidak/i.test(r.pt)).length;
    const hist = Data.histogramJarak(rows);
    const frek = {}; rows.forEach(r => { frek[r.fq] = frek[r.fq] || { n: 0, h: r.h }; frek[r.fq].n++; });
    const frekL = Object.keys(frek).sort((a, b) => (frek[a].h || 0) - (frek[b].h || 0));
    const pt = Data.hitungNilai(rows, r => r.pt);
    const arahR = f.arah === 'pulang' ? 'pulang' : 'pergi';
    const top = Data.rangkaianTeratas(rows, arahR, 10);
    const totalTop = top.reduce((s, t) => s + t.n, 0);
    const baris = top.map((t, i) => `<tr><td class="num">${i + 1}</td><td>${t.rantai.split(' → ').map(m =>
      modeChip(m, (S().boot.asumsi.find(a => a.m === m) || {}).k)).join('<span class="arrow">→</span>')}</td>
      <td class="num">${fmtNum(t.n)}</td><td class="num">${pct(t.n / rows.length)}</td><td>${esc(singkatStatus(t.statusDominan))}</td>
      <td class="num">${t.rataKm === null ? '—' : fmtNum(t.rataKm, 1) + ' km'}</td></tr>`);

    const html = head('Modul 01 • Profil & Pola Perjalanan', 'Karakteristik Profil & Pola Perjalanan Civitas',
      'Sebaran responden, jarak estimasi ke kampus, frekuensi kehadiran mingguan, dan rangkaian multimoda.') +
      `<div class="kpis">
        ${kpi({ lab: 'Responden', val: fmtNum(rows.length), unit: 'civitas', icon: 'users', sub: st.map(s => fmtNum(s.n) + ' ' + singkatStatus(s.kunci)).join(' • ') })}
        ${kpi({ lab: 'Jarak estimasi ke kampus', val: fmtNum(median, 1), unit: 'km (median)', icon: 'route', sub: 'Rata-rata ' + fmtNum(mean, 1) + ' km • ' + hist.tanpa + ' tanpa jarak' })}
        ${kpi({ lab: 'Frekuensi ke kampus', val: fmtNum(hari.length ? hari.reduce((a, b) => a + b, 0) / hari.length : null, 1), unit: 'hari/minggu', sub: 'Rata-rata dari konversi Q8' })}
        ${kpi({ lab: 'Pengguna multimoda (' + arahR + ')', val: pct(multi / rows.length), sub: fmtNum(multi) + ' responden memakai ≥ 2 moda' })}
        ${kpi({ lab: 'Perjalanan tambahan', val: pct(tambah / rows.length), sub: fmtNum(tambah) + ' responden mampir/keluar kampus (Q17)' })}
      </div>
      <div class="grid g2">
        ${card('Responden per status civitas', nInfo(rows), canvas('c-st', 'short'))}
        ${card('Responden per fakultas / unit', nInfo(rows), canvas('c-fk', ''))}
      </div>
      ${card('Kelompok moda utama per status civitas', 'Proporsi (100%) • arah: ' + ARAH_LABEL[f.arah].toLowerCase() + (f.arah === 'total' ? ' (dihitung per perjalanan)' : ''),
        canvas('c-modast', 'short') + legenda(KEL5.map(k => [labelKel(k), warnaKel(k)])))}
      <div class="grid g2">
        ${card('Histogram jarak estimasi ke kampus', 'Jarak satu arah (km) • ' + hist.tanpa + ' responden tanpa jarak tidak ditampilkan', canvas('c-hist'))}
        ${card('Frekuensi ke kampus (Q8)', 'Jawaban asli beserta konversi hari/minggu', canvas('c-frek'))}
      </div>
      <div class="grid g-2-1">
        ${card('10 rangkaian moda terbanyak (' + arahR + ')', 'Mencakup ' + fmtNum(totalTop) + ' dari ' + fmtNum(rows.length) + ' responden (' + pct(totalTop / rows.length) + ')',
          tabel(['No', 'Rangkaian moda', { t: 'Pengguna', num: 1 }, { t: '% responden', num: 1 }, 'Status dominan', { t: 'Rata-rata jarak', num: 1 }], baris))}
        ${card('Perjalanan tambahan (Q17)', nInfo(rows), canvas('c-q17', 'tall'))}
      </div>`;
    return { html: html, after: () => {
      Charts.bar('c-st', st.map(s => singkatStatus(s.kunci)), [{ label: 'Responden', data: st.map(s => s.n), colors: st.map(s => U.STATUS_WARNA[s.kunci] || '#0F5132') }],
        { unit: 'responden', ekstraTooltip: c => ' (' + pct(c.parsed.y / rows.length) + ')' });
      Charts.bar('c-fk', fk.map(x => singkatFak(x.kunci)), [{ label: 'Responden', data: fk.map(x => x.n), color: '#0F5132' }],
        { horizontal: true, unit: 'responden', maxLabel: 40, ekstraTooltip: c => ' (' + pct(c.parsed.x / rows.length) + ')' });
      const stL = st.map(s => s.kunci);
      Charts.bar('c-modast', stL.map(singkatStatus), KEL5.map(k => ({ label: labelKel(k), color: warnaKel(k), data: stL.map(s => {
        const sk = Data.sebaranKelompok(rows.filter(r => r.st === s), f.arah); return sk.n ? sk.hitung[k] / sk.n * 100 : 0; }) })),
        { horizontal: true, stacked: true, persen: true, tebal: 26 });
      Charts.bar('c-hist', hist.bins.map(b => b.label), [{ label: 'Responden', data: hist.bins.map(b => b.n), color: '#2F80ED' }], { unit: 'responden', sumbuJudul: 'Responden' });
      Charts.bar('c-frek', frekL.map(k => k + (frek[k].h !== null ? ' (' + fmtNum(frek[k].h, 1) + ')' : '')), [{ label: 'Responden', data: frekL.map(k => frek[k].n), color: '#0F5132' }],
        { horizontal: true, unit: 'responden', maxLabel: 38 });
      Charts.bar('c-q17', pt.map(p => labelQ17(p.kunci)), [{ label: 'Responden', data: pt.map(p => p.n), color: '#7B61C9' }],
        { horizontal: true, unit: 'responden', maxLabel: 30, judulTooltip: it => pt[it.dataIndex].kunci, ekstraTooltip: c => ' (' + pct(c.parsed.x / rows.length) + ')' });
    } };
  }

  // =========================================================
  // DAMPAK ENERGI & EMISI
  // =========================================================
  function dampak() {
    const rows = rowsF(), f = S().f, b = S().boot, sat = S().satuan;
    if (!adaFaktor()) {
      const tanpa0 = b.meta.modaTanpaFaktor || [];
      return { html: head('Modul 02 • Dampak Energi & Emisi', 'Kalkulasi & Analisis Komparatif Dampak Energi dan Emisi Karbon') +
        bannerEstimasi() + bannerFaktorKosong() + card('Moda yang menunggu faktor emisi, faktor energi, dan sumber rujukan',
          'Halaman ini terisi otomatis setelah faktor diisi dan disimpan (hitung ulang berjalan otomatis).',
          `<div style="display:flex;flex-wrap:wrap;gap:6px">${tanpa0.map(m => modeChip(m, (b.asumsi.find(a => a.m === m) || {}).k)).join('')}</div>
           <p style="margin-top:14px"><a class="btn primary" href="#pengaturan">Buka Pengaturan Asumsi</a></p>`) };
    }
    const rg = Data.ringkas(rows, f, b.asumsi);
    const peta = Data.petaAsumsi(b.asumsi);
    const inc = rows.filter(r => Data.masuk(r, f.arah));
    let pkm = 0; const nArah = f.arah === 'total' ? 2 : 1;
    inc.forEach(r => { pkm += r.km * r.h * nArah; });
    const intensitas = pkm ? rg.totalKg * 1000 / pkm : null;
    const rata = sat === 'rata';
    const val = d => rata ? d.rataKg : d.kg;
    const unitE = rata ? 'kg CO₂e/orang/minggu' : 'kg CO₂e/minggu';
    const perSt = Data.perDimensi(rows, f.arah, r => r.st).sort((a, b2) => b2.n - a.n);
    const perFk = Data.perDimensi(rows, f.arah, r => r.fk).sort((a, b2) => (val(b2) || 0) - (val(a) || 0));
    const perKl = Data.perDimensi(rows, f.arah, r => r.kl ? 'Klaster ' + r.kl : null).sort((a, b2) => a.kunci.localeCompare(b2.kunci));
    const kelPer = KEL5.concat(rg.perKelompok['Tidak Spesifik'].g ? ['Tidak Spesifik'] : []);
    // nilai per kelompok: total = Σ leg; rata = total / responden masuk yang memakai kelompok tsb
    const pemakaiKel = {}; kelPer.forEach(k => { pemakaiKel[k] = new Set(); });
    inc.forEach(r => Data.legEmisi(r, f.arah, peta).forEach(l => pemakaiKel[l.kelompok] && pemakaiKel[l.kelompok].add(r.id)));
    const nilaiKel = (k, kunci) => { const v = rg.perKelompok[k][kunci]; return rata ? (pemakaiKel[k].size ? v / pemakaiKel[k].size : 0) : v; };
    const domFk = {}; rows.forEach(r => { const k = r.fk; domFk[k] = domFk[k] || {}; domFk[k][r.kgp] = (domFk[k][r.kgp] || 0) + 1; });
    const kmFk = {}; rows.forEach(r => { if (r.km === null) return; kmFk[r.fk] = kmFk[r.fk] || [0, 0]; kmFk[r.fk][0] += r.km; kmFk[r.fk][1]++; });
    const barisFk = perFk.map(d => { const dom = Object.keys(domFk[d.kunci]).sort((a, c) => domFk[d.kunci][c] - domFk[d.kunci][a])[0];
      return `<tr><td>${esc(d.kunci)}</td><td class="num">${fmtNum(d.nMasuk)} / ${fmtNum(d.n)}</td>
      <td class="num">${kmFk[d.kunci] ? fmtNum(kmFk[d.kunci][0] / kmFk[d.kunci][1], 1) : '—'}</td><td class="num">${auto(d.kg)}</td>
      <td class="num">${auto(d.rataKg)}</td><td class="num">${auto(d.mj)}</td><td>${modeChip(labelKel(dom), dom)}</td></tr>`; });
    const alasanBaris = Object.keys(rg.alasan).sort((a, c) => rg.alasan[c] - rg.alasan[a]).map(k => `<tr><td>${esc(k)}</td><td class="num">${fmtNum(rg.alasan[k])}</td></tr>`);
    const tanpa = b.meta.modaTanpaFaktor || [];

    const html = head('Modul 02 • Dampak Energi & Emisi', 'Kalkulasi & Analisis Komparatif Dampak Energi dan Emisi Karbon',
      'Estimasi emisi gas rumah kaca dan konsumsi energi perjalanan civitas ke ' + esc(b.meta.namaKampus) + ' per minggu.',
      `<div class="seg" id="seg-satuan"><button data-v="total" class="${!rata ? 'on' : ''}">Total sampel</button><button data-v="rata" class="${rata ? 'on' : ''}">Rata-rata / responden</button></div>`) +
      bannerEstimasi() + bannerFaktorKosong() +
      `<div class="kpis">
        ${kpi({ lab: 'Total emisi mingguan', val: auto(rg.totalKg), unit: 'kg CO₂e/mgg', icon: 'cloud', color: '#E4572E', sub: 'Rata-rata ' + auto(rg.rataKg) + ' kg/orang' })}
        ${kpi({ lab: 'Total konsumsi energi', val: auto(rg.totalMJ), unit: 'MJ/mgg', color: '#D4961A', sub: 'Rata-rata ' + auto(rg.rataMJ) + ' MJ/orang' })}
        ${kpi({ lab: 'Proyeksi emisi tahunan', val: auto(rg.totalKg * b.meta.mingguPerTahun / 1000), unit: 'ton CO₂e/thn', color: '#0F5132', sub: 'Basis ' + b.meta.mingguPerTahun + ' minggu efektif (sampel, bukan populasi)' })}
        ${kpi({ lab: 'Intensitas emisi', val: auto(intensitas), unit: 'g CO₂e/pnp-km', color: '#2F80ED', sub: 'Total emisi ÷ total penumpang-km responden' })}
        ${kpi({ lab: 'Dihitung', val: fmtNum(rg.nMasuk), unit: '/ ' + fmtNum(rg.n), sub: fmtNum(rg.nKecuali) + ' dikecualikan (lihat bawah)' })}
      </div>
      <div class="grid g2">
        ${card('Emisi per kelompok moda', rata ? 'Rata-rata per responden pemakai kelompok tsb' : 'Kontribusi leg perjalanan', canvas('c-kel-e'))}
        ${card('Energi per kelompok moda', rata ? 'MJ per responden pemakai per minggu' : 'MJ per minggu', canvas('c-kel-n'))}
      </div>
      <div class="grid g2">
        ${card('Emisi per status civitas', unitE, canvas('c-st-e', 'short'))}
        ${card('Emisi per klaster pola perjalanan', perKl.length ? unitE + ' • klaster dari Analisis Statistik' : 'Data klaster belum diunggah',
          perKl.length ? canvas('c-kl-e', 'short') : kosong('Belum ada data klaster', 'Unggah jenis data AnalisisStatistik.'))}
      </div>
      ${card('Diagram sebar: jarak tempuh vs emisi mingguan per responden', 'Warna = kelompok moda utama pergi • ' + fmtNum(inc.length) + ' responden', canvas('c-scatter', 'tall'))}
      ${card('Matriks emisi per fakultas / unit', 'Diurutkan menurut ' + (rata ? 'rata-rata per orang' : 'total emisi'),
        tabel(['Fakultas / unit', { t: 'Dihitung / N', num: 1 }, { t: 'Rata jarak (km)', num: 1 }, { t: 'Total kg CO₂e/mgg', num: 1 },
          { t: 'Rata kg/orang', num: 1 }, { t: 'Total MJ/mgg', num: 1 }, 'Kelompok dominan'], barisFk))}
      <div class="grid g2">
        ${card('Responden yang dikecualikan', 'Satu responden dapat memiliki lebih dari satu alasan', tabel(['Alasan', { t: 'Responden', num: 1 }], alasanBaris))}
        ${card('Moda tanpa faktor emisi/energi atau sumber', 'Leg dengan moda ini membuat responden dikecualikan',
          tanpa.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${tanpa.map(m => modeChip(m, (b.asumsi.find(a => a.m === m) || {}).k)).join('')}</div>
            <p class="small muted" style="margin-top:12px">Isi di <a href="#pengaturan">Pengaturan Asumsi</a>. Kolom Sumber wajib diisi sebelum faktor dipakai.</p>`
            : '<p class="muted">Semua moda sudah memiliki faktor dan sumber.</p>')}
      </div>`;
    return { html: html, after: () => {
      U.$$('#seg-satuan button').forEach(bt => bt.onclick = () => { S().satuan = bt.dataset.v; App.render(); });
      Charts.bar('c-kel-e', kelPer.map(labelKel), [{ label: 'Emisi', data: kelPer.map(k => nilaiKel(k, 'g') / 1000), colors: kelPer.map(warnaKel) }],
        { horizontal: true, unit: 'kg CO₂e', sumbuJudul: unitE });
      Charts.bar('c-kel-n', kelPer.map(labelKel), [{ label: 'Energi', data: kelPer.map(k => nilaiKel(k, 'mj')), colors: kelPer.map(warnaKel) }],
        { horizontal: true, unit: 'MJ', sumbuJudul: rata ? 'MJ/orang/minggu' : 'MJ per minggu' });
      Charts.bar('c-st-e', perSt.map(d => singkatStatus(d.kunci)), [{ label: 'Emisi', data: perSt.map(val), colors: perSt.map(d => U.STATUS_WARNA[d.kunci] || '#0F5132') }],
        { unit: 'kg CO₂e', ekstraTooltip: c => ' • ' + perSt[c.dataIndex].nMasuk + ' responden' });
      if (perKl.length) Charts.bar('c-kl-e', perKl.map(d => d.kunci + klLabel(d.kunci)), [{ label: 'Emisi', data: perKl.map(val), colors: perKl.map((d, i) => U.URUT[i]) }],
        { horizontal: true, maxLabel: 24, unit: 'kg CO₂e', ekstraTooltip: c => ' • ' + perKl[c.dataIndex].nMasuk + ' responden' });
      const ds = KEL5.map(k => ({ label: labelKel(k), color: warnaKel(k),
        data: inc.filter(r => r.kgp === k && r.km !== null).map(r => ({ x: r.km, y: Data.emisi(r, f.arah) / 1000, id: r.id })) })).filter(d => d.data.length);
      Charts.scatter('c-scatter', ds, { xJudul: 'Jarak tempuh satu arah ke kampus (km)', yJudul: 'Emisi (kg CO₂e/minggu, ' + ARAH_LABEL[f.arah].toLowerCase() + ')' });
    } };
  }

  function klLabel(k) {
    const n = Number(String(k).replace(/\D/g, ''));
    const meta = (S().boot.analisis.uji || []).find(u => u.jenis === 'KlasterMeta' && (!S().f.g || u.g === S().f.g));
    const r = meta && meta.data && (meta.data.ringkasan || []).find(x => x.klaster === n);
    return r && r.label ? ' — ' + r.label : '';
  }

  // =========================================================
  // SIMULASI PERALIHAN MODA (FR-05)
  // =========================================================
  function opsiSimulasi() {
    const as = S().boot.asumsi;
    const asal = [{ v: '*Pribadi BBM', t: 'Semua kendaraan pribadi BBM' }].concat(as.filter(a => a.k === 'Pribadi BBM')
      .map(a => ({ v: a.m, t: a.m + (a.ef === null || !a.src ? ' (faktor kosong)' : '') })));
    const tujuan = [{ v: '*Padanan listrik', t: 'Kendaraan listrik setara (motor→motor listrik, mobil→mobil listrik)' }]
      .concat(as.filter(a => a.k === 'Transportasi Umum' || a.k === 'Kendaraan Listrik')
        .map(a => ({ v: a.m, t: a.m + (a.ef === null || !a.src ? ' (faktor kosong)' : '') })));
    return { asal, tujuan };
  }
  function simulasi() {
    const sim = S().sim, o = opsiSimulasi();
    const html = head('Modul 03 • Simulasi (What-If)', 'Simulasi Dinamis Peralihan Moda Rendah Emisi',
      'Geser persentase pengguna moda asal yang beralih untuk melihat potensi penghematan emisi dan energi. Skenario tidak disimpan, tetapi ikut dalam ekspor.') +
      bannerFaktorKosong() +
      `<div class="banner">${icon('sigma')}<div><b>Metode: nilai harapan</b>
        <p>Selisih = p × Σ leg moda asal [jarak leg × hari/minggu × (faktor asal ÷ pembagi okupansi − faktor tujuan ÷ pembagi tujuan)].
        Pembagi tujuan = pembagi asal bila tujuan berbasis kendaraan-km (mis. motor listrik), = 1 bila berbasis penumpang-km.
        Hanya responden yang masuk hitung dampak pada arah terpilih yang disertakan.</p></div></div>
      <section class="card lg"><div class="grid g2">
        <label class="field"><span>Moda asal (yang dikurangi)</span><select id="sim-asal">${o.asal.map(x => `<option value="${esc(x.v)}" ${x.v === sim.asal ? 'selected' : ''}>${esc(x.t)}</option>`).join('')}</select></label>
        <label class="field"><span>Moda tujuan</span><select id="sim-tujuan">${o.tujuan.map(x => `<option value="${esc(x.v)}" ${x.v === sim.tujuan ? 'selected' : ''}>${esc(x.t)}</option>`).join('')}</select></label>
      </div>
      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center;gap:12px">
        <b>Persentase pemakai moda asal yang beralih (p)</b>
        <div style="display:flex;align-items:center;gap:6px"><input class="input tnum" id="sim-pn" type="number" min="0" max="100" value="${sim.p}" style="width:84px"> %</div>
      </div>
      <div class="range-wrap"><input type="range" id="sim-p" min="0" max="100" step="1" value="${sim.p}" aria-label="Persentase beralih">
        <div class="ref-line hidden" id="sim-ref"></div><div class="ref-label hidden" id="sim-ref-l"></div></div>
      <div id="sim-acuan" class="small"></div></section>
      <div class="kpis" id="sim-kpi"></div>
      <div class="grid g2">
        ${card('Emisi mingguan: baseline vs skenario', 'kg CO₂e per minggu, per status civitas', canvas('c-sim-e'))}
        ${card('Energi mingguan: baseline vs skenario', 'MJ per minggu (total sampel)', canvas('c-sim-n'))}
      </div>
      <div id="sim-note"></div>`;
    return { html: html, after: () => {
      const upd = () => perbaruiSimulasi();
      U.$('#sim-asal').onchange = e => { sim.asal = e.target.value; upd(); };
      U.$('#sim-tujuan').onchange = e => { sim.tujuan = e.target.value; upd(); };
      U.$('#sim-p').oninput = e => { sim.p = Number(e.target.value); U.$('#sim-pn').value = sim.p; upd(); };
      U.$('#sim-pn').oninput = e => { sim.p = Math.max(0, Math.min(100, Number(e.target.value) || 0)); U.$('#sim-p').value = sim.p; upd(); };
      perbaruiSimulasi(true);
    } };
  }
  let simChart = {};
  function perbaruiSimulasi(awal) {
    const sim = S().sim, rows = rowsF(), f = S().f, b = S().boot;
    const r = Data.simulasi(rows, f, b.asumsi, sim.asal, sim.tujuan, sim.p);
    S().simHasil = r;
    const lebih = r.acuan !== null && sim.p / 100 > r.acuan;
    U.$('#sim-kpi').innerHTML =
      kpi({ lab: 'Pengurangan emisi mingguan', val: (r.selisihKg > 0 ? '−' : '') + auto(Math.abs(r.selisihKg)), unit: 'kg CO₂e/mgg', icon: 'cloud', color: '#2BB673', sub: 'Turun ' + pct(r.persen) + ' dari baseline ' + auto(r.baselineKg) + ' kg' }) +
      kpi({ lab: 'Proyeksi reduksi tahunan', val: auto(r.selisihKg * b.meta.mingguPerTahun / 1000), unit: 'ton CO₂e/thn', color: '#0F5132', sub: b.meta.mingguPerTahun + ' minggu efektif • sampel saja' }) +
      kpi({ lab: 'Penghematan energi', val: auto(r.selisihMJ), unit: 'MJ/mgg', color: '#D4961A', sub: 'Turun ' + pct(r.persenMJ) + ' dari ' + auto(r.baselineMJ) + ' MJ' }) +
      kpi({ lab: 'Perkiraan civitas beralih', val: fmtNum(r.perkiraanBeralih), unit: 'dari ' + fmtNum(r.nPemakai), color: lebih ? '#E4572E' : '#2F80ED', sub: 'Pemakai moda asal (yang dihitung)' });
    const pos = r.acuan === null ? null : r.acuan * 100;
    U.$('#sim-ref').classList.toggle('hidden', pos === null); U.$('#sim-ref-l').classList.toggle('hidden', pos === null);
    if (pos !== null) {
      U.$('#sim-ref').style.left = `calc(${pos}% - 1px)`; U.$('#sim-ref-l').style.left = pos + '%';
      U.$('#sim-ref-l').textContent = 'Acuan kesediaan ' + pct(r.acuan);
    }
    U.$('#sim-acuan').innerHTML = r.acuan === null ? '<span class="muted">Belum ada pemakai moda asal yang dapat dihitung.</span>' :
      `<span class="chip ${lebih ? 'err' : 'ok'}">${lebih ? icon('alert', 'ic-sm') + ' Melebihi' : icon('check', 'ic-sm') + ' Di bawah'} batas atas kesediaan</span>
       <span class="muted"> ${pct(r.acuan)} dari ${fmtNum(r.nAcuan)} pemakai moda asal menjawab setuju/sangat setuju bersedia pindah moda (Q22 skor 4–5).</span>`;
    U.$('#sim-note').innerHTML = r.legTanpaTujuan ? `<div class="banner warn">${icon('alert')}<div><b>Sebagian leg tidak disimulasikan</b>
      <p>${fmtNum(r.legTanpaTujuan)} leg moda asal tidak punya padanan tujuan dengan faktor (mis. "Kendaraan Pribadi (tidak spesifik)" tanpa padanan listrik). Leg tersebut dianggap tidak beralih.</p></div></div>` : '';
    const st = r.perStatus.sort((a, c) => c.n - a.n);
    if (awal || !simChart.e || !document.getElementById('c-sim-e')) {
      simChart.e = Charts.bar('c-sim-e', st.map(s => singkatStatus(s.status)), [
        { label: 'Baseline', data: st.map(s => s.baseKg), color: '#B8C2BC' },
        { label: 'Skenario', data: st.map(s => s.sesudahKg), color: '#2BB673' }], { unit: 'kg CO₂e', legend: true });
      simChart.n = Charts.bar('c-sim-n', ['Total sampel'], [
        { label: 'Baseline', data: [r.baselineMJ], color: '#B8C2BC' }, { label: 'Skenario', data: [r.sesudahMJ], color: '#D4961A' }],
        { unit: 'MJ', legend: true, horizontal: true, tebal: 34 });
    } else {
      simChart.e.data.labels = st.map(s => singkatStatus(s.status));
      simChart.e.data.datasets[0].data = st.map(s => s.baseKg); simChart.e.data.datasets[1].data = st.map(s => s.sesudahKg); simChart.e.update();
      simChart.n.data.datasets[0].data = [r.baselineMJ]; simChart.n.data.datasets[1].data = [r.sesudahMJ]; simChart.n.update();
    }
  }

  // =========================================================
  // PERSEPSI & HAMBATAN (FR-06)
  // =========================================================
  const LIK_WARNA = ['#B5401F', '#F09A7A', '#C9CFCB', '#7FCB9F', '#0F5132'];
  const LIK_LABEL = ['Sangat tidak setuju (1)', 'Tidak setuju (2)', 'Netral (3)', 'Setuju (4)', 'Sangat setuju (5)'];
  function persepsi() {
    const rows = rowsF();
    if (!rows.length) return { html: head('Modul 04', 'Persepsi & Hambatan') + card('', '', kosong('Tidak ada responden', 'Ubah filter.')) };
    const lk = Data.distribusiLikert(rows);
    const hb = Data.hambatan(rows);
    const st = Data.hitungNilai(rows, r => r.st).map(s => s.kunci);
    const tr = rows.filter(r => /^pernah/i.test(r.tr)).length;
    const top6 = hb.slice(0, 6).map(h => h.kunci);
    const setujuList = lk.map(l => `<div class="bar-item"><div class="row"><span>${l.kode} — ${esc(l.label)}</span><b>${pct(l.setuju)}</b></div>
      <div class="track"><i style="width:${(l.setuju || 0) * 100}%;--c:${l.setuju >= 0.6 ? '#0F5132' : l.setuju >= 0.4 ? '#2F80ED' : '#E4572E'}"></i></div></div>`).join('');
    const html = head('Modul 04 • Persepsi & Hambatan', 'Analisis Persepsi, Kesiapan, dan Hambatan Civitas',
      'Sikap terhadap pilihan moda rendah emisi dan kebijakan kampus (skala 1–5), serta hambatan memakai transportasi umum.') +
      `<div class="kpis">
        ${kpi({ lab: 'Mendukung shuttle kampus (Q23)', val: pct(lk[3].setuju), color: '#0F5132', sub: 'Skor 4–5 dari ' + fmtNum(lk[3].n) + ' jawaban' })}
        ${kpi({ lab: 'Bersedia pindah moda (Q22)', val: pct(lk[2].setuju), color: '#2BB673', sub: 'Garis acuan di Simulasi' })}
        ${kpi({ lab: 'Pernah naik transportasi umum ke kampus (Q18)', val: pct(tr / rows.length), color: '#2F80ED', sub: fmtNum(tr) + ' dari ' + fmtNum(rows.length) })}
        ${kpi({ lab: 'Mendukung kebijakan parkir (Q24)', val: pct(lk[4].setuju), color: '#E4572E', sub: 'Skor 4–5 dari ' + fmtNum(lk[4].n) + ' jawaban' })}
      </div>
      <div class="grid g-2-1">
        ${card('Distribusi 6 pernyataan skala Likert', 'Proporsi jawaban (100%) • jawaban kosong tidak dihitung', canvas('c-likert', 'tall') + legenda(LIK_LABEL.map((l, i) => [l, LIK_WARNA[i]])))}
        ${card('Persentase setuju (skor 4–5)', 'Diurutkan sesuai nomor pertanyaan', `<div class="bar-list">${setujuList}</div>`)}
      </div>
      <div class="grid g2">
        ${card('Hambatan utama naik transportasi umum (Q19)', 'Maks. 4 pilihan per responden • % terhadap ' + fmtNum(rows.length) + ' responden', canvas('c-hb', 'tall'))}
        ${card('Hambatan teratas per status civitas', '% responden dalam masing-masing status', canvas('c-hbst', 'tall') + legenda(st.map(s => [singkatStatus(s), U.STATUS_WARNA[s] || '#0F5132'])))}
      </div>
      ${card('Pengalaman memakai transportasi umum ke kampus per status (Q18)', 'Proporsi (100%)', canvas('c-tr', 'short') + legenda([['Pernah', '#2F80ED'], ['Tidak pernah', '#C9CFCB']]))}`;
    return { html: html, after: () => {
      Charts.bar('c-likert', lk.map(l => l.kode + ' ' + l.label), LIK_LABEL.map((lab, i) => ({ label: lab, color: LIK_WARNA[i],
        data: lk.map(l => l.n ? l.hitung[i] / l.n * 100 : 0) })), { horizontal: true, stacked: true, persen: true, maxLabel: 30, tebal: 28 });
      Charts.bar('c-hb', hb.map(h => h.kunci), [{ label: 'Responden', data: hb.map(h => h.n), color: '#E4572E' }],
        { horizontal: true, unit: 'responden', maxLabel: 34, ekstraTooltip: c => ' (' + pct(hb[c.dataIndex].pct) + ')' });
      Charts.bar('c-hbst', top6, st.map(s => { const rs = rows.filter(r => r.st === s);
        return { label: singkatStatus(s), color: U.STATUS_WARNA[s] || '#0F5132',
          data: top6.map(h => rs.length ? rs.filter(r => r.hb.some(x => String(x).replace(/\.$/, '') === h)).length / rs.length * 100 : 0) }; }),
        { horizontal: true, persen: false, unit: '%', desimal: 1, maxLabel: 30, tebal: 12, tickFmt: v => U.fmtNum(v, 0) + '%' });
      Charts.bar('c-tr', st.map(singkatStatus), [
        { label: 'Pernah', color: '#2F80ED', data: st.map(s => { const rs = rows.filter(r => r.st === s); return rs.length ? rs.filter(r => /^pernah/i.test(r.tr)).length / rs.length * 100 : 0; }) },
        { label: 'Tidak pernah', color: '#C9CFCB', data: st.map(s => { const rs = rows.filter(r => r.st === s); return rs.length ? rs.filter(r => !/^pernah/i.test(r.tr)).length / rs.length * 100 : 0; }) }],
        { horizontal: true, stacked: true, persen: true, tebal: 26 });
    } };
  }

  // =========================================================
  // ANALISIS STATISTIK (FR-12) — ditampilkan apa adanya dari berkas
  // =========================================================
  function statistik() {
    const b = S().boot;
    const gels = b.meta.gelombang;
    const g = S().f.g || gels[0];
    const uji = (b.analisis.uji || []).filter(u => u.g === g);
    const meta = uji.find(u => u.jenis === 'KlasterMeta');
    const tab = S().statTab;
    const nUji = uji.filter(u => u.jenis === 'ChiSquare' || u.jenis === 'Spearman').length;
    const nTab = uji.filter(u => u.jenis === 'Tabulasi').length;
    const tabs = `<div class="tabs" id="stat-tabs">
      <button data-t="klaster" class="${tab === 'klaster' ? 'on' : ''}">Klaster pola perjalanan</button>
      <button data-t="uji" class="${tab === 'uji' ? 'on' : ''}">Uji hubungan<span class="count">${nUji}</span></button>
      <button data-t="tabulasi" class="${tab === 'tabulasi' ? 'on' : ''}">Tabulasi silang<span class="count">${nTab}</span></button></div>`;
    let isi = '', after = () => {};
    const tidakAda = !uji.length;
    const catatanTetap = `<div class="banner">${icon('info')}<div><b>Dari berkas unggahan, tidak dihitung ulang</b>
      <p>Hasil klaster k-modes dan uji statistik ditampilkan apa adanya dari berkas tim peneliti (gelombang ${esc(g || '—')}).
      Filter global tidak mengubah angka di halaman ini. Bila data responden berubah, hitung ulang di Excel/Python lalu unggah ulang jenis data AnalisisStatistik.</p></div></div>`;
    if (tidakAda) {
      isi = card('', '', kosong('Belum ada hasil analisis statistik', 'Unggah berkas Response_Olahan sebagai jenis data <b>AnalisisStatistik</b> (sheet Clustering, Uji Hubungan, Tabulasi Silang).',
        '<a class="btn primary" href="#unggah">Buka Unggah Berkas</a>'));
    } else if (tab === 'klaster') {
      const ring = (meta && meta.data && meta.data.ringkasan) || [];
      const rowsG = b.rows.filter(r => r.g === g);
      const emKl = Data.perDimensi(rowsG, 'total', r => r.kl);
      isi = `<div class="banner warn">${icon('alert')}<div><b>Klaster bersifat eksploratif</b><p>${esc(meta ? meta.kesimpulan : '')}
          ${meta && meta.data ? esc(meta.data.meta.filter(m => !/eksploratif/i.test(m)).slice(1).join(' • ')) : ''}</p></div></div>
        ${card('Ringkasan klaster', 'Nilai terbanyak (modus) tiap variabel',
            tabel(['Klaster', { t: 'Jumlah', num: 1 }, { t: '%', num: 1 }, 'Frekuensi (Q8)', 'Moda pergi utama', 'Moda pulang utama', 'Perjalanan tambahan (Q17)'],
              ring.map((r, i) => `<tr><td><span class="chip" style="background:${U.URUT[i]};color:#fff">${r.klaster}</span> ${esc(r.label || '')}</td>
                <td class="num">${fmtNum(r.jumlah)}</td><td class="num">${pct(r.persen)}</td><td>${esc(r.q8)}</td><td>${esc(r.pergi)}</td><td>${esc(r.pulang)}</td><td>${esc(r.q17)}</td></tr>`)))}
        <div class="cluster-cards">${card('Ukuran klaster', fmtNum(ring.reduce((s, r) => s + r.jumlah, 0)) + ' responden', `<div class="donut-wrap">${canvas('c-kl', '')}</div>` +
            legenda(ring.map((r, i) => ['Klaster ' + r.klaster + (r.label ? ' — ' + r.label : ''), U.URUT[i]])))}${ring.map((r, i) => { const e = emKl.find(x => Number(x.kunci) === r.klaster);
          return card(`Klaster ${r.klaster}${r.label ? ' — ' + esc(r.label) : ''}`, fmtNum(r.jumlah) + ' responden (' + pct(r.persen) + ')',
            `<dl class="dl"><dt>Frekuensi</dt><dd>${esc(r.q8)}</dd><dt>Moda pergi</dt><dd>${esc(r.pergi)}</dd><dt>Moda pulang</dt><dd>${esc(r.pulang)}</dd>
             <dt>Q17</dt><dd>${esc(r.q17)}</dd><dt>Estimasi emisi</dt><dd>${e && e.nMasuk ? auto(e.rataKg) + ' kg CO₂e/orang/minggu (' + e.nMasuk + ' dihitung)' : '—'}</dd></dl>`,
            { cls: '', foot: `<a href="#dampak" data-kl="${r.klaster}" class="kl-link">Filter dashboard ke klaster ini →</a>` }); }).join('')}</div>`;
      after = () => {
        Charts.donut('c-kl', ring.map(r => 'Klaster ' + r.klaster + (r.label ? ' — ' + r.label : '')), ring.map(r => r.jumlah), ring.map((r, i) => U.URUT[i]), 'responden');
        U.$$('.kl-link').forEach(a => a.onclick = () => { S().f.kl = a.dataset.kl; });
      };
    } else if (tab === 'uji') {
      const chi = uji.filter(u => u.jenis === 'ChiSquare');
      const sp = uji.filter(u => u.jenis === 'Spearman');
      const pFmt = p => { const n = Number(p); return p === '' || p === null || p === undefined ? '—' : isNaN(n) ? esc(String(p).replace(/(\d)\.(\d)/g, '$1,$2')) : n < 0.001 ? '< 0,001' : fmtNum(n, 4); };
      isi = chi.map((u, i) => {
        const tdk = /tidak ditafsirkan/i.test(u.kesimpulan);
        return card(esc(u.judul), 'Uji Chi-Square independensi', `<div class="uji-card">
          <div>${tdk ? `<span class="chip warn">${icon('alert', 'ic-sm')} Tidak ditafsirkan</span>` : /asumsi:\s*terpenuhi/i.test(u.asumsi) ? `<span class="chip ok">${icon('check', 'ic-sm')} Asumsi terpenuhi (menurut berkas)</span>` : ''}</div>
          <div class="stat"><div><span>χ²</span><b>${fmtNum(u.stat, 3)}</b></div><div><span>Derajat bebas</span><b>${fmtNum(u.df)}</b></div>
            <div><span>p-value</span><b>${pFmt(u.p)}</b></div></div>
          <p class="small"><b>Pemeriksaan asumsi:</b> ${esc(u.asumsi || '—')}</p>
          <p class="small" style="margin-top:4px"><b>Kesimpulan (dari berkas):</b> ${esc(u.kesimpulan || '—')}</p></div>` +
          (u.data && u.data.kolom ? `<div style="margin-top:14px">${canvas('c-chi' + i, 'short')}</div>` +
            legenda(u.data.baris.filter(x => !/^total/i.test(x.label)).map((x, j) => [x.label.replace(/\(.*?\)/g, '').trim(), U.URUT[j]])) : ''), { cls: 'uji-card' });
      }).join('') +
      (sp.length ? card('Korelasi Spearman: persepsi terhadap kesediaan pindah moda (Q22)', esc(sp[0].asumsi || ''),
        `<div class="grid g2"><div>${canvas('c-sp', 'short')}</div>
         ${tabel(['Pasangan', { t: 'N', num: 1 }, { t: 'rho', num: 1 }, 'p-value', 'p Bonferroni', 'Kesimpulan'],
          sp.map(u => `<tr><td>${esc(u.judul)}</td><td class="num">${fmtNum(u.df)}</td><td class="num">${fmtNum(u.stat, 3)}</td><td>${pFmt(u.p)}</td><td>${pFmt(u.pb)}</td><td>${esc(u.kesimpulan)}</td></tr>`))}</div>`) : '');
      after = () => {
        chi.forEach((u, i) => {
          if (!u.data || !u.data.kolom) return;
          const bar = u.data.baris.filter(x => !/^total/i.test(x.label));
          const tot = u.data.kolom.map((k, j) => bar.reduce((s, x) => s + (x.nilai[j] || 0), 0));
          const kolomIdx = u.data.kolom.map((k, j) => j).filter(j => !/^total/i.test(u.data.kolom[j]));
          Charts.bar('c-chi' + i, kolomIdx.map(j => u.data.kolom[j] + ' (n=' + tot[j] + ')'), bar.map((x, k) => ({ label: x.label, color: U.URUT[k],
            data: kolomIdx.map(j => tot[j] ? x.nilai[j] / tot[j] * 100 : 0) })), { horizontal: true, stacked: true, persen: true, maxLabel: 36, tebal: 20 });
        });
        if (sp.length) Charts.bar('c-sp', sp.map(u => u.judul), [{ label: 'rho', data: sp.map(u => u.stat), color: '#0F5132' }],
          { horizontal: true, unit: '', desimal: 3, max: 1, tickFmt: v => U.fmtNum(v, 1), sumbuJudul: 'Koefisien Spearman (rho)' });
      };
    } else {
      const tb = uji.filter(u => u.jenis === 'Tabulasi');
      isi = tb.map(t => { const d = t.data;
        return card(esc(t.judul), d.catatan ? esc(d.catatan) : 'Frekuensi dari berkas',
          tabel([d.baris.length ? 'Kategori' : ''].concat(d.kolom.map(k => ({ t: k, num: 1 }))),
            d.baris.map(x => `<tr ${/^total/i.test(x.label) ? 'style="font-weight:700"' : ''}><td>${esc(x.label)}</td>${x.nilai.map(v => `<td class="num">${fmtNum(v)}</td>`).join('')}</tr>`)));
      }).join('');
    }
    const html = head('Analisis Statistik', 'Klaster Pola Perjalanan & Uji Hubungan',
      'Hasil k-modes (3 klaster), uji chi-square, korelasi Spearman, dan tabulasi silang yang dihitung tim peneliti.') +
      catatanTetap + tabs + `<div class="grid" id="stat-isi">${isi}</div>`;
    return { html: html, after: () => {
      U.$$('#stat-tabs button').forEach(bt => bt.onclick = () => { S().statTab = bt.dataset.t; App.render(); });
      after();
    } };
  }

  // =========================================================
  // TABEL DATA (FR-07)
  // =========================================================
  const FLAG_INFO = {
    Frekuensi: 'Jawaban frekuensi belum ada di KamusFrekuensi', Penumpang: 'Jumlah penumpang kosong/tidak wajar (dibatasi MaksPenumpang)',
    ModaTidakSpesifik: 'Ada moda yang tidak spesifik/tidak dikenal', RuteBeda: 'Menyatakan rute sama, tetapi moda pergi & pulang berbeda',
    EmailDuplikat: 'Email pengisi muncul lebih dari sekali di berkas', LikertKosong: 'Ada skor persepsi yang kosong', Asal: 'Asal tidak terpetakan / luar Jabodetabek'
  };
  function tabelData() {
    const t = S().tabel, f = S().f;
    let rows = rowsF();
    const q = t.q.trim().toLowerCase();
    if (q) rows = rows.filter(r => [r.id, r.st, r.fk, r.ps, r.w, r.fq, r.lp.map(l => l[0]).join(' '), r.ll.map(l => l[0]).join(' '), r.fl.join(' ')].join(' ').toLowerCase().indexOf(q) >= 0);
    if (t.kel) rows = rows.filter(r => r.kgp === t.kel);
    if (t.kual === 'bersih') rows = rows.filter(r => !r.fl.length);
    else if (t.kual === 'flag') rows = rows.filter(r => r.fl.length);
    else if (t.kual) rows = rows.filter(r => r.fl.indexOf(t.kual) >= 0);
    if (t.hitung === 'masuk') rows = rows.filter(r => Data.masuk(r, f.arah)); else if (t.hitung === 'kecuali') rows = rows.filter(r => !Data.masuk(r, f.arah));
    const kunci = { id: r => r.g + String(r.no).padStart(5, '0'), st: r => r.st, w: r => r.w, km: r => r.km === null ? -1 : r.km, h: r => r.h || 0,
      kel: r => r.kgp, em: r => Data.masuk(r, f.arah) ? Data.emisi(r, f.arah) : -1, fl: r => r.fl.length }[t.sort] || (r => r.id);
    rows.sort((a, b) => { const x = kunci(a), y = kunci(b); return (x > y ? 1 : x < y ? -1 : 0) * t.dir; });
    const PER = 25, nHal = Math.max(1, Math.ceil(rows.length / PER));
    t.hal = Math.min(t.hal, nHal);
    const hal = rows.slice((t.hal - 1) * PER, t.hal * PER);
    const th = (k, l, num) => `<th class="sortable ${num ? 'num' : ''}" data-s="${k}">${l}${t.sort === k ? (t.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
    const baris = hal.map(r => { const ok = Data.masuk(r, f.arah);
      return `<tr class="click ${r.fl.length ? 'flagged' : ''}" data-id="${esc(r.id)}">
        <td><b class="tnum">${esc(r.id)}</b></td>
        <td>${esc(singkatStatus(r.st))}<div class="small muted">${esc(singkatFak(r.fk))}</div></td>
        <td>${esc(r.w || '— belum terpetakan')}<div class="small muted">${r.km === null ? '' : fmtNum(r.km, 1) + ' km • '}${esc(r.kp || '')}</div></td>
        <td class="num">${r.h === null ? '—' : fmtNum(r.h, 1)}<div class="small muted">hari/mgg</div></td>
        <td>${(f.arah === 'pulang' ? r.ll : r.lp).map(l => modeChip(l[0], (S().boot.asumsi.find(a => a.m === l[0]) || {}).k)).join('<span class="arrow">→</span>')}</td>
        <td class="num">${ok ? auto(Data.emisi(r, f.arah) / 1000) + ' kg' : '<span class="chip warn">Dikecualikan</span>'}</td>
        <td>${r.fl.length ? r.fl.map(x => `<span class="chip warn" title="${esc(FLAG_INFO[x] || '')}">${esc(x)}</span>`).join(' ') : '<span class="chip ok">Bersih</span>'}</td></tr>`; });
    const pages = [];
    for (let i = 1; i <= nHal; i++) if (i === 1 || i === nHal || Math.abs(i - t.hal) <= 2) pages.push(i); else if (pages[pages.length - 1] !== '…') pages.push('…');
    const flagOpts = Object.keys(FLAG_INFO).map(k => `<option value="${k}" ${t.kual === k ? 'selected' : ''}>Flag: ${k}</option>`).join('');
    const html = head('Modul 05 • Katalog Data', 'Katalog Data Mikro Responden & Validitas',
      'Data per responden tanpa identitas pribadi (nama, NIM/NIP, email, dan alamat lengkap tidak disimpan/ditampilkan). Klik baris untuk rincian.') +
      `<section class="card"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">
        <label class="field" style="flex:2 1 240px"><span>Cari</span><input class="input" id="tb-q" placeholder="ID, wilayah, moda, flag…" value="${esc(t.q)}"></label>
        <label class="field" style="flex:1 1 160px"><span>Kelompok moda utama pergi</span><select id="tb-kel"><option value="">Semua</option>${KEL5.concat(['Tidak Spesifik']).map(k => `<option value="${k}" ${t.kel === k ? 'selected' : ''}>${labelKel(k)}</option>`).join('')}</select></label>
        <label class="field" style="flex:1 1 160px"><span>Kualitas</span><select id="tb-kual"><option value="">Semua</option><option value="bersih" ${t.kual === 'bersih' ? 'selected' : ''}>Bersih</option><option value="flag" ${t.kual === 'flag' ? 'selected' : ''}>Ber-flag</option>${flagOpts}</select></label>
        <label class="field" style="flex:1 1 160px"><span>Hitung dampak</span><select id="tb-hit"><option value="">Semua</option><option value="masuk" ${t.hitung === 'masuk' ? 'selected' : ''}>Dihitung</option><option value="kecuali" ${t.hitung === 'kecuali' ? 'selected' : ''}>Dikecualikan</option></select></label>
        <button class="btn" id="tb-reset">${icon('refresh', 'ic-sm')} Reset</button></div></section>
      <section class="card"><div class="card-head"><div><h2>Daftar responden <span class="chip dark">${fmtNum(rows.length)} baris</span></h2>
        <p>Emisi = ${esc(ARAH_LABEL[f.arah].toLowerCase())} per minggu • baris bergaris oranye memiliki flag kualitas (tetap dihitung)</p></div></div>
        <div class="table-wrap"><table class="t"><thead><tr>${th('id', 'ID')}${th('st', 'Civitas & fakultas')}${th('w', 'Wilayah & jarak')}${th('h', 'Frekuensi', 1)}
          <th>Rangkaian moda</th>${th('em', 'Emisi/mgg', 1)}${th('fl', 'Status kualitas')}</tr></thead>
          <tbody>${baris.join('') || '<tr><td colspan="7" class="muted">Tidak ada baris yang cocok.</td></tr>'}</tbody></table></div>
        <div class="pager"><span>Menampilkan ${rows.length ? (t.hal - 1) * PER + 1 : 0}–${Math.min(t.hal * PER, rows.length)} dari ${fmtNum(rows.length)}</span>
          <div class="pages"><button class="btn sm" data-h="${t.hal - 1}" ${t.hal <= 1 ? 'disabled' : ''}>Sebelumnya</button>
          ${pages.map(p => p === '…' ? '<span style="padding:4px">…</span>' : `<button class="btn sm ${p === t.hal ? 'primary' : ''}" data-h="${p}">${p}</button>`).join('')}
          <button class="btn sm" data-h="${t.hal + 1}" ${t.hal >= nHal ? 'disabled' : ''}>Berikutnya</button></div></div></section>`;
    return { html: html, after: () => {
      let tm;
      U.$('#tb-q').oninput = e => { clearTimeout(tm); tm = setTimeout(() => { t.q = e.target.value; t.hal = 1; App.render(); U.$('#tb-q').focus(); const v = U.$('#tb-q'); v.setSelectionRange(v.value.length, v.value.length); }, 250); };
      U.$('#tb-kel').onchange = e => { t.kel = e.target.value; t.hal = 1; App.render(); };
      U.$('#tb-kual').onchange = e => { t.kual = e.target.value; t.hal = 1; App.render(); };
      U.$('#tb-hit').onchange = e => { t.hitung = e.target.value; t.hal = 1; App.render(); };
      U.$('#tb-reset').onclick = () => { Object.assign(t, { q: '', kel: '', kual: '', hitung: '', hal: 1 }); App.render(); };
      U.$$('th.sortable').forEach(h => h.onclick = () => { if (t.sort === h.dataset.s) t.dir *= -1; else { t.sort = h.dataset.s; t.dir = 1; } App.render(); });
      U.$$('.pages button[data-h]').forEach(b => b.onclick = () => { t.hal = Number(b.dataset.h); App.render(); });
      U.$$('tr[data-id]').forEach(tr => tr.onclick = () => detailResponden(tr.dataset.id));
    } };
  }

  function detailResponden(id) {
    const r = S().boot.rows.find(x => x.id === id); if (!r) return;
    const peta = Data.petaAsumsi(S().boot.asumsi);
    const legHtml = (legs, ok) => legs.map((l, i) => { const a = peta[l[0]] || {};
      const g = ok && a.ef !== null && a.ef !== undefined ? l[1] * r.h * a.ef / l[2] / 1000 : null;
      return `<div class="leg"><div class="k">Leg ${i + 1}</div>${modeChip(l[0], a.k)}<b>${l[1] === null ? '—' : fmtNum(l[1], 1) + ' km'}</b>
        <div class="small muted">Pembagi okupansi ${fmtNum(l[2])} • ${g === null ? 'tidak dihitung' : auto(g) + ' kg CO₂e/mgg'}</div></div>`; }).join('');
    const lk = Data.LIKERT.map((l, i) => `<div><b>${r.lk[i] === null ? '—' : r.lk[i]}</b>${l.kode}</div>`).join('');
    App.drawer(`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><div class="crumb small muted">Inspeksi data responden</div><h2>${esc(r.id)} <span class="chip">${esc(singkatStatus(r.st))}</span></h2>
        <p class="small muted">${esc(r.fk)} • ${esc(r.ps)}</p></div><button class="btn icon ghost" data-close>${icon('x')}</button></div>
      <dl class="dl"><dt>Wilayah asal</dt><dd>${esc(r.w || 'Belum terpetakan')} ${r.kp ? `<span class="chip">${esc(r.kp)}</span>` : ''}</dd>
        <dt>Jarak estimasi</dt><dd>${r.km === null ? '—' : fmtNum(r.km, 1) + ' km satu arah'}</dd>
        <dt>Frekuensi</dt><dd>${esc(r.fq)} → ${r.h === null ? '—' : fmtNum(r.h, 1) + ' hari/minggu'}</dd>
        <dt>Penumpang</dt><dd>Pergi ${fmtNum(r.pnp)} • Pulang ${fmtNum(r.pnl)}</dd>
        <dt>Rute sama</dt><dd>${esc(r.rs)}</dd><dt>Q17</dt><dd>${esc(r.pt)}</dd><dt>Q18</dt><dd>${esc(r.tr)}</dd>
        <dt>Klaster</dt><dd>${r.kl ? 'Klaster ' + r.kl + klLabel('Klaster ' + r.kl) : '—'}</dd></dl>
      <div><h3>Perjalanan pergi ${r.okp ? `<span class="chip ok">${auto(r.ep / 1000)} kg CO₂e/mgg</span>` : '<span class="chip warn">Dikecualikan</span>'}</h3><div class="legs" style="margin-top:8px">${legHtml(r.lp, r.okp)}</div></div>
      <div><h3>Perjalanan pulang ${r.okl ? `<span class="chip ok">${auto(r.el / 1000)} kg CO₂e/mgg</span>` : '<span class="chip warn">Dikecualikan</span>'}</h3><div class="legs" style="margin-top:8px">${legHtml(r.ll, r.okl)}</div></div>
      ${r.ak ? `<div class="banner warn">${icon('alert')}<div><b>Alasan dikecualikan</b><p>${esc(r.ak)}</p></div></div>` : ''}
      <div><h3>Skor persepsi (1–5)</h3><div class="likert-grid" style="margin-top:8px">${lk}</div></div>
      <div><h3>Hambatan transportasi umum</h3><p class="small" style="margin-top:6px">${r.hb.length ? r.hb.map(esc).join(' • ') : '—'}</p></div>
      <div><h3>Flag kualitas</h3><ul class="msgs" style="margin-top:6px">${r.fl.length ? r.fl.map(x => `<li><b>${esc(x)}</b> — ${esc(FLAG_INFO[x] || '')}</li>`).join('') : '<li>Tidak ada flag.</li>'}</ul></div>`);
  }

  return { beranda, profil, dampak, simulasi, persepsi, statistik, tabel: tabelData, kpi, card, head, kosong, canvas, tabel_: tabel, legenda, bannerEstimasi, KEL5, LIK_WARNA, LIK_LABEL, ARAH_LABEL, klLabel, labelQ17 };
})();
