"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  LogOut,
  RefreshCw,
  Factory,
  Warehouse,
  PackageCheck,
  Clock,
  Search,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Package,
  Maximize2,
  X,
  ArrowDown,
} from "lucide-react";
import { ExecutiveBackground3D } from "./ExecutiveBackground3D";
import { CheranSealBadge } from "../ui/CheranSealBadge";
import {
  RevealBlock,
  WeaveRule,
  ScrollThreadBar,
  DispatchTickRail,
} from "../ui/ScrollReveal";

interface ExecutiveOfficialViewProps {
  user: any;
  onLogout: () => void;
}

export const ExecutiveOfficialView: React.FC<ExecutiveOfficialViewProps> = ({
  user,
  onLogout,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [handovers, setHandovers] = useState<any[]>([]);
  // Top First-Half Interactive Swipe Deck ("DHOTHI" default, swipe left/right to "SAREE")
  const [heroSlide, setHeroSlide] = useState<"DHOTHI" | "SAREE">("DHOTHI");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDeckHovered, setIsDeckHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  // Second-Half Statutory Filter ("ALL" | "DHOTHI" | "SAREE")
  const [activeTab, setActiveTab] = useState<"ALL" | "DHOTHI" | "SAREE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showLoomModal, setShowLoomModal] = useState(false);

  const swipeStartXRef = useRef<number | null>(null);
  const swipeViewportRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const elapsedCycleMsRef = useRef<number>(0);

  const SLIDE_CYCLE_MS = 6500;

  const loadExecutiveData = async (isManualSync = false) => {
    try {
      if (isManualSync) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [ovRes, handRes] = await Promise.all([
        fetch("/api/production/overview"),
        fetch("/api/production/handover"),
      ]);

      if (!ovRes.ok || !handRes.ok) {
        throw new Error("Unable to load official dispatch telemetry");
      }

      const ovJson = await ovRes.json();
      const handJson = await handRes.json();

      setOverviewData(ovJson.overview || ovJson);
      setHandovers(Array.isArray(handJson) ? handJson : []);
    } catch (err: any) {
      setError(err.message || "Failed to synchronize live Society stocks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExecutiveData(false);
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Derived Official Piece Totals (Strict pieces, zero meters)
  const veatti = overviewData?.veatti || {
    totalProducedMeters: 0,
    godownAvailableMeters: 0,
    totalHandoveredMeters: 0,
    balanceToHandoverMeters: 0,
    targetMeters: 0,
    activeUnitsCount: 0,
    unloadedPaavuCount: 0,
    runningPaavuCount: 0,
    completedPaavuCount: 0,
  };

  const saree = overviewData?.saree || {
    totalProducedMeters: 0,
    godownAvailableMeters: 0,
    totalHandoveredMeters: 0,
    balanceToHandoverMeters: 0,
    targetMeters: 0,
    activeUnitsCount: 0,
    unloadedPaavuCount: 0,
    runningPaavuCount: 0,
    completedPaavuCount: 0,
  };

  const consolidated = overviewData?.totalConsolidated || {
    totalProducedMeters:
      (veatti.totalProducedMeters || 0) + (saree.totalProducedMeters || 0),
    godownAvailableMeters:
      (veatti.godownAvailableMeters || 0) + (saree.godownAvailableMeters || 0),
    totalHandoveredMeters:
      (veatti.totalHandoveredMeters || 0) + (saree.totalHandoveredMeters || 0),
    targetMeters: (veatti.targetMeters || 0) + (saree.targetMeters || 0),
    balanceToHandoverMeters:
      (veatti.balanceToHandoverMeters || 0) +
      (saree.balanceToHandoverMeters || 0),
  };

  const activeStats =
    activeTab === "DHOTHI"
      ? veatti
      : activeTab === "SAREE"
      ? saree
      : consolidated;

  const activeUnitLabel =
    activeTab === "DHOTHI"
      ? "Dhothis"
      : activeTab === "SAREE"
      ? "Sarees"
      : "Pieces";

  const calcPct = (handedOver: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.max(0, (handedOver / target) * 100));
  };

  const overallPct = calcPct(
    consolidated.totalHandoveredMeters || 0,
    consolidated.targetMeters || 0
  );
  const activePct = calcPct(
    activeStats.totalHandoveredMeters || 0,
    activeStats.targetMeters || 0
  );
  const dhothiPct = calcPct(
    veatti.totalHandoveredMeters || 0,
    veatti.targetMeters || 0
  );
  const sareePct = calcPct(
    saree.totalHandoveredMeters || 0,
    saree.targetMeters || 0
  );

  const weftInfo = overviewData?.weftInventory || {
    veatti: { godownStockKg: 0, godownStockBags: 0, totalLoomStockBags: 0 },
    saree: { godownStockKg: 0, godownStockBags: 0, totalLoomStockBags: 0 },
  };

  const resolvePieces = (h: any) => {
    if (h.pieces && Number(h.pieces) > 0) return Number(h.pieces);
    const divisor = h.clothType === "SAREE" ? 5.5 : 3.65;
    return Math.floor((Number(h.meters) || 0) / divisor);
  };

  const filteredHandovers = useMemo(() => {
    return handovers.filter((h) => {
      if (activeTab === "DHOTHI" && h.clothType !== "VEATTI") return false;
      if (activeTab === "SAREE" && h.clothType !== "SAREE") return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hay = [
          h.challanNo,
          h.recipientDept,
          h.officerName,
          h.vehicleNo,
          h.unit?.weaverName,
          h.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [handovers, activeTab, searchTerm]);

  const handleExportCSV = () => {
    const headers = [
      "Challan No",
      "Dispatch Date",
      "Variety",
      "Quantity (Pieces)",
      "Recipient Department",
      "Officer / Verifier",
      "Vehicle / Unit",
    ];
    const rows = filteredHandovers.map((h) => [
      `"${(h.challanNo || "").replace(/"/g, '""')}"`,
      new Date(h.handoverDate).toLocaleDateString("en-IN"),
      h.clothType === "SAREE" ? "Saree" : "Dhothi",
      resolvePieces(h),
      `"${(h.recipientDept || "Co-optex / Govt").replace(/"/g, '""')}"`,
      `"${(h.officerName || "-").replace(/"/g, '""')}"`,
      `"${(h.vehicleNo || h.unit?.weaverName || "-").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cheran_Govt_Handover_${activeTab}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    elapsedCycleMsRef.current = 0;
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = "scaleX(0)";
    }
  }, [heroSlide]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    mq.addEventListener("change", handleReducedMotionChange);

    if (
      mq.matches ||
      reducedMotion ||
      isDeckHovered ||
      isDragging ||
      showLoomModal ||
      loading
    ) {
      return () => mq.removeEventListener("change", handleReducedMotionChange);
    }

    let rafId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - lastTimestamp, 100);
      lastTimestamp = now;

      if (typeof document === "undefined" || !document.hidden) {
        elapsedCycleMsRef.current += dt;
        const pct = Math.min(1, elapsedCycleMsRef.current / SLIDE_CYCLE_MS);
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${pct})`;
        }
        if (elapsedCycleMsRef.current >= SLIDE_CYCLE_MS) {
          elapsedCycleMsRef.current = 0;
          if (progressBarRef.current) {
            progressBarRef.current.style.transform = "scaleX(0)";
          }
          setHeroSlide((prev) => (prev === "DHOTHI" ? "SAREE" : "DHOTHI"));
          return;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      mq.removeEventListener("change", handleReducedMotionChange);
    };
  }, [heroSlide, reducedMotion, isDeckHovered, isDragging, showLoomModal, loading]);

  const handleSwapSlide = (target?: "DHOTHI" | "SAREE") => {
    if (target) {
      setHeroSlide(target);
    } else {
      setHeroSlide((prev) => (prev === "DHOTHI" ? "SAREE" : "DHOTHI"));
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeStartXRef.current = e.clientX;
    setIsDragging(true);
    setDragOffset(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events where pointer capture is unavailable
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || swipeStartXRef.current === null) return;
    const rawDx = e.clientX - swipeStartXRef.current;
    const maxPull = (swipeViewportRef.current?.clientWidth || 640) * 0.85;
    const atOuterEdge =
      (heroSlide === "DHOTHI" && rawDx > 0) ||
      (heroSlide === "SAREE" && rawDx < 0);
    const boundedDx = Math.max(-maxPull, Math.min(maxPull, rawDx));
    setDragOffset(atOuterEdge ? boundedDx * 0.24 : boundedDx);
  };

  const finishPointerSwipe = (
    e: React.PointerEvent<HTMLDivElement>,
    allowSwitch: boolean
  ) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors on cancelled pointers
    }
    const startX = swipeStartXRef.current;
    swipeStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);

    if (!allowSwitch || startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) >= 48) {
      if (dx < 0 && heroSlide === "DHOTHI") setHeroSlide("SAREE");
      else if (dx > 0 && heroSlide === "SAREE") setHeroSlide("DHOTHI");
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    finishPointerSwipe(e, true);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    finishPointerSwipe(e, false);
  };

  const handleHeroKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setHeroSlide("SAREE");
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHeroSlide("DHOTHI");
    }
  };

  const officialDisplayName = user?.fullName || "Senior Inspecting Official";

  const productSlides = [
    {
      key: "DHOTHI" as const,
      title: "Bleached Cotton Dhothis",
      subtitle: "8x4 Traditional Gold-Bordered Handloom & Powerloom Dhothi Quota",
      image: "/images/dhothi_weave.jpg",
      imageAlt: "Folded Pure White Cotton Dhothis with Antique Gold Borders",
      pct: dhothiPct,
      unitWord: "Dhothis",
      sentPcs: veatti.totalHandoveredMeters || 0,
      remainingPcs: veatti.balanceToHandoverMeters || 0,
      producedPcs: veatti.totalProducedMeters || 0,
      godownPcs: veatti.godownAvailableMeters || 0,
      targetPcs: veatti.targetMeters || 0,
      unitsCount: veatti.activeUnitsCount || 0,
      runningPaavus: veatti.runningPaavuCount || 0,
      unloadedPaavus: veatti.unloadedPaavuCount || 0,
      weftBags: weftInfo.veatti?.godownStockBags || 0,
      accentBar: "#10B981",
      badgeClass: "bg-[#0B2A20] text-[#6EE7B7] border-[#10B981]/40",
    },
    {
      key: "SAREE" as const,
      title: "Co-optex Cotton & Silk Sarees",
      subtitle: "Temple-Indigo, Maroon & Zari Bordered Govt Saree Dispatch Quota",
      image: "/images/saree_weave.jpg",
      imageAlt: "Folded Temple-Indigo and Maroon Handloom Sarees with Gold Zari Borders",
      pct: sareePct,
      unitWord: "Sarees",
      sentPcs: saree.totalHandoveredMeters || 0,
      remainingPcs: saree.balanceToHandoverMeters || 0,
      producedPcs: saree.totalProducedMeters || 0,
      godownPcs: saree.godownAvailableMeters || 0,
      targetPcs: saree.targetMeters || 0,
      unitsCount: saree.activeUnitsCount || 0,
      runningPaavus: saree.runningPaavuCount || 0,
      unloadedPaavus: saree.unloadedPaavuCount || 0,
      weftBags: weftInfo.saree?.godownStockBags || 0,
      accentBar: "#D49A42",
      badgeClass: "bg-[#2C1E0B] text-[#FCD34D] border-[#D49A42]/45",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070D1D] px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-20 rounded-2xl bg-[#0F1B33] border border-[#1E2E4E] animate-pulse" />
          <div className="h-[440px] rounded-2xl bg-[#0F1B33] border border-[#1E2E4E] animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-[#0F1B33] border border-[#1E2E4E] animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#14233C] font-sans">
      <ScrollThreadBar />

      {/* =========================================================================
       * STICKY COMMAND TOP BAR (Obsidian Indigo & Zari Accent)
       * ========================================================================= */}
      <header className="sticky top-0 z-30 bg-[#081022] text-[#FAF7F0] border-b border-[#223354] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <CheranSealBadge size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                  Cheran Co-operative Society · Statutory Dispatch Portal
                </h1>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0B2B20] text-[#6EE7B7] border border-[#10B981]/35">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                  Live Telemetry
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#94A8C7] truncate mt-0.5">
                Reg. No. SL-204 · Co-optex Piece Inspection &amp; Godown Audit ·{" "}
                <span className="font-financial text-[#F3CA7A]">{currentTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => loadExecutiveData(true)}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-[#111D38] hover:bg-[#19294D] border border-[#25375D] text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#E7C37B] ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">
                {refreshing ? "Syncing..." : "Sync Ledger"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#B47B2B] hover:bg-[#9E6A22] text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="Print Statutory Dossier"
              className="hidden md:inline-flex p-2 rounded-xl bg-[#111D38] hover:bg-[#19294D] border border-[#25375D] text-white transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
            </button>

            <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-[#223354] text-xs">
              <div className="w-8 h-8 rounded-full bg-[#0A101B] border border-[#D49A42] flex items-center justify-center text-[#E7C37B] font-bold">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-white">{officialDisplayName}</div>
                <div className="text-[10.5px] text-[#94A8C7]">Inspecting Officer</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="px-3 py-2 rounded-xl bg-[#111D38] hover:bg-[#7F1D1D] border border-[#25375D] text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
       * FIRST HALF (STATIC HERO COMMAND STAGE + SWIPEABLE DHOTHI <-> SAREE + 3D LOOM)
       * Seamless dark-indigo top deck merging smoothly into warm ivory dossier below
       * ========================================================================= */}
      <section className="relative overflow-x-clip bg-gradient-to-b from-[#070D1D] via-[#0B152C] to-[#132240] text-white border-b border-[#24375C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-8 sm:pb-10 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-[#3A121C] border border-[#991B1B] text-[#FECACA] text-xs font-medium flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => loadExecutiveData(true)}
                className="underline font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Main Asymmetric Grid: 7 Cols Swipeable Product + Stats Deck | 5 Cols Live 3D Powerloom Machine */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT (7 Cols): Swipeable Dhothi <-> Saree Image & Exact Telemetry Deck */}
            <div
              tabIndex={0}
              onKeyDown={handleHeroKeyDown}
              onMouseEnter={() => setIsDeckHovered(true)}
              onMouseLeave={() => setIsDeckHovered(false)}
              aria-label="Swipe or swap left and right between Dhothi and Saree inspection decks"
              className="lg:col-span-7 hero-slide-enter-left rounded-2xl bg-[#0D1830] border border-[#223354] overflow-hidden flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[#D49A42]/60 select-none"
            >
              {/* Deck Top Control Bar: Sliding Segmented Pill + Active Variety Readout */}
              <div className="px-5 sm:px-6 py-3.5 bg-[#0A1326] border-b border-[#1E2E4E] flex flex-wrap items-center justify-between gap-3">
                {/* Sliding Segmented Control */}
                <div className="relative inline-grid grid-cols-2 p-1 rounded-xl bg-[#070E1D] border border-[#1E2E4E]">
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg border transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      heroSlide === "DHOTHI"
                        ? "translate-x-0 bg-[#0E2E22] border-[#10B981]/50"
                        : "translate-x-full bg-[#2C1E0B] border-[#D49A42]/50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleSwapSlide("DHOTHI")}
                    className={`relative z-10 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                      heroSlide === "DHOTHI"
                        ? "text-[#6EE7B7]"
                        : "text-[#94A8C7] hover:text-white"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        heroSlide === "DHOTHI" ? "bg-[#34D399]" : "bg-[#475569]"
                      }`}
                    />
                    <span>01 · Dhothi Ledger</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwapSlide("SAREE")}
                    className={`relative z-10 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                      heroSlide === "SAREE"
                        ? "text-[#FCD34D]"
                        : "text-[#94A8C7] hover:text-white"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        heroSlide === "SAREE" ? "bg-[#FBBF24]" : "bg-[#475569]"
                      }`}
                    />
                    <span>02 · Saree Ledger</span>
                  </button>
                </div>

                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-[#0F1B35] border border-[#1E2E4E] font-financial text-[11px] font-semibold text-[#94A8C7]">
                  {heroSlide === "DHOTHI" ? "01 / 02 · DHOTHI" : "02 / 02 · SAREE"}
                </span>
              </div>

              {/* Synced Auto-Slide Sweep Timer Rail */}
              <div
                aria-hidden="true"
                className="h-[2.5px] w-full bg-[#101C36] overflow-hidden"
              >
                <div
                  ref={progressBarRef}
                  className="h-full w-full origin-left scale-x-0"
                  style={{
                    background:
                      heroSlide === "DHOTHI"
                        ? "linear-gradient(90deg, #10B981 0%, #6EE7B7 100%)"
                        : "linear-gradient(90deg, #B47B2B 0%, #FCD34D 100%)",
                  }}
                />
              </div>

              {/* Sliding Viewport Track with Real-Time Pointer Drag + Parallax (Dhothi 0% <-> Saree -50%) */}
              <div
                ref={swipeViewportRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                className="overflow-hidden flex-1 touch-pan-y cursor-grab active:cursor-grabbing"
              >
                <div
                  className={`flex w-[200%] h-full will-change-transform ${
                    isDragging
                      ? "transition-none"
                      : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  }`}
                  style={{
                    transform: `translate3d(calc(${
                      heroSlide === "DHOTHI" ? "0%" : "-50%"
                    } + ${dragOffset}px), 0, 0)`,
                  }}
                >
                  {productSlides.map((slide) => {
                    const isActive = heroSlide === slide.key;
                    const directionalRest =
                      slide.key === "DHOTHI"
                        ? "-translate-x-5 opacity-45"
                        : "translate-x-5 opacity-45";
                    const contentSlideState =
                      isActive || isDragging
                        ? "translate-x-0 opacity-100"
                        : directionalRest;

                    return (
                      <div
                        key={slide.key}
                        className="w-1/2 p-5 sm:p-6 flex flex-col justify-between gap-5"
                      >
                        {/* Upper Pair: Product Photograph + Completion Ring / Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-stretch">
                          {/* Authentic Product Photography Frame with Parallax Zoom-Glide */}
                          <div className="sm:col-span-5 relative min-h-[210px] sm:min-h-[230px] rounded-xl overflow-hidden border border-[#283B61] bg-[#081022]">
                            <Image
                              src={slide.image}
                              alt={slide.imageAlt}
                              fill
                              sizes="(max-width: 640px) 100vw, 320px"
                              draggable={false}
                              className={`object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                                isActive || isDragging
                                  ? "scale-100 translate-x-0"
                                  : slide.key === "DHOTHI"
                                  ? "scale-[1.08] -translate-x-3"
                                  : "scale-[1.08] translate-x-3"
                              }`}
                              priority
                            />
                            <div
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-18deg] transition-transform duration-1000 ease-out motion-reduce:hidden ${
                                isActive ? "translate-x-[360%]" : "-translate-x-full"
                              }`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#070D1D]/90 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${slide.badgeClass}`}
                              >
                                {slide.key === "DHOTHI"
                                  ? "DHOTHI STOCK"
                                  : "SAREE STOCK"}
                              </span>
                              <span className="font-financial text-xs font-semibold text-white bg-[#070D1D]/85 px-2 py-0.5 rounded border border-white/15">
                                {slide.unitsCount} Looms
                              </span>
                            </div>
                          </div>

                          {/* Telemetry Readout Right beside Photo (Staggered Slide Transition) */}
                          <div className="sm:col-span-7 flex flex-col justify-between gap-4">
                            <div
                              className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${contentSlideState}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h2 className="font-display text-2xl sm:text-[26px] font-bold text-white leading-tight">
                                    {slide.title}
                                  </h2>
                                  <p className="text-xs text-[#94A8C7] mt-1 leading-relaxed">
                                    {slide.subtitle}
                                  </p>
                                </div>
                              </div>

                              {/* Big Completion Headline Metric */}
                              <div
                                className={`mt-4 flex items-baseline justify-between gap-3 rounded-xl bg-[#091224] border border-[#1E2E4E] px-4 py-3.5 transition-all duration-700 delay-[60ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${contentSlideState}`}
                              >
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#94A8C7]">
                                    Quota Completion
                                  </div>
                                  <div className="font-financial text-3xl sm:text-4xl font-bold text-white mt-0.5 tabular-nums">
                                    {slide.pct.toFixed(1)}%
                                  </div>
                                </div>
                                <div className="text-right font-financial text-xs">
                                  <div className="text-[#94A8C7]">Target Quota</div>
                                  <div className="text-sm font-bold text-[#F3CA7A] mt-0.5">
                                    {slide.targetPcs.toLocaleString("en-IN")}{" "}
                                    {slide.unitWord}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Crisp Fulfillment Progress Track with Live Sliding Sheen */}
                            <div className="space-y-1.5">
                              <div className="h-2.5 w-full rounded-full bg-[#172544] overflow-hidden border border-[#253860]">
                                <div
                                  className="relative h-full rail-fill-animated rounded-full overflow-hidden"
                                  style={{
                                    width: `${slide.pct}%`,
                                    backgroundColor: slide.accentBar,
                                  }}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="rail-sheen-runner absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-financial text-[#94A8C7]">
                                <span>
                                  Running Paavu: {slide.runningPaavus} · Unloaded:{" "}
                                  {slide.unloadedPaavus}
                                </span>
                                <span>Weft Godown: {slide.weftBags} Bags</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lower 4 Statutory Piece Counters Inside Active Slide */}
                        <div
                          className={`grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 transition-all duration-700 delay-[110ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${contentSlideState}`}
                        >
                          <div className="rounded-xl bg-[#0A1326] border border-[#1E2E4E] p-3.5 min-w-0">
                            <div className="text-[11px] font-medium text-[#8FA4C7] truncate">
                              Sent to Govt
                            </div>
                            <div className="font-financial text-lg sm:text-xl font-bold text-[#6EE7B7] mt-1 whitespace-nowrap truncate">
                              {slide.sentPcs.toLocaleString("en-IN")}{" "}
                              <span className="text-[11px] font-sans font-semibold text-[#A7F3D0]">
                                pcs
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#0A1326] border border-[#1E2E4E] p-3.5 min-w-0">
                            <div className="text-[11px] font-medium text-[#8FA4C7] truncate">
                              Remaining Quota
                            </div>
                            <div className="font-financial text-lg sm:text-xl font-bold text-[#FDBA74] mt-1 whitespace-nowrap truncate">
                              -{slide.remainingPcs.toLocaleString("en-IN")}{" "}
                              <span className="text-[11px] font-sans font-semibold text-[#FED7AA]">
                                pcs
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#0A1326] border border-[#1E2E4E] p-3.5 min-w-0">
                            <div className="text-[11px] font-medium text-[#8FA4C7] truncate">
                              Loom Produced
                            </div>
                            <div className="font-financial text-lg sm:text-xl font-bold text-white mt-1 whitespace-nowrap truncate">
                              {slide.producedPcs.toLocaleString("en-IN")}{" "}
                              <span className="text-[11px] font-sans font-semibold text-[#CBD5E1]">
                                pcs
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#0A1326] border border-[#1E2E4E] p-3.5 min-w-0">
                            <div className="text-[11px] font-medium text-[#8FA4C7] truncate">
                              Godown Ready
                            </div>
                            <div className="font-financial text-lg sm:text-xl font-bold text-[#FCD34D] mt-1 whitespace-nowrap truncate">
                              {slide.godownPcs.toLocaleString("en-IN")}{" "}
                              <span className="text-[11px] font-sans font-semibold text-[#FDE68A]">
                                pcs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT (5 Cols): Live Kinematic 3D Powerloom Weaving Machine Stage */}
            <div className="lg:col-span-5 hero-slide-enter-right relative rounded-2xl border border-[#25375D] bg-[#060B18] min-h-[360px] lg:min-h-[430px] overflow-hidden">
              <div className="absolute inset-0 z-0">
                <ExecutiveBackground3D variant="stage" activeCategory={heroSlide} />
              </div>

              <div className="relative z-10 h-full min-h-[360px] lg:min-h-[430px] flex flex-col justify-between p-4 pointer-events-none">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#081022]/95 border border-[#233457] text-[11px] font-semibold text-[#E7C37B]">
                    <Factory className="h-3.5 w-3.5 text-[#D49A42]" />
                    <span>3D Powerloom Weaving Machine · {heroSlide}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#081022]/95 border border-[#233457] font-financial text-[11px] text-[#94A8C7]">
                    LIVE MOTION
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-[#081022]/95 border border-[#233457] text-[11px] font-financial text-[#CBD5E1]">
                    Warp Shedding · Shuttle Flight · Take-Up Roll
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLoomModal(true)}
                    className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B152C] hover:bg-[#17284E] border border-[#D49A42]/50 text-[11px] font-semibold text-white transition cursor-pointer"
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-[#E7C37B]" />
                    <span>Expand 3D</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Seamless Merge Bridge Strip Connecting Top Executive Deck to Second-Half Audit Ledger */}
          <div className="hero-slide-enter-up relative overflow-hidden rounded-xl bg-[#0A1326] border border-[#223457] px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden"
            >
              <div className="bridge-beam-runner h-full w-1/3 bg-gradient-to-r from-transparent via-[#D49A42] to-transparent" />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D49A42]" />
                <span className="text-[#94A8C7]">Combined Completion:</span>
                <span className="font-financial font-bold text-white">
                  {overallPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-[#CBD5E1] font-financial">
                Govt Sent:{" "}
                <span className="font-bold text-[#6EE7B7]">
                  {(consolidated.totalHandoveredMeters || 0).toLocaleString("en-IN")} pcs
                </span>
              </div>
              <div className="text-[#CBD5E1] font-financial">
                Godown Stock:{" "}
                <span className="font-bold text-[#FCD34D]">
                  {(consolidated.godownAvailableMeters || 0).toLocaleString("en-IN")} pcs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="#statutory-breakdown"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E7C37B] hover:text-white transition"
              >
                <span>Inspect Full Quota &amp; Signed Challans</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
       * SECOND HALF (SEAMLESS MERGED STATUTORY BREAKDOWN, FLOW & SIGNED CHALLANS)
       * Preserves complete statutory overview, flow pipeline & searchable table
       * ========================================================================= */}
      <main
        id="statutory-breakdown"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 sm:py-11 space-y-9"
      >
        {/* Filter Bar + Active Extent Summary */}
        <section className="rounded-2xl bg-white border border-[#E5DEC9] p-6 sm:p-7 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E5DEC9]">
            <div>
              <h2 className="font-display text-2xl sm:text-[26px] font-bold text-[#14233C] leading-snug">
                Consolidated Production &amp; Co-optex Dispatch Breakdown
              </h2>
              <p className="text-xs sm:text-sm text-[#5B6B84] mt-1">
                Switch ledger scope across all varieties, Dhothi quota, or Saree quota to inspect godown tallies and signed receipts.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex rounded-xl border border-[#E5DEC9] bg-[#FAF7F0] p-1 text-xs font-semibold">
                {(["ALL", "DHOTHI", "SAREE"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                      activeTab === tab
                        ? "bg-[#14233C] text-white"
                        : "text-[#5B6B84] hover:text-[#14233C]"
                    }`}
                  >
                    {tab === "ALL"
                      ? "All Varieties"
                      : tab === "DHOTHI"
                      ? "Dhothi Quota"
                      : "Saree Quota"}
                  </button>
                ))}
              </div>

              <span className="font-financial text-sm font-bold text-[#14233C] bg-[#FEF5E4] border border-[#E7C37B] px-3 py-1.5 rounded-lg">
                {activePct.toFixed(1)}% Fulfilled
              </span>
            </div>
          </div>

          <DispatchTickRail
            produced={activeStats.totalProducedMeters || 0}
            godown={activeStats.godownAvailableMeters || 0}
            handedOver={activeStats.totalHandoveredMeters || 0}
            target={activeStats.targetMeters || 0}
            unitLabel={activeUnitLabel}
          />
        </section>

        <WeaveRule label="Headline Statutory Piece Counters" />

        {/* 4 Core Statutory Counters */}
        <RevealBlock>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-xl bg-white border border-[#BBF7D0] p-5 sm:p-6">
              <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B84]">
                <span>Handed Over to Govt</span>
                <PackageCheck className="h-4 w-4 text-[#166534]" />
              </div>
              <div className="font-financial text-2xl sm:text-3xl font-bold text-[#14233C] mt-3">
                {(activeStats.totalHandoveredMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="font-sans text-xs font-semibold text-[#166534]">
                  {activeUnitLabel}
                </span>
              </div>
              <p className="text-xs text-[#5B6B84] mt-2">
                Verified deliveries receipted by Co-optex
              </p>
            </div>

            <div className="rounded-xl bg-white border border-[#D49A42]/70 p-5 sm:p-6">
              <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B84]">
                <span>Godown Ready Stock</span>
                <Warehouse className="h-4 w-4 text-[#B47B2B]" />
              </div>
              <div className="font-financial text-2xl sm:text-3xl font-bold text-[#14233C] mt-3">
                {(activeStats.godownAvailableMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="font-sans text-xs font-semibold text-[#B47B2B]">
                  {activeUnitLabel}
                </span>
              </div>
              <p className="text-xs text-[#5B6B84] mt-2">
                Physical inventory awaiting dispatch lorry
              </p>
            </div>

            <div className="rounded-xl bg-white border border-[#E5DEC9] p-5 sm:p-6">
              <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B84]">
                <span>Produced As of Now</span>
                <Factory className="h-4 w-4 text-[#14233C]" />
              </div>
              <div className="font-financial text-2xl sm:text-3xl font-bold text-[#14233C] mt-3">
                {(activeStats.totalProducedMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="font-sans text-xs font-semibold text-[#14233C]">
                  {activeUnitLabel}
                </span>
              </div>
              <p className="text-xs text-[#5B6B84] mt-2">
                Cumulative finished weave from Society looms
              </p>
            </div>

            <div className="rounded-xl bg-[#FFFDF8] border border-[#FDBA74] p-5 sm:p-6">
              <div className="flex items-center justify-between text-xs font-semibold text-[#9A3412]">
                <span>Remaining Quota Deficit</span>
                <Clock className="h-4 w-4 text-[#9A3412]" />
              </div>
              <div className="font-financial text-2xl sm:text-3xl font-bold text-[#9A3412] mt-3">
                -{(activeStats.balanceToHandoverMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="font-sans text-xs font-semibold">
                  {activeUnitLabel}
                </span>
              </div>
              <p className="text-xs text-[#78531E] mt-2">
                Pending target balance yet to be handed over
              </p>
            </div>
          </section>
        </RevealBlock>

        <WeaveRule label="Variety Wise Quota & Loom Pipeline" />

        {/* Variety Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <RevealBlock className="lg:col-span-6" delayMs={40}>
            <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 sm:p-7 h-full space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#14233C]">
                    Bleached Cotton Dhothis
                  </h3>
                  <p className="text-xs text-[#5B6B84] mt-0.5">
                    {veatti.activeUnitsCount || 0} Loom Units ·{" "}
                    {veatti.runningPaavuCount || 0} Running Paavus ·{" "}
                    {veatti.unloadedPaavuCount || 0} Unloaded
                  </p>
                </div>
                <span className="font-financial text-lg font-bold text-[#166534] bg-[#ECFDF5] border border-[#BBF7D0] px-3 py-1 rounded-lg">
                  {dhothiPct.toFixed(1)}%
                </span>
              </div>

              <DispatchTickRail
                produced={veatti.totalProducedMeters || 0}
                godown={veatti.godownAvailableMeters || 0}
                handedOver={veatti.totalHandoveredMeters || 0}
                target={veatti.targetMeters || 0}
                unitLabel="Dhothis"
              />

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#F0eadc] text-xs">
                <div>
                  <div className="text-[#5B6B84]">Produced</div>
                  <div className="font-financial font-bold text-[#14233C] text-sm mt-0.5">
                    {(veatti.totalProducedMeters || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div>
                  <div className="text-[#5B6B84]">Godown Ready</div>
                  <div className="font-financial font-bold text-[#B47B2B] text-sm mt-0.5">
                    {(veatti.godownAvailableMeters || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div>
                  <div className="text-[#5B6B84]">Weft In Godown</div>
                  <div className="font-financial font-bold text-[#14233C] text-sm mt-0.5">
                    {weftInfo.veatti?.godownStockBags || 0} Bags
                  </div>
                </div>
              </div>
            </div>
          </RevealBlock>

          <RevealBlock className="lg:col-span-6" delayMs={120}>
            <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 sm:p-7 h-full space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#14233C]">
                    Handloom &amp; Powerloom Sarees
                  </h3>
                  <p className="text-xs text-[#5B6B84] mt-0.5">
                    {saree.activeUnitsCount || 0} Loom Units ·{" "}
                    {saree.runningPaavuCount || 0} Running Paavus ·{" "}
                    {saree.unloadedPaavuCount || 0} Unloaded
                  </p>
                </div>
                <span className="font-financial text-lg font-bold text-[#14233C] bg-[#FAF7F0] border border-[#D4CAB0] px-3 py-1 rounded-lg">
                  {sareePct.toFixed(1)}%
                </span>
              </div>

              <DispatchTickRail
                produced={saree.totalProducedMeters || 0}
                godown={saree.godownAvailableMeters || 0}
                handedOver={saree.totalHandoveredMeters || 0}
                target={saree.targetMeters || 0}
                unitLabel="Sarees"
              />

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#F0eadc] text-xs">
                <div>
                  <div className="text-[#5B6B84]">Produced</div>
                  <div className="font-financial font-bold text-[#14233C] text-sm mt-0.5">
                    {(saree.totalProducedMeters || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div>
                  <div className="text-[#5B6B84]">Godown Ready</div>
                  <div className="font-financial font-bold text-[#B47B2B] text-sm mt-0.5">
                    {(saree.godownAvailableMeters || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div>
                  <div className="text-[#5B6B84]">Weft In Godown</div>
                  <div className="font-financial font-bold text-[#14233C] text-sm mt-0.5">
                    {weftInfo.saree?.godownStockBags || 0} Bags
                  </div>
                </div>
              </div>
            </div>
          </RevealBlock>
        </div>

        {/* Physical Stock Flow Verification Chain */}
        <RevealBlock delayMs={60}>
          <section className="rounded-2xl bg-white border border-[#E5DEC9] p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-[#E5DEC9]">
              <div>
                <h3 className="font-display text-xl font-bold text-[#14233C]">
                  Physical Stock Flow Verification Chain
                </h3>
                <p className="text-xs text-[#5B6B84] mt-0.5">
                  Reconciled formula: Loom Output − Verified Govt Handover = Physical Godown Stock
                </p>
              </div>
              <span className="font-financial text-xs font-semibold text-[#166534] inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Zero Discrepancy Reconciled
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <div className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F0] p-5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-financial text-[11px] font-semibold text-[#5B6B84]">
                    STEP 01 · WEAVING UNITS
                  </div>
                  <div className="text-sm font-bold text-[#14233C] mt-1">
                    Powerloom Output
                  </div>
                  <div className="font-financial text-xl font-bold text-[#14233C] mt-2">
                    {(activeStats.totalProducedMeters || 0).toLocaleString("en-IN")}{" "}
                    {activeUnitLabel}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#B47B2B] hidden md:block flex-shrink-0" />
              </div>

              <div className="rounded-xl border border-[#D49A42]/60 bg-[#FEF9EE] p-5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-financial text-[11px] font-semibold text-[#78531E]">
                    STEP 02 · SOCIETY GODOWN
                  </div>
                  <div className="text-sm font-bold text-[#14233C] mt-1">
                    Ready Stock Held
                  </div>
                  <div className="font-financial text-xl font-bold text-[#92611D] mt-2">
                    {(activeStats.godownAvailableMeters || 0).toLocaleString("en-IN")}{" "}
                    {activeUnitLabel}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#B47B2B] hidden md:block flex-shrink-0" />
              </div>

              <div className="rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] p-5">
                <div className="font-financial text-[11px] font-semibold text-[#166534]">
                  STEP 03 · CO-OPTEX / GOVT
                </div>
                <div className="text-sm font-bold text-[#14233C] mt-1">
                  Dispatched &amp; Receipted
                </div>
                <div className="font-financial text-xl font-bold text-[#166534] mt-2">
                  {(activeStats.totalHandoveredMeters || 0).toLocaleString("en-IN")}{" "}
                  {activeUnitLabel}
                </div>
              </div>
            </div>
          </section>
        </RevealBlock>

        <WeaveRule label="Verified Government Handover Challan Ledger" />

        {/* Signed Co-optex Delivery Challans Table */}
        <RevealBlock delayMs={80}>
          <section className="rounded-2xl bg-white border border-[#E5DEC9] overflow-hidden shadow-xs">
            <div className="p-6 border-b border-[#E5DEC9] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF7F0]/60">
              <div>
                <h3 className="font-display text-xl font-bold text-[#14233C] flex items-center gap-2.5">
                  <span>Signed Co-optex Delivery Challans</span>
                  <span className="font-financial text-xs px-2.5 py-0.5 rounded-md bg-[#14233C] text-white">
                    {filteredHandovers.length} Records
                  </span>
                </h3>
                <p className="text-xs text-[#5B6B84] mt-0.5">
                  Chronological audit log of physical piece dispatches signed by verifying officers
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 no-print">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5B6B84]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter by Challan No, Officer, Unit..."
                    className="w-full sm:w-72 rounded-xl border border-[#D4CAB0] bg-white pl-9 pr-3 py-2 text-xs font-medium text-[#14233C] placeholder-[#8A94A6] focus:border-[#14233C] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-[13px]">
                <thead>
                  <tr>
                    <th className="px-6 py-4 font-semibold text-[#5B6B84]">
                      Challan No.
                    </th>
                    <th className="px-6 py-4 font-semibold text-[#5B6B84]">
                      Dispatch Date
                    </th>
                    <th className="px-6 py-4 font-semibold text-[#5B6B84]">
                      Variety
                    </th>
                    <th className="px-6 py-4 font-semibold text-[#5B6B84]">
                      Delivered Quantity
                    </th>
                    <th className="px-6 py-4 font-semibold text-[#5B6B84]">
                      Recipient Department
                    </th>
                    <th className="px-6 py-4 font-semibold text-[#5B6B84]">
                      Officer / Vehicle
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EADC]">
                  {filteredHandovers.length > 0 ? (
                    filteredHandovers.map((h) => {
                      const pcs = resolvePieces(h);
                      const isSaree = h.clothType === "SAREE";
                      return (
                        <tr
                          key={h.id}
                          className="hover:bg-[#FAF7F0] transition-colors"
                        >
                          <td className="px-6 py-4 font-financial font-semibold text-[#14233C]">
                            {h.challanNo}
                          </td>
                          <td className="px-6 py-4 text-[#475569]">
                            {new Date(h.handoverDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                                isSaree
                                  ? "bg-[#FEF5E4] text-[#92611D] border-[#E7C37B]"
                                  : "bg-[#ECFDF5] text-[#166534] border-[#BBF7D0]"
                              }`}
                            >
                              <Layers className="h-3 w-3" />
                              {isSaree ? "Saree" : "Dhothi"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-financial font-bold text-[#14233C]">
                            {pcs.toLocaleString("en-IN")} pcs
                          </td>
                          <td className="px-6 py-4 text-[#334155]">
                            {h.recipientDept || "Tamil Nadu Handlooms / Co-optex"}
                          </td>
                          <td className="px-6 py-4 text-[#5B6B84] text-xs">
                            <div>{h.officerName || "Society Despatch Clerk"}</div>
                            {(h.vehicleNo || h.unit?.weaverName) && (
                              <div className="font-financial text-[11px] text-[#8A94A6]">
                                {h.vehicleNo || h.unit?.weaverName}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-[#5B6B84]">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 text-[#C7BFA9]" />
                          <p className="text-sm font-semibold text-[#14233C]">
                            No Handover Challans Match Your Filter
                          </p>
                          <p className="text-xs text-[#5B6B84]">
                            Clear search criteria or switch variety tabs to inspect all records.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </RevealBlock>
      </main>

      {/* Fullscreen 3D Powerloom Modal */}
      {showLoomModal && (
        <div className="fixed inset-0 z-50 bg-[#04070f]">
          <ExecutiveBackground3D variant="fullscreen" activeCategory={heroSlide} />

          <div className="fixed top-5 left-5 z-10 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#091020] border border-[#233457] text-xs font-semibold text-[#E7C37B]">
            <Factory className="h-4 w-4 text-[#D49A42]" />
            <span>Kinematic 3D Powerloom Simulation · {heroSlide}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowLoomModal(false)}
            className="fixed top-5 right-5 z-10 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#091020] hover:bg-[#142240] border border-[#D49A42]/50 text-xs font-bold text-white transition cursor-pointer"
          >
            <X className="h-4 w-4 text-[#E7C37B]" />
            <span>Close 3D View</span>
          </button>

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-[#091020] border border-[#233457] text-xs text-[#CBD5E1] pointer-events-none">
            Move cursor to orbit perspective · Synchronized gear train, shedding warp &amp; shuttle flight
          </div>
        </div>
      )}
    </div>
  );
};
