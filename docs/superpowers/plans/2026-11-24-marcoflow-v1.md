# MarcoFlow v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, browser-only flowchart programming IDE with editing, execution, debugging, local save, `.fprg` import/export, and template-based source generation for 27 languages, deployed to Cloudflare Pages.

**Architecture:** React SPA with a pure-TypeScript core (`model`, `fprg`, `lang`, `vm`, `layout`, `codegen`, `templates`) and feature modules for projects, editor, runtime, and code viewer. React Flow renders an auto-laid-out statement tree; Zustand stores project/UI/runtime state; `idb-keyval` persists projects in IndexedDB. No backend, no `eval`, no runtime network calls.

**Tech Stack:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, `@xyflow/react`, `dagre`, Zustand, CodeMirror 6, `idb-keyval`, React Router, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-marcoflow-design.md`

## Global Constraints

- Node.js >= 22, npm; TypeScript `strict`; no `any` in exported core signatures.
- All core modules under `src/core/**` are pure TypeScript and must not import React.
- Never use `eval` or `new Function`; expression evaluation is a custom lexer/parser.
- No backend, no auth, no telemetry; runtime makes zero network requests.
- Project data persists only in IndexedDB (database `marcoflow`).
- Do not copy, extract, or decompile Flowgorithm assets, templates, icons, or code. Templates are authored independently. Attribution copy: "Inspired by Flowgorithm; independent implementation."
- UI copy defaults to Indonesian with an English toggle; code identifiers are ASCII.
- Dual theme via CSS custom properties; system default; both themes meet WCAG AA.
- Desktop-first: at widths < 768 px show a "best on desktop" gate and disable editing.
- 27 core language templates + VBA (Excel) bonus + Auto/Gaddis/IBO pseudocode.
- `.fprg` export uses `fileversion="4.2"`, 4-space indent, LF.
- Deployed as static SPA to Cloudflare Pages; `public/_redirects` contains `/* /index.html 200`.
- Commit after every task using Conventional Commits.

## Review Focus

1. **Malformed or unknown `.fprg`** — import must report the problem, keep the current project untouched, and never crash; unknown elements survive a round-trip. *(Task 3 tests)*
2. **Invalid console input** — typing `abc` for an Integer input must re-prompt in the console without ending the run or corrupting state. *(Task 6 tests)*
3. **Undeclared / out-of-scope identifiers** — a misspelled variable or function from an imported file must produce a node-level error, not a silent default or crash. *(Task 5 tests)*
4. **Nested control-flow layout** — loops inside If branches and nested functions must not overlap, and every edge must connect to the correct branch entry/merge node. *(Task 8 tests)*
5. **Storage failure or exhaustion** — if IndexedDB is unavailable or full, the editor continues in memory and shows a persistent export-backup warning; no work is lost silently. *(Task 7 tests)*

---

## File Structure

```
flow-app/
├── index.html
├── package.json / vite.config.ts / tsconfig.json
├── public/{_redirects,_headers,favicon.svg}
├── src/
│   ├── main.tsx
│   ├── app/{App,router,Shell,Sidebar,TopBar,CommandPalette,ThemeProvider,DesktopGate}.tsx
│   ├── core/
│   │   ├── model/{types,program,walk}.ts
│   │   ├── fprg/{parse,serialize}.ts
│   │   ├── lang/{ast,lexer,parser,values,builtins,evaluate,validate}.ts
│   │   ├── vm/{events,interpreter}.ts
│   │   ├── layout/{shapes,layout}.ts
│   │   ├── codegen/{template,render}.ts
│   │   └── templates/{index.ts,data/*.fpgt,samples/*.fprg}
│   ├── shared/
│   │   ├── storage/{db,projects}.ts
│   │   ├── theme/theme.ts
│   │   ├── i18n/{index.ts,id.ts,en.ts}
│   │   └── ui/{Button,Drawer,Toast,Tooltip,Dialog,IconButton}.tsx
│   ├── features/
│   │   ├── projects/{ProjectHub,ProjectCard,ImportButton,SampleGallery}.tsx
│   │   ├── editor/
│   │   │   ├── EditorPage.tsx
│   │   │   ├── store/{projectStore,uiStore}.ts
│   │   │   ├── canvas/{FlowCanvas,ShapeNode,NodeToolbar,InsertMenu,edges}.tsx
│   │   │   ├── palette/ShapePalette.tsx
│   │   │   ├── inspector/{Inspector,forms,FunctionPanel}.tsx
│   │   │   └── export/{exportSvg,exportPng}.ts
│   │   ├── run/{controller,RunToolbar,ConsoleDock,VariableWatch,CallStack}.tsx
│   │   └── codegen/{SourcePanel.tsx}
│   └── styles/{globals.css,tokens.css}
└── tests/{fixtures/*.fprg,e2e/smoke.spec.ts}
```

---

### Task 1: Project scaffold, theme, and app shell

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- Create: `src/main.tsx`, `src/app/{App,router,Shell,Sidebar,TopBar,ThemeProvider,DesktopGate}.tsx`
- Create: `src/shared/theme/theme.ts`, `src/styles/{tokens.css,globals.css}`
- Create: `public/{_redirects,_headers,favicon.svg}`, `src/shared/i18n/{index,id,en}.ts`
- Create: `src/test/setup.ts`
- Test: `src/app/Shell.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `Shell` layout with sidebar nav items `projects | editor | examples | variables | source | settings`; `useTheme()` from `src/shared/theme/theme.ts` returning `{ theme: 'light'|'dark'|'system'; setTheme(t): void; resolved: 'light'|'dark' }`; `t(key: string): string` from `src/shared/i18n/index.ts`; `DesktopGate` wrapper that renders children at >= 768 px and a notice below.

- [ ] **Step 1: Scaffold the Vite React TS app and install dependencies**

```bash
cd /tmp && rm -rf marcoflow-scaffold
npm create vite@latest marcoflow-scaffold -- --template react-ts
cp -r /tmp/marcoflow-scaffold/. /home/jawaa/flow-app/
cd /home/jawaa/flow-app
rm -rf node_modules package-lock.json
npm i react-router-dom @xyflow/react dagre zustand idb-keyval clsx tailwind-merge lucide-react
npm i -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb @types/dagre @playwright/test
```
Keep the existing `docs/` and `.gitignore`. Add `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }` to `vite.config.ts`, `"test": "vitest"` to scripts, and `@tailwindcss/vite` to the Vite plugins. `src/test/setup.ts` imports `@testing-library/jest-dom/vitest`.

- [ ] **Step 2: Write the failing shell test**

```tsx
// src/app/Shell.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Shell } from './Shell'

test('sidebar exposes navigation and toggles theme', async () => {
  render(<MemoryRouter><Shell /></MemoryRouter>)
  expect(screen.getByRole('navigation', { name: /utama/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /tema/i }))
  expect(document.documentElement.dataset.theme).toMatch(/light|dark/)
})
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npx vitest run src/app/Shell.test.tsx`
Expected: FAIL — cannot resolve `./Shell`.

- [ ] **Step 4: Implement the shell, theme tokens, i18n, and routes**

Implement `Shell` with a 72 px `<nav aria-label="Utama">`, 280 px expandable panel, minimal top bar, `<Outlet />`, and `<DesktopGate>`. Add routes `/` (placeholder Hub), `/editor/:id` (placeholder), `/examples` (placeholder). Define light/dark tokens in `tokens.css` and apply `data-theme` on `<html>`; persist choice in `localStorage` and follow `prefers-color-scheme` when `system`. `_redirects` contains `/* /index.html 200`.

- [ ] **Step 5: Run tests and build**

Run: `npx vitest run && npm run build`
Expected: PASS; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: scaffold MarcoFlow shell with theme and routing"
```

---

### Task 2: AST model and immutable program operations

**Files:**
- Create: `src/core/model/{types,program,walk}.ts`
- Test: `src/core/model/program.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Program`, `FunctionDef`, `Param`, `Stmt`, `StmtKind`, `FlowType`, `ScalarType`, `LValue`, `Diagnostic`; `createProgram(name?: string): Program`; `createStmt(kind: StmtKind): Stmt`; `appendStmt(program, functionName, stmt): Program`; `insertStmt(program, functionName, targetPath, position, stmt): Program` with `InsertPosition = 'before'|'after'|'into-then'|'into-else'|'into-body'`; `replaceStmt(program, functionName, path, stmt): Program`; `removeStmt(program, functionName, path): Program`; `findStmt(program, functionName, path): { stmt: Stmt; parentBody: Stmt[]; index: number } | null`; `walkStmts(body: Stmt[], basePath: string, visit: (stmt: Stmt, path: string) => void): void`; `stmtPathId(functionName, path): string`; `formatStmt(stmt: Stmt): string`.

- [ ] **Step 1: Write failing model tests**

Cover: `createProgram()` has one `Main` with empty body; append inserts at end; nested path `1/then/0` resolves; `insertStmt(..., 'into-then', ...)` appends into the `then` array; removing a nested statement keeps siblings; operations do not mutate the input object (`expect(next).not.toBe(prev)`, original deep-equals before-snapshot); `walkStmts` yields paths in pre-order.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/model/program.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the model and operations**

Use the exact `Stmt` union from the spec (`declare|assign|input|output|if|while|do|for|call|comment|breakpoint|turtle|file|unsupported`). Path segments are array indexes joined by `/`, with `then`, `else`, and `body` markers (e.g. `3/then/1`). Implement immutability by rebuilding only the containers along the path.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/core/model/program.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/model && git commit -m "feat(core): add AST model and immutable statement operations"
```

---

### Task 3: `.fprg` parser and serializer with round-trip coverage

**Files:**
- Create: `src/core/fprg/{parse,serialize}.ts`
- Create: `tests/fixtures/{v2-factorial,v4-arrays,v4-unknown}.fprg`
- Test: `src/core/fprg/fprg.test.ts`

**Interfaces:**
- Consumes: model types and operations from Task 2.
- Produces: `parseFprg(xml: string): { ok: true; program: Program; warnings: string[] } | { ok: false; error: string }`; `serializeFprg(program: Program): string`; `export function escAttr(value: string): string`.

- [ ] **Step 1: Write failing parser/serializer tests**

Assertions: v2 factorial parses with `declare`, `assign`, `if`, `output`; v4 array fixture keeps `array="True"` and `size`; unknown element is preserved in `program.unknown` and re-emitted; malformed XML (`<flowgorithm><function>`) returns `{ ok: false }` with a message; a 4.2 program round-trips (`parse(serialize(parse(x)))` deep-equals semantic snapshot) and output contains `fileversion="4.2"`; reserved characters in strings are escaped.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/core/fprg/fprg.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement parsing and serialization**

Use `DOMParser` with `text/xml` and check `parsererror`. Map statement elements per spec; handle 1.0 `variables=`; read `direction` and `newline` with defaults. Preserve unknown child elements as raw XML strings via `XMLSerializer`. Serialize with an explicit escaper (not `innerHTML`) and the exact attribute order used in fixtures.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/core/fprg/fprg.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/fprg tests/fixtures && git commit -m "feat(core): parse and serialize Flowgorithm fprg files"
```

---

### Task 4: Expression lexer and Pratt parser

**Files:**
- Create: `src/core/lang/{ast,lexer,parser}.ts`
- Test: `src/core/lang/parser.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Expr` union (`number|string|boolean|identifier|unary|binary|call|index`); `UnaryOp = '-'|'!'|'not'|'¬'`; `BinaryOp = '^'|'↑'|'*'|'×'|'/'|'÷'|'%'|'mod'|'+'|'-'|'&'|'>'|'<'|'>='|'≥'|'<='|'≤'|'=='|'='|'!='|'<>'|'≠'|'and'|'&&'|'∧'|'or'|'||'|'∨'`; `parseExpression(source: string): { ok: true; expr: Expr } | { ok: false; error: { message: string; position: number } }`; `canonicalOp(op: BinaryOp): string`.

- [ ] **Step 1: Write failing parser tests**

Cover precedence (`1 + 2 * 3` → `+` with right `*`), right-associative exponent (`2 ^ 3 ^ 2`), unary minus, parentheses, unicode equivalents (`≥`, `≠`, `∧`, `÷`), case-insensitive keywords (`AND`, `True`, `PI`), string escapes (`"a\"b"`), function calls with zero and many args, array indexing `a[i + 1]`, and two error cases (unclosed string, trailing operator) reporting a position.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/core/lang/parser.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement lexer and parser**

Tokenize numbers (integer vs real), strings with `\"` and `\\`, identifiers (`^[A-Za-z][A-Za-z0-9]*`), operators including Unicode, and EOF. Implement precedence climbing with the table from spec section 8; `^` is right-associative. Map all aliases to canonical ops in the AST.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/core/lang/parser.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/lang && git commit -m "feat(core): add expression lexer and parser"
```

---

### Task 5: Values, intrinsics, evaluator, and static validation

**Files:**
- Create: `src/core/lang/{values,builtins,evaluate,validate}.ts`
- Test: `src/core/lang/{evaluate,validate}.test.ts`

**Interfaces:**
- Consumes: `Expr` and `parseExpression` from Task 4; `Program`, `Diagnostic` from Task 2.
- Produces: `ScalarValue = { kind:'scalar'; type: ScalarType; value: number|string|boolean }`; `ArrayValue = { kind:'array'; elementType: ScalarType; items: ScalarValue[] }`; `Value = ScalarValue|ArrayValue`; `EvalContext = { lookup(name): Value|undefined; callFunction(name, args): Value; random(max): number }`; `evaluate(expr, ctx): ScalarValue`; `evalExpression(source, ctx): ScalarValue`; `checkProgram(program): Diagnostic[]`; `scalar(type, value): ScalarValue`; `toStr(v): string`.

- [ ] **Step 1: Write failing evaluator tests**

Assertions: `1 / 2` → Real `0.5`; `7 mod 3` → Integer `1`; `"a" & 2` → `"a2"`; `"2" + 1` → error "operator + butuh angka"; `true and not false` → true; `Abs(-3)` → 3; `Random(5)` uses injected `random` and stays in `0..4`; `ToInteger("12.9")` → 12; `Char("abc", 1)` → `"b"`; out-of-range `Char` errors. Validator: undeclared variable, misspelled function, wrong arity, assigning Real to Integer is allowed with truncation warning? no warning — silent truncation; using a `None` function in an expression is an error; array without size is an error; all diagnostics carry `path` and `function`.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/core/lang/evaluate.test.ts src/core/lang/validate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement values, builtins, evaluator, validator**

Implement coercion rules exactly as spec section 8. Build a per-function symbol table in `checkProgram` (params + declares, block-scoped visibility is function-wide as in Flowgorithm). Validate every statement expression and condition type. `evaluate` must throw `RuntimeFault` (exported class with `message` and optional `path`) rather than return junk.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/core/lang/evaluate.test.ts src/core/lang/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/lang && git commit -m "feat(core): evaluate expressions and validate programs"
```

---

### Task 6: Interpreter event stream

**Files:**
- Create: `src/core/vm/{events,interpreter}.ts`
- Test: `src/core/vm/interpreter.test.ts`

**Interfaces:**
- Consumes: model, evaluator/validator, `Expr` parser.
- Produces: `RuntimeEvent` union from spec section 9; `RuntimeError = { message: string; path: string; function: string; callStack: string[] }`; `createInterpreter(program, options?: { ignoreBreakpoints?: boolean; maxDepth?: number; random?: (max:number)=>number }): AsyncGenerator<RuntimeEvent, void, string>`; helper `collect(program, inputs: string[], options?): Promise<RuntimeEvent[]>` for tests.

- [ ] **Step 1: Write failing interpreter tests**

Use `collect` helper. Cases: hello world emits `output` "Hello, world"; If chooses the correct branch; While/Do/For counts (For end is inclusive; `dec` direction); function call with return variable; recursion factorial(5)=120; array assignment and read; breakpoint emits `breakpoint` and `ignoreBreakpoints` skips it; mismatched input for Integer re-prompts (events show `inputRequest` twice, second input "42" accepted) — assert no `done` between; divide by zero yields `error`; recursive runaway stops at `maxDepth` with `error`; `stop` is consumer-driven (checking `return()` closes generator without unhandled rejection).

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/core/vm/interpreter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the interpreter**

Use an async generator with recursive statement execution, a frame per function (`locals`, `returnVariable`), and `yield*` for nested bodies. For input: `const text = yield { type:'inputRequest', ... }`; validate the conversion and loop again on failure. Track call depth and throw `RuntimeFault` at `maxDepth` (default 100). Emit `callEnter`/`callExit`, snapshots via `variables` getter? No — expose `locals` in `callExit`? Keep events exactly as spec; the UI reads variable snapshots from a `snapshot` field added to `nodeEnter`? **Do not change the spec union**; instead export `getFrameSnapshot(interpreter)` is not possible on a generator. Add an event `{ type:'snapshot'; frames: FrameSnapshot[] }` emitted after every `nodeEnter` and `inputAccept`; document it in code and tests. This is the only addition.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/core/vm/interpreter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/vm && git commit -m "feat(core): add interpreter with debug event stream"
```

---

### Task 7: IndexedDB project storage and project hub

**Files:**
- Create: `src/shared/storage/{db,projects}.ts`
- Create: `src/features/projects/{ProjectHub,ProjectCard,ImportButton}.tsx`
- Test: `src/shared/storage/projects.test.ts`, `src/features/projects/ProjectHub.test.tsx`

**Interfaces:**
- Consumes: `Program`, `parseFprg`, `serializeFprg`.
- Produces: `ProjectRecord = { id: string; program: Program; viewState: { nodeOffsets: Record<string,{x:number;y:number}> }; templateId: string; createdAt: number; updatedAt: number; schemaVersion: 1 }`; `listProjects(): Promise<ProjectRecord[]>`; `getProject(id)`; `putProject(record)`; `deleteProject(id)`; `duplicateProject(id)`; `createProjectRecord(name: string): ProjectRecord`; `getStorageStatus(): 'ok'|'memory'`; `getStorageWarning(): string | null`; `normalizeRecord(raw: unknown): ProjectRecord`. Project hub calls `putProject`, supports new/open/rename/delete/duplicate, and import via `parseFprg` with an error toast on failure.

- [ ] **Step 1: Write failing storage tests**

Use `fake-indexeddb/auto`. Assert: create → list returns it sorted by `updatedAt` desc; put updates timestamp; duplicate copies with new id and " (copy)" suffix; delete removes it. Failure case: mock `idb-keyval` set to reject with `QuotaExceededError`; `putProject` resolves but `getStorageStatus()` becomes `'memory'` and `getStorageWarning()` returns the export-backup warning; subsequent `listProjects` returns in-memory records instead of throwing. Migration case: a raw record without `schemaVersion` or `viewState` normalizes to schema 1 with empty offsets, and unrelated extra fields survive `normalizeRecord`.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/shared/storage/projects.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement storage and hub**

Wrap `idb-keyval`'s `createStore('marcoflow','projects')`. Keep an in-memory `Map` mirror; on IndexedDB errors, switch to memory mode, keep the mirror authoritative, and surface `storageWarning`. Build the hub grid with cards (name, updated time, node count preview placeholder), New/Import buttons, and delete confirmation dialog.

- [ ] **Step 4: Add the hub component test and run both**

Run: `npx vitest run src/shared/storage/projects.test.ts src/features/projects/ProjectHub.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/storage src/features/projects && git commit -m "feat: persist projects in IndexedDB with memory fallback"
```

---

### Task 8: Auto-layout engine

**Files:**
- Create: `src/core/layout/{shapes,layout}.ts`
- Test: `src/core/layout/layout.test.ts`

**Interfaces:**
- Consumes: `FunctionDef`, `Stmt`, `StmtKind`.
- Produces: `NODE_SIZE: Record<StmtKind,{width:number;height:number}>`; `FlowNode = { id: string; path: string; kind: StmtKind; stmt: Stmt; x: number; y: number; width: number; height: number }`; `FlowEdge = { id: string; source: string; target: string; label?: 'Yes'|'No'|'Then'|'Else' }`; `layoutFunction(fn: FunctionDef): { nodes: FlowNode[]; edges: FlowEdge[]; width: number; height: number }`.

- [ ] **Step 1: Write failing layout tests**

Build a program with an If containing a nested While, and a For after it. Assert: node ids equal statement paths; every non-terminal node has exactly one outgoing default edge except If (2 labeled) and loops (body + exit); no two node rectangles overlap (AABB check); nested body nodes lie strictly below their condition; every edge source/target exists; deterministic output for identical input.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/core/layout/layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement layout**

Build a dagre graph (`rankdir: 'TB'`, `nodesep: 60`, `ranksep: 70`), one node per statement, synthetic merge nodes for If and loop exits, and labeled edges. Use `NODE_SIZE` with wrapped-text height estimates (max 2 lines). Position nodes from dagre; include terminator Start/End nodes with ids `__start`/`__end`. Normalize the origin to `(0,0)`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/core/layout/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/layout && git commit -m "feat(core): auto-layout flowchart statement trees"
```

---

### Task 9: Canvas, shape nodes, insert menu, and editor store

**Files:**
- Create: `src/features/editor/store/{projectStore,uiStore}.ts`
- Create: `src/features/editor/{EditorPage.tsx}`
- Create: `src/features/editor/canvas/{FlowCanvas,ShapeNode,NodeToolbar,InsertMenu,shapePaths}.tsx`
- Create: `src/features/editor/palette/ShapePalette.tsx`
- Test: `src/features/editor/store/projectStore.test.ts`, `src/features/editor/canvas/InsertMenu.test.tsx`

**Interfaces:**
- Consumes: model ops, `layoutFunction`, persistence, hub routing.
- Produces: `useProjectStore` with `{ program, projectId, dirty, saveState, viewState, load(record), create(name), commit((program)=>program), setNodeOffset(path,{x,y}), clearOffsets(), undo(), redo(), canUndo, canRedo, markSaved() }`; `useUiStore` with `{ theme, sidebarPanel, inspectorTab, inspectorPinned, consoleMode, setSidebarPanel, setInspectorTab, togglePinned, setConsoleMode }`; `<FlowCanvas />` renders `layoutFunction` nodes with custom shapes and selection; `<InsertMenu target={{functionName,path,position}} onInsert={(kind)=>void} />`.

- [ ] **Step 1: Write failing store tests**

Assert: `create('Test')` yields a Main-only program and `dirty=false`; `commit` pushes previous program to undo and sets `dirty=true`; `undo` restores; `redo` re-applies; new commit clears redo; loading a record resets history; all operations route through the record in IndexedDB after a debounce (use fake timers).

- [ ] **Step 2: Run store tests to confirm failure**

Run: `npx vitest run src/features/editor/store/projectStore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement stores and canvas**

Render React Flow with custom `ShapeNode` (terminator, rect, parallelogram, diamond, hexagon, sticky note, breakpoint circle), category colors from tokens, start/end nodes, labeled edges, and `fitView`. Show `+` affordances on edge hover and block end. Selection opens the inspector via `useUiStore`. Wire drag offsets into `viewState.nodeOffsets` (temporary; auto-layout button clears them). Add undo/redo and archetype insertion.

- [ ] **Step 4: Add InsertMenu component test and run both**

InsertMenu renders positions for `before|after|into-then|into-else|into-body` and calls `onInsert('output')`. Run: `npx vitest run src/features/editor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor && git commit -m "feat(editor): add flowchart canvas, shapes, and editor store"
```

---

### Task 10: Inspector forms, function manager, and inline validation

**Files:**
- Create: `src/features/editor/inspector/{Inspector,forms,FunctionPanel,Problems}.tsx`
- Test: `src/features/editor/inspector/Inspector.test.tsx`, `src/features/editor/inspector/FunctionPanel.test.tsx`

**Interfaces:**
- Consumes: `checkProgram`, model ops, editor store.
- Produces: `<Inspector />` dispatching to per-kind forms; `<FunctionPanel />` with add/rename/delete/param editing; `useProjectStore.commit` used for every field change; `Problems` list fed by `checkProgram` (memoized).

- [ ] **Step 1: Write failing inspector tests**

Assert: selecting an Output node shows expression + newline fields and edits persist to the store; Assign shows target/index and rejects empty target; Declare exposes type/array/size; For exposes direction and 4 fields; Breakpoint exposes an optional condition; Call shows function picker with arity mismatch warning; an undeclared variable renders an error badge on the node and in Problems; a turtle/file statement shows a read-only "phase 2" notice with no editable fields; FunctionPanel rename updates callsites, refuses deleting Main, and blocks duplicate names.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/features/editor/inspector`
Expected: FAIL.

- [ ] **Step 3: Implement the inspector and function manager**

Use controlled inputs with local draft state and commit on blur/Enter; expression inputs get datalist suggestions from symbols. Validation runs through `checkProgram` after each commit. Function rename rewrites `call` nodes across all functions. Parameter editor enforces unique names and valid types.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/editor/inspector`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/inspector && git commit -m "feat(editor): add node inspector and function manager"
```

---

### Task 11: Run controller, toolbar, console, watch, and call stack

**Files:**
- Create: `src/features/run/{controller,RunToolbar,ConsoleDock,VariableWatch,CallStack}.tsx`
- Create: `src/features/run/runtimeStore.ts`
- Test: `src/features/run/controller.test.ts`, `src/features/run/ConsoleDock.test.tsx`

**Interfaces:**
- Consumes: `createInterpreter`, events, project store.
- Produces: `RuntimeStatus = 'idle'|'running'|'paused'|'awaiting-input'|'done'|'error'`; `RuntimeState = { status; activePath; entries: ConsoleEntry[]; variables: VariableSnapshot[]; callStack: CallFrame[]; error?: RuntimeError }`; `ConsoleEntry = { kind:'output'|'input'|'error'|'system'; text: string; path?: string }`; `VariableSnapshot = { functionName; name; type; value: string; arrayItems?: {index:number;value:string}[] }`; `createRunController(onChange): RunController` with `start(program,{ignoreBreakpoints})`, `step(program)`, `pause()`, `resume()`, `stop()`, `submitInput(text)`, `getState()`.

- [ ] **Step 1: Write failing controller tests**

Assert: `start` runs to `done` and appends output entries; `step` advances exactly one `nodeEnter`; `pause` halts after the current event; `submitInput` resumes a waiting program and rejects wrong type with an error entry; runtime error sets status and includes the node path; `stop` returns to `idle` without unhandled rejections. Console test: output renders a green bubble, input a blue bubble, and toggling plain mode renders a `<pre>` with all lines.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/features/run`
Expected: FAIL.

- [ ] **Step 3: Implement controller and run UI**

Use the async generator's `next(text)` handshake. In `running` mode, loop with `speed` delay; in `paused`/`step`, call `next()` once per action. Use the interpreter's `snapshot` event to update variables/call stack. Console auto-scrolls, input prompt is autofocused, Escape stops. Floating pill shows Run/Step/Pause/Stop/speed; status colors map to runtime status.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/run && git commit -m "feat(run): add debugger controls, console, and variable watch"
```

---

### Task 12: Code generation template engine

**Files:**
- Create: `src/core/codegen/{template,render}.ts`
- Create: `src/core/templates/samples/{hello,factorial,arrays}.fprg` (shared test programs)
- Test: `src/core/codegen/template.test.ts`, `src/core/codegen/render.test.ts`

**Interfaces:**
- Consumes: model, `serializeFprg` (for sample fixture only), expression parser (for precedence-aware rendering).
- Produces: `Template` (opaque parsed shape); `ParseResult<T>`; `parseTemplate(source: string): ParseResult<Template>`; `generate(program: Program, template: Template): { code: string; lineMap: Record<string, number[]> }`; `requiredSections: string[]`.

- [ ] **Step 1: Write failing template-engine tests**

Assert: INI parser handles comments, sections, repeated keys (multiline), `{field}` substitution, `{{` escape, `{space}`, and `{pipe}`; flags include/exclude lines using `inc`, `~step`; indentation directives shift nested blocks; a missing required section returns `{ok:false}` naming it; render of a Hello program through a minimal inline Python-like template produces `print("Hello, world")` and a `lineMap` from the output statement path to its line number.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/core/codegen`
Expected: FAIL.

- [ ] **Step 3: Implement the INI parser and renderer**

Parse lines into `{text, flags, indent}` entries; select the first line whose flags match; substitute fields; track indentation levels. Render statements recursively; use expression precedence fields so parentheses appear only when needed. Produce the line map keyed by `stmtPathId`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/core/codegen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/codegen src/core/templates/samples && git commit -m "feat(codegen): add INI template engine and renderer"
```

---

### Task 13: Built-in templates, source viewer, and template import

**Files:**
- Create: `src/core/templates/index.ts`, `src/core/templates/data/*.fpgt` (28 language files + 3 pseudocode files)
- Create: `src/features/codegen/SourcePanel.tsx`
- Test: `src/core/templates/templates.test.ts`, `src/core/codegen/render.snapshot.test.ts`, `src/features/codegen/SourcePanel.test.tsx`

**Interfaces:**
- Consumes: template engine, `generate`, parser.
- Produces: `listTemplates(): { id; name; extension; kind:'language'|'pseudocode' }[]`; `getTemplate(id): Template | undefined`; `importTemplate(source: string): ParseResult<{ id; template: Template }>`; `<SourcePanel />` with language picker, highlighted current statement, copy/download, and custom `.fpgt` import.

- [ ] **Step 1: Write failing template-registry tests**

Assert: registry contains exactly the 27 core ids (`ada95, applescript, autohotkey, bash, csharp, cpp, fortran2003, groovy, java, javascript, kotlin, lua, matlab, nim, pascal, perl, php, powershell, python, qbasic, ruby, scala, smalltalk, swift, tsql, typescript, vbnet`) plus `vba`, `pseudo-auto`, `pseudo-gaddis`, `pseudo-ibo`; every template parses with no error and defines `[Language]`, `[Types]`, and statement sections `[Assign]`, `[Output]`, `[If]`, `[While]`, `[For]`; snapshots for Python, C++, JavaScript, and Java match committed outputs for the factorial and arrays sample programs.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/core/templates`
Expected: FAIL.

- [ ] **Step 3: Author the 28 language templates and register them**

Write each `.fpgt` independently with correct literal syntax, operators, loops, function declaration/return conventions, and file/turtle placeholders marked unsupported. Load them with `import.meta.glob('./data/*.fpgt', { query: '?raw', import: 'default', eager: true })`. The registry maps file stem → `TemplateInfo` and parses lazily on first `getTemplate`.

- [ ] **Step 4: Build the SourcePanel**

SourcePanel shows code in a read-only CodeMirror 6 view, scrolls to the active statement line, updates when the template changes, supports copy/download, and imports a custom `.fpgt` with duplicate/invalid-section toasts.

- [ ] **Step 5: Generate snapshots and run tests**

Run: `npx vitest run src/core/templates src/core/codegen src/features/codegen -u` (first run to create snapshots), then `npx vitest run src/core/templates src/core/codegen src/features/codegen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/templates src/features/codegen && git commit -m "feat(codegen): add 27 language templates and source viewer"
```

---

### Task 14: `.fprg` export/import UI, PNG/SVG export, command palette, shortcuts

**Files:**
- Create: `src/features/editor/export/{exportSvg,exportPng}.ts`
- Create: `src/app/CommandPalette.tsx`, `src/features/editor/useShortcuts.ts`
- Create: `src/shared/ui/{Button,IconButton,Dialog,Drawer,Toast,Tooltip}.tsx`
- Test: `src/features/editor/export/export.test.ts`, `src/app/CommandPalette.test.tsx`

**Interfaces:**
- Consumes: serializeFprg, project store, UI store, canvas DOM.
- Produces: `downloadFprg(program, filename?)`; `exportSvg(element: HTMLElement, filename)` returns SVG text and triggers download; `exportPng(element, filename, scale=2)`; `<CommandPalette />` with fuzzy actions; `useShortcuts()` binding F5/F10/Ctrl+S/Ctrl+Z/Ctrl+Y/Ctrl+K/Delete/Escape.

- [ ] **Step 1: Write failing export/palette tests**

Assert: SVG export preserves node labels and edges (query serialized string) and embeds font fallbacks; PNG export calls `toBlob` with type `image/png` and 2× canvas dimensions (mock canvas); export filename defaults to `<project>.fprg`; command palette filters "run"/"jalankan" and executes the action; shortcut handler calls run on F5 and ignores shortcuts while an input is focused.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/features/editor/export src/app/CommandPalette.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement export, palette, and shortcuts**

SVG: clone the React Flow viewport SVG, inject computed colors/fonts, remove selection classes, add a white/dark background rect. PNG: draw the SVG into a canvas at scale and `toBlob`. Wire a File menu with Import/Export `.fprg`, PNG, SVG. Palette uses a simple subsequence matcher. Shortcuts skip editable targets and respect dialogs.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/editor/export src/app/CommandPalette.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor src/app src/shared/ui && git commit -m "feat: add file export, image export, and command palette"
```

---

### Task 15: Samples, desktop gate, accessibility, and UI polish

**Files:**
- Create: `src/features/projects/samples/{hello,factorial,bubble-sort,fibonacci}.fprg`
- Create: `src/features/projects/SampleGallery.tsx`
- Modify: `src/app/{Shell,DesktopGate,Sidebar,TopBar}.tsx`, `src/features/editor/*`
- Test: `src/features/projects/SampleGallery.test.tsx`, `src/app/DesktopGate.test.tsx`

**Interfaces:**
- Consumes: all prior modules.
- Produces: seeded sample project cards that load without errors; responsive sidebar (bottom icons < 900 px); `DesktopGate` notice below 768 px; `aria-live` console; focus rings; reduced-motion support.

- [ ] **Step 1: Write failing UI tests**

Assert: gallery shows four samples and importing one yields a runnable program; `DesktopGate` renders a notice at mocked width 375 and children at 1280; sidebar collapses to icons under 900; console region has `aria-live="polite"`; every interactive control has an accessible name.

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run src/features/projects/SampleGallery.test.tsx src/app/DesktopGate.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement samples, responsive rules, and a11y polish**

Author four `.fprg` samples (hello, factorial with function, bubble sort with array, fibonacci with recursion) and validate them with the parser in a test. Add responsive CSS, mobile gate, focus management, reduced-motion guards, and an empty-state for new projects with a "Tambah Output" CTA.

- [ ] **Step 4: Run full unit suite and typecheck**

Run: `npm run typecheck && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add samples, responsive gate, and accessibility polish"
```

---

### Task 16: End-to-end smoke, CI, and Cloudflare Pages deployment

**Files:**
- Create: `tests/e2e/smoke.spec.ts`, `playwright.config.ts`
- Create: `.github/workflows/ci.yml`, `README.md`, `wrangler.toml` (optional)
- Modify: `package.json` (`typecheck`, `test:e2e`, `ci` scripts), `public/_redirects`

**Interfaces:**
- Consumes: the running app.
- Produces: CI green pipeline; deployed URL.

- [ ] **Step 1: Write the failing E2E smoke test**

```ts
test('create, run, step, export, import', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /project baru/i }).click()
  await page.getByRole('button', { name: /output/i }).first().click()
  await page.getByLabel(/ekspresi/i).fill('"Hello, world"')
  await page.getByRole('button', { name: /jalankan/i }).click()
  await expect(page.getByText('Hello, world')).toBeVisible()
  await page.getByRole('button', { name: /step/i }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /simpan/i }).click()
  await page.getByRole('menuitem', { name: /export fprg/i }).click()
  await download
})
```

- [ ] **Step 2: Run it and confirm failure**

Run: `npx playwright test`
Expected: FAIL until the flow is wired; fix labels/routes, not the assertions, unless an assertion contradicts the spec.

- [ ] **Step 3: Add CI and deployment config**

CI: `npm ci`, `npm run typecheck`, `npx vitest run`, `npx playwright install --with-deps chromium`, `npx playwright test`, `npm run build`; upload `dist`. Document Cloudflare Pages settings (build `npm run build`, output `dist`) in README. Confirm `_headers` sets a self-only CSP without breaking Vite assets.

- [ ] **Step 4: Run the full gate**

Run: `npm run typecheck && npx vitest run && npm run build && npx playwright test`
Expected: all PASS. Also verify the initial JS bundle stays within the spec budget: `tar -c dist/assets/*.js | wc -c` is at most ~1.4 MB raw (about 350 KB gzip). If it exceeds, split the SourcePanel/CodeMirror chunk with `React.lazy`.

- [ ] **Step 5: Commit and push**

```bash
git add -A && git commit -m "chore: add e2e smoke, CI, and deployment docs"
```

---

## Execution Notes

- Task order is dependency order; do not start a task before its `Consumes` interfaces pass their own tests.
- If the real `.fprg` fixtures reveal a spec mismatch, update the spec and this plan in the same commit as the code change.
- Template authoring (Task 13) is the largest data task; add templates in batches and keep snapshots updated.
- Phase 2 (turtle, file I/O) and Phase 3 (share links, sync) are out of this plan.
