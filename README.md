# Trisakti Green Mobility — Dashboard Transportasi Hijau

Frontend dashboard dampak lingkungan transportasi civitas Universitas Trisakti (WD IV FTSP). Dashboard ini statis (HTML/CSS/JS murni) dan memanggil Google Apps Script sebagai REST API.

- `index.html`: kerangka halaman
- `css/style.css`: token desain (DESIGN.md), tata letak, mode presentasi, gaya cetak A4 landscape
- `js/config.js`: **URL Web App Apps Script (wajib diisi)**
- `js/api.js`: fetch ke Apps Script (POST `text/plain`, token sesi)
- `js/data.js`: filter, agregasi, dan simulasi (berjalan di browser)
- `js/excel.js`: baca/tulis .xlsx (SheetJS); kolom identitas dibuang di sini
- `js/charts.js`, `js/pages.js`, `js/admin.js`, `js/report.js`, `js/app.js`: grafik, halaman, administrasi, ekspor, navigasi

Berkas backend (`Kode.gs`, `Seed.gs`) **tidak** ada di repo ini. Isinya ditempel langsung ke editor Apps Script.

Lihat **PANDUAN-INSTALASI.md** untuk langkah lengkap.

Pustaka CDN: Chart.js 4.4.1 dan SheetJS 0.18.5 (cdnjs), font Inter (Google Fonts). Dashboard membutuhkan koneksi internet.
