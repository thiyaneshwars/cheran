"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  const [activeTab, setActiveTab] = useState<"ALL" | "DHOTHI" | "SAREE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showLoomModal, setShowLoomModal] = useState(false);

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

  const officialDisplayName = user?.fullName || "Senior Inspecting Official";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-20 rounded-2xl skeleton-shimmer border border-[#E5DEC9]" />
          <div className="h-80 rounded-2xl skeleton-shimmer border border-[#E5DEC9]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl skeleton-shimmer border border-[#E5DEC9]"
              />
            ))}
          </div>
          <div className="h-80 rounded-2xl skeleton-shimmer border border-[#E5DEC9]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#14233C] font-sans">
      <ScrollThreadBar />

      {/* Top Sticky Temple Indigo Authority Header */}
      <header className="sticky top-0 z-30 bg-[#14233C] text-[#FAF7F0] border-b-2 border-[#B47B2B] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <CheranSealBadge size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                  Cheran Co-operative Society · Statutory Dispatch Portal
                </h1>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#166534]/35 text-[#86EFAC] border border-[#22C55E]/35">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                  Live Tally
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#A8B6CE] truncate mt-0.5">
                Reg. No. SL-204 · Co-optex Piece Inspection &amp; Godown Audit ·{" "}
                <span className="font-financial text-[#E7C37B]">{currentTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => loadExecutiveData(true)}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              className="px-3 py-2 rounded-xl bg-[#B47B2B] hover:bg-[#9E6A22] text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="Print Statutory Dossier"
              className="hidden md:inline-flex p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
            </button>

            <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-white/15 text-xs">
              <div className="w-8 h-8 rounded-full bg-[#0A101B] border border-[#D49A42] flex items-center justify-center text-[#E7C37B] font-bold">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-white">{officialDisplayName}</div>
                <div className="text-[10.5px] text-[#A8B6CE]">Inspecting Officer</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="px-3 py-2 rounded-xl bg-white/8 hover:bg-[#991B1B]/80 border border-white/15 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Statutory Dossier */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-medium flex items-center justify-between gap-3">
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

        {/* CHAPTER 1: Immediate Hero Thesis + Live Kinematic 3D Powerloom Viewport */}
        <section className="rounded-2xl bg-white border border-[#D4CAB0] overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Core Solid Cotton Ledger Summary */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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

                  <span className="font-financial text-lg font-bold text-[#14233C] bg-[#FEF5E4] border border-[#E7C37B] px-3 py-1 rounded-lg">
                    {activePct.toFixed(1)}% Complete
                  </span>
                </div>

                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#14233C] leading-tight">
                  Govt Handover &amp; Physical Piece Dispatch Statement
                </h2>
                <p className="text-xs sm:text-sm text-[#5B6B84] mt-2 leading-relaxed max-w-2xl">
                  Official piece-counted verification tracking total woven inventory produced on Society looms, current physical godown holdings, and verified receipts dispatched to Co-optex.
                </p>
              </div>

              <DispatchTickRail
                produced={activeStats.totalProducedMeters || 0}
                godown={activeStats.godownAvailableMeters || 0}
                handedOver={activeStats.totalHandoveredMeters || 0}
                target={activeStats.targetMeters || 0}
                unitLabel={activeUnitLabel}
              />

              <div className="rounded-xl bg-[#FAF7F0] border border-[#E5DEC9] p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#5B6B84]">
                    Pending Target Balance
                  </div>
                  <div className="font-financial text-xl font-bold text-[#9A3412] mt-0.5 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#B45309] flex-shrink-0" />
                    <span>
                      -{(activeStats.balanceToHandoverMeters || 0).toLocaleString("en-IN")}{" "}
                      {activeUnitLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right font-financial text-xs text-[#5B6B84]">
                  <div>Target Obligation</div>
                  <div className="font-bold text-[#14233C] text-sm mt-0.5">
                    {(activeStats.targetMeters || 0).toLocaleString("en-IN")} {activeUnitLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Dedicated Unobstructed 3D Kinematic Powerloom Machine Showcase */}
            <div className="lg:col-span-6 relative bg-[#070D1D] border-t lg:border-t-0 lg:border-l border-[#14233C] min-h-[320px] sm:min-h-[380px] overflow-hidden">
              <ExecutiveBackground3D variant="stage" activeCategory={activeTab} />

              {/* Solid Ink Telemetry Labels over 3D Viewport */}
              <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#091122] border border-[#233457] text-[11px] font-semibold text-[#E7C37B]">
                <Factory className="h-3.5 w-3.5 text-[#D49A42]" />
                <span>3D Powerloom Weaving Machine · {activeTab}</span>
              </div>

              <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#091122] border border-[#233457] text-[11px] font-financial text-[#CBD5E1]">
                <span>{(veatti.activeUnitsCount || 0) + (saree.activeUnitsCount || 0)} Loom Units</span>
                <span>·</span>
                <span>{handovers.length} Challans</span>
              </div>

              <button
                type="button"
                onClick={() => setShowLoomModal(true)}
                className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#091122] hover:bg-[#14233C] border border-[#233457] hover:border-[#D49A42]/60 text-[11px] font-semibold text-white transition cursor-pointer"
              >
                <Maximize2 className="h-3 w-3 text-[#E7C37B]" />
                <span>Expand 3D View</span>
              </button>
            </div>
          </div>
        </section>

        <WeaveRule label="Headline Statutory Piece Counters" />

        {/* CHAPTER 2: 4 Core Statutory Counters (Single-label precision) */}
        <RevealBlock>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border border-[#BBF7D0] p-5">
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

            <div className="rounded-xl bg-white border border-[#D49A42]/70 p-5">
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

            <div className="rounded-xl bg-white border border-[#E5DEC9] p-5">
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

            <div className="rounded-xl bg-[#FFFDF8] border border-[#FDBA74] p-5">
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

        {/* CHAPTER 3: Variety Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <RevealBlock className="lg:col-span-6" delayMs={40}>
            <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 h-full space-y-5">
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
            <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 h-full space-y-5">
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

        {/* CHAPTER 4: Horizontal 3-Step Physical Movement Chain */}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F0] p-4 flex items-center justify-between gap-3">
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

              <div className="rounded-xl border border-[#D49A42]/60 bg-[#FEF9EE] p-4 flex items-center justify-between gap-3">
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

              <div className="rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] p-4">
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

        {/* CHAPTER 5: Searchable & Exportable Handover Challans Table */}
        <RevealBlock delayMs={80}>
          <section className="rounded-2xl bg-white border border-[#E5DEC9] overflow-hidden shadow-xs">
            <div className="p-5 sm:p-6 border-b border-[#E5DEC9] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF7F0]/60">
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
                    <th className="px-5 py-3.5 font-semibold text-[#5B6B84]">
                      Challan No.
                    </th>
                    <th className="px-5 py-3.5 font-semibold text-[#5B6B84]">
                      Dispatch Date
                    </th>
                    <th className="px-5 py-3.5 font-semibold text-[#5B6B84]">
                      Variety
                    </th>
                    <th className="px-5 py-3.5 font-semibold text-[#5B6B84]">
                      Delivered Quantity
                    </th>
                    <th className="px-5 py-3.5 font-semibold text-[#5B6B84]">
                      Recipient Department
                    </th>
                    <th className="px-5 py-3.5 font-semibold text-[#5B6B84]">
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
                          <td className="px-5 py-3.5 font-financial font-semibold text-[#14233C]">
                            {h.challanNo}
                          </td>
                          <td className="px-5 py-3.5 text-[#475569]">
                            {new Date(h.handoverDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5">
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
                          <td className="px-5 py-3.5 font-financial font-bold text-[#14233C]">
                            {pcs.toLocaleString("en-IN")} pcs
                          </td>
                          <td className="px-5 py-3.5 text-[#334155]">
                            {h.recipientDept || "Tamil Nadu Handlooms / Co-optex"}
                          </td>
                          <td className="px-5 py-3.5 text-[#5B6B84] text-xs">
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

      {/* Fullscreen 3D Powerloom Modal (Solid High-Contrast Chrome) */}
      {showLoomModal && (
        <div className="fixed inset-0 z-50 bg-[#04070f]">
          <ExecutiveBackground3D variant="fullscreen" activeCategory={activeTab} />

          <div className="fixed top-5 left-5 z-10 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#091020] border border-[#233457] text-xs font-semibold text-[#E7C37B]">
            <Factory className="h-4 w-4 text-[#D49A42]" />
            <span>Kinematic 3D Powerloom Simulation · {activeTab}</span>
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
