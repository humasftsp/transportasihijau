# Panduan Instalasi — Dashboard Dampak Lingkungan Transportasi Hijau Universitas Trisakti

Arsitektur: **frontend** (HTML/CSS/JS) di **GitHub Pages** dan **backend** di **Google Apps Script** sebagai REST API (JSON). Data disimpan di Google Sheets milik akun yang menjalankan setup.

```
Browser (GitHub Pages)  ──fetch POST (text/plain)──►  Apps Script /exec  ──►  Google Sheets + Drive
index.html, css/, js/                                 Kode.gs + Seed.gs        (database, arsip, cadangan, ekspor)
```

---

## Bagian A — Backend (Google Apps Script)

1. Buka https://script.google.com → **Proyek baru**. Beri nama, misalnya `Dashboard Transportasi Hijau`.
2. Ganti nama berkas `Code.gs` menjadi **`Kode`**, lalu tempel seluruh isi **Kode.gs**.
3. Klik **+** (Tambah berkas) → **Skrip**, beri nama **`Seed`**, lalu tempel seluruh isi **Seed.gs**.
4. Di baris atas `Kode.gs`, isi tiga konstanta berikut:
   ```js
   const ADMIN_EMAIL_AWAL = 'christina.sari@trisakti.ac.id';
   const ADMIN_NAMA_AWAL  = 'Dr. Ir. Christina Sari';
   const KODE_AKSES_AWAL  = 'IsiSandiTimMin8Karakter';   // sandi tim, minimal 8 karakter
   ```
   Klik **Simpan** (ikon disket).
5. Pilih fungsi **`setupAppEnvironment`** di dropdown → **▶ Jalankan** → **Tinjau izin** → izinkan akses Drive, Sheets, Docs, dan layanan eksternal.
   - Buka **Log eksekusi**. Pastikan muncul `✅ Setup selesai!`, beserta tautan Spreadsheet dan folder Drive.
   - Di Drive akan muncul folder **📁 Dashboard Transportasi Hijau Trisakti** berisi database dan folder Unggahan, Cadangan, dan Ekspor.
   - ⚠️ **Jalankan hanya sekali.** Kalau dijalankan lagi, fungsi ini akan menolak agar data tidak terduplikasi.
6. **Kosongkan lagi** `KODE_AKSES_AWAL` (`''`) lalu **Simpan**. Kode sudah tersimpan sebagai hash di Script Properties, jadi tidak perlu dibiarkan tertulis di kode.
7. **Terapkan → Deployment baru** → jenis **Aplikasi web**:
   - *Jalankan sebagai*: **Saya**
   - *Yang memiliki akses*: **Siapa saja**
   - Klik **Terapkan**, lalu **salin URL** yang berakhiran `/exec`.

> "Siapa saja" hanya berarti URL bisa dipanggil dari mana pun. Data tetap terkunci: setiap permintaan wajib membawa token dari login (email terdaftar + kode akses), dan pemeriksaannya dilakukan di server.

**Setelah kode backend diubah:** buka **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**. Dengan cara ini URL `/exec` tidak berubah.

---

## Bagian B — Frontend (GitHub Pages)

Folder hasil ekstrak ZIP ini (`dashboard-transportasi-hijau/`) adalah **folder yang di-`git init`**. Isinya langsung `index.html`, `css/`, `js/`, dan panduan ini. Jangan masuk lebih dalam, dan jangan naik satu level.

1. Buka **`js/config.js`**, lalu tempel URL `/exec` dari langkah A7:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/AKfy..../exec';
   ```
2. Buka terminal **di folder `dashboard-transportasi-hijau/`**. Perintah `dir` (Windows) atau `ls` harus menampilkan `index.html` di daftar teratas.
3. Buat repository **Public** baru di GitHub (jangan centang README), lalu jalankan:
   ```bash
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
   Saat diminta password, tempel **Personal Access Token** (scope `repo`), bukan password akun. Layar memang tidak menampilkan apa pun saat token ditempel.
4. Di GitHub: **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**, lalu centang **Enforce HTTPS**.
5. Tunggu 1–2 menit, lalu buka `https://USERNAME.github.io/NAMA-REPO/`.

**Memperbarui frontend:** `git add .` → `git commit -m "keterangan"` → `git push`. Kalau tampilan masih versi lama, tekan Ctrl+Shift+R.

---

## Bagian C — Pengisian data pertama (urutannya penting)

