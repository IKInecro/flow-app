# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students, self-taught learners, and teachers who learn algorithms through flowcharts. They usually work on a laptop or desktop, often in class or while doing assignments, and want to express logic before writing syntax. The interface ships in English only.

## Product Purpose

MarcoFlow is a browser-based flowchart editor that creates, saves, runs, and translates diagrams into code. The goal is to make program logic tangible: draw a flow, press Run, watch variables change, then read the equivalent code. Success means finishing a small program in one session with no install, account, or server.

## Positioning

All data stays in the browser through IndexedDB, and `.fprg` files move in and out without a backend. Diagrams, the runtime, and 27 language templates live in one static page. Nothing else is needed to try it.

## Operating Context

- Desktop-first; below 768px the app shows a move-to-desktop notice and disables editing.
- Flow: project hub → canvas editor → run/step → floating terminal, variables, call stack → source view.
- Projects save automatically; import/export `.fprg`; custom templates `.fpgt`.
- Theme follows the system, with a light/dark toggle and a Settings page.
- The insert palette, right inspector, and navigation rail can be folded; panel borders resize by drag.
- Block properties float beside the selected node; the terminal floats and appears when a program runs.
- Internet is only needed to load the app.

## Capabilities and Constraints

- React 19 + TypeScript + Vite, `@xyflow/react`, dagre, Zustand, CodeMirror 6, `idb-keyval`.
- 27 built-in language templates plus custom template import.
- Auto-layout, insert menu, undo/redo, SVG/PNG export, terminal, variables, call stack.
- Self-hosted Nunito, Fredoka, and JetBrains Mono; no external font requests.
- No backend, authentication, analytics, or environment variables.
- Assets and templates must not be copied from Flowgorithm.
- Must run as a static SPA on Cloudflare Pages with a self-only CSP.

## Brand Commitments

- Product name: MarcoFlow. Voice: friendly, clear, never condescending.
- English is the only interface language; common technical terms stay in English.
- Owner brief: modern and polished, smooth connector and drag motion, modal and panel transitions; never feel overly technical. More recently: modern dark blue rather than neon "tech", readable tinted light mode, better typography.

## Evidence on Hand

- The real app and all features run in `src/`.
- Sample programs: hello, factorial, bubble sort, fibonacci.
- No testimonials, user metrics, pricing, or commercial claims; do not invent them.

## Product Principles

1. The diagram stays central; other panels serve it and never compete.
2. Feedback is immediate: every action lands, every status reads.
3. Human language first, syntax later.
4. One session, no onboarding wall.
5. Data belongs to the user: local, portable, exportable.

## Accessibility & Inclusion

Target WCAG AA: text contrast at least 4.5:1, visible keyboard focus, adequate hit targets, functional text at 11px or above, and motion respects `prefers-reduced-motion`.
