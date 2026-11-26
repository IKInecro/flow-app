---
name: MarcoFlow
description: Deep navy wayfinding for flowcharts that become code
colors:
  route-blue: "#2f5fd0"
  route-blue-soft: "#e9f0ff"
  route-blue-dark: "#7d9be8"
  ink-navy: "#0d1b2f"
  porcelain: "#f2f6fd"
  paper: "#ffffff"
  paper-2: "#f7faff"
  paper-3: "#edf3fd"
  border-cool: "#e0e8f6"
  text-muted: "#566882"
  midnight: "#050b18"
  navy-panel: "#0a1528"
  navy-panel-2: "#0e1c34"
  navy-panel-3: "#142642"
  navy-border: "#1d3050"
  navy-muted: "#92a6c5"
  line-teal: "#0e7c6b"
  line-amber: "#96620b"
  line-coral: "#bf3a31"
  nav-light: "#ffffff"
  nav-dark: "#030913"
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

MarcoFlow looks like a clean transit map for a software campus at night: a deep navy ground, layered slate-blue panels, soft ink text, and one restrained blue route. It stays a working tool first — dense panels, standard flowchart silhouettes, obvious controls — and lets colour, rounded type, and floating tools carry the character.

**Key Characteristics:**
- Deep navy is the default: midnight ground, layered navy panels, soft ink. Light mode keeps the porcelain version as an opt-in.
- One soft route blue for action, selection, focus, and live connectors.
- Teal, amber, and coral carry diagram meaning only.
- Rounded Nunito/Fredoka typography keeps the product friendly without feeling technical.
- Floating node properties and a floating terminal keep the canvas unobstructed.
- Motion explains state in 150–300ms; nothing loops for decoration.

## Colors

The palette is blue-led and low-glow. No neon, no chromatic halos, no gradients inside text.

### Primary
- **Route Blue** (#2f5fd0 light, #7d9be8 dark): primary buttons, active tab, focus ring, live connector.
- **Route Blue Soft** (#e9f0ff light, #12264a dark): active pill and selection surfaces.

### Diagram inks
- **Teal** (#0e7c6b / #46c2a5): start station and success.
- **Amber** (#96620b / #e6b76a): branches and notes.
- **Coral** (#bf3a31 / #ff8a86): end station, breakpoints, destructive actions.

### Neutral
- **Midnight** (#050b18): the default app ground and page background in dark mode.
- **Navy Panel** (#0a1528): palette, inspector, cards, floating tools in dark mode; steps up through #0e1c34 and #142642 for raised and selected surfaces.
- **Ink Navy** (#0d1b2f): primary text in light mode; soft ink (#e8effc) in dark mode.
- **Porcelain** (#f2f6fd): light-mode app ground; never plain grey or warm cream.
- **Paper** (#ffffff): light-mode palette, inspector, cards, floating tools.
- **Cool Border** (#e0e8f6 / #1d3050): hairlines and panel separation.
- **Muted Slate** (#566882 / #92a6c5): supporting copy at AA.

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

The shell is a 248px navigation drawer beside a fluid work area. Hiding it slides the whole drawer off-screen (`margin-left: -248px`) so the work area takes the full viewport; a 28×96px edge handle at the left middle reopens it, and Esc closes it again. The rail's navigation group folds under its own header, and the drawer follows light/dark theme.

The editor is a flex row inside an 8px inset: a 248px insert palette (200–380px), fluid canvas, and 280px inspector (250–460px). Panels and canvas are separate 16px cards. Every join is a draggable 8px resizer with a visible grip; each panel can be hidden and reopened from its floating edge tab or the Layout menu. Widths persist in `marcoflow.layout`.

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
- Grouped into Recent, Values, Control flow, Extras, with a search field that also matches plain-language terms (loop, print, debug).
- Each block is a filled tinted row with a 43×29px shape preview, bold name, one-line hint, and a drag grip. The preview draws the real block silhouette, not a generic icon.
- The panel fills the editor height; the header, search, hint, and footer stay put while the block list scrolls. Recent blocks (last four) persist in `marcoflow.recentBlocks`.
- Clicking a block adds it after the selected node (or at the end). Dragging a block onto any connector inserts it on that path.

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
- Drawer surface follows theme (white in light, #030913 in dark).
- 40px items, blue-soft active pill, muted slate at rest, 11px tracked section header with a fold chevron.
- Hide slides the drawer completely off-screen; the 28×96px edge handle is the only chrome left at the viewport edge.

### Connectors
- Sequential steps connect bottom to top on one axis; no dog-legs.
- Conditions leave from the diamond's side vertices. Each branch handle follows the side where its child actually sits, and the merge is centred under the condition.
- A loop's `No` exit leaves the left vertex, drops in a lane outside the body, and joins the merge below it. The return line climbs a separate lane on the right and enters the header's right vertex.
- Loop bodies and merges are centred on their header, so nesting adds depth instead of drifting right a column per level.
- Lanes stagger when loops nest, and a lane follows its header when the header is dragged.
- Every connector has a 26px invisible hit stroke. Hovering shows the route; clicking drops a 30px `+` at that point, which opens a compact insert menu. The menu anchors inside the canvas (start/end/above variants) and choosing a block inserts on that path.
- Drag a palette block over a connector to see a blue route glow, then drop to insert on the same path. Empty branches append into the matching side; loop return lanes append to the body; loop exits and final edges insert after the control.

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
