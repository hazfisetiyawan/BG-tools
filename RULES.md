# BUSINESS RULES

Berlaku mulai 1 April 2026.

Sumber acuan: Dashboard_Kalkulator_BG_CTO_format_desain.xlsx

---

# Perhitungan Hari

Formula:

Tanggal Berakhir - Tanggal Berlaku

Contoh:

19 Juni 2026 - 19 September 2026 = 92 hari

Tidak menggunakan inclusive date.

---

# Perhitungan Kuartal

Jika melewati batas kuartal walaupun 1 hari, naik ke kuartal berikutnya.

Contoh:

15 Januari - 15 April = 1 kuartal

15 Januari - 16 April = 2 kuartal

15 Januari - 15 Juli = 2 kuartal

15 Januari - 16 Juli = 3 kuartal

Tidak digunakan untuk Cover Kontra Asuransi.

---

# Jenis Bank Garansi

Pilihan yang tersedia:

* Jaminan Penawaran
* Jaminan Sanggah Banding
* Jaminan Pelaksanaan
* Jaminan Pemeliharaan
* Jaminan Pembayaran
* Jaminan Uang Muka
* Jaminan Jenis Lainnya

---

# Jenis Cover

Pilihan yang tersedia:

* Rekening Setoran Jaminan
* Setor Jaminan 100%
* Setor Jaminan <100% (Fasilitas)
* Kontra Asuransi

---

# Tabel Rate Provisi

## Cover: Rekening Setoran Jaminan

Provisi = 0% untuk semua Jenis BG.

Tipe hitung: tidak ada (provisi selalu 0).

Minimum provisi tetap berlaku (lihat seksi Minimum Provisi).

## Cover: Setor Jaminan 100%

Tipe hitung: Kuartal

| Jenis BG                  | Rate per Kuartal |
|---------------------------|-----------------|
| Jaminan Penawaran         | 0.35%           |
| Jaminan Sanggah Banding   | 0.35%           |
| Jaminan Pemeliharaan      | 0.35%           |
| Jaminan Pelaksanaan       | 0.50%           |
| Jaminan Pembayaran        | 0.50%           |
| Jaminan Uang Muka         | 0.50%           |
| Jaminan Jenis Lainnya     | 0.50%           |

Formula:

Nilai BG × Rate × Jumlah Kuartal

## Cover: Setor Jaminan <100% (Fasilitas)

Tipe hitung: Kuartal

| Jenis BG                  | Rate per Kuartal |
|---------------------------|-----------------|
| Jaminan Penawaran         | 0.70%           |
| Jaminan Sanggah Banding   | 0.70%           |
| Jaminan Pemeliharaan      | 0.70%           |
| Jaminan Pelaksanaan       | 0.75%           |
| Jaminan Pembayaran        | 0.75%           |
| Jaminan Uang Muka         | 0.75%           |
| Jaminan Jenis Lainnya     | 0.75%           |

Formula:

Nilai BG × Rate × Jumlah Kuartal

## Cover: Kontra Asuransi

Tipe hitung: Annum

Rate tetap 1.25% per annum untuk semua Jenis BG.

Formula:

Nilai BG × 1.25% × Jumlah Hari ÷ 360

Tidak menggunakan kuartal.

---

# Minimum Provisi

Minimum provisi untuk semua kombinasi Jenis BG dan Cover:

Rp 1.000.000

Jika hasil kalkulasi < Rp 1.000.000, nilai provisi yang digunakan adalah Rp 1.000.000.

Pengecualian:

Cover Rekening Setoran Jaminan provisinya 0 dan tidak dikenakan minimum.

---

# Biaya Administrasi

Berdasarkan Nilai BG:

| Nilai BG | Biaya Administrasi |
|---|---|
| ≤ Rp 300.000.000 | Rp 100.000 |
| ≤ Rp 1.000.000.000 | Rp 250.000 |
| > Rp 1.000.000.000 | Rp 500.000 |

Jika checkbox Gratis Administrasi dipilih:

Rp 0

---

# Format Khusus BG

Default:

Rp 0

Jika checkbox Format Khusus dipilih:

Tambahan Rp 500.000

---

# Total Biaya

Total = Nilai Provisi + Biaya Administrasi + Biaya Format Khusus

