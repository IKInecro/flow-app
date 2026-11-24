---
name: MarcoFlow
description: Daylight wayfinding for flowcharts that become code
colors:
  route-vermilion: "#b53d28"
  route-vermilion-soft: "#fbe6e0"
  ink-navy: "#17202b"
  porcelain: "#f1eee7"
  paper: "#fffdf9"
  paper-2: "#f7f3ec"
  paper-3: "#ece6db"
  border-warm: "#e2dcd1"
  text-muted: "#5e6874"
  line-blue: "#2456c8"
  line-teal: "#0a7f6a"
  line-amber: "#b7790c"
  rail-ink: "#090e13"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Onest Variable, sans-serif"
    fontSize: "3.2rem"
    fontWeight: 620
    lineHeight: 1
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  title:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 620
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
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "34px"
components:
  button-primary:
    backgroundColor: "{colors.route-vermilion}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 15px"
    height: "38px"
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    padding: "0 15px"
    height: "38px"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-muted}"
    rounded: "99px"
    padding: "5px 9px"
  project-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-navy}"
    rounded: "18px"
  field:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
---

# Design System: MarcoFlow

## Overview

**Creative North Star: "Daylight Wayfinding"**

MarcoFlow looks like a campus route map read in the morning: warm paper, deep ink, and a single vermilion line telling you where you are going. The interface is a working tool first, so navigation, panels, tabs, and forms stay familiar. The world enters through colour, type, density, and one live gesture: when a program runs, the active station and its connector pulse like a route being travelled.

**Key Characteristics:**
- Warm porcelain ground with a deep ink sidebar.
- One vermilion accent reserved for action, selection, and the live route.
- Line colours (cobalt, teal, amber) carry diagram meaning, never decoration.
- Compact product density with generous grouping.
- Motion explains state: route pulse, panel slide, drag lift, modal rise.

## Colors

A restrained product palette with a committed ink/paper contrast and route colours doing semantic work.

