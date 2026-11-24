# MarcoFlow — Web Flowchart Programming IDE

**Date:** 2026-11-24
**Status:** Draft for review
**Repo:** `flow-app`
**Deploy:** Cloudflare Pages, `marcoflow.pages.dev`

## 1. Summary

MarcoFlow is a browser-based flowchart programming environment inspired by
Flowgorithm. Users build programs from flowchart shapes, run and debug them
step by step, inspect variables, and view equivalent source code in many
programming languages. All project data stays in the browser; there is no
backend, account, or telemetry.

The app is a static single-page application. Flowchart semantics and the
`.fprg` file format are compatible with Flowgorithm so existing student files
can be imported, but MarcoFlow is an independent implementation: no
Flowgorithm code, assets, or embedded resources are copied or decompiled.

## 2. Goals

- Create, edit, save, and reopen flowchart programs in the browser.
- Execute programs with run, pause, step, stop, speed control, and breakpoints.
- Show a live variable watch, call stack, and chat-style console with input.
- Convert programs to pseudocode and 27+ real languages through templates.
- Import and export Flowgorithm-compatible `.fprg` XML.
- Export the flowchart as PNG or SVG.
- Feel modern and interactive: app-shell sidebar, full-bleed canvas, floating
  run controls, command palette, dual light/dark theme, smooth node feedback.
- Work fully client-side on Cloudflare Pages.

## 3. Non-goals (v1)

- User accounts, cloud sync, multiplayer, classroom management.
- Server-side execution of generated code.
- Turtle graphics execution and file I/O execution (parsed and preserved, but
  shown as read-only "coming in phase 2" nodes).
- Full mobile editing. The app opens on phones but shows a clear
  "best on desktop" gate; editing below 768 px is disabled.
- Flowgorithm name, logo, icons, color schemes, translations, or templates.

## 4. Target users and core flows

**Primary:** students learning programming logic, and teachers demoing
algorithms. Desktop/laptop browser, 1280 px+ recommended.

Core flows:

1. **Start:** open `/`, see project cards, create a new project or open a
   sample.
2. **Build:** insert shapes from the sidebar palette, edit them in the
   inspector, add functions and parameters.
3. **Run:** press Run, watch nodes highlight and the console fill with chat
   bubbles; answer input prompts.
4. **Debug:** press Step, pause at breakpoints, inspect variables and the call
   stack, then continue.
5. **Learn:** open the Source tab, switch language, see the current statement
   highlighted in generated code.
6. **Save:** autosave to IndexedDB; export `.fprg`; import on another machine.

## 5. Constraints and decisions

| Topic | Decision |
|---|---|
| Hosting | Cloudflare Pages, static SPA, no Functions/Workers in v1 |
| Storage | IndexedDB in the current browser only |
| Framework | React 19 + TypeScript + Vite |
| Flowchart rendering | `@xyflow/react` (React Flow) with custom node components |
| Layout | `dagre` for automatic top-down layout with custom branch placement |
| State | Zustand stores (project, editor UI, runtime, settings) |
| Code viewer | CodeMirror 6 (read-only, syntax highlight via generated HTML classes) |
| Persistence | `idb-keyval` wrapper with versioned project records |
| Styling | Tailwind CSS v4 + CSS custom properties for themes |
| Routing | React Router, SPA fallback via `_redirects` |
| Testing | Vitest (unit/integration) + Playwright (smoke) |
| Language | UI copy Indonesian by default, English toggle; code identifiers stay ASCII |
| Product name | MarcoFlow (avoid Flowgorithm trademark) |

### Licensing guardrails

Flowgorithm's EULA forbids decompiling or reverse-engineering the application.
MarcoFlow therefore:

- ships only independently authored templates and assets;
- does not extract data from the Flowgorithm installer;
- supports importing a user-supplied `.fpgt` template file;
- may display a short attribution note ("Inspired by Flowgorithm; independent
  implementation") without using its marks.

## 6. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ app shell: sidebar, minimal top bar, routing, theme           │
├───────────────┬──────────────────────────────┬───────────────┤
│ sidebar panel │  canvas (React Flow + dagre)  │ inspector     │
│ palette /     │  nodes, edges, overlays       │ drawer        │
│ functions     │                               │ (variables,   │
│               │                               │  source, etc.)│
├───────────────┴──────────────────────────────┴───────────────┤
│ console dock (chat bubbles / plain text, input prompt)        │
└──────────────────────────────────────────────────────────────┘

Data flow:
UI action → project store (AST) → layout engine → React Flow nodes
                    │
                    ├─ persistence (debounced IndexedDB)
                    ├─ validator (inline diagnostics)
                    └─ runtime engine (async event stream)
                              ↓
                   highlight, console, watch, call stack
```

### Module boundaries

| Module | Responsibility | Public surface |
|---|---|---|
| `core/model` | AST types, factories, traversal, immutable edits | types, `createProgram`, `insertStmt`, `replaceStmt`, `walk` |
| `core/fprg` | Parse/serialize `.fprg` XML | `parseFprg(xml) → Result<Program>`, `serializeFprg(Program) → string` |
| `core/lang` | Expression lexer/parser/type checker/evaluator | `parseExpression`, `checkProgram`, `evaluate` |
| `core/vm` | Interpreter and runtime events | `createInterpreter(program)`, `AsyncGenerator<RuntimeEvent>` |
| `core/layout` | AST → positioned nodes and edges | `layoutProgram(fn) → {nodes, edges, bounds}` |
| `core/codegen` | Render program through a language template | `generate(program, template) → {code, lineMap}` |
| `core/templates` | INI template parser + built-in templates | `parseTemplate`, `templates` registry |
| `features/projects` | Project hub, import/export, samples | routes + components |
| `features/editor` | Canvas, palette, inspector, function management | route + components |
| `features/run` | Toolbar, console, watch, call stack, debugger UI | components + runtime store |
| `features/codegen` | Source viewer, language picker, download/copy | components |
| `shared` | UI primitives, icons, theme, persistence, keyboard | reusable APIs |

Each core module is pure TypeScript and must not import React.

## 7. Data model

```ts
type FlowType = 'None' | 'Integer' | 'Real' | 'String' | 'Boolean'

interface Program {
  fileVersion: string           // export as "4.2"
  meta: {
    name: string
    authors: string
    about: string
    saved?: string
    created?: string
    edited?: string[]
  }
  functions: FunctionDef[]      // exactly one Main
  unknown?: string[]            // preserved raw XML for unsupported constructs
}

interface FunctionDef {
  name: string
  returnType: FlowType
  returnVariable: string
  params: Param[]
  body: Stmt[]
  origin?: { line?: number }    // optional source position for diagnostics
}

interface Param {
  name: string
  type: FlowType
  isArray: boolean
}

type Stmt =
  | { kind: 'declare'; names: string[]; type: FlowType; isArray: boolean; size?: string }
  | { kind: 'assign'; target: LValue; expression: string }
  | { kind: 'input'; variable: LValue }
  | { kind: 'output'; expression: string; newline: boolean }
  | { kind: 'if'; condition: string; then: Stmt[]; else: Stmt[] }
  | { kind: 'while'; condition: string; body: Stmt[] }
  | { kind: 'do'; condition: string; body: Stmt[] }
  | { kind: 'for'; variable: string; start: string; end: string; step: string; direction: 'inc' | 'dec'; body: Stmt[] }
  | { kind: 'call'; functionName: string; args: string[] }
  | { kind: 'comment'; text: string }
  | { kind: 'breakpoint'; condition?: string }
  | { kind: 'turtle' | 'file'; op: string; fields: Record<string, string> } // phase 2
  | { kind: 'unsupported'; rawXml: string; label: string }

interface LValue { name: string; index?: string }
```

All statement edits are immutable operations on this tree. Every statement gets
a stable runtime id derived from its path (e.g. `Main/2/then/0`) for
highlighting and diagnostics; serialization does not write ids.

### `.fprg` compatibility

- Read `fileversion` 1.x–4.x.
- Map `<declare variables="...">` (1.0) and `name="..."` (2+).
- Preserve `array`, `size`, `direction`, `newline`, and unknown attributes.
- Read comments and breakpoints.
- Turtle/file nodes are preserved and displayed read-only.
- Unknown elements are preserved in a raw XML bag and re-emitted on export.
- Tolerate non-ASCII numeric character references on read; escape on write.
- Round-trip rule: parse → serialize → parse must keep semantic content.

## 8. Expression language

Lexer + Pratt parser; never use `eval` or `Function`.

- Literals: integer, real, double-quoted string, `true`, `false`, `pi`.
- Identifiers: letter start, letters/digits only, no underscore, case-insensitive.
- Reserved: type names, intrinsic names, boolean/module keywords.
- Operators, highest to lowest precedence:
  1. unary `-`, `!`, `not`, `¬`
  2. exponent `^`, `↑` (right-associative)
  3. multiplicative `*`, `×`, `/`, `÷`, `%`, `mod`
  4. additive `+`, `-`
  5. concatenation `&`
  6. relational `>`, `<`, `>=`, `≥`, `<=`, `≤`, `==`, `=`, `!=`, `<>`, `≠`
  7. logical and `and`, `&&`, `∧`
  8. logical or `or`, `||`, `∨`
- Semantics: `/` always Real; `+` numeric only; `&` concatenates any types;
  Integer→Real widens, Real→Integer truncates; Boolean conditions required.
- Arrays: fixed size, 0-based, bounds checked at runtime.
- Intrinsics: `Abs Arcsin Arccos Arctan Cos Int Ln Log Log10 Sgn Sin Sqrt Tan
  Len Char ToChar ToCode ToFixed ToInteger ToReal ToString EOF Random Size`.
- Function calls: value-returning functions inside expressions; `None`
  functions only as `<call>` statements.
- Validation produces diagnostics with statement path, message, severity, and
  optional span. Errors block Run; warnings do not.

## 9. Interpreter and runtime events

`createInterpreter(program)` returns an async generator. The UI drives it.

```ts
type RuntimeEvent =
  | { type: 'start'; function: string }
  | { type: 'nodeEnter'; path: string; function: string }
  | { type: 'nodeExit'; path: string }
  | { type: 'output'; text: string; newline: boolean; path: string }
  | { type: 'inputRequest'; variable: string; expectedType: FlowType }
  | { type: 'inputAccept'; value: string }
  | { type: 'breakpoint'; path: string }
  | { type: 'callEnter'; function: string; args: Value[]; path: string }
  | { type: 'callExit'; function: string; returnValue?: Value }
  | { type: 'error'; error: RuntimeError }
  | { type: 'done' }
```

- Input: generator yields `inputRequest`, UI resolves a promise with typed text;
  invalid conversion re-prompts with a friendly error.
- Breakpoints: unconditional or expression-based; "ignore breakpoints" flag.
- Recursion: explicit depth counter, limit 100, friendly error with call stack.
- Infinite loops are user-controlled via Stop; run loop checks a cancellation
  token between events.
- Speed: 0 ms (full speed), 100, 300, 600 ms per node; Step ignores speed.
- Runtime errors: type mismatch, undeclared variable, index out of range,
  divide-by-zero, invalid input, stack overflow, unknown function.

## 10. Editor and interaction

### App shell

- Persistent slim sidebar (~72 px): logo, Projects, Editor, Examples, Variables,
  Source, Settings. Active item highlights; clicking opens the linked panel
  (~280 px) and collapses on second click.
- Minimal top bar: inline-editable project name, save state, theme toggle,
  command palette button.
- Full-bleed canvas.
- Floating bottom-center pill: Run, Step, Pause, Stop, speed menu, status.
- Inspector right drawer slides in on selection; pinnable. Tabs: Properties,
  Variables, Call Stack, Source.
- Console: docked, resizable, collapsible; chat-bubble and plain-text modes.

### Canvas behavior

- Automatic top-down layout; branch nodes (If Then/Else, loop body) get
  labeled edges and consistent column offsets.
- Nodes: Start/End terminator, Declare, Assign, Input, Output, If, While, Do,
  For, Call, Comment, Breakpoint, plus read-only Turtle/File.
- Hover an edge or block end shows `+`; opens insert menu scoped to location.
- Selection: ring + mini toolbar (edit, insert before/after, duplicate, delete,
  toggle breakpoint).
- Dragging a node offsets it temporarily; "Auto layout" restores. Offsets are
  stored per project view state, not in `.fprg`.
- Keyboard: arrows navigate, Enter edits, Delete deletes, Ctrl+Z/Y undo/redo,
  Ctrl+S exports `.fprg`, Ctrl+K palette, F5 run, F10 step.
- Command palette lists all actions and shapes with fuzzy search.

### Inspector forms

- Declare: names, type, array flag, size expression.
- Assign: target (+ index), expression with autocomplete of variables/functions.
- Input: variable picker limited to declared variables.
- Output: expression, newline toggle.
- If/While/Do: condition expression.
- For: variable, start, end, step, direction.
- Call: function picker, argument list with arity check.
- Comment: multiline text.
- Breakpoint: condition (optional).
- Function editor: name, return type, return variable, params; add/rename/delete
  function; cannot delete Main; rename updates callsites.

Validation appears inline and in a Problems list; errors badge on node.

## 11. Visual design

- Dual theme (system default) with CSS variables; both themes meet WCAG AA.
- Modern neutral surfaces, one accent gradient, soft shadows, 10–12 px radii,
  motion 120–200 ms, respects `prefers-reduced-motion`.
- Type: Inter (UI) + JetBrains Mono (code/expressions); system fallbacks.
- Shape colors communicate category and match generated-code highlights:
  I/O teal/green, control purple, declarations slate, call amber, errors red.
- Dark mode: near-black surfaces with subtle borders; light mode: off-white.
- No Flowgorithm logos, icons, or color schemes.

## 12. Code generation

### Template engine

- INI parser supporting comments, sections, repeated keys as multiline values,
  flags (`inc`, `~step`, custom), indentation directives, `{field}` substitution,
  `{{` escape, `{space}`, `{pipe}`.
- Sections: Language, Types, Function ID, Variable ID, literals, Variable Access,
  every operator with precedence, Main, Declare, Assign, Input, Output, If,
  While, Do, For, Call, Comment, Breakpoint, function definition.
- `lineMap` links generated lines to statement paths for synchronized
  highlighting.
- Import/export `.fpgt`; validate missing required sections with clear errors.

### Built-in targets

27 core templates authored for MarcoFlow: Ada 95, AppleScript, AutoHotkey, Bash,
C#, C++, Fortran 2003, Groovy, Java, JavaScript, Kotlin, Lua, MATLAB, Nim,
Pascal, Perl, PHP, PowerShell, Python, QBasic, Ruby, Scala, Smalltalk, Swift,
Transact-SQL, TypeScript, Visual Basic .NET. Bonus: VBA (Excel).
Pseudocode: Auto (follows UI language), Gaddis, IBO.

Each template has at least one sample test program whose generated output is
snapshotted and linted for obvious syntax errors where a checker is available.

## 13. Persistence, import, export

- IndexedDB database `marcoflow`, object store `projects`:
  `{ id, program, viewState, templateId, createdAt, updatedAt, schemaVersion }`.
- Autosave 500 ms debounce; save-state indicator: Saving / Saved / Error.
- Project hub: cards with mini flowchart preview, name, updated time; actions
  open, rename, duplicate, delete, export; New, Import, Samples.
- Import validates XML and reports errors without destroying the current project.
- Export `.fprg` with stable formatting (4-space indent, LF).
- Export PNG: render flowchart at 2× into canvas; SVG: serialize our own canvas
  SVG layer (React Flow viewport) with embedded styles.
- Storage warning banner on hub: "Projects live in this browser. Export a
  backup."
- Schema migrations handled by `schemaVersion`; unknown future fields preserved.

## 14. Error handling and resilience

- Expression and semantic errors are inline, never silent.
- Runtime errors stop execution, highlight the node, and show a dismissible
  card with message and call stack.
- Failed import/export shows a toast; original state is untouched.
- Storage quota or IndexedDB failure: switch to in-memory mode + persistent
  warning to export.
- Invalid `.fprg` attributes are normalized with warnings.
- No raw HTML injection: all user text rendered as text nodes; CodeMirror
  receives plain generated code.
- No network requests at runtime except optional external links.

## 15. Accessibility

- All controls keyboard reachable; visible focus rings.
- Sidebar and drawer have ARIA labels and escape-to-close.
- Console output announced via polite live region.
- Color is never the only signal: type badges/labels accompany colors.
- Minimum contrast 4.5:1 for text; 3:1 for UI boundaries.

## 16. Performance

- Layout recomputed only when the active function AST changes; memoized.
- React Flow nodes memoized per statement; large programs (300+ nodes) remain
  interactive.
- Codegen runs on demand and is debounced on edits.
- No blocking work during run; interpreter yields between events.
- Target: initial JS ≤ 350 KB gzip; first load ≤ 2 s on broadband.

## 17. Testing

- Unit: lexer/parser precedence, unicode operators, case-insensitivity,
  coercion rules, intrinsic functions, array bounds.
- Unit: validator diagnostics.
- Round-trip: representative `.fprg` samples (2.x, 3.x, 4.2), unknown nodes.
- Interpreter: hello world, branch, all loops, functions, arrays, recursion,
  breakpoints, input conversion, runtime errors, stop/pause.
- Codegen: snapshot per template with a canonical program; `.fpgt` parse
  fixtures for multiline/flag/indent behavior.
- Component: inspector validation, project hub CRUD, theme toggle.
- E2E smoke: new project → insert output → run → console text → step →
  export `.fprg` → re-import.
- CI: `typecheck`, `lint`, `vitest run`, Playwright smoke on Chromium.

## 18. Deployment

- `npm run build` outputs `dist/`.
- Cloudflare Pages project `marcoflow`, Git integration from `flow-app`.
- `public/_redirects`: `/* /index.html 200`.
- Security headers via `_headers` (CSP allowing self only, no inline scripts
  beyond Vite output, frame-ancestors none).
- No environment variables required.
- Custom domain optional later; `marcoflow.pages.dev` works out of the box.

## 19. Risks and mitigations

| Risk | Mitigation |
|---|---|
| 27 templates drift or produce invalid syntax | snapshot tests + per-language sample + priority ordering; templates are data, easy to fix |
| Complex nested layout looks messy | dagre + branch column rules + auto-layout button + comment folding |
| Async input complicates stepping | single interpreter event loop; input promise queue; explicit paused state |
| `.fprg` edge cases | preserve unknown XML, round-trip fixtures, tolerate missing attrs |
| Large canvas performance | memoized nodes, layout only on change, viewport culling built into React Flow |
| Browser storage loss | backup banner + one-click export |
| Licensing | independent templates/assets; no decompilation; attribution only |

## 20. Milestones

1. **Foundation:** scaffold, theme, shell, routing, IndexedDB projects, CI.
2. **Model + editor:** AST, factories, shape nodes, layout, insert menu,
   inspector, function management, undo/redo.
3. **Language core:** expression parser/evaluator, validator, tests.
4. **Runtime:** interpreter events, toolbar, console, watch, breakpoints, call
   stack.
5. **Persistence + files:** `.fprg` parse/serialize, import/export, PNG/SVG.
6. **Codegen:** template engine, 27 templates + pseudocode, source viewer sync.
7. **Polish:** command palette, keyboard shortcuts, accessibility, responsive
   desktop gate, samples, docs, deploy.

Turtle graphics and file I/O ship in phase 2; share links and cloud sync in
phase 3.

## 21. Acceptance criteria

- A new user can create a project, add an Output node, run it, and see "Hello,
  world" without reading docs.
- Every statement type in section 7 can be created, edited, deleted, saved,
  reopened, and exported.
- Run, Step, Pause, Stop, breakpoints, variable watch, and call stack work for
  nested functions, arrays, and loops.
- A valid Flowgorithm 4.2 `.fprg` sample imports and runs; its export re-imports
  without semantic loss.
- Switching language regenerates code and highlights the active statement.
- No `eval`, no network calls, no storage of data outside the browser.
- Works on Chrome, Firefox, Safari, Edge current versions at ≥1280 px; opens with
  a desktop notice below 768 px.
- Deployed build passes CI and is reachable at `marcoflow.pages.dev`.
