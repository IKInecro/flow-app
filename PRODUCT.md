# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pelajar, mahasiswa, dan pengajar yang belajar algoritma lewat diagram alur. Mereka biasanya bekerja di laptop/desktop, sering di kelas atau saat mengerjakan tugas, dan butuh menyusun logika tanpa menulis sintaks dulu. The interface ships in English only.

## Product Purpose

MarcoFlow adalah editor diagram alur berbasis browser yang membuat, menyimpan, menjalankan, dan menerjemahkan diagram menjadi kode. Tujuannya membuat logika program terasa nyata: siswa menggambar alur, menekan Jalankan, melihat variabel berubah, lalu membaca kode setara. Sukses berarti pengguna bisa menyelesaikan satu program kecil dalam satu sesi tanpa instalasi, akun, atau server.

## Positioning

Semua data tinggal di browser lewat IndexedDB, dan file `.fprg` bisa dibawa keluar-masuk tanpa backend. Diagram, runtime, dan 27 template bahasa hidup dalam satu halaman statis. Tidak ada layanan lain yang dibutuhkan untuk mencoba.

## Operating Context

- Desktop-first; di bawah 768px aplikasi menampilkan ajakan pindah ke desktop dan menonaktifkan editing.
- Alur kerja: hub proyek → editor kanvas → jalankan/step → console, variabel, call stack → lihat kode.
- Proyek disimpan otomatis; impor/ekspor `.fprg`; template kustom `.fpgt`.
- Theme follows the system, with a light/dark toggle and a Settings page. The interface ships in English only.
- Koneksi internet hanya dibutuhkan untuk memuat aplikasi.

## Capabilities and Constraints

- React 19 + TypeScript + Vite, `@xyflow/react`, dagre, Zustand, CodeMirror 6, `idb-keyval`.
- 27 template bahasa bawaan, ditambah impor template kustom.
- Auto-layout, insert menu, undo/redo, ekspor SVG/PNG, console, variabel, call stack.
- Tanpa backend, tanpa autentikasi, tanpa analitik, tanpa environment variable.
- Aset dan template tidak boleh disalin dari Flowgorithm.
- Harus tetap jalan sebagai static SPA di Cloudflare Pages dengan CSP self-only.

## Brand Commitments

- Nama produk: MarcoFlow. Nada bicara: ramah, jelas, tidak menggurui.
- English is the only interface language; common technical terms stay in English.
- Brief pemilik: tampilan harus modern dan halus, memakai Google Fonts, animasi pada konektor dan saat drag, modal dan transisi panel yang mulus; tidak boleh terasa terlalu teknis.

## Evidence on Hand

- Aplikasi nyata dan seluruh fitur berjalan di `src/`.
- Contoh program: hello, factorial, bubble sort, fibonacci.
- Tidak ada testimoni, metrik pengguna, harga, atau klaim komersial; jangan mengarang.

## Product Principles

1. Diagram tetap pusat; panel lain melayani, tidak bersaing.
2. Umpan balik harus langsung: setiap aksi terasa, setiap status terbaca.
3. Bahasa manusia dulu, sintaks belakangan.
4. Satu sesi, tanpa hambatan masuk.
5. Data milik pengguna: lokal, portabel, bisa diekspor.

## Accessibility & Inclusion

Target WCAG AA: kontras teks minimal 4.5:1, fokus keyboard terlihat, target sentuh memadai, dan gerakan menghormati `prefers-reduced-motion`.
