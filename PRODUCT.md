<!-- impeccable:product-schema 1 -->
# Cheran Co-operative Society — Accounting & Production Ledger

**Type:** Statutory Co-operative Textile Accounting, Powerloom Production & Co-optex Dispatch Management System  
**Primary Users:** Society Accountants & Auditors (`aduit@cheran`), Production Supervisors (`production@cheran`), and Senior Inspecting Government Officials (`official@cheran`)  
**Primary Environments:** Office desktop and laptop monitors in Tamil Nadu co-operative society offices and inspecting directorates, with clean responsive layouts for tablet and mobile field checks.

## Product Purpose & Jobs To Be Done
1. **Higher Officials Statutory Inspection Portal (`official@cheran`):** Read-only real-time progress view tracking Loom-to-Godown-to-Govt (Co-optex) completion percentages, active godown ready stocks, remaining pending targets, and searchable/exportable Government Handover Challans for Dhothis and Sarees.
2. **Double-Entry Society Accounting & Treasury Workspace:** Daily book accounting, multiple bank account balances & transfers, liquid cash custody & revocations, society profit & loss statements, audit logs, and MIS reports.
3. **Powerloom Floor & Paavu Production Tracking:** Unit-wise powerloom allocations, Paavu (warp beam) issuances, Babin winding allocations, daily loom production logs, Dhothi & Saree piece registers, Government yarn allotment tracking, and weft suggestions.
4. **System Administration & Backups:** Role-based access (`PRODUCTION`, `AUDITING` / `ADMIN`, `OFFICIAL` / `MANAGEMENT`), master rates/settings, and database backup/restore controls.

## Non-Negotiable Domain Invariants
- **Pieces Over Meters:** Higher Officials Portal and Govt Handover Stock views always measure and display counts in **pieces** (`pcs`) for **Dhothis** and **Sarees** (never raw meter totals on official handover dashboards).
- **Terminology Consistency:** Always display **"Dhothi"** (never "Veatti") in user-facing UI labels, headings, and exports.
- **Role Security & Routing Integrity:** Credentials and role routing in `src/app/page.tsx` and `/api/auth/login` must continue routing `official@cheran` (`OFFICIAL` / `MANAGEMENT`) cleanly into the dedicated inspection portal, and accountants/supervisors into the full workspace shell.
- **Financial & Stock Exactness:** Tabular numerals (`.font-financial`), exact `formatINR` formatting, CSV export fidelity, and Prisma database mutations remain untouched.

## Visual World & Interaction Constraints (User-Confirmed Redesign Direction)
- **Unified Light Institutional Aesthetic:** Warm Handloom Ivory canvas (`#FAF7F2` / `#F5F1E8`), Crisp Loom Cotton Card surfaces (`#FFFFFF`), Deep Temple Indigo authority ink (`#192841` / `#0F1B2D`), and Antique Zari Gold (`#B47B2B`) & Terracotta/Emerald operational accents across **every** screen (Loading Splash, Login Portal, Higher Officials Portal, and Full Accounting & Production Workspace).
- **Higher Officials Portal 3D Loom Simulation & Swipeable Showcase:** Within `ExecutiveOfficialView.tsx` (Higher Officials Portal), the static top command deck pairs authentic generated product photography ([dhothi_weave.jpg](public/images/dhothi_weave.jpg) & [saree_weave.jpg](public/images/saree_weave.jpg)) and left/right swipe controls (`DHOTHI ⇄ SAREE`) with full quota completion %, sent/godown/produced/remaining piece telemetry alongside `ExecutiveBackground3D` WebGL powerloom animation, merging seamlessly into the ivory statutory inspection ledger and challan audit below. All remaining application screens use pure flat architectural ivory surfaces with zero WebGL backgrounds.
- **Purposeful Scroll-Reveal & Continuity Motion:** Smooth IntersectionObserver-driven chapter, KPI ribbon, pipeline milestone, and table/ledger reveals with staggered textile warp/weft cadence, sticky/fluid inspection continuity, visible-by-default DOM fallback, and complete `@media (prefers-reduced-motion: reduce)` compliance.
- **Official Assets & Clean Iconography:** Preserve `/images/cheran_logo.png` (framed neatly inside a metallic dark-medallion seal so its black crest harmonizes cleanly with warm ivory surfaces) and authentic industrial textile photography (`/images/textile_loom_banner.jpg`); replace all inline emoji icons with crisp vector icons (`lucide-react`).
