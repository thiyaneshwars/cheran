---
name: Cheran Co-operative Society — Temple-Indigo & Zari Guild Ledger
description: Unified handloom ivory, deep temple-indigo, antique zari accounting, and 3D powerloom dispatch system.
colors:
  temple-indigo: "#14233C"
  temple-indigo-hover: "#1D3254"
  stage-obsidian: "#070D1D"
  stage-badge: "#091122"
  stage-border: "#233457"
  kora-ivory: "#FAF7F0"
  linen-surface: "#F3EEE3"
  linen-row-divider: "#F0EADC"
  cotton-card: "#FFFFFF"
  linen-hairline: "#E5DEC9"
  linen-strong: "#D4CAB0"
  scrollbar-stone: "#C7BBA0"
  muted-placeholder: "#8A94A6"
  print-black: "#000000"
  zari-gold: "#B47B2B"
  zari-gold-bright: "#D49A42"
  zari-soft: "#FEF5E4"
  ink-body: "#25344D"
  ink-muted: "#5B6B84"
  cooptex-emerald: "#166534"
  cooptex-emerald-bg: "#ECFDF5"
  deficit-terracotta: "#9A3412"
  deficit-terracotta-bg: "#FFF7ED"
  critical-crimson: "#991B1B"
  critical-crimson-bg: "#FEF2F2"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.005em"
  display-compact:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  title-sm:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  body-compact:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
  overline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.1em"
  micro:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.3
  financial:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "'tnum' 1, 'lnum' 1"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.temple-indigo}"
    textColor: "{colors.cotton-card}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.temple-indigo-hover}"
  card-ledger:
    backgroundColor: "{colors.cotton-card}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Cheran Co-operative Society

## Overview

**Creative North Star: "The Temple-Indigo & Zari Guild Ledger"**

This system brings Tamil Nadu co-operative handloom heritage and statutory accounting precision together on one calm, unified light workspace. Unbleached kora cotton ivory frames crisp ledger sheets bounded by `1px` warm linen hairlines (`#E5DEC9`), while deep temple-indigo (`#14233C`) navigation rails, authority headers, and antique zari gold (`#B47B2B`) milestones establish institutional clarity.

Inside the **Higher Officials Portal**, a static tech-professional obsidian-indigo command stage pairs an interactive left/right swipe deck (**Dhothi** via `/images/dhothi_weave.jpg` ⇄ **Saree** via `/images/saree_weave.jpg`, showing completion %, sent, remaining, produced, and godown pieces) with the live **Kinematic 3D Powerloom Machine (`ExecutiveBackground3D`)**, merging seamlessly into the ivory statutory breakdown, stock pipeline, and searchable Co-optex challan ledger below (`RevealBlock`, `WeaveRule`, and `DispatchTickRail`). Across operational **Production & Accounting ledgers**, headings and dense multi-column tables stay in clean sans (`Plus Jakarta Sans`) and tabular `JetBrains Mono` with comfortable letter and word spacing so entries never crowd together.

**Key Characteristics:**
- **Dedicated 3D Loom Stage on Officials Portal Only:** High-contrast dark-indigo 3D stage with fullscreen inspection option, while Login, Loading, Dashboard, and Production views remain crisp flat cotton ledgers.
- **Readable Production Tables & Sans Headings:** `.font-display` serif is applied selectively on editorial portals, never cramping operational `font-black` / tabular ledgers.
- **Scroll-Revealed Continuity:** Progressive-enhancement scroll reveals (`opacity: 1` by default; `prefers-reduced-motion` compliant) pace long statutory sheets cleanly.

## Colors

Warm archival ivory and woven linen ground the application, reservedly punctuated by Deep Temple Indigo and Antique Zari Gold.

### Primary
- **Deep Temple Indigo (`#14233C`)**: Primary typography ink, navigation rail surface, active buttons, and sticky inspection portal masthead.
- **Temple Indigo Hover (`#1D3254`)**: Interactive hover elevation for indigo controls.