1. **Masuk** dengan email Admin dan kode akses tim.
2. **Unggah Berkas → Responden (sheet Olahan)** → pilih `Response_Olahan-*.xlsx` → periksa pratinjau → **Konfirmasi**.
   - Kolom Q1 (nama), Q3 (NIM/NIP), Q4 (unit), dan Q7 (email) dibuang **di browser** dan tidak pernah dikirim ke server. Email hanya dipakai sesaat untuk menandai pengisian ganda.
3. **Unggah Berkas → Analisis Statistik** → pilih **berkas yang sama** → periksa kecocokan jumlah responden → **Konfirmasi**.
4. **Pengaturan Asumsi → Faktor Emisi & Energi**: isi faktor emisi (g CO₂e/km), faktor energi (MJ/km), dan **Sumber** untuk setiap moda bermotor → **Simpan & hitung ulang**. *Sebelum langkah ini selesai, halaman Dampak dan Simulasi masih kosong.*
5. **Pengaturan Asumsi → Tabel Jarak Wilayah**: verifikasi jarak draf (lihat catatan di bawah), lalu ganti isi kolom Sumber.
6. **Pengaturan Asumsi → Kamus Wilayah**: petakan 14 responden yang asalnya belum terpetakan.
7. **Pengguna & Log**: tambahkan email anggota tim.

---

## Catatan penting tentang data awal

| Hal | Keadaan saat ini | Yang perlu dilakukan tim |
|---|---|---|
| Faktor emisi/energi | **Kosong**, kecuali jalan kaki dan sepeda (0) | Isi dari rujukan resmi beserta sumbernya (PRD 4.4) |
| Tabel jarak (115 wilayah) | **DRAF**: titik tengah kecamatan/kota perkiraan, jarak garis lurus × 1,3 ke Kampus A, minimal 1 km | Verifikasi, misalnya dengan Google Maps. Kalau Data_Bersih_Transportasi_Hijau_v3.xlsx masih ada, unggah tabel jaraknya sebagai jenis **Tabel Jarak** (mode Ganti) |
| Kamus wilayah | 501 dari 515 responden terpetakan: 348 tingkat kecamatan (keyakinan Sedang), 149 keyakinan Rendah (hanya kota atau petunjuk lemah), 4 di luar Jabodetabek | Petakan 14 sisanya, periksa yang berkeyakinan Rendah |
| Frekuensi | Nilai tengah rentang (4–5 hari = 4,5; lebih dari 5 = 6) | Sesuaikan dengan konvensi tim di **Kamus Frekuensi** |
| Penumpang | `PenumpangBilaSendiri = IkutiIsian` (Q12/Q16 dipakai apa adanya, dibatasi MaksPenumpang) | 86 responden menjawab Q11 "yes" (berangkat sendiri) tetapi Q12 > 0. Pilih `Nol` di Parameter bila Q11 yang dianggap benar |
| Moda utama | Isian pertama Q10/Q14, sama dengan sheet Clustering & Tabulasi | Tidak ada |
| Minggu efektif/tahun | 36 | Konfirmasi (PRD 8.6 no. 3) |

Karena tabel jarak masih draf, **angka dampak belum akan sama dengan Excel referensi** sampai jarak dan faktor yang dipakai tim dimasukkan.

---

## Uji setelah instalasi

1. Buka URL `/exec` langsung di browser. Harus tampil `{"success":true,…,"siap":true}`.
2. Login dengan email yang tidak terdaftar → harus ditolak.
3. Unggah berkas → data muncul di Beranda (515 responden; 277 mahasiswa, 129 dosen, 109 tendik).
4. Analisis Statistik → klaster 210/162/143; χ² Q17×Q2 = 28,571 (df 6); χ² Q17×Q8 berlabel **Tidak ditafsirkan**.
5. Isi satu faktor emisi → halaman Dampak berubah.
6. Coba Ekspor PDF, Word, dan Excel. Lalu buka DevTools (F12) → tab Console dan pastikan tidak ada galat CORS.

## Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| "GAS_URL belum diisi" | Isi `js/config.js`, lalu commit dan push ulang |
| "Respons server bukan JSON" | Deployment belum diatur "Siapa saja", atau URL bukan `/exec` |
| Perubahan kode backend tidak berefek | Buat **Versi baru** di Kelola deployment |
| Lupa kode akses | Isi `KODE_AKSES_AWAL`, jalankan `resetKodeAkses()` dari editor, lalu kosongkan lagi |
| Situs 404 di GitHub Pages | `index.html` tidak berada di root repo; lihat langkah B2 |
| Ekspor Word gagal | Jalankan fungsi apa saja dari editor sekali lagi untuk menyetujui izin `script.external_request` |
