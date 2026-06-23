# PRODUCT REQUIREMENT DOCUMENT

## Product Name

BGO Toolkit

---

# Scope MVP

Modul:

1. Dashboard
2. Notepad Aplikasi BG
3. Kalkulator Provisi
4. Export PNG
5. Backup Data

---

# Dashboard

Menampilkan:

* Total Aplikasi
* Total Nilai BG
* Total Provisi
* Total Pending
* Total Process
* Total Done

Filter:

* Tanggal
* Cabang
* Jenis BG
* Status

---

# Notepad Aplikasi BG

Struktur tabel:

| Field         |
| ------------- |
| Tanggal       |
| Applicant     |
| Nilai BG      |
| No BG         |
| No Registrasi |
| Nama File     |
| No Aplikasi   |
| Nilai Provisi |
| Kode Cabang   |
| Nama Cabang   |
| Jenis BG      |
| Status        |
| Note          |

---

# Nama File

Tidak diinput manual.

Generate otomatis.

Format:

Applicant - Nilai BG - No BG - No Registrasi

Contoh:

PT ABC - 10000000000 - BG001 - REG001

---

# Status

Pilihan:

* Draft
* Pending
* Process
* Done
* Cancel

Default:

Pending

---

# Edit dan Delete

Record di tabel dapat diedit dan dihapus.

Edit dilakukan inline langsung di baris tabel.

Delete memunculkan konfirmasi sebelum menghapus.

---

# Sorting

Tabel dapat diurutkan berdasarkan:

* Tanggal (default: terbaru di atas)
* Nilai BG
* Status
* Nama Cabang

Klik header kolom untuk toggle ascending / descending.

---

# Search

Realtime search berdasarkan:

* Applicant
* No BG
* No Registrasi
* No Aplikasi
* Nama Cabang

---

# Auto Save

Semua perubahan otomatis tersimpan.

Tidak ada tombol Save.

---

# Validasi Input

Tanggal Berakhir harus lebih besar dari Tanggal Berlaku.

Nilai BG tidak boleh 0 atau kosong.

Applicant tidak boleh kosong.

Jika validasi gagal, tampilkan pesan error di bawah field yang bermasalah.

Kalkulasi tidak berjalan sebelum semua input valid.

---

# Kalkulator Provisi

Input:

* Applicant
* Cover Jaminan
* Jenis BG
* Nilai BG
* Tanggal Berlaku
* Tanggal Berakhir

Kalkulator tidak terhubung ke Notepad.

Data hasil kalkulasi hanya tersimpan ke Notepad jika user menekan tombol "Simpan ke Notepad".

---

# Cover Jaminan

Pilihan:

* Blokir Rekening 100%
* NCL/KMK
* Kontra Asuransi

---

# Jenis BG

Pilihan:

* Penawaran
* Pemeliharaan
* Sanggah Banding
* Pelaksanaan
* Uang Muka
* Jenis Lainnya
* Kredit

---

# Output

Menampilkan:

* Jumlah Hari
* Jumlah Kuartal (disembunyikan jika Cover = Kontra Asuransi)
* Rate
* Nilai Provisi
* Biaya Administrasi
* Biaya Format Khusus
* Total Biaya

---

# Export PNG

Hasil kalkulasi dapat diexport menjadi PNG.

---

# Layout PNG

Struktur terdiri dari tiga zona: Header, Body, Footer.

## Header

Background gelap (warna navy).

Menampilkan:

* Label kecil: "BGO Toolkit · Hasil Kalkulasi Provisi"
* Nama Applicant (baris utama)
* Jenis BG · Cover Jaminan (subtitle)

Jika nama Applicant melebihi 35 karakter, dipotong dengan elipsis.

## Body

Terbagi dua seksi dengan label seksi.

Seksi pertama: Detail Jaminan

* Nilai BG
* Tanggal Berlaku
* Tanggal Berakhir
* Jumlah Hari
* Jumlah Kuartal (disembunyikan jika Cover = Kontra Asuransi, diganti baris "Basis Hitung: Per Annum")

Seksi kedua: Rincian Biaya

* Rate
* Nilai Provisi
* Biaya Administrasi
* Biaya Format Khusus

Diikuti baris Total Biaya dengan background sekunder sebagai highlight.

## Footer

Menampilkan:

* Teks kiri: "Dihitung oleh BGO Toolkit"
* Teks kanan: Tanggal kalkulasi

## Dimensi

Lebar: 320px

Tinggi: menyesuaikan konten.

Optimasi untuk preview WhatsApp di layar mobile.

---

# Backup

Export JSON

Import JSON

Digunakan untuk backup dan pindah perangkat.

## Conflict Resolution saat Import

Jika terdapat data dengan ID yang sama antara file JSON dan data lokal:

* Data lokal dipertahankan (skip duplikat).
* Data baru yang tidak ada di lokal ditambahkan.
* Tidak ada data lokal yang ditimpa atau dihapus.

Setelah import selesai, tampilkan ringkasan:

* Jumlah record berhasil ditambahkan
* Jumlah record dilewati (duplikat)