### Secondary
- **Antique Zari Gold (`#B47B2B` / `#D49A42`)**: Ceremonial rail divider border, active tab left bar, Co-optex dispatch shuttle stitch, and Higher Officials accent.

### Tertiary
- **Co-optex Emerald (`#166534` on `#ECFDF5`)**: Verified government handover deliveries and active ledger sync badges.
- **Target Deficit Terracotta (`#9A3412` on `#FFF7ED`)**: Remaining production quota deficits paired with warning icons and signed `-N pcs` deltas.

### Neutral
- **Unbleached Kora Ivory (`#FAF7F0`)**: Application canvas ground, loading backdrop, and secondary card fields.
- **Woven Linen Alt (`#F3EEE3`) & Row Hairline (`#F0EADC`)**: Table headers and row separators.
- **Cotton Card (`#FFFFFF`)**: Primary working cards and tables.
- **Linen Borders & Scrollbars (`#E5DEC9`, `#D4CAB0`, `#C7BBA0`, `#8A94A6`)**: Crisp `1px` borders and visible horizontal table scrollbars.
- **3D Stage Obsidian (`#070D1D`, `#091122`, `#233457`)**: Dedicated viewport stage housing `ExecutiveBackground3D`.

### Named Rules
**The Readable Register Rule.** Keep operational Production and Accounting headers and dense register tables in airy UI sans (`Plus Jakarta Sans`) and tabular `JetBrains Mono` with relaxed word spacing rather than tightly tracked serifs.

## Typography

**Display Font:** `Newsreader` (used via explicit `.font-display` on portal mastheads and section titles)
**Operational Sans:** `Plus Jakarta Sans` (navigation, production page headers, form labels, tables)
**Financial/Code Font:** `JetBrains Mono` (tabular piece counts, currency INR, challan numbers, ratios)

## Layout

Desktop-first office monitor grid (`max-w-7xl` on Officials Portal, `232px` default horizontally resizable [`180px–360px`] and `76px` collapsible Temple Indigo navigation rail + `80px` sticky Ivory header on the Accounting Workspace) with `.scrollbar-landscape` horizontal scrollbars for wide production registers.

## Elevation & Depth

Tonal layering replaces multi-layer shadows: Canvas (`#FAF7F0`) -> Card (`#FFFFFF`) -> Inset Linen (`#F3EEE3`), topped by sticky Temple Indigo chrome (`#14233C`) cleanly anchored with a thin `#B47B2B` seam.

## Shapes

Consistent rectangular hospitality with `6px–16px` radii (`999px` on pill badges and scrollbars). Thick partial border accents on rounded containers (`border-t-4`, `border-l-4`) are disallowed.

## Components

### Signature Components
- **`CheranSealBadge`**: Wraps `/images/cheran_logo.png` cleanly inside `#0A101B` with `border-[#B47B2B]/65`.
- **`ExecutiveBackground3D`**: Three.js kinematic powerloom visualization mounted cleanly in the Higher Officials Portal stage and optional fullscreen inspection modal.
- **`DispatchTickRail`**: Extent progress bar mapping Loom Output -> Godown Custody -> Govt Co-optex Fulfillment.
- **`ScrollThreadBar` & `RevealBlock`**: Top sticky zari-indigo progress thread paired with progressive intersection reveal choreography (`prefers-reduced-motion` safe).

## Do's and Don'ts

### Do:
- **Do** count all Co-optex dispatch metrics strictly in **pieces** (`Dhothis`, `Sarees`, `Pieces`) paired with icon + signed delta on deficits.
- **Do** maintain `.scrollbar-landscape` and normal word/letter spacing across all Powerloom Production ledgers.

### Don't:
- **Don't** apply tightly tracked serif fonts onto dense production headings or multi-badge unit cards.
- **Don't** add blurred glass overlays, emoji buttons, or WebGL backgrounds outside the Higher Officials Loom stage.