### Primary
- **Route Vermilion** (#b53d28): primary buttons, active node, live connector, selected tab, focus ring. On paper it clears 4.5:1 with white text.

### Secondary
- **Cobalt Line** (#2456c8): input and call nodes, secondary route drawing.
- **Teal Line** (#0a7f6a): success and terminal nodes.
- **Amber Line** (#b7790c): branches and warnings.

### Neutral
- **Ink Navy** (#17202b): primary text and the sidebar ground in light theme.
- **Porcelain** (#f1eee7): app ground.
- **Paper** (#fffdf9): panels, cards, canvas.
- **Warm Border** (#e2dcd1): hairlines and separation.
- **Muted Slate** (#5e6874): supporting copy at 5.5:1 on paper.
- **Rail Ink** (#090e13): dark-theme sidebar.

### Named Rules
**The One Live Line Rule.** Only the active path and its outgoing connector wear vermilion. Everything else stays neutral so the run state is unmistakable.

## Typography

**Display Font:** Bricolage Grotesque Variable (with Onest fallback)
**Body Font:** Onest Variable (with system sans fallback)
**Label/Mono Font:** JetBrains Mono Variable

**Character:** Bricolage gives the hub a hand-lettered wayfinding voice; Onest keeps dense panels quiet and legible; JetBrains Mono is used only for code and measurements.

### Hierarchy
- **Display** (620, clamp 2.25–3.2rem, 1): hub headline only.
- **Headline** (600, 21px, 1.2): section headings on hub and examples.
- **Title** (620, 14–15px, 1.3): card names, editor project name, panel headings.
- **Body** (400–550, 12.5–15px, 1.5–1.6): descriptions, forms, console.
- **Label** (600–700, 10–11px, 0.02–0.12em): chips, tabs, rail group labels, status.

### Named Rules
**The No-Mono-UI Rule.** Monospace appears only inside code, console output, and numeric data; labels and buttons never wear it as a costume.

## Layout

The shell is a 248px ink rail beside a fluid work area; below 1180px the rail compacts to 78px, below 900px to 64px. The hub is a 1240px container: full-width hero, then project cards at 252px minimum, then a horizontally swipeable examples rail. The editor is a three-column grid — 220px insert palette, fluid canvas, 306px inspector — with the console docked below and collapsing to a 40px header. At 1080px the columns narrow; at 820px they become 150px / fluid / 210px. Source mode gives the code panel 360–460px.

Spacing rhythm is 4/8/12/16/24/34 with more space above section headings than below. The canvas sits inset 10px inside a 18px rounded frame so the diagram reads as a sheet on a desk.

## Elevation & Depth

Depth is soft and directional: a low ambient shadow at rest, a lifted shadow on hover, and a large offset shadow for overlays. No zero-offset halos. The editor bar is a solid layer with z-index 20 so its menus always escape the work area.

### Shadow Vocabulary
- **rest** (`0 1px 2px rgb(23 32 43 / 7%)`): cards, buttons, controls.
- **lift** (`0 2px 6px rgb(23 32 43 / 6%), 0 14px 32px -14px rgb(23 32 43 / 24%)`): hover, run pill.
- **overlay** (`0 30px 70px -24px rgb(23 32 43 / 38%), 0 8px 24px -12px rgb(23 32 43 / 18%)`): dialogs, drawers, floating toolbars.

### Named Rules
**The Lift-On-Intent Rule.** Surfaces rest flat-ish and lift only when the visitor points at them or an overlay opens.

## Shapes

Corners are gently rounded: 9px controls, 13px menus and inserts, 18px cards and canvas, 20px project cards and dialogs, 28px hero. Pills are reserved for status chips, speed, and the run toolbar. Diagram nodes keep their semantic silhouettes (terminator pill, process rectangle, branch diamond) with a 1.5px stroke and a soft drop shadow.

## Components

### Buttons
- **Shape:** 9px radius, 38px height, 15px horizontal padding.
- **Primary:** vermilion fill, warm white text, offset lift shadow.
- **Hover / Focus:** darken and lift; 2px vermilion focus outline with 2px offset.
- **Ghost / Icon:** transparent at rest, paper-3 hover, icon buttons 34px square.

### Chips
- **Style:** paper fill, warm hairline, 99px radius, 11px label.
- **State:** storage chip pairs a teal drive icon; quiet chip drops the fill.

### Cards / Containers
- **Corner Style:** 18px project card, 20px dialog.
- **Background:** paper over porcelain.
- **Shadow Strategy:** rest → lift on hover.
- **Border:** 1px warm hairline; accent tint on hover.
- **Internal Padding:** 12–18px; route preview 132px tall.

### Inputs / Fields
- **Style:** paper-2 fill, warm border, 9px radius.
- **Focus:** paper fill, vermilion border, 3px 16% vermilion ring.
- **Error / Disabled:** danger border and 10% danger fill; disabled at 40% opacity.

### Navigation
- **Style:** ink rail, 13px Onest labels, 10px tracked group label, 10px radius items.
- **States:** muted slate at rest, raised ink hover, 17% vermilion + paper text + vermilion icon when current.
- **Compact:** labels and wordmark hide; icons center in 64px.

### Signature Component — Live Route Connector
Diagram edges are 1.7px neutral smooth-step routes. The live edge turns vermilion, gains a moving dash pulse, and a 3.4px dot travels the path via SVG motion. Hover turns any edge into a dashed route. Reduced motion keeps the colour change and removes the travelling dot.

## Do's and Don'ts

### Do:
- **Do** keep vermilion for the active action or the active route only.
- **Do** use warm paper and ink navy as the base contrast before adding a line colour.
- **Do** keep node silhouettes and control positions standard for a flowchart tool.
- **Do** animate state changes in 150–300ms with `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Do** respect `prefers-reduced-motion`: keep colour/opacity feedback, remove travel.

### Don't:
- **Don't** use monospace for UI labels, buttons, or marketing copy.
- **Don't** use glass/blur as decoration; blur only separates a modal from the page.
- **Don't** add a second accent for decoration or gradients inside text.
- **Don't** put a coloured left border on cards, alerts, or list items.
- **Don't** animate layout-driving properties; use transforms, opacity, and grid/flex reveal.
