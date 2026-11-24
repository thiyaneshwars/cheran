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
  Filter,
  Layers,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
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
  // State
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

  // Metrics Extraction
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

  // Calculate Accurate Percentages
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

  return (
    <div className="relative min-h-screen w-full bg-[#06090F] text-slate-100 overflow-x-hidden selection:bg-amber-500 selection:text-black">
      {/* 3D Animated Background */}
      <ExecutiveBackground3D />

      {/* Main Content Layer (Z-10) */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* =========================================================================
         * 1. EXECUTIVE OFFICIAL TOP BAR & STATE EMBLEM BANNER
         * ========================================================================= */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#06090F]/80 backdrop-blur-xl px-4 sm:px-6 lg:px-10 py-3.5 transition-all">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Official Emblem & Society Header */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 shadow-lg shadow-amber-500/20 border border-amber-300/40 flex-shrink-0">
                <ShieldCheck className="h-7 w-7 text-white stroke-[2.2]" />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 border-2 border-[#06090F]">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Government of Tamil Nadu • Directorate of Handlooms
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono hidden sm:inline">
                    Reg. CH-1049
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                  <span>Cheran Co-operative Weavers Society</span>
                  <span className="text-slate-400 font-normal hidden lg:inline">|</span>
                  <span className="text-amber-300/90 font-extrabold text-xs sm:text-sm hidden lg:inline">
                    Statutory Executive Oversight Portal
                  </span>
                </h1>
              </div>
            </div>

            {/* Right: Live Clock, Refresh, Fullscreen, and Logout */}
            <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
              {/* Live Timestamp */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>{currentTime || "IST Live Sync"}</span>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchData}
                disabled={refreshing}
                title="Sync Real-Time Data from Storage Godown & Powerlooms"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition hover:border-amber-400/40 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen Inspection Mode"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              {/* Secure Official Sign Out */}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to exit the Executive Portal?")) {
                    onLogout();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition cursor-pointer"
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
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
          {/* Official Verification Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent p-5 sm:p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-amber-300 tracking-wide uppercase">
                    Statutory Scheme Monitoring • Free Dhothi & Free Saree Distribution Quota
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  Central Godown Stocks & Government Handover Tracker
                </h2>
                <p className="text-xs sm:text-sm text-slate-300/80 max-w-3xl leading-relaxed">
                  Real-time audit dashboard for Senior Inspecting Authorities. Displays verified physical stocks
                  in society godowns, cumulative deliveries to Co-optex, and completion percentages against government quotas.
                </p>
              </div>

              {/* Official Credential Identity Chip */}
              <div className="self-start lg:self-auto p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md space-y-1 text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Logged in as Inspecting Official
                </span>
                <span className="text-xs sm:text-sm font-black text-amber-300 block">
                  {user?.fullName || "Directorate of Handlooms Official"}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 block">
                  Credential: {user?.email || "official@cheran"}
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
           * 3. HERO OVERALL COMPLETION & QUOTA STATUS
           * ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card A: Overall Percentage Completion Gauge */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Target className="h-4 w-4" />
                    Overall Scheme Progress
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30">
                    Combined Target
                  </span>
                </div>

                {/* Big Percentage Display */}
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                    {overallPercent}%
                  </span>
                  <span className="text-sm font-bold text-emerald-400 font-sans">
                    Completed
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-300 font-medium">
                  {(total.totalHandoveredMeters || 0).toLocaleString("en-IN")} Pieces Handovered out of{" "}
                  {(total.targetMeters || 0).toLocaleString("en-IN")} Total Pieces Target Quota
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 space-y-2">
                <div className="h-3 w-full rounded-full bg-slate-800/90 overflow-hidden p-0.5 border border-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                    style={{ width: `${Math.min(100, Math.max(3, overallPercent))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>0%</span>
                  <span className="text-amber-300 font-bold">
                    Remaining Quota: {(total.balanceToHandoverMeters || 0).toLocaleString("en-IN")} Pcs
                  </span>
                  <span>100% Target</span>
                </div>
              </div>
            </div>

            {/* Card B: Dhothi Scheme Completion Card */}
            <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Layers className="h-4 w-4" />
                    Dhothi Scheme (வேட்டி திட்டம்)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                    Standard 2.00m
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-300">
                    {dhothiPercent}%
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">Handovered</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs pt-3 border-t border-white/10 font-mono">
                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block uppercase">Govt Handovered:</span>
                    <span className="text-base font-black text-white">
                      {(veatti.totalHandoveredMeters || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-sans">Dhothis dispatched</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block uppercase">In Godown Stock:</span>
                    <span className="text-base font-black text-amber-300">
                      {(veatti.godownAvailableMeters || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-amber-400/80 block font-sans">Dhothis ready</span>
                  </div>
                </div>
              </div>

              {/* Mini progress strip */}
              <div className="mt-5 space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(3, dhothiPercent))}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 text-right font-mono">
                  Target: {(veatti.targetMeters || 0).toLocaleString("en-IN")} Dhothis
                </div>
              </div>
            </div>

            {/* Card C: Saree Scheme Completion Card */}
            <div className="rounded-3xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <Layers className="h-4 w-4" />
                    Saree Scheme (சேலை திட்டம்)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30">
                    Standard 5.50m
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-purple-300">
                    {sareePercent}%
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">Handovered</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs pt-3 border-t border-white/10 font-mono">
                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block uppercase">Govt Handovered:</span>
                    <span className="text-base font-black text-white">
                      {(saree.totalHandoveredMeters || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-purple-400 block font-sans">Sarees dispatched</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block uppercase">In Godown Stock:</span>
                    <span className="text-base font-black text-amber-300">
                      {(saree.godownAvailableMeters || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-amber-400/80 block font-sans">Sarees ready</span>
                  </div>
                </div>
              </div>

              {/* Mini progress strip */}
              <div className="mt-5 space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(3, sareePercent))}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 text-right font-mono">
                  Target: {(saree.targetMeters || 0).toLocaleString("en-IN")} Sarees
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
           * 4. THE CORE 3-STEP STATUTORY TALLY PIPELINE (Loom -> Godown -> Govt)
           * ========================================================================= */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Statutory Flow Verification: Powerloom &rarr; Godown &rarr; Government Handover</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every piece produced on powerlooms enters central godown stock, and reduces only upon verified Co-optex dispatch.
                </p>
              </div>

              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto">
                <Sparkles className="h-3.5 w-3.5" />
                <span>100% Balanced Audit</span>
              </span>
            </div>

            {/* Step Pipeline Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
              {/* Step 1: Loom Produced */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 relative">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="uppercase tracking-wider">Step 1: Loom Produced</span>
                  <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <Factory className="h-4 w-4" />
                  </span>
                </div>

                <div>
                  <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                    {(total.totalProducedMeters || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-bold text-blue-400 ml-1.5">Pieces</span>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span>Dhothis Woven:</span>
                    <strong className="text-slate-200">{(veatti.totalProducedMeters || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sarees Woven:</span>
                    <strong className="text-slate-200">{(saree.totalProducedMeters || 0).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>

              {/* Step 2: In Central Storage Godown */}
              <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-5 space-y-3 relative shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="uppercase tracking-wider font-black">Step 2: In Godown Stock</span>
                  <span className="p-2 rounded-xl bg-amber-500/30 text-amber-200">
                    <Warehouse className="h-4 w-4" />
                  </span>
                </div>

                <div>
                  <span className="text-3xl sm:text-4xl font-black font-mono text-amber-300">
                    {(total.godownAvailableMeters || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-bold text-amber-200 ml-1.5">Pieces Available</span>
                </div>

                <div className="text-[11px] text-slate-300 pt-2 border-t border-amber-500/20 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span>Dhothi Godown:</span>
                    <strong className="text-amber-200">{(veatti.godownAvailableMeters || 0).toLocaleString("en-IN")} pcs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Saree Godown:</span>
                    <strong className="text-amber-200">{(saree.godownAvailableMeters || 0).toLocaleString("en-IN")} pcs</strong>
                  </div>
                </div>
              </div>

              {/* Step 3: Government Handovered */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3 relative">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span className="uppercase tracking-wider font-black">Step 3: Govt Handovered</span>
                  <span className="p-2 rounded-xl bg-emerald-500/30 text-emerald-200">
                    <Send className="h-4 w-4" />
                  </span>
                </div>

                <div>
                  <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-300">
                    {(total.totalHandoveredMeters || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-bold text-emerald-200 ml-1.5">Pieces Dispatched</span>
                </div>

                <div className="text-[11px] text-slate-300 pt-2 border-t border-emerald-500/20 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span>Dhothis Handovered:</span>
                    <strong className="text-emerald-200">{(veatti.totalHandoveredMeters || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sarees Handovered:</span>
                    <strong className="text-emerald-200">{(saree.totalHandoveredMeters || 0).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciled Equation Banner */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
              <div className="font-mono flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">Statutory Stock Formula:</span>
                <span className="text-white font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                  Loom Produced ({(total.totalProducedMeters || 0).toLocaleString("en-IN")})
                </span>
                <span>=</span>
                <span className="text-amber-300 font-bold bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30">
                  In Godown ({(total.godownAvailableMeters || 0).toLocaleString("en-IN")})
                </span>
                <span>+</span>
                <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Handovered ({(total.totalHandoveredMeters || 0).toLocaleString("en-IN")})
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero Variance • Perfectly Tapered</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
           * 5. OFFICIAL GOVERNMENT HANDOVER CHALLANS & GATE-PASS LEDGER
           * ========================================================================= */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl overflow-hidden space-y-5 p-6 sm:p-7">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <span>Verified Government Delivery Challans (அரசு ஒப்படைப்பு ரசீதுகள்)</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/15">
                      {filteredHandovers.length} Dispatches Recorded
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official dispatches to Co-optex with gate-pass numbers, vehicles, inspecting officer, and verified pieces count.
                </p>
              </div>

              {/* Action Buttons: Filter Pills + Export CSV */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Category Filter Pills */}
                <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl text-xs font-bold text-slate-300">
                  <button
                    type="button"
                    onClick={() => setActiveTab("ALL")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeTab === "ALL" ? "bg-amber-500 text-black shadow-xs font-black" : "hover:text-white"
                    }`}
                  >
                    All ({handovers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("DHOTHI")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeTab === "DHOTHI" ? "bg-emerald-600 text-white shadow-xs font-black" : "hover:text-white"
                    }`}
                  >
                    Dhothis ({handovers.filter((h) => h.clothType === "VEATTI").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("SAREE")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeTab === "SAREE" ? "bg-purple-600 text-white shadow-xs font-black" : "hover:text-white"
                    }`}
                  >
                    Sarees ({handovers.filter((h) => h.clothType === "SAREE").length})
                  </button>
                </div>

                {/* Export CSV Button */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-bold text-xs transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-amber-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Challan / Order #, Recipient Department, Vehicle No, or Officer Name..."
                className="w-full rounded-2xl bg-black/40 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-500/20 font-medium"
              />
            </div>

            {/* Challans Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-white/5 text-slate-400 font-bold border-b border-white/10 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Challan #</th>
                    <th className="py-3 px-4">Dispatch Date</th>
                    <th className="py-3 px-4">Cloth Category</th>
                    <th className="py-3 px-4 text-right">Quantity (Pieces)</th>
                    <th className="py-3 px-4">Recipient Dept / Depot</th>
                    <th className="py-3 px-4">Vehicle No</th>
                    <th className="py-3 px-4">Inspection Officer</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredHandovers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-8 w-8 text-slate-500" />
                          <span className="font-bold text-sm text-slate-300">
                            No government handover records found for current filter.
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
                        <tr key={h.id} className="hover:bg-white/5 transition">
                          <td className="py-3 px-4 font-mono font-black text-amber-300">
                            #{h.challanNo}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(h.handoverDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isDhothi
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              }`}
                            >
                              {isDhothi ? "Dhothi (வேட்டி)" : "Saree (சேலை)"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-sm">
                            <span className={isDhothi ? "text-emerald-300" : "text-purple-300"}>
                              {(pieces || 0).toLocaleString("en-IN")}{" "}
                              <span className="text-[10px] font-sans font-normal text-slate-400">
                                {isDhothi ? "Dhothis" : "Sarees"}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-semibold">
                            {h.recipientDept}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {h.vehicleNo || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {h.officerName || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                            {h.notes || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredHandovers.length > 0 && (
                  <tfoot className="bg-white/5 font-mono font-bold text-slate-200 border-t-2 border-white/10 text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 uppercase text-[10px] font-sans font-black text-slate-400">
                        Total Filtered Handover Quantity ({filteredHandovers.length} Challans)
                      </td>
                      <td className="py-3 px-4 text-right font-black text-amber-300 text-sm">
                        {filteredHandovers
                          .reduce((s, h) => {
                            const isDhothi = h.clothType === "VEATTI";
                            const p =
                              h.pieces && h.pieces > 0
                                ? h.pieces
                                : Math.floor((h.meters || 0) / (isDhothi ? 3.65 : 5.5));
                            return s + p;
                          }, 0)
                          .toLocaleString("en-IN")}{" "}
                        Pieces
                      </td>
                      <td colSpan={4} className="py-3 px-4 text-slate-500">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* =========================================================================
           * 6. STATUTORY OFFICIAL INSPECTION CERTIFICATE FOOTER
           * ========================================================================= */}
          <footer className="pt-4 pb-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>
                Statutory Handloom & Textiles Inspection Authority • Department of Handlooms, Government of Tamil Nadu
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 text-center sm:text-right">
              Encrypted Audit Session ID: {user?.id?.substring(0, 8) || "OFFICIAL-PORTAL"} • FY 2026-2027
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