---

# Dua Applicant

Kalkulator mendukung maksimal 2 Applicant dalam satu BG.

## Cara Aktivasi

Terdapat toggle atau checkbox "Tambah Applicant 2".

Default: hanya 1 Applicant (Applicant 2 tersembunyi).

Jika diaktifkan, muncul field tambahan untuk Applicant 2.

## Input Tambahan

Applicant 1:

* Nama Applicant 1
* Persentase Kewajiban Applicant 1 (%)

Applicant 2:

* Nama Applicant 2
* Persentase Kewajiban Applicant 2 (%)

## Validasi Persentase

Total persentase Applicant 1 + Applicant 2 harus = 100%.

Jika tidak sama dengan 100%, kalkulasi diblok dan tampil pesan error.

## Formula Provisi per Applicant

Provisi Applicant 1 = Total Provisi × (% Kewajiban Applicant 1 ÷ 100)

Provisi Applicant 2 = Total Provisi × (% Kewajiban Applicant 2 ÷ 100)

Aturan minimum provisi Rp 1.000.000 diterapkan pada Total Provisi sebelum dibagi, bukan per applicant.

## Output

Output kalkulasi menampilkan:

* Nama dan persentase masing-masing Applicant
* Nilai provisi masing-masing Applicant
* Total Provisi (gabungan)
* Total Biaya (gabungan)

## Save to Notepad

Jika ada 2 Applicant, dibuat 2 entry terpisah di Notepad:

* Entry 1: Applicant 1, Nilai Provisi = provisi bagian Applicant 1
* Entry 2: Applicant 2, Nilai Provisi = provisi bagian Applicant 2

Nilai BG pada kedua entry tetap menggunakan Nilai BG penuh (bukan dibagi).

---

# Save to Notepad

Saat user menekan tombol "Simpan ke Notepad":

Dibuat entry baru pada tabel aplikasi dengan data:

* Applicant
* Nilai BG
* Nilai Provisi
* Jenis BG
* Tanggal
* Status = Pending

Serta data lain yang tersedia dari input kalkulator.

---

# Keyboard Navigation

## Prinsip

Seluruh alur input kalkulator dapat diselesaikan tanpa mouse.

## Tombol Navigasi

| Tombol | Aksi |
|--------|------|
| Tab | Pindah ke field berikutnya |
| Shift + Tab | Kembali ke field sebelumnya |
| Enter | Pindah ke field berikutnya (sama dengan Tab) |
| Arrow Up / Down | Navigasi pilihan dropdown saat dropdown terbuka |
| Space | Toggle checkbox (Gratis Administrasi, Format Khusus, Tambah Applicant 2) |
| Escape | Tutup dropdown tanpa memilih |

## Urutan Tab Index Kalkulator

1. Applicant 1
2. Toggle Tambah Applicant 2 (jika diaktifkan: lanjut ke Applicant 2 dan % Kewajiban)
3. Applicant 2 (jika aktif)
4. % Kewajiban Applicant 1
5. % Kewajiban Applicant 2 (jika aktif)
6. Cover Jaminan
7. Jenis BG
8. Nilai BG
9. Tanggal Berlaku
10. Tanggal Berakhir
11. Checkbox Gratis Administrasi
12. Checkbox Format Khusus
13. Tombol Simpan ke Notepad
14. Tombol Export PNG

## Input Tanggal

Format input: DD/MM/YYYY

Pemisah otomatis: setelah mengetik 2 digit hari, garis miring (/) muncul otomatis.

Setelah 2 digit bulan, garis miring kedua muncul otomatis.

Tidak perlu mengetik karakter "/" secara manual.

## Input Nilai BG

Format: angka tanpa titik atau koma saat mengetik.

Tampilan diformat otomatis dengan pemisah ribuan setelah field kehilangan fokus.

Contoh: ketik "100000000" → tampil "100.000.000" setelah blur.

## Dropdown Jenis Cover dan Jenis BG

Dapat diketik huruf pertama untuk loncat ke pilihan yang sesuai.

Contoh: ketik "K" saat dropdown Cover terbuka → loncat ke "Kontra Asuransi".

## Fokus Awal

Saat halaman kalkulator dibuka, fokus otomatis diarahkan ke field Applicant 1.
