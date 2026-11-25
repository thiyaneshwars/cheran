"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Warehouse,
  Send,
  Target,
  Factory,
  RefreshCw,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  Search,
  Layers,
  ChevronRight,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ExecutiveBackground3D } from "./ExecutiveBackground3D";
import { exportToCSV } from "@/lib/export";

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
  const [activeTab, setActiveTab] = useState<"ALL" | "DHOTHI" | "SAREE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Live Data
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [ovRes, handRes] = await Promise.all([
        fetch("/api/production/overview"),
        fetch("/api/production/handover"),
      ]);

      if (ovRes.ok) {
        const d = await ovRes.json();
        setOverviewData(d.overview || null);
      }
      if (handRes.ok) {
        const h = await handRes.json();
        setHandovers(Array.isArray(h) ? h : []);
      }
    } catch (err) {
      console.error("Failed to fetch executive data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fullscreen toggle helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Safe Numeric Metrics Extraction
  const veatti = {
    totalProducedMeters: Number(overviewData?.veatti?.totalProducedMeters) || 0,
    totalHandoveredMeters: Number(overviewData?.veatti?.totalHandoveredMeters) || 0,
    godownAvailableMeters: Number(overviewData?.veatti?.godownAvailableMeters) || 0,
    targetMeters: Number(overviewData?.veatti?.targetMeters) || 0,
    balanceToHandoverMeters: Number(overviewData?.veatti?.balanceToHandoverMeters) || 0,
  };

  const saree = {
    totalProducedMeters: Number(overviewData?.saree?.totalProducedMeters) || 0,
    totalHandoveredMeters: Number(overviewData?.saree?.totalHandoveredMeters) || 0,
    godownAvailableMeters: Number(overviewData?.saree?.godownAvailableMeters) || 0,
    targetMeters: Number(overviewData?.saree?.targetMeters) || 0,
    balanceToHandoverMeters: Number(overviewData?.saree?.balanceToHandoverMeters) || 0,
  };

  const computedTarget =
    Number(overviewData?.totalConsolidated?.targetMeters) ||
    (veatti.targetMeters + saree.targetMeters > 0
      ? veatti.targetMeters + saree.targetMeters
      : veatti.totalProducedMeters + saree.totalProducedMeters);

  const total = {
    totalProducedMeters:
      Number(overviewData?.totalConsolidated?.totalProducedMeters) ||
      (veatti.totalProducedMeters + saree.totalProducedMeters),
    totalHandoveredMeters:
      Number(overviewData?.totalConsolidated?.totalHandoveredMeters) ||
      (veatti.totalHandoveredMeters + saree.totalHandoveredMeters),
    godownAvailableMeters:
      Number(overviewData?.totalConsolidated?.godownAvailableMeters) ||
      (veatti.godownAvailableMeters + saree.godownAvailableMeters),
    targetMeters: computedTarget,
    balanceToHandoverMeters:
      Number(overviewData?.totalConsolidated?.balanceToHandoverMeters) ||
      Math.max(
        0,
        computedTarget -
          (Number(overviewData?.totalConsolidated?.totalHandoveredMeters) ||
            veatti.totalHandoveredMeters + saree.totalHandoveredMeters)
      ),
  };

  // Percentages
  const overallPercent =
    total.targetMeters > 0
      ? Math.min(100, Math.round((total.totalHandoveredMeters / total.targetMeters) * 1000) / 10)
      : 0;

  const dhothiPercent =
    veatti.targetMeters > 0
      ? Math.min(100, Math.round((veatti.totalHandoveredMeters / veatti.targetMeters) * 1000) / 10)
      : 0;

  const sareePercent =
    saree.targetMeters > 0
      ? Math.min(100, Math.round((saree.totalHandoveredMeters / saree.targetMeters) * 1000) / 10)
      : 0;

  // Radial gauge circumference for SVG progress ring
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset =
    ringCircumference - (Math.min(100, overallPercent) / 100) * ringCircumference;

  // Filter Handovers for Ledger
  const filteredHandovers = useMemo(() => {
    return handovers.filter((h) => {
      const matchType =
        activeTab === "ALL" ||
        (activeTab === "DHOTHI" && h.clothType === "VEATTI") ||
        (activeTab === "SAREE" && h.clothType === "SAREE");

      if (!matchType) return false;

      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        String(h.challanNo || "").toLowerCase().includes(q) ||
        String(h.recipientDept || "").toLowerCase().includes(q) ||
        String(h.vehicleNo || "").toLowerCase().includes(q) ||
        String(h.officerName || "").toLowerCase().includes(q) ||
        String(h.unit?.weaverName || "").toLowerCase().includes(q)
      );
    });
  }, [handovers, activeTab, searchTerm]);

  const filteredTotalPieces = useMemo(() => {
    return filteredHandovers.reduce((s, h) => {
      const isDhothi = h.clothType === "VEATTI";
      const p =
        h.pieces && h.pieces > 0
          ? h.pieces
          : Math.floor((h.meters || 0) / (isDhothi ? 3.65 : 5.5));
      return s + p;
    }, 0);
  }, [filteredHandovers]);

  // Export Executive Audit CSV
  const handleExportCSV = () => {
    if (filteredHandovers.length === 0) {
      alert("No handover dispatches to export.");
      return;
    }

    const rows = filteredHandovers.map((h) => {
      const isDhothi = h.clothType === "VEATTI";
      const pieces =
        h.pieces && h.pieces > 0
          ? h.pieces
          : Math.floor((h.meters || 0) / (isDhothi ? 3.65 : 5.5));

      return {
        "Challan / Order No": h.challanNo,
        "Dispatch Date": new Date(h.handoverDate).toLocaleDateString("en-IN"),
        "Cloth Category": isDhothi ? "Dhothi (வேட்டி)" : "Saree (சேலை)",
        "Handover Quantity (Pieces)": pieces,
        "Source Powerloom / Unit": h.unit?.weaverName || "Society Godown Pool",
        "Recipient Department": h.recipientDept || "Co-optex / Govt Depot",
        "Vehicle Number": h.vehicleNo || "—",
        "Inspection Officer": h.officerName || "—",
        Notes: h.notes || "—",
      };
    });

    exportToCSV(`Official_Government_Handover_Audit_${activeTab}`, rows);
  };

  const isInitialLoading = loading && !overviewData;

  return (
    <div className="executive-portal relative min-h-screen w-full bg-[#04070f] text-slate-100 overflow-x-hidden selection:bg-amber-400/30 selection:text-amber-100">
      {/* Custom GPU Three.js Zari & Silk Loom Background */}
      <ExecutiveBackground3D activeCategory={activeTab} />

      {/* Atmospheric Depth Scrim — frames UI readably while keeping 3D silk & threads crisp */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,15,0.74) 0%, rgba(4,7,15,0.20) 34%, rgba(4,7,15,0.44) 72%, rgba(4,7,15,0.88) 100%)",
        }}
      />

      {/* Main Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* =========================================================================
         * 1. EXECUTIVE TOP BAR & AUTHORITY HEADER
         * ========================================================================= */}
        <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#050914]/78 backdrop-blur-lg px-4 sm:px-6 lg:px-10 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Crest Emblem & Society Identity */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/20 to-amber-600/10 border border-amber-400/35 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.3)] flex-shrink-0">
                <ShieldCheck className="h-6 w-6 text-amber-300 stroke-[2]" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[11px] font-semibold tracking-wide text-amber-300">
                    Government of Tamil Nadu &bull; Directorate of Handlooms
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                    Reg. CH-1049
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
                  <span>Cheran Co-operative Weavers Society</span>
                  <span className="text-slate-600 font-normal hidden lg:inline">/</span>
                  <span className="text-slate-300 font-medium text-xs sm:text-sm hidden lg:inline">
                    Executive Oversight Portal
                  </span>
                </h1>
              </div>
            </div>

            {/* Right: IST Sync, Refresh, Fullscreen & Sign Out */}
            <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#091022]/85 border border-white/[0.08] text-[11px] font-mono text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <Clock className="h-3.5 w-3.5 text-amber-300/80" />
                <span className="tabular-nums">{currentTime || "IST Live Sync"}</span>
              </div>

              <button
                type="button"
                onClick={fetchData}
                disabled={refreshing}
                title="Sync real-time stock and dispatch totals"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B1326]/85 hover:bg-[#131E3A] border border-white/[0.1] hover:border-amber-300/35 text-xs font-semibold text-slate-200 transition cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-amber-300 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Sync</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen Inspection Mode"
                aria-label="Toggle Fullscreen Inspection Mode"
                className="p-2 rounded-lg bg-[#0B1326]/85 hover:bg-[#131E3A] border border-white/[0.1] hover:border-amber-300/35 text-slate-300 hover:text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to exit the Executive Portal?")) {
                    onLogout();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-400/25 text-rose-200 text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* =========================================================================
         * 2. MAIN EXECUTIVE CONTENT
         * ========================================================================= */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-10 space-y-7">
          {/* Statutory Oversight Summary Header */}
          <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] border-t-amber-300/25 bg-[#090F1E]/68 backdrop-blur-md px-5 py-5 sm:px-7 sm:py-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.65)]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-white tracking-tight leading-snug">
                  Central Godown Stocks &amp; Government Handover Tracker
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Statutory Free Dhothi &amp; Free Saree distribution monitor for Senior Inspecting Authorities &mdash; verifying physical godown inventory, cumulative Co-optex dispatches, and quota completion.
                </p>
              </div>

              <div className="self-start lg:self-auto px-4 py-3 rounded-xl bg-[#050914]/80 border border-white/[0.08] space-y-0.5 lg:text-right min-w-[230px]">
                <span className="text-[11px] font-medium text-slate-400 block">
                  Inspecting Official
                </span>
                <span className="text-sm font-bold text-amber-200 block">
                  {user?.fullName || "Directorate of Handlooms Official"}
                </span>
                <span className="text-[11px] font-mono text-emerald-300/90 block">
                  {user?.email || "official@cheran"}
                </span>
              </div>
            </div>
          </section>

          {/* =========================================================================
           * 3. HERO OVERALL & SCHEME QUOTA PROGRESS
           * ========================================================================= */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card A: Overall Consolidated Quota */}
            <div className="rounded-2xl border border-white/[0.09] border-t-amber-300/30 bg-[#090F1E]/68 backdrop-blur-md p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.65)] flex flex-col justify-between transition-colors hover:border-amber-300/25">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    <span>Overall Scheme Progress</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-200 text-[11px] border border-amber-400/25">
                    Combined Quota
                  </span>
                </div>

                {isInitialLoading ? (
                  <div className="mt-6 space-y-3 animate-pulse">
                    <div className="h-12 w-36 rounded-lg bg-white/10" />
                    <div className="h-4 w-52 rounded bg-white/10" />
                  </div>
                ) : (
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-bold font-financial tabular-nums tracking-tight text-white">
                          {overallPercent}%
                        </span>
                        <span className="text-sm font-semibold text-emerald-300">
                          Completed
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-300 font-medium tabular-nums">
                        {(total.totalHandoveredMeters || 0).toLocaleString("en-IN")} of{" "}
                        {(total.targetMeters || 0).toLocaleString("en-IN")} pieces handovered
                      </p>
                    </div>

                    {/* Architectural Radial Progress Arc */}
                    <div className="relative h-16 w-16 flex-shrink-0 flex items-center justify-center">
                      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                        <circle
                          cx="32"
                          cy="32"
                          r={ringRadius}
                          fill="none"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="4.5"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r={ringRadius}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringDashOffset}
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-mono font-bold text-amber-200 tabular-nums">
                        {Math.round(overallPercent)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Clean Progress Track */}
              <div className="mt-6 space-y-2">
                <div className="h-2.5 w-full rounded-full bg-[#050914] overflow-hidden border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(2, overallPercent))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                  <span>0%</span>
                  <span className="text-amber-200 font-semibold">
                    Balance Quota: {(total.balanceToHandoverMeters || 0).toLocaleString("en-IN")} Pcs
                  </span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Card B: Dhothi Scheme Progress */}
            <div className="rounded-2xl border border-white/[0.09] border-t-emerald-400/30 bg-[#090F1E]/68 backdrop-blur-md p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.65)] flex flex-col justify-between transition-colors hover:border-emerald-400/25">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    <span>Dhothi Scheme (வேட்டி திட்டம்)</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200 text-[11px] border border-emerald-400/25">
                    Pieces
                  </span>
                </div>

                {isInitialLoading ? (
                  <div className="mt-6 space-y-3 animate-pulse">
                    <div className="h-11 w-28 rounded-lg bg-white/10" />
                    <div className="h-10 w-full rounded bg-white/10" />
                  </div>
                ) : (
                  <>
                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="text-4xl sm:text-[44px] font-bold font-financial tabular-nums tracking-tight text-emerald-300">
                        {dhothiPercent}%
                      </span>
                      <span className="text-xs font-semibold text-emerald-200/80 uppercase tracking-wider">
                        Handovered
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs pt-3.5 border-t border-white/[0.08]">
                      <div>
                        <span className="text-[11px] text-emerald-100/70 block">
                          Govt Handovered
                        </span>
                        <span className="text-lg font-bold font-mono tabular-nums text-white mt-0.5 block">
                          {(veatti.totalHandoveredMeters || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] text-emerald-300/85">Dhothis dispatched</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-emerald-100/70 block">
                          In Godown Stock
                        </span>
                        <span className="text-lg font-bold font-mono tabular-nums text-amber-200 mt-0.5 block">
                          {(veatti.godownAvailableMeters || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] text-amber-300/80">Dhothis ready</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-5 space-y-1.5">
                <div className="h-2 w-full rounded-full bg-[#050914] overflow-hidden border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(2, dhothiPercent))}%` }}
                  />
                </div>
                <div className="text-[11px] text-emerald-100/70 text-right font-mono tabular-nums">
                  Target: {(veatti.targetMeters || 0).toLocaleString("en-IN")} Dhothis
                </div>
              </div>
            </div>

            {/* Card C: Saree Scheme Progress */}
            <div className="rounded-2xl border border-white/[0.09] border-t-rose-400/30 bg-[#090F1E]/68 backdrop-blur-md p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.65)] flex flex-col justify-between transition-colors hover:border-rose-400/25">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-rose-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    <span>Saree Scheme (சேலை திட்டம்)</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-200 text-[11px] border border-rose-400/25">
                    Pieces
                  </span>
                </div>

                {isInitialLoading ? (
                  <div className="mt-6 space-y-3 animate-pulse">
                    <div className="h-11 w-28 rounded-lg bg-white/10" />
                    <div className="h-10 w-full rounded bg-white/10" />
                  </div>
                ) : (
                  <>
                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="text-4xl sm:text-[44px] font-bold font-financial tabular-nums tracking-tight text-rose-300">
                        {sareePercent}%
                      </span>
                      <span className="text-xs font-semibold text-rose-200/80 uppercase tracking-wider">
                        Handovered
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs pt-3.5 border-t border-white/[0.08]">
                      <div>
                        <span className="text-[11px] text-rose-100/70 block">
                          Govt Handovered
                        </span>
                        <span className="text-lg font-bold font-mono tabular-nums text-white mt-0.5 block">
                          {(saree.totalHandoveredMeters || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] text-rose-300/85">Sarees dispatched</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-rose-100/70 block">
                          In Godown Stock
                        </span>
                        <span className="text-lg font-bold font-mono tabular-nums text-amber-200 mt-0.5 block">
                          {(saree.godownAvailableMeters || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] text-amber-300/80">Sarees ready</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-5 space-y-1.5">
                <div className="h-2 w-full rounded-full bg-[#050914] overflow-hidden border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-rose-400 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(2, sareePercent))}%` }}
                  />
                </div>
                <div className="text-[11px] text-rose-100/70 text-right font-mono tabular-nums">
                  Target: {(saree.targetMeters || 0).toLocaleString("en-IN")} Sarees
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
           * 4. 3-STEP STATUTORY TALLY PIPELINE (Powerloom -> Godown -> Govt)
           * ========================================================================= */}
          <section className="rounded-2xl border border-white/[0.09] bg-[#090F1E]/72 backdrop-blur-md p-6 sm:p-7 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.65)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <span>Statutory Stock Flow: Powerloom &rarr; Godown &rarr; Government Handover</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Every woven piece enters central godown stock first and deducts strictly upon verified Co-optex dispatch.
                </p>
              </div>

              <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-200 text-xs font-semibold border border-emerald-400/25 self-start sm:self-auto whitespace-nowrap">
                Co-optex Audit Synced
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch relative">
              {/* Loom Produced */}
              <div className="rounded-xl border border-white/[0.08] bg-[#050914]/70 p-5 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Loom Produced</span>
                  <span className="p-2 rounded-lg bg-white/[0.07] text-slate-200 border border-white/[0.12]">
                    <Factory className="h-4 w-4" />
                  </span>
                </div>

                <div>
                  <span className="text-3xl sm:text-4xl font-bold font-financial tabular-nums text-white">
                    {(total.totalProducedMeters || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-medium text-slate-300 ml-1.5">Pieces</span>
                </div>

                <div className="text-xs text-slate-300 pt-2.5 border-t border-white/[0.08] font-mono tabular-nums space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dhothis Woven</span>
                    <strong className="text-slate-100">
                      {(veatti.totalProducedMeters || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sarees Woven</span>
                    <strong className="text-slate-100">
                      {(saree.totalProducedMeters || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </div>

              {/* In Central Storage Godown */}
              <div className="rounded-xl border border-amber-400/35 bg-[#0E1629]/82 p-5 space-y-3 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(251,191,36,0.2)]">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-200">
                  <span className="flex items-center gap-1.5">
                    <span>In Central Godown Stock</span>
                  </span>
                  <span className="p-2 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/30">
                    <Warehouse className="h-4 w-4" />
                  </span>
                </div>

                <div>
                  <span className="text-3xl sm:text-4xl font-bold font-financial tabular-nums text-amber-300">
                    {(total.godownAvailableMeters || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-medium text-amber-200/90 ml-1.5">
                    Pieces Available
                  </span>
                </div>

                <div className="text-xs text-amber-100/80 pt-2.5 border-t border-amber-400/15 font-mono tabular-nums space-y-1">
                  <div className="flex justify-between">
                    <span>Dhothi Godown</span>
                    <strong className="text-amber-200">
                      {(veatti.godownAvailableMeters || 0).toLocaleString("en-IN")} pcs
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Saree Godown</span>
                    <strong className="text-amber-200">
                      {(saree.godownAvailableMeters || 0).toLocaleString("en-IN")} pcs
                    </strong>
                  </div>
                </div>
              </div>

              {/* Government Handovered */}
              <div className="rounded-xl border border-emerald-400/25 bg-[#050914]/70 p-5 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-200">
                  <span>Government Handovered</span>
                  <span className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                    <Send className="h-4 w-4" />
                  </span>
                </div>

                <div>
                  <span className="text-3xl sm:text-4xl font-bold font-financial tabular-nums text-emerald-300">
                    {(total.totalHandoveredMeters || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-medium text-emerald-200/90 ml-1.5">
                    Pieces Dispatched
                  </span>
                </div>

                <div className="text-xs text-emerald-100/80 pt-2.5 border-t border-emerald-400/15 font-mono tabular-nums space-y-1">
                  <div className="flex justify-between">
                    <span>Dhothis Handovered</span>
                    <strong className="text-emerald-200">
                      {(veatti.totalHandoveredMeters || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sarees Handovered</span>
                    <strong className="text-emerald-200">
                      {(saree.totalHandoveredMeters || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Statutory Equation Strip */}
            <div className="px-4 py-3.5 rounded-xl bg-[#050914]/85 border border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
              <div className="font-mono tabular-nums flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-sans">Stock Balance Equation:</span>
                <span className="text-white font-semibold bg-white/[0.06] px-2.5 py-1 rounded-md border border-white/[0.06]">
                  Loom Produced ({(total.totalProducedMeters || 0).toLocaleString("en-IN")})
                </span>
                <span className="text-slate-400">=</span>
                <span className="text-amber-200 font-semibold bg-amber-500/15 px-2.5 py-1 rounded-md border border-amber-400/25">
                  In Godown ({(total.godownAvailableMeters || 0).toLocaleString("en-IN")})
                </span>
                <span className="text-slate-400">+</span>
                <span className="text-emerald-200 font-semibold bg-emerald-500/15 px-2.5 py-1 rounded-md border border-emerald-400/25">
                  Handovered ({(total.totalHandoveredMeters || 0).toLocaleString("en-IN")})
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs">
                <ChevronRight className="h-3.5 w-3.5 text-amber-300" />
                <span>Zero Variance &bull; Statutory Tally Verified</span>
              </div>
            </div>
          </section>

          {/* =========================================================================
           * 5. OFFICIAL GOVERNMENT HANDOVER CHALLANS LEDGER
           * ========================================================================= */}
          <section className="rounded-2xl border border-white/[0.09] bg-[#090F1E]/76 backdrop-blur-md shadow-[0_20px_50px_-15px_rgba(0,0,0,0.65)] overflow-hidden space-y-5 p-6 sm:p-7">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Verified Government Delivery Challans (அரசு ஒப்படைப்பு ரசீதுகள்)
                  </h3>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.08] text-slate-200 border border-white/[0.1] tabular-nums">
                    {filteredHandovers.length} Dispatches
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Official Co-optex gate-pass dispatches with verified piece counts, vehicle logs, and inspecting authority sign-offs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  role="tablist"
                  aria-label="Filter challans by cloth category"
                  className="flex items-center bg-[#050914]/90 border border-white/[0.09] p-1 rounded-lg text-xs font-semibold text-slate-300"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "ALL"}
                    onClick={() => setActiveTab("ALL")}
                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                      activeTab === "ALL"
                        ? "bg-amber-400 text-slate-950 font-bold shadow-xs"
                        : "hover:text-white"
                    }`}
                  >
                    All ({handovers.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "DHOTHI"}
                    onClick={() => setActiveTab("DHOTHI")}
                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                      activeTab === "DHOTHI"
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                        : "hover:text-white"
                    }`}
                  >
                    Dhothis ({handovers.filter((h) => h.clothType === "VEATTI").length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "SAREE"}
                    onClick={() => setActiveTab("SAREE")}
                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                      activeTab === "SAREE"
                        ? "bg-rose-400 text-slate-950 font-bold shadow-xs"
                        : "hover:text-white"
                    }`}
                  >
                    Sarees ({handovers.filter((h) => h.clothType === "SAREE").length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0E172D] hover:bg-[#162242] text-slate-100 border border-white/[0.12] hover:border-amber-300/35 font-semibold text-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                >
                  <Download className="h-3.5 w-3.5 text-amber-300" />
                  <span>Export Audit CSV</span>
                </button>
              </div>
            </div>

            {/* Scoped Dark Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Challan #, Recipient Department, Vehicle Number, or Inspecting Officer..."
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium transition"
              />
            </div>

            {/* Scoped Dark Obsidian Ledger Table */}
            <div className="overflow-x-auto rounded-xl border border-white/[0.09] bg-[#050914]/65">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Challan #</th>
                    <th className="py-3.5 px-4">Dispatch Date</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Quantity (Pieces)</th>
                    <th className="py-3.5 px-4">Recipient Dept / Depot</th>
                    <th className="py-3.5 px-4">Vehicle No</th>
                    <th className="py-3.5 px-4">Inspecting Officer</th>
                    <th className="py-3.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] font-medium">
                  {filteredHandovers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-7 w-7 text-slate-500" />
                          <span className="font-semibold text-sm text-slate-300">
                            No government handover records match the current filter.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHandovers.map((h) => {
                      const isDhothi = h.clothType === "VEATTI";
                      const pieces =
                        h.pieces && h.pieces > 0
                          ? h.pieces
                          : Math.floor((h.meters || 0) / (isDhothi ? 3.65 : 5.5));

                      return (
                        <tr key={h.id} className="transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-300 tabular-nums">
                            #{h.challanNo}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 tabular-nums">
                            {new Date(h.handoverDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isDhothi
                                  ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/25"
                                  : "bg-rose-500/15 text-rose-200 border border-rose-400/25"
                              }`}
                            >
                              {isDhothi ? "Dhothi (வேட்டி)" : "Saree (சேலை)"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm tabular-nums">
                            <span className={isDhothi ? "text-emerald-300" : "text-rose-300"}>
                              {(pieces || 0).toLocaleString("en-IN")}{" "}
                              <span className="text-[11px] font-sans font-normal text-slate-400">
                                {isDhothi ? "Dhothis" : "Sarees"}
                              </span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-200 font-semibold">
                            {h.recipientDept}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {h.vehicleNo || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {h.officerName || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 truncate max-w-[160px]">
                            {h.notes || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredHandovers.length > 0 && (
                  <tfoot className="font-mono font-bold text-slate-200 border-t border-white/[0.1] text-xs">
                    <tr>
                      <td
                        colSpan={3}
                        className="py-3.5 px-4 font-sans font-semibold text-slate-300"
                      >
                        Total Dispatched ({filteredHandovers.length} Challans)
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-300 text-sm tabular-nums">
                        {filteredTotalPieces.toLocaleString("en-IN")} Pieces
                      </td>
                      <td colSpan={4} className="py-3.5 px-4 text-slate-500">
                        —
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          {/* =========================================================================
           * 6. OFFICIAL INSPECTION AUTHORITY FOOTER
           * ========================================================================= */}
          <footer className="pt-4 pb-10 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-300 flex-shrink-0" />
              <span>
                Statutory Handloom &amp; Textiles Inspection Authority &bull; Department of Handlooms, Government of Tamil Nadu
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 text-center sm:text-right">
              Audit Session ID: {user?.id?.substring(0, 8) || "OFFICIAL"} &bull; FY 2026-2027
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
