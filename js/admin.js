/* ============================================================
 * admin.js — Unggah Berkas, Pengaturan Asumsi, Pengguna & Log
 * ============================================================ */
const Admin = (function () {
  'use strict';
  const { esc, fmtNum, icon, tanggal, toast, loading } = U;
  const P = Pages;
  const S = () => App.state;

  // =========================================================
  // UNGGAH BERKAS (FR-08, FR-12)
  // =========================================================
  const JENIS = [
    { v: 'Responden', t: 'Responden (sheet Olahan)', d: 'Data survei Q1–Q25. Nama, NIM/NIP, unit, dan email dibuang di browser.' },
    { v: 'AnalisisStatistik', t: 'Analisis Statistik', d: 'Sheet Clustering, Uji Hubungan, Tabulasi Silang dari berkas yang sama.' },
    { v: 'TabelJarak', t: 'Tabel Jarak', d: 'Wilayah → jarak km ke kampus (mis. hasil Google Maps).' },
    { v: 'KamusWilayah', t: 'Kamus Wilayah', d: 'Teks asal (Q9) → nama wilayah di Tabel Jarak.' },
    { v: 'AsumsiEmisi', t: 'Faktor Emisi & Energi', d: 'Faktor per moda baku beserta sumber rujukan.' }
  ];

  function unggah() {
    const u = S().unggah;
    const ganti = u.mode === 'Ganti';
    const langkah = !u.parsed ? 1 : !u.preview ? 2 : 3;
    const pv = u.preview;
    const html = P.head('Administrasi • FR-08', 'Unggah & Pembaruan Data Excel',
      'Berkas .xlsx (maks. 10 MB) dibaca di browser, divalidasi di server, lalu baru disimpan setelah Anda menekan Konfirmasi. Hitung ulang berjalan otomatis.',
      `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="up-tpl">${icon('download', 'ic-sm')} Unduh template ${esc(u.jenis)}</button></div>`) +
      `<section class="card lg">
        <div class="steps"><div class="step ${langkah >= 1 ? 'on' : ''}"><i>1</i>Pilih jenis &amp; berkas</div><div class="step-line"></div>
          <div class="step ${langkah >= 2 ? 'on' : ''}"><i>2</i>Validasi &amp; pratinjau</div><div class="step-line"></div>
          <div class="step ${langkah >= 3 ? 'on' : ''}"><i>3</i>Konfirmasi</div></div>
        <div class="grid g2" style="margin-top:18px">
          <div style="display:grid;gap:10px;align-content:start">
            <b class="small">Jenis data</b>
            ${JENIS.map(j => `<label class="choice ${u.jenis === j.v ? 'on' : ''}"><input type="radio" name="up-jenis" value="${j.v}" ${u.jenis === j.v ? 'checked' : ''}>
              <div><b>${esc(j.t)}</b><span>${esc(j.d)}</span></div></label>`).join('')}
          </div>
          <div style="display:grid;gap:14px;align-content:start">
            ${u.jenis === 'AnalisisStatistik' ? `<div class="banner">${icon('info')}<div><b>Selalu mode Ganti</b><p>Hasil klaster &amp; uji gelombang terpilih diganti seluruhnya. Jumlah dan nomor responden dicek terhadap data Responden.</p></div></div>` : `
            <div><b class="small">Metode integrasi</b><div class="grid g2" style="gap:10px;margin-top:6px">
              <label class="choice ${!ganti ? 'on' : ''}"><input type="radio" name="up-mode" value="Tambah" ${!ganti ? 'checked' : ''}><div><b>Tambah</b><span>ID yang sudah ada ditolak/dilewati.</span></div></label>
              <label class="choice ${ganti ? 'on' : ''}"><input type="radio" name="up-mode" value="Ganti" ${ganti ? 'checked' : ''}><div><b>Ganti</b><span>Cadangan dibuat otomatis, lalu data diganti.</span></div></label>
            </div></div>`}
            ${u.jenis === 'Responden' || u.jenis === 'AnalisisStatistik' ? `<label class="field"><span>Kode gelombang survei</span>
              <input class="input" id="up-gel" value="${esc(u.gel)}" maxlength="20" placeholder="mis. G1, 2026-Ganjil">
              <span class="small muted" style="font-weight:400">ID responden = gelombang + nomor (mis. ${esc(u.gel || 'G1')}-0001). Klaster dicocokkan per gelombang.</span></label>` : ''}
            <div class="drop" id="up-drop" tabindex="0" role="button" aria-label="Pilih berkas Excel">
              ${icon('upload')}<p style="margin-top:8px"><b>${u.file ? esc(u.file.name) : 'Seret berkas .xlsx ke sini atau klik untuk memilih'}</b></p>
              <p class="small muted">${u.file ? fmtNum(u.file.size / 1024 / 1024, 2) + ' MB' : 'Maksimal 10 MB'}</p>
              <input type="file" id="up-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="hidden"></div>
            ${u.parsed ? `<div class="banner">${icon('shield')}<div><b>Dibaca di browser</b><p>${esc(u.parsed.ringkas)}</p></div></div>` : ''}
            ${u.galatLokal ? `<div class="banner err">${icon('alert')}<div><b>Berkas tidak dapat dibaca</b><p>${esc(u.galatLokal)}</p></div></div>` : ''}
          </div></div></section>
      ${pv ? pratinjau(pv) : ''}
      <section class="card"><div class="card-head"><div><h2>Riwayat &amp; jejak audit unggahan</h2><p>Log tidak dapat diubah.</p></div>
        <button class="btn sm" id="up-log-refresh">${icon('refresh', 'ic-sm')} Segarkan</button></div><div id="up-log">${P.kosong('Memuat…', '')}</div></section>
      <section class="card"><div class="card-head"><div><h2>Cadangan &amp; pemulihan</h2><p>Cadangan dibuat otomatis sebelum mode Ganti, pemulihan, atau penghapusan.</p></div></div>
        <div id="up-backup">${P.kosong('Memuat…', '')}</div>
        <div class="card-foot"><span>Hapus seluruh data satu gelombang (cadangan dibuat lebih dulu):</span>
          <span style="display:flex;gap:8px"><select id="up-hapus-g" style="width:auto">${S().boot.meta.gelombang.map(g => `<option>${esc(g)}</option>`).join('')}</select>
          <button class="btn sm danger" id="up-hapus">${icon('trash', 'ic-sm')} Hapus gelombang</button></span></div></section>`;
    return { html: html, after: () => {
      U.$$('input[name=up-jenis]').forEach(i => i.onchange = () => { u.jenis = i.value; resetFile(); App.render(); });
      U.$$('input[name=up-mode]').forEach(i => i.onchange = () => { u.mode = i.value; ulangValidasi(); });
      const gel = U.$('#up-gel'); if (gel) gel.onchange = () => { u.gel = gel.value.trim() || 'G1'; ulangValidasi(); };
      U.$('#up-tpl').onclick = () => Excel.buatTemplate(u.jenis);
      const drop = U.$('#up-drop'), inp = U.$('#up-file');
      drop.onclick = () => inp.click();
      drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) bacaBerkas(e.dataTransfer.files[0]); };
      inp.onchange = () => inp.files[0] && bacaBerkas(inp.files[0]);
      const kf = U.$('#up-confirm'); if (kf) kf.onclick = konfirmasi;
      const st = U.$('#up-setuju'); if (st) st.onchange = () => { u.setuju = st.checked; U.$('#up-confirm').disabled = !bolehKonfirmasi(); };
      const bt = U.$('#up-batal'); if (bt) bt.onclick = () => { resetFile(); App.render(); };
      U.$('#up-log-refresh').onclick = muatLogBackup;
      U.$('#up-hapus').onclick = hapusGelombang;
      muatLogBackup();
    } };
  }

  function bolehKonfirmasi() {
    const pv = S().unggah.preview;
    return pv && pv.jumlahSiap + (pv.jenis === 'AnalisisStatistik' ? 1 : 0) > 0 && !pv.galat.some(g => g.baris === '-') && (!pv.perluSetuju || S().unggah.setuju);
  }

  function pratinjau(pv) {
    const nPerhatian = pv.hitung ? pv.hitung.perhatian : 0;
    const nDup = pv.hitung ? pv.hitung.duplikat : 0;
    const stIcon = s => s === 'Valid' ? `<span class="chip ok">${icon('check', 'ic-sm')} Valid</span>` : s === 'Duplikat' ? '<span class="chip warn">Duplikat</span>' :
      s === 'Perhatian' ? '<span class="chip warn">Perhatian</span>' : '<span class="chip err">Galat</span>';
    const isAn = pv.jenis === 'AnalisisStatistik';
    const kolom = isAn ? ['Bagian', 'Status', 'Keterangan'] : pv.jenis === 'Responden' ?
      ['Baris', 'ID', 'Status', 'Civitas', 'Fakultas', 'Asal (Q9)', 'Moda utama', 'Keterangan'] : ['Baris', 'Kunci', 'Status', 'Keterangan'];
    const baris = pv.pratinjau.map(p => isAn ? `<tr><td>${esc(p.id)}</td><td>${stIcon(p.status)}</td><td>${esc(p.pesan)}</td></tr>` :
      pv.jenis === 'Responden' ? `<tr><td class="num">${p.baris}</td><td class="nowrap"><b>${esc(p.id)}</b></td><td>${stIcon(p.status)}</td><td>${esc(U.singkatStatus(p.civitas))}</td>
        <td>${esc(U.singkatFak(p.fakultas))}</td><td>${esc(p.asal)}</td><td>${esc(p.moda)}</td><td>${esc(p.pesan)}</td></tr>` :
      `<tr><td class="num">${p.baris}</td><td>${esc(p.id)}</td><td>${stIcon(p.status)}</td><td>${esc(p.pesan)}</td></tr>`);
    return `<section class="card lg"><div class="card-head"><div><h2>Validasi skema &amp; integritas (pra-simpan)</h2>
        <p>Jenis ${esc(pv.jenis)} • mode ${esc(pv.jenis === 'AnalisisStatistik' ? 'Ganti' : pv.mode)} • gelombang ${esc(pv.gelombang)}</p></div></div>
      <div class="stat-cards">
        <div class="stat-card ok">${icon('check')}<div><b>${fmtNum(isAn ? pv.total : pv.jumlahSiap)}</b><span>${isAn ? 'baris klaster terbaca' : 'baris siap disimpan'}</span></div></div>
        <div class="stat-card ${nDup ? 'warn' : ''}">${icon('info')}<div><b>${fmtNum(nDup)}</b><span>duplikat dilewati</span></div></div>
        <div class="stat-card ${nPerhatian ? 'warn' : ''}">${icon('alert')}<div><b>${fmtNum(nPerhatian)}</b><span>perlu perhatian (tetap disimpan)</span></div></div>
        <div class="stat-card ${pv.galat.length ? 'err' : 'ok'}">${icon('x')}<div><b>${fmtNum(pv.galat.length)}</b><span>galat (tidak disimpan)</span></div></div>
      </div>
      ${pv.galat.length ? `<div class="banner err" style="margin-top:14px">${icon('alert')}<div><b>Galat</b><ul class="msgs">${pv.galat.slice(0, 12).map(g => `<li>${g.baris !== '-' ? 'Baris ' + g.baris + ': ' : ''}${esc(g.pesan)}</li>`).join('')}</ul></div></div>` : ''}
      ${pv.peringatan.length ? `<div class="banner warn" style="margin-top:14px">${icon('alert')}<div><b>Peringatan</b><ul class="msgs">${pv.peringatan.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div></div>` : ''}
      <h3 style="margin:18px 0 8px">Pratinjau ${isAn ? 'isi' : '(10 baris pertama + semua baris bermasalah)'}</h3>
      ${P.tabel_(kolom, baris)}
      ${pv.perluSetuju ? `<label class="choice" style="margin-top:14px"><input type="checkbox" id="up-setuju" ${S().unggah.setuju ? 'checked' : ''}>
        <div><b>Saya memahami ketidakcocokan di atas dan tetap ingin menyimpan</b><span>Wajib dicentang karena jumlah/nomor responden klaster tidak cocok dengan data Responden.</span></div></label>` : ''}
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;flex-wrap:wrap">
        <button class="btn" id="up-batal">Batal / unggah berkas lain</button>
        <button class="btn primary" id="up-confirm" ${bolehKonfirmasi() ? '' : 'disabled'}>${icon('lock', 'ic-sm')} Konfirmasi &amp; simpan ke Google Sheets</button></div></section>`;
  }

  function resetFile() { Object.assign(S().unggah, { file: null, wb: null, parsed: null, preview: null, setuju: false, galatLokal: '' }); }

  async function bacaBerkas(file) {
    const u = S().unggah;
    resetFile();
    if (!/\.xlsx$/i.test(file.name)) { u.galatLokal = 'Hanya berkas .xlsx yang diterima.'; App.render(); return; }
    if (file.size > 10 * 1024 * 1024) { u.galatLokal = 'Ukuran berkas melebihi 10 MB.'; App.render(); return; }
    u.file = file;
    loading(true, 'Membaca berkas di browser…');
    try {
      u.wb = Excel.bacaWorkbook(await file.arrayBuffer());
      await ulangValidasi(true);
    } catch (e) {
      u.galatLokal = e.message; u.wb = null; loading(false); App.render();
    }
  }

  async function ulangValidasi(dariBaca) {
    const u = S().unggah;
    if (!u.wb) { App.render(); return; }
    u.preview = null; u.setuju = false; u.galatLokal = '';
    loading(true, 'Memvalidasi…');
    try {
      const payload = { jenis: u.jenis, mode: u.mode, gelombang: u.gel, namaFile: u.file.name };
      if (u.jenis === 'Responden') {
        const r = Excel.parseResponden(u.wb);
        payload.rows = r.rows;
        u.parsed = { ringkas: `Sheet "${r.info.sheet}" (${r.info.format}): ${fmtNum(r.info.jumlah)} baris. ` +
          (r.info.kolomDibuang.length ? 'Kolom identitas dibuang sebelum dikirim: ' + r.info.kolomDibuang.join(', ') + '. ' : '') +
          (r.info.emailGanda ? r.info.emailGanda + ' baris ditandai EmailDuplikat.' : '') };
      } else if (u.jenis === 'AnalisisStatistik') {
        const a = Excel.parseAnalisis(u.wb);
        payload.analisis = a;
        u.parsed = { ringkas: `Klaster: ${a.klaster.ringkasan.length} klaster, ${fmtNum(a.klaster.responden.length)} responden • ` +
          `${a.uji.length} hasil uji • ${a.tabulasi.length} tabulasi silang.` };
      } else {
        const t = Excel.parseTabel(u.wb, u.jenis);
        payload.rows = t.rows;
        u.parsed = { ringkas: `Sheet "${t.info.sheet}": ${fmtNum(t.info.jumlah)} baris.` };
      }
      u.preview = await API.call('previewUpload', payload);
    } catch (e) {
      u.galatLokal = e.message;
    } finally { loading(false); App.render(); }
  }

  async function konfirmasi() {
    const u = S().unggah;
    if (!bolehKonfirmasi()) return;
    if (u.preview.mode === 'Ganti' && u.jenis !== 'AnalisisStatistik' && !confirm('Mode Ganti akan mengganti data. Cadangan dibuat otomatis. Lanjutkan?')) return;
    loading(true, 'Menyimpan, mencadangkan, dan menghitung ulang…');
    try {
      const r = await API.call('commitUpload', { token: u.preview.token, setuju: u.setuju });
      toast(r.message || 'Tersimpan.', 'ok');
      resetFile();
      await App.muat(true);
    } catch (e) { toast(e.message, 'error'); loading(false); }
  }

  async function muatLogBackup() {
    try {
      const [logs, bk] = await Promise.all([API.call('getLogs'), API.call('listBackups')]);
      const el = U.$('#up-log'); if (!el) return;
      el.innerHTML = P.tabel_(['Waktu', 'Akun', 'Jenis', 'Berkas', { t: 'Baris', num: 1 }, 'Mode', 'Status', 'Catatan'],
        logs.unggah.slice(0, 30).map(l => `<tr><td class="nowrap">${tanggal(l.waktu)}</td><td>${esc(l.email)}</td><td>${esc(l.jenis)}</td><td>${esc(l.file)}</td>
          <td class="num">${fmtNum(l.jumlah)}</td><td>${esc(l.mode)}</td><td><span class="chip ${/sukses/i.test(l.status) ? 'ok' : 'err'}">${esc(l.status)}</span></td><td class="small">${esc(l.catatan)}</td></tr>`));
      U.$('#up-backup').innerHTML = P.tabel_(['Nama cadangan', 'Dibuat', ''], bk.slice(0, 15).map(b => `<tr><td>${esc(b.nama)}</td><td class="nowrap">${tanggal(b.waktu)}</td>
        <td><button class="btn sm" data-restore="${esc(b.id)}" data-nama="${esc(b.nama)}">${icon('refresh', 'ic-sm')} Pulihkan</button></td></tr>`));
      U.$$('[data-restore]').forEach(btn => btn.onclick = async () => {
        if (!confirm('Pulihkan "' + btn.dataset.nama + '"? Data sekarang dicadangkan dulu, lalu diganti isi cadangan ini.')) return;
        loading(true, 'Memulihkan…');
        try { const r = await API.call('restoreBackup', { fileId: btn.dataset.restore }); toast(r.message, 'ok'); await App.muat(true); }
        catch (e) { toast(e.message, 'error'); loading(false); }
      });
    } catch (e) { const el = U.$('#up-log'); if (el) el.innerHTML = `<p class="small" style="color:var(--error)">${esc(e.message)}</p>`; }
  }

  async function hapusGelombang() {
    const g = U.$('#up-hapus-g').value;
    if (!g) return;
    const ketik = prompt('Ketik HAPUS ' + g + ' untuk menghapus seluruh responden, klaster, dan uji gelombang ini (cadangan dibuat lebih dulu):');
    if (ketik !== 'HAPUS ' + g) { if (ketik !== null) toast('Teks konfirmasi tidak cocok. Tidak ada yang dihapus.'); return; }
    loading(true, 'Menghapus…');
    try { const r = await API.call('hapusGelombang', { gelombang: g }); toast(r.message, 'ok'); await App.muat(true); }
    catch (e) { toast(e.message, 'error'); loading(false); }
  }

  // =========================================================
  // PENGATURAN ASUMSI (FR-09)
  // =========================================================
  const KEYAKINAN = ['Tinggi', 'Sedang', 'Rendah', 'Luar wilayah'];
  function kolomDef(sheet) {
    const a = S().asm;
    const moda = (a.edits.AsumsiEmisi || a.data.AsumsiEmisi).map(r => r.ModaBaku).filter(Boolean);
    const wil = (a.edits.TabelJarak || a.data.TabelJarak).map(r => r.Wilayah).filter(Boolean);
    return {
      AsumsiEmisi: [['ModaBaku', 'text', 180], ['Kelompok', Data.KELOMPOK, 150], ['BasisFaktor', ['kendaraan-km', 'penumpang-km'], 130],
        ['FaktorEmisi_gCO2e', 'num', 100, 'Faktor emisi (g CO₂e/km)'], ['FaktorEnergi_MJ', 'num', 90, 'Faktor energi (MJ/km)'],
        ['MaksPenumpang', 'num', 80, 'Maks. penumpang'], ['PadananListrik', [''].concat(moda), 160, 'Padanan listrik'], ['Sumber', 'text', 200, 'Sumber rujukan'], ['Catatan', 'text', 200]],
      TabelJarak: [['Wilayah', 'text', 200], ['JarakKm', 'num', 90, 'Jarak (km)'], ['Keyakinan', KEYAKINAN, 120], ['Status', ['Aktif', 'Dikecualikan'], 120],
        ['Sumber', 'text', 220], ['Catatan', 'text', 240]],
      KamusWilayah: [['AsalAsli', 'text', 320, 'Teks asal (Q9, huruf kecil)'], ['Wilayah', wil, 220], ['KeyakinanPemetaan', KEYAKINAN, 130, 'Keyakinan pemetaan']],
      KamusModa: [['JawabanAsli', 'text', 360, 'Jawaban asli (Q10/Q14)'], ['ModaBaku', moda, 220, 'Moda baku'], ['TidakSpesifik', ['Tidak', 'Ya'], 110, 'Tidak spesifik']],
      KamusFrekuensi: [['JawabanAsli', 'text', 260, 'Jawaban asli (Q8)'], ['HariPerMinggu', 'num', 110, 'Hari/minggu'], ['Catatan', 'text', 260]],
      Parameter: [['Kunci', 'ro', 190], ['Nilai', 'text', 180], ['Keterangan', 'ro', 420]]
    }[sheet];
  }
  const TAB_ASM = [['AsumsiEmisi', 'Faktor Emisi & Energi'], ['TabelJarak', 'Tabel Jarak Wilayah'], ['KamusWilayah', 'Kamus Wilayah'],
    ['KamusModa', 'Kamus Moda'], ['KamusFrekuensi', 'Kamus Frekuensi'], ['Parameter', 'Parameter Global'], ['Riwayat', 'Riwayat Perubahan']];

  function pengaturan() {
    const a = S().asm;
    if (!a.data) {
      setTimeout(muatAsumsi, 0);
      return { html: P.head('Administrasi • FR-09', 'Pengaturan Asumsi & Faktor Emisi') + P.card('', '', P.kosong('Memuat tabel asumsi…', '')) };
    }
    const tab = a.tab;
    const dirty = Object.keys(a.dirty).filter(k => a.dirty[k]);
    let isi;
    if (tab === 'Riwayat') {
      isi = P.card('Riwayat perubahan asumsi', 'Siapa dan kapan (50 terakhir)', P.tabel_(['Waktu', 'Akun', 'Sheet', 'Ringkasan'],
        a.data.logAsumsi.map(l => `<tr><td class="nowrap">${tanggal(l.waktu)}</td><td>${esc(l.email)}</td><td>${esc(l.sheet)}</td><td>${esc(l.ringkasan)}</td></tr>`)));
    } else {
      const rows = a.edits[tab] || a.data[tab];
      const def = kolomDef(tab);
      const q = (a.cari || '').toLowerCase();
      const idx = rows.map((r, i) => i).filter(i => !q || def.some(d => String(rows[i][d[0]] === undefined ? '' : rows[i][d[0]]).toLowerCase().indexOf(q) >= 0));
      const tampil = idx.slice(0, 150);
      const sel = (opsi, v) => { const ada = opsi.indexOf(String(v)) >= 0 || v === '' || v === undefined;
        return (ada ? '' : `<option selected>${esc(v)}</option>`) + opsi.map(o => `<option value="${esc(o)}" ${String(v) === String(o) ? 'selected' : ''}>${esc(o || '—')}</option>`).join(''); };
      const sel0 = (opsi, v) => sel(opsi, v === undefined || v === null ? '' : v);
      const sel1 = (opsi, v) => (v === '' || v === undefined) && opsi[0] !== '' ? '<option value="" selected>— pilih —</option>' + sel(opsi, v) : sel0(opsi, v);
      const baris = tampil.map(i => { const r = rows[i];
        return `<tr data-i="${i}">${def.map(d => { const v = r[d[0]] === undefined || r[d[0]] === null ? '' : r[d[0]];
          if (d[1] === 'ro') return `<td class="small">${esc(v)}</td>`;
          if (Array.isArray(d[1])) return `<td class="edit"><select data-k="${d[0]}" style="min-width:${d[2]}px">${sel1(d[1], v)}</select></td>`;
          return `<td class="edit"><input data-k="${d[0]}" ${d[1] === 'num' ? 'type="number" step="any" min="0" class="tnum"' : ''} value="${esc(v)}" style="min-width:${d[2]}px"></td>`; }).join('')}
          ${tab !== 'Parameter' ? `<td class="edit"><button class="btn icon ghost sm" data-del="${i}" title="Hapus baris">${icon('trash', 'ic-sm')}</button></td>` : ''}</tr>`; });
      const bantu = {
        AsumsiEmisi: 'Faktor hanya dipakai bila kolom Sumber terisi. Basis kendaraan-km dibagi (1 + penumpang, dibatasi MaksPenumpang); penumpang-km tidak dibagi. Kosongkan faktor untuk mengecualikan moda.',
        TabelJarak: 'Jarak satu arah ke kampus (km). Nilai awal adalah DRAF (garis lurus × 1,3 dari titik tengah perkiraan) dan wajib diverifikasi, mis. dengan Google Maps; ganti kolom Sumber setelah diverifikasi.',
        KamusWilayah: 'Mencocokkan teks asal Q9 (huruf kecil, spasi dirapikan) dengan wilayah di Tabel Jarak. Jawaban baru yang belum ada akan dikecualikan dari hitung dampak sampai dipetakan.',
        KamusModa: 'Mencocokkan jawaban Q10/Q14 dengan moda baku di Faktor Emisi. "Tidak spesifik = Ya" memberi flag ModaTidakSpesifik.',
        KamusFrekuensi: 'Konversi jawaban Q8 ke hari per minggu. Nilai awal memakai titik tengah rentang.',
        Parameter: 'MingguPerTahun • AturanPembagianJarak (Rata/AktifTetap) • JarakAktifKm • PenumpangBawaan • PenumpangBilaSendiri (IkutiIsian/Nol) • NamaKampus • VersiAsumsi.'
      }[tab];
      const belum = tab === 'KamusWilayah' && a.data.asalBelumTerpetakan.length ? P.card('Asal responden yang belum terpetakan',
        fmtNum(a.data.asalBelumTerpetakan.reduce((s, x) => s + x.Jumlah, 0)) + ' responden dikecualikan dari hitung dampak karena teks asalnya belum ada di kamus',
        P.tabel_(['Teks asal (Q9)', { t: 'Responden', num: 1 }, 'Petakan ke wilayah', ''], a.data.asalBelumTerpetakan.slice(0, 60).map((x, i) =>
          `<tr><td>${esc(x.AsalAsli || '(kosong)')}</td><td class="num">${x.Jumlah}</td><td class="edit"><select data-map="${i}"><option value="">— pilih —</option>${kolomDef('KamusWilayah')[1][1].map(w => `<option>${esc(w)}</option>`).join('')}</select></td>
          <td class="edit"><button class="btn sm" data-addmap="${i}">${icon('plus', 'ic-sm')} Tambahkan</button></td></tr>`))) : '';
      isi = `${belum}<section class="card"><div class="card-head"><div><h2>${esc(TAB_ASM.find(t => t[0] === tab)[1])} <span class="chip">${fmtNum(rows.length)} baris</span></h2><p>${esc(bantu)}</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${tab !== 'Parameter' ? `<button class="btn sm" id="asm-add">${icon('plus', 'ic-sm')} Tambah baris</button>` : ''}</div></div>
        <label class="field" style="max-width:360px;margin-bottom:12px"><input class="input" id="asm-cari" placeholder="Cari di tabel ini…" value="${esc(a.cari || '')}"></label>
        <div class="table-wrap" style="max-height:560px"><table class="t"><thead><tr>${def.map(d => `<th>${esc(d[3] || d[0])}</th>`).join('')}${tab !== 'Parameter' ? '<th></th>' : ''}</tr></thead>
        <tbody>${baris.join('') || `<tr><td colspan="${def.length + 1}" class="muted">Tidak ada baris.</td></tr>`}</tbody></table></div>
        <div class="pager"><span>Menampilkan ${tampil.length} dari ${idx.length} baris yang cocok${idx.length > 150 ? ' (persempit dengan pencarian)' : ''}</span></div></section>`;
    }
    const html = P.head('Administrasi • FR-09', 'Pengaturan Asumsi & Faktor Emisi',
      'Ubah tabel asumsi tanpa menyentuh kode. Setiap penyimpanan divalidasi (angka tidak negatif, Sumber wajib untuk faktor), dicatat siapa dan kapan, lalu memicu hitung ulang.',
      `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" id="asm-recompute">${icon('refresh', 'ic-sm')} Hitung ulang</button>
        <button class="btn" id="asm-export">${icon('download', 'ic-sm')} Ekspor asumsi (.xlsx)</button>
        ${dirty.length ? `<button class="btn" id="asm-undo">Batalkan perubahan</button>` : ''}
        <button class="btn primary" id="asm-save" ${dirty.indexOf(tab) < 0 ? 'disabled' : ''}>${icon('check', 'ic-sm')} Simpan &amp; hitung ulang</button></div>`) +
      `<div class="banner">${icon('shield')}<div><b>Tata kelola perubahan asumsi</b><p>Faktor emisi dan energi wajib bersumber rujukan resmi (mis. IPCC, KLHK, Kemenhub, DESNZ/DEFRA) sebelum dipakai.
        Perubahan langsung memperbarui seluruh halaman dampak.</p>${dirty.length ? `<div class="meta"><span class="chip warn">Belum disimpan: ${dirty.map(esc).join(', ')}</span></div>` : ''}</div></div>
      <div class="tabs" id="asm-tabs">${TAB_ASM.map(t => `<button data-t="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${esc(t[1])}${a.dirty[t[0]] ? ' •' : ''}</button>`).join('')}</div>
      <div class="grid">${isi}</div>`;
    return { html: html, after: () => afterPengaturan() };
  }

  function afterPengaturan() {
    const a = S().asm, tab = a.tab;
    const pastikanEdit = () => { if (!a.edits[tab]) a.edits[tab] = JSON.parse(JSON.stringify(a.data[tab])); return a.edits[tab]; };
    U.$$('#asm-tabs button').forEach(b => b.onclick = () => { a.tab = b.dataset.t; a.cari = ''; App.render(); });
    const c = U.$('#asm-cari');
    if (c) { let tm; c.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { a.cari = c.value; App.render(); const n = U.$('#asm-cari'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); }; }
    U.$$('tr[data-i] [data-k]').forEach(el => el.onchange = () => {
      const rows = pastikanEdit(); const i = Number(el.closest('tr').dataset.i);
      let v = el.value; if (el.type === 'number') v = v === '' ? '' : Number(v);
      rows[i][el.dataset.k] = v; a.dirty[tab] = true;
      U.$('#asm-save').disabled = false;
    });
    U.$$('[data-del]').forEach(b => b.onclick = () => { const rows = pastikanEdit(); rows.splice(Number(b.dataset.del), 1); a.dirty[tab] = true; App.render(); });
    const add = U.$('#asm-add'); if (add) add.onclick = () => { const rows = pastikanEdit(); const o = {}; kolomDef(tab).forEach(d => { o[d[0]] = ''; }); rows.unshift(o); a.cari = ''; a.dirty[tab] = true; App.render(); };
    U.$$('[data-addmap]').forEach(b => b.onclick = () => {
      const i = Number(b.dataset.addmap); const w = U.$(`[data-map="${i}"]`).value;
      if (!w) { toast('Pilih wilayah terlebih dahulu.'); return; }
      const x = a.data.asalBelumTerpetakan[i];
      const rows = pastikanEdit(); rows.unshift({ AsalAsli: x.AsalAsli, Wilayah: w, KeyakinanPemetaan: 'Rendah' });
      a.data.asalBelumTerpetakan.splice(i, 1); a.dirty[tab] = true; App.render();
      toast('Ditambahkan ke kamus (belum disimpan). Tekan "Simpan & hitung ulang".');
    });
    U.$('#asm-save').onclick = simpanAsumsi;
    const u = U.$('#asm-undo'); if (u) u.onclick = () => { if (confirm('Buang semua perubahan yang belum disimpan?')) { a.edits = {}; a.dirty = {}; a.data = null; App.render(); } };
    U.$('#asm-recompute').onclick = async () => { loading(true, 'Menghitung ulang…');
      try { const r = await API.call('recompute'); toast(r.message, 'ok'); await App.muat(true); } catch (e) { toast(e.message, 'error'); loading(false); } };
    U.$('#asm-export').onclick = () => Excel.unduhXlsx('Asumsi_Dashboard_' + new Date().toISOString().slice(0, 10) + '.xlsx',
      ['AsumsiEmisi', 'TabelJarak', 'KamusWilayah', 'KamusModa', 'KamusFrekuensi', 'Parameter'].map(s => {
        const h = Excel.HEADER_TABEL[s] || Object.keys((a.data[s] || [])[0] || {});
        return { nama: s, data: [h].concat((a.edits[s] || a.data[s]).map(r => h.map(k => r[k]))) };
      }));
  }

  async function muatAsumsi() {
    try { const d = await API.call('getAsumsi'); Object.assign(S().asm, { data: d, edits: {}, dirty: {} }); }
    catch (e) { toast(e.message, 'error'); }
    if (App.state.page === 'pengaturan') App.render();
  }

  async function simpanAsumsi() {
    const a = S().asm, tab = a.tab;
    if (!a.edits[tab]) return;
    const kunci = { AsumsiEmisi: 'ModaBaku', TabelJarak: 'Wilayah', KamusWilayah: 'AsalAsli', KamusModa: 'JawabanAsli', KamusFrekuensi: 'JawabanAsli', Parameter: 'Kunci' }[tab];
    const rows = a.edits[tab].filter(r => String(r[kunci] || '').trim() !== '');
    if (tab === 'KamusWilayah') rows.forEach(r => { r.AsalAsli = String(r.AsalAsli).replace(/ /g, ' ').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[,;]+$/, ''); });
    loading(true, 'Menyimpan & menghitung ulang…');
    try {
      const r = await API.call('saveAsumsi', { sheet: tab, rows: rows });
      toast(r.message, 'ok');
      delete a.edits[tab]; a.dirty[tab] = false;
      a.data = null;
      await App.muat(true);
    } catch (e) { loading(false); toast(e.message, 'error'); }
  }

  // =========================================================
  // PENGGUNA & LOG (FR-11)
  // =========================================================
  function pengguna() {
    const html = P.head('Administrasi • FR-11', 'Pengguna & Log Aktivitas',
      'Hanya email terdaftar dan aktif yang dapat masuk (dengan kode akses tim). Penonaktifan berlaku pada permintaan berikutnya.') +
      `<div class="grid g-2-1">
        <section class="card"><div class="card-head"><div><h2>Daftar pengguna</h2><p>Peran saat ini: Admin. Admin terakhir tidak dapat dinonaktifkan.</p></div></div>
          <div id="usr-list">${P.kosong('Memuat…', '')}</div>
          <form id="usr-add" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:14px">
            <label class="field" style="flex:2 1 220px"><span>Email</span><input class="input" type="email" name="email" required placeholder="nama@trisakti.ac.id"></label>
            <label class="field" style="flex:1 1 160px"><span>Nama</span><input class="input" name="nama" placeholder="Nama lengkap"></label>
            <button class="btn primary" type="submit">${icon('plus', 'ic-sm')} Tambah</button></form></section>
        <section class="card"><div class="card-head"><div><h2>Ganti kode akses tim</h2><p>Semua anggota memakai kode yang sama. Beri tahu tim setelah diganti.</p></div></div>
          <form id="kode-form" style="display:grid;gap:12px">
            <label class="field"><span>Kode lama</span><input class="input" type="password" name="lama" required autocomplete="current-password"></label>
            <label class="field"><span>Kode baru (min. 8 karakter)</span><input class="input" type="password" name="baru" minlength="8" required autocomplete="new-password"></label>
            <label class="field"><span>Ulangi kode baru</span><input class="input" type="password" name="ulang" minlength="8" required autocomplete="new-password"></label>
            <button class="btn primary" type="submit">${icon('lock', 'ic-sm')} Ganti kode</button></form></section>
      </div>
      <section class="card"><div class="card-head"><div><h2>Log unggahan</h2><p>Tidak dapat diubah dari aplikasi.</p></div></div><div id="log-u">${P.kosong('Memuat…', '')}</div></section>
      <section class="card"><div class="card-head"><div><h2>Log perubahan asumsi &amp; pengguna</h2></div></div><div id="log-a">${P.kosong('Memuat…', '')}</div></section>`;
    return { html: html, after: () => {
      U.$('#usr-add').onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target);
        await simpanUser({ email: fd.get('email'), nama: fd.get('nama'), aktif: true }); e.target.reset(); };
      U.$('#kode-form').onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target);
        if (fd.get('baru') !== fd.get('ulang')) { toast('Kode baru dan ulangan tidak sama.', 'error'); return; }
        loading(true, 'Mengganti kode…');
        try { const r = await API.call('changeKode', { lama: fd.get('lama'), baru: fd.get('baru') }); toast(r.message, 'ok'); e.target.reset(); }
        catch (err) { toast(err.message, 'error'); } finally { loading(false); } };
      muatPengguna();
    } };
  }

  async function muatPengguna() {
    try {
      const [us, logs] = await Promise.all([API.call('listUsers'), API.call('getLogs')]);
      if (!U.$('#usr-list')) return;
      U.$('#usr-list').innerHTML = P.tabel_(['Email', 'Nama', 'Peran', 'Status', 'Ditambahkan', ''], us.map(u => `<tr><td>${esc(u.email)}</td><td>${esc(u.nama)}</td>
        <td>${esc(u.peran)}</td><td>${u.aktif ? '<span class="chip ok">Aktif</span>' : '<span class="chip">Nonaktif</span>'}</td><td class="small">${tanggal(u.ditambahkan)}<br>${esc(u.oleh)}</td>
        <td><button class="btn sm ${u.aktif ? 'danger' : ''}" data-email="${esc(u.email)}" data-nama="${esc(u.nama)}" data-aktif="${u.aktif ? 0 : 1}">${u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></td></tr>`));
      U.$$('#usr-list [data-email]').forEach(b => b.onclick = () => {
        if (b.dataset.email === S().boot.user.email && b.dataset.aktif === '0' && !confirm('Menonaktifkan akun Anda sendiri akan langsung mengeluarkan Anda. Lanjutkan?')) return;
        simpanUser({ email: b.dataset.email, nama: b.dataset.nama, aktif: b.dataset.aktif === '1' });
      });
      U.$('#log-u').innerHTML = P.tabel_(['Waktu', 'Akun', 'Jenis', 'Berkas', { t: 'Baris', num: 1 }, 'Mode', 'Status', 'Catatan'],
        logs.unggah.map(l => `<tr><td class="nowrap">${tanggal(l.waktu)}</td><td>${esc(l.email)}</td><td>${esc(l.jenis)}</td><td>${esc(l.file)}</td><td class="num">${fmtNum(l.jumlah)}</td>
          <td>${esc(l.mode)}</td><td><span class="chip ${/sukses/i.test(l.status) ? 'ok' : 'err'}">${esc(l.status)}</span></td><td class="small">${esc(l.catatan)}</td></tr>`));
      U.$('#log-a').innerHTML = P.tabel_(['Waktu', 'Akun', 'Sheet', 'Ringkasan'], logs.asumsi.map(l => `<tr><td class="nowrap">${tanggal(l.waktu)}</td><td>${esc(l.email)}</td><td>${esc(l.sheet)}</td><td>${esc(l.ringkasan)}</td></tr>`));
    } catch (e) { toast(e.message, 'error'); }
  }

  async function simpanUser(d) {
    loading(true, 'Menyimpan pengguna…');
    try { const r = await API.call('saveUser', d); toast(r.message, 'ok'); await muatPengguna(); }
    catch (e) { toast(e.message, 'error'); } finally { loading(false); }
  }

  return { unggah, pengaturan, pengguna };
})();
