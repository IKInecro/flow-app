---
name: MarcoFlow
description: Modern blue wayfinding for flowcharts that become code
colors:
  route-blue: "#2f5fd0"
  route-blue-soft: "#e9f0ff"
  route-blue-dark: "#7ea2ff"
  ink-navy: "#0d1b2f"
  porcelain: "#f2f6fd"
  paper: "#ffffff"
  paper-2: "#f7faff"
  paper-3: "#edf3fd"
  border-cool: "#e0e8f6"
  text-muted: "#566882"
  line-teal: "#0e7c6b"
  line-amber: "#96620b"
  line-coral: "#bf3a31"
  nav-light: "#ffffff"
  nav-dark: "#060d19"
typography:
  display:
    fontFamily: "Fredoka Variable, Nunito Variable, sans-serif"
    fontSize: "3.2rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0em"
  title:
    fontFamily: "Nunito Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "9px"
  md: "13px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.route-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    height: "38px"
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    height: "38px"
  palette-item:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink-navy}"
    rounded: "10px"
    padding: "7px 8px"
  field:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
---

# Design System: MarcoFlow

## Overview

**Creative North Star: "Modern Blue Wayfinding"**

MarcoFlow looks like a clean transit map for a software campus: cool porcelain ground, navy ink, soft white panels, and one confident blue route. It stays a working tool first — dense panels, standard flowchart silhouettes, obvious controls — and lets colour, rounded type, and floating tools carry the character.

**Key Characteristics:**
- Cool blue-tinted ground with white work surfaces in light mode; deep navy ground with slate-blue panels in dark mode.
- One route blue for action, selection, focus, and live connectors.
- Teal, amber, and coral carry diagram meaning only.
- Rounded Nunito/Fredoka typography keeps the product friendly without feeling technical.
- Floating node properties and a floating terminal keep the canvas unobstructed.
- Motion explains state in 150–300ms; nothing loops for decoration.

## Colors

The palette is blue-led and low-glow. No neon, no chromatic halos, no gradients inside text.

### Primary
- **Route Blue** (#2f5fd0 light, #7ea2ff dark): primary buttons, active tab, focus ring, live connector.
- **Route Blue Soft** (#e9f0ff light, #162846 dark): active pill and selection surfaces.

### Diagram inks
- **Teal** (#0e7c6b / #3fc3a5): start station and success.
- **Amber** (#96620b / #efb75b): branches and notes.
- **Coral** (#bf3a31 / #ff7f7f): end station, breakpoints, destructive actions.

### Neutral
- **Ink Navy** (#0d1b2f): primary text in light mode.
- **Porcelain** (#f2f6fd): app ground; never plain grey or warm cream.
- **Paper** (#ffffff): palette, inspector, cards, floating tools.
- **Cool Border** (#e0e8f6 / #233550): hairlines and panel separation.
- **Muted Slate** (#566882 / #94a5bf): supporting copy at AA.

### Named Rules
**The One Route Rule.** Only the active path, primary action, and current selection wear route blue.

## Typography

**Display Font:** Fredoka Variable (self-hosted, `/fonts/fredoka-latin.woff2`)
**Body Font:** Nunito Variable (self-hosted, `/fonts/nunito-latin.woff2`)
**Code Font:** JetBrains Mono Variable

Fredoka gives panel titles and the wordmark a soft, geometric voice; Nunito keeps dense labels friendly and legible. Monospace is reserved for expressions, console output, and path labels. Functional UI text stays at 11px or above.

### Hierarchy
- **Display** (600, clamp 2.25–3.2rem, 1): hub hero only.
- **Headline** (600, 17–21px): panel titles.
- **Title** (700, 14–15px): card names, project name.
- **Body** (500–650, 12.5–15px, 1.5): descriptions, forms.
- **Label** (700–800, 11px, 0.02–0.13em): tabs, params, status.

**The No-Mono-UI Rule.** Monospace belongs to code, terminal output, and numeric fields only.

## Layout

The shell is a 236px navigation rail (78px collapsed) beside a fluid work area. The rail's navigation group folds under its own header, and the rail itself follows light/dark theme.

The editor is a flex row: a 196px insert palette (170–340px), fluid canvas, and 280px inspector (250–460px). Every vertical border is a draggable 8px resizer with a visible grip; each panel can be hidden and reopened from its floating edge tab or the Layout menu. Widths persist in `marcoflow.layout`.

The console is **not** a bottom dock. It is a 600×240px floating terminal that rises when a program runs, can be dragged by its header, resized from its corner, and closed until the next run. Block properties are a 262px card that floats beside the selected node and follows it while panning or dragging.

## Elevation & Depth

Soft directional shadows only. Resting surfaces use a 1px hairline and near-flat shadow; hover lifts slightly; floating tools use the overlay shadow. No zero-offset chromatic glow.

### Shadow Vocabulary
- **rest** (`0 1px 2px rgb(13 27 47 / 6%)`): cards, buttons.
- **lift** (`0 2px 6px rgb(13 27 47 / 5%), 0 14px 32px -14px rgb(13 27 47 / 22%)`): hover, run pill.
- **overlay** (`0 30px 70px -24px rgb(13 27 47 / 34%)`): dialogs, node card, terminal.

## Shapes

Controls 9px, tiles and menus 10–13px, panels 12–14px, cards 18–20px, hero 28px. Pills are reserved for status chips and the run toolbar. Nodes keep their semantic silhouettes with a 1.6px stroke, tinted fill, icon chip, role label, and a fine top highlight.

## Components

### Blocks
- **Structure:** tinted station silhouette + 23px icon chip + label + uppercase role meta.
- **Start / End:** teal terminator / coral terminator; compact, centred, no meta clutter.
- **Actions:** blue-tinted parallelogram or rectangle.
- **Branches:** amber diamond, icon above label.
- **Notes / Breakpoints:** amber note and coral pause chip.
- **States:** hover lifts with a neutral shadow; selection adds a blue halo and 2px stroke.

### Insert palette
- Grouped into Values, Control flow, Extras.
- Each block is a filled tinted row with a 27px icon chip, bold name, and one-line hint — no outline-only squares.

### Floating block properties
- Header with kind icon, role name, path, and close.
- `StmtForm` fields at 31px height with 12px text.
- Follows the node via a viewport-fixed portal; closing keeps the node selected.

### Floating terminal
- Dark terminal in both themes: traffic-light dots, status pill, mode toggle, close, corner resize.
- Auto-opens on run/step; hidden by default and never restored open on reload.
- Body uses JetBrains Mono at 11px with output/input/error/system tints.

### Inputs / Fields
- Paper-2 fill, cool border, 9px radius. Focus: white fill, blue border, 3px blue-soft ring.

### Navigation
- Rail surface follows theme (white in light, #060d19 in dark).
- 38px items, blue-soft active pill, muted slate at rest, 11px tracked section header with a fold chevron.

### Signature Component — Live Route Connector
Edges are 1.7px neutral routes. The active edge turns route blue with a moving dash and travelling dot. Hover dashes any edge. Reduced motion keeps colour and drops travel.

## Do's and Don'ts

### Do:
- Keep route blue for the active action or path only.
- Use blue-tinted surfaces so light mode never reads as an empty white page.
- Keep node silhouettes and control positions standard.
- Let floating tools overlap the canvas; never dock them permanently over it.
- Respect `prefers-reduced-motion`.

### Don't:
- Don't use neon glows, coloured halos, or "tech" gradients.
- Don't use monospace for UI labels.
- Don't put functional text below 11px.
- Don't add decorative coloured left borders.
- Don't animate layout properties; use transform, opacity, and grid/flex reveal.
