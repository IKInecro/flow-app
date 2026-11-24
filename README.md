# MarcoFlow

Editor flowchart berbasis web untuk belajar algoritma — alternatif Flowgorithm yang
berjalan langsung di browser. Program disusun dari bentuk flowchart, dijalankan
dengan debugger langkah-per-langkah, lalu diterjemahkan ke 27 bahasa pemrograman
atau pseudocode lewat template.

- Demo: <https://marcoflow.pages.dev>
- Stack: React 19, TypeScript, Vite, Tailwind CSS, `@xyflow/react`, dagre,
  Zustand, CodeMirror 6, IndexedDB (`idb-keyval`).
- Tanpa backend, tanpa akun. Proyek tersimpan di browser dan bisa diekspor sebagai
  `.fprg` (kompatibel dengan format Flowgorithm).

## Fitur

- Kanvas flowchart dengan auto-layout, insert menu, inspector per node, dan
  function manager (parameter, return, pemanggilan rekursif).
- Run, pause, step, breakpoint, input console, variable watch, dan call stack.
- Generasi kode untuk 27 bahasa + 3 pseudocode, highlight baris aktif, salin,
  unduh, serta impor template `.fpgt` buatan sendiri.
- Ekspor proyek `.fprg`, ekspor gambar PNG/SVG, command palette (Ctrl+K), dan
  shortcut editor (F5 jalankan, F10 langkah, Ctrl+S ekspor, Ctrl+Z/Ctrl+Y).
- Empat contoh siap jalan: Halo Dunia, Faktorial, Bubble Sort, Fibonacci.
- Tema terang/gelap mengikuti sistem, antarmuka Indonesia dengan toggle Inggris.
- Desktop-first: di bawah 768 px editor diganti pemberitahuan "paling nyaman di
  desktop"; sidebar berubah menjadi bar ikon di bawah 900 px.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan Vite |
| `npm run build` | Typecheck + build produksi ke `dist/` |
| `npm run preview` | Menjalankan hasil build |
| `npm run typecheck` | TypeScript build (`tsc -b`) |
| `npm test` / `npx vitest run` | Unit + integration test (Vitest, jsdom) |
| `npm run test:e2e` | Smoke test Playwright (butuh `npx playwright install chromium`) |

Jika hanya tersedia Chrome sistem (bukan headless shell bawaan Playwright), set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ke binary Chrome sebelum menjalankan e2e.
| `npm run ci` | Gate lengkap: typecheck, unit, build, e2e |

## Deployment (Cloudflare Pages)

1. Hubungkan repo ke Cloudflare Pages.
2. Build command: `npm run build`.
3. Build output directory: `dist`.
4. Framework preset: *None* / Vite. Node 22.
5. Domain produksi: `marcoflow.pages.dev`.

File di `public/` ikut tersalin ke `dist/`:

- `_redirects` — SPA fallback `/* /index.html 200`.
- `_headers` — CSP self-only, `nosniff`, referrer policy, dan permissions policy.
  Aset Vite, font sistem, serta blob/data untuk ekspor gambar sudah diizinkan.

Tidak ada environment variable atau server API yang dibutuhkan.

## Struktur singkat

```
src/core       model AST, parser .fprg, evaluator/interpreter, layout, codegen
src/features   hub proyek, editor, inspector, runtime, source viewer
src/shared     storage IndexedDB, i18n, tema, komponen UI
src/app        shell, router, desktop gate, command palette
tests/e2e      smoke test Playwright
```

## Lisensi dan atribusi

Seluruh kode, template bahasa, contoh, ikon, dan aset MarcoFlow ditulis
independen. Proyek ini tidak menyalin kode, aset, logo, terjemahan, atau template
dari Flowgorithm. Format `.fprg` diimplementasikan ulang sebagai format pertukaran
data agar proyek pengguna bisa dibuka dan dipindahkan.
