"use client";

import React, { useState, useMemo } from "react";
import {
  Scale,
  Warehouse,
  PackageCheck,
  Factory,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  RefreshCw,
  Search,
  Printer,
  Download,
  Info,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  calculateDhothiPieces,
  calculateSareePieces,
  calculatePiecesFromMeters,
  calculateWeftRequirementSuggestion,
  GOVT_DHOTHI_WEFT_KG_PER_PIECE,
  GOVT_DHOTHI_KG_PER_BAG,
  GOVT_SAREE_WEFT_KG_PER_PIECE,
  GOVT_SAREE_KG_PER_BAG,
  WeftSuggestionResult,
} from "@/lib/veatti-calculations";
import { round2, formatINR } from "@/lib/decimal";

interface WeftSuggestionViewProps {
  clothType: "VEATTI" | "SAREE";
  units: any[];
  weftInventory?: any;
  onRefresh: () => void;
  onOpenWeftModal?: (unit: any, suggestedBags: number, suggestedKg: number) => void;
  onOpenBabinModal?: (unit: any, suggestedSets: number) => void;
}

export const WeftSuggestionView: React.FC<WeftSuggestionViewProps> = ({
  clothType,
  units,
  weftInventory,
  onRefresh,
  onOpenWeftModal,
  onOpenBabinModal,
}) => {
  const isSaree = clothType === "SAREE";
  const itemLabel = isSaree ? "Saree" : "Dhothi";
  const itemsLabel = isSaree ? "Sarees" : "Dhothis";
  const kgPerPiece = isSaree ? GOVT_SAREE_WEFT_KG_PER_PIECE : GOVT_DHOTHI_WEFT_KG_PER_PIECE; // 0.182 vs 0.119
  const kgPerBag = isSaree ? GOVT_SAREE_KG_PER_BAG : GOVT_DHOTHI_KG_PER_BAG; // 50 vs 60

  // Filtered powerlooms by clothType
  const filteredUnits = useMemo(() => {
    return units.filter((u) => (clothType ? u.clothType === clothType : true));
  }, [units, clothType]);

  // Selected Unit ID for the interactive simulator
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    filteredUnits.length > 0 ? filteredUnits[0].id : ""
  );

  // Per-unit custom simulated pieces map: { [unitId]: number }
  const [customPiecesMap, setCustomPiecesMap] = useState<Record<string, string>>({});

  // Search and filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NEED_DISPATCH" | "SUFFICIENT">("ALL");

  // Godown stats from overview
  const inv = isSaree ? weftInventory?.saree : weftInventory?.veatti;
  const godownStockKg = inv?.godownStockKg ?? 0;
  const godownStockBags = inv?.godownStockBags ?? (godownStockKg > 0 ? +(godownStockKg / kgPerBag).toFixed(1) : 0);
  const govtTotalWeftKg = inv?.govtTotalWeftKg ?? 0;
  const govtTotalWeftBags = inv?.govtTotalWeftBags ?? (govtTotalWeftKg > 0 ? +(govtTotalWeftKg / kgPerBag).toFixed(1) : 0);
  const totalIssuedKg = inv?.totalIssuedKg ?? 0;
  const totalIssuedBags = inv?.totalIssuedBags ?? (totalIssuedKg > 0 ? +(totalIssuedKg / kgPerBag).toFixed(1) : 0);
  const totalLoomStockKg = inv?.totalLoomStockKg ?? 0;
  const totalLoomStockBags = inv?.totalLoomStockBags ?? (totalLoomStockKg > 0 ? +(totalLoomStockKg / kgPerBag).toFixed(1) : 0);

  // Compute suggestions for all units
  const unitSuggestions = useMemo(() => {
    return filteredUnits.map((u) => {
      const rawPieces = u.remainingPaavuMeters ?? Math.max(0, (u.paavuMeters || 0) - (u.totalProducedMeters || 0));
      const defaultPieces = Math.floor(rawPieces || 0);

      const customStr = customPiecesMap[u.id];
      const customPieces = customStr !== undefined && customStr !== "" ? parseInt(customStr, 10) : undefined;
      const piecesToRun = customPieces !== undefined && !isNaN(customPieces) ? customPieces : defaultPieces;

      const currentLoomStock = u.weftStockKg ?? 0;
      const initialWeft = u.initialWeftKg ?? 0;
      const regGiven = (u.registerEntries || []).reduce((s: number, r: any) => s + (r.weftGivenKg || 0), 0);
      const totalGivenKg = round2(initialWeft + regGiven);
      const totalGivenBags = +(totalGivenKg / kgPerBag).toFixed(1);

      const suggestion = calculateWeftRequirementSuggestion({
        clothType,
        remainingPaavuPieces: defaultPieces,
        customPiecesToRun: piecesToRun,
        currentLoomStockKg: currentLoomStock,
        currentLoomBabinStock: u.babinCount ?? 0,
        godownStockKg,
        customKgPerPiece: kgPerPiece,
        customKgPerBag: kgPerBag,
      });

      return {
        unit: u,
        defaultPieces,
        piecesToRun,
        totalGivenKg,
        totalGivenBags,
        currentLoomStock,
        currentLoomStockBags: +(currentLoomStock / kgPerBag).toFixed(1),
        suggestion,
      };
    });
  }, [filteredUnits, customPiecesMap, clothType, godownStockKg, isSaree, kgPerPiece, kgPerBag]);

  // Selected Unit calculation
  const selectedUnitItem = useMemo(() => {
    if (!selectedUnitId) return unitSuggestions[0] || null;
    return unitSuggestions.find((s) => s.unit.id === selectedUnitId) || unitSuggestions[0] || null;
  }, [unitSuggestions, selectedUnitId]);

  // Filtered rows for the society table
  const displayedRows = useMemo(() => {
    return unitSuggestions.filter((row) => {
      const matchesSearch =
        !search.trim() ||
        row.unit.weaverName?.toLowerCase().includes(search.toLowerCase()) ||
        row.unit.location?.toLowerCase().includes(search.toLowerCase());

      const needsDispatch = row.suggestion.shortfallKg > 0;
      const matchesFilter =
        statusFilter === "ALL"
          ? true
          : statusFilter === "NEED_DISPATCH"
          ? needsDispatch
          : !needsDispatch;

      return matchesSearch && matchesFilter;
    });
  }, [unitSuggestions, search, statusFilter]);

  // Society-wide totals for running all pending paavus
  const societyTotals = useMemo(() => {
    let totalPieces = 0;
    let totalWeftRequiredKg = 0;
    let totalShortfallKg = 0;
    let totalSuggestedBags = 0;
    let totalSuggestedKg = 0;
    let totalBabinSetsRequired = 0;
    let totalCurrentBabinStock = 0;
    let totalSuggestedBabinSets = 0;

    for (const r of unitSuggestions) {
      totalPieces += r.piecesToRun;
      totalWeftRequiredKg += r.suggestion.weftRequiredKg;
      totalShortfallKg += r.suggestion.shortfallKg;
      totalSuggestedBags += r.suggestion.suggestedBags;
      totalSuggestedKg += r.suggestion.suggestedKg;
      totalBabinSetsRequired += r.suggestion.babinSetsRequired;
      totalCurrentBabinStock += r.suggestion.currentLoomBabinStock;
      totalSuggestedBabinSets += r.suggestion.suggestedBabinSets;
    }

    const netSurplusBags = godownStockBags - totalSuggestedBags;

    return {
      totalPieces,
      totalWeftRequiredKg: round2(totalWeftRequiredKg),
      totalShortfallKg: round2(totalShortfallKg),
      totalSuggestedBags,
      totalSuggestedKg: round2(totalSuggestedKg),
      netSurplusBags: +netSurplusBags.toFixed(1),
      isSocietyCovered: godownStockBags >= totalSuggestedBags,
      totalBabinSetsRequired: round2(totalBabinSetsRequired),
      totalCurrentBabinStock: round2(totalCurrentBabinStock),
      totalSuggestedBabinSets,
    };
  }, [unitSuggestions, godownStockBags]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Powerloom Weaver",
      "Cloth Type",
      "Looms",
      `Pending Paavu ${itemsLabel} (Pcs)`,
      `${itemsLabel} To Run (Simulated)`,
      "Weft Given To Loom (KG)",
      "Weft Given To Loom (Bags)",
      "Current Loom Stock (KG)",
      "Current Loom Stock (Bags)",
      "Weft Required (KG)",
      "Shortfall (KG)",
      "Suggested Dispatch (Bags)",
      "Suggested Dispatch (KG)",
      "Godown Availability Status",
      "Current Loom Babins (Sets)",
      "Babin Sets Required",
      "Babin Sets Shortfall",
      "Suggested Babin Dispatch (Sets)",
    ];

    const rows = unitSuggestions.map((r) => [
      `"${r.unit.weaverName || ""}"`,
      r.unit.clothType,
      r.unit.machineCount || 1,
      r.defaultPieces,
      r.piecesToRun,
      r.totalGivenKg,
      r.totalGivenBags,
      r.currentLoomStock,
      r.currentLoomStockBags,
      r.suggestion.weftRequiredKg,
      r.suggestion.shortfallKg,
      r.suggestion.suggestedBags,
      r.suggestion.suggestedKg,
      r.suggestion.status,
      r.suggestion.currentLoomBabinStock,
      r.suggestion.babinSetsRequired,
      r.suggestion.babinShortfall,
      r.suggestion.suggestedBabinSets,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Weft_Allocation_Schedule_${clothType}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
       * 1. TOP HEADER & CENTRAL GODOWN WEFT INVENTORY STATUS
       * ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-sky-800/40 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold uppercase tracking-wider border border-sky-400/30 flex items-center gap-1.5">
                <Warehouse className="h-3.5 w-3.5" />
                <span>Central Godown & Loom Weft Distribution</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Standard: {kgPerPiece} KG / {itemLabel} • {kgPerBag} KG / Bag
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>{isSaree ? "Saree" : "Dhothi"} Weft Allocation & Bag Suggester</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-3xl leading-relaxed">
              Calculates exact Weft KG & bags required for each powerloom based on Paavu {itemsLabel} to run,
              accounting for weft already given, loom-side stored balance, and society godown stock.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4 text-sky-300" />
              <span>Export Schedule</span>
            </button>
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Godown & Loom Inventory"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-sky-300" />
            </button>
          </div>
        </div>

        {/* 4 Godown & Loom Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Central Godown Weft Stock */}
          <div className="p-4.5 rounded-2xl bg-sky-950/60 border border-sky-600/40 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between text-xs font-bold text-sky-300">
              <span>Godown Weft In Stock</span>
              <Warehouse className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
              {godownStockBags}{" "}
              <span className="text-sm font-bold text-sky-300 font-sans">Bags</span>
            </div>
            <div className="text-xs text-slate-300 font-mono">
              {godownStockKg.toLocaleString()} KG @ {kgPerBag}kg/bag
            </div>
          </div>

          {/* Card 2: Government Allotment Inward */}
          <div className="p-4.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Govt Weft Inward</span>
              <PackageCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
              {govtTotalWeftBags}{" "}
              <span className="text-sm font-bold text-slate-400 font-sans">Bags</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {govtTotalWeftKg.toLocaleString()} KG total inward
            </div>
          </div>

          {/* Card 3: Total Issued to Looms */}
          <div className="p-4.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Issued to Powerlooms</span>
              <Send className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
              {totalIssuedBags}{" "}
              <span className="text-sm font-bold text-slate-400 font-sans">Bags</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {totalIssuedKg.toLocaleString()} KG issued across {filteredUnits.length} looms
            </div>
          </div>

          {/* Card 4: Current Weft Sitting at Looms */}
          <div className="p-4.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Remaining at Looms</span>
              <Scale className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
              {totalLoomStockBags}{" "}
              <span className="text-sm font-bold text-slate-400 font-sans">Bags</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {totalLoomStockKg.toLocaleString()} KG available across looms
            </div>
          </div>
        </div>

        {/* Society Overall Sufficiency Bar */}
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${societyTotals.isSocietyCovered ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`}>
              {societyTotals.isSocietyCovered ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <div className="font-bold text-white text-sm">
                Society Weft Balance: {societyTotals.isSocietyCovered ? "✅ Sufficient Godown Stock" : "⚠️ Low Godown Stock Alert"}
              </div>
              <div className="text-slate-300 font-medium">
                To run all <span className="font-bold text-white font-mono">{societyTotals.totalPieces.toLocaleString()} pending {itemsLabel}</span> across all looms requires{" "}
                <span className="font-bold text-sky-300 font-mono">{societyTotals.totalWeftRequiredKg.toLocaleString()} KG</span> weft (net dispatch: <span className="font-bold text-amber-300 font-mono">{societyTotals.totalSuggestedBags} Bags</span>) &{" "}
                <span className="font-bold text-purple-300 font-mono">{societyTotals.totalBabinSetsRequired} Babin Sets</span> (net dispatch: <span className="font-bold text-purple-300 font-mono">{societyTotals.totalSuggestedBabinSets} Sets</span>).
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs ${societyTotals.isSocietyCovered ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`}>
              Godown Surplus: {societyTotals.netSurplusBags >= 0 ? `+${societyTotals.netSurplusBags} Bags` : `${societyTotals.netSurplusBags} Bags Short`}
            </span>
            <span className="px-3 py-1.5 rounded-xl font-bold font-mono text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Babins Needed: {societyTotals.totalSuggestedBabinSets} Sets
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
       * 2. INTERACTIVE POWERLOOM WEFT ADVISOR & SIMULATOR (SELECTED LOOM)
       * ========================================================================= */}
      {selectedUnitItem && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border-2 border-sky-600/30 space-y-6">
          {/* Header & Loom Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
                  Powerloom Weft Advisor
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  📍 {selectedUnitItem.unit.location || "Tamil Nadu"} • {selectedUnitItem.unit.machineCount} Looms
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>{selectedUnitItem.unit.weaverName}</span>
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                  {kgPerPiece} kg/{itemLabel}
                </span>
              </h3>
            </div>

            {/* Quick Powerloom Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Switch Powerloom:</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:border-sky-500"
              >
                {filteredUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.weaverName} ({u.clothType} • {u.machineCount || 1} looms)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3-Column Interactive Layout: Loom Stock | Interactive Simulator | Godown Suggestion */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Col 1: Current Powerloom Status (4 cols) */}
            <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-5 border border-slate-200/90 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Factory className="h-4 w-4 text-emerald-600" />
                <span>Current Loom Stock Status</span>
              </div>

              {/* Pending Paavu */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 flex justify-between">
                  <span>Pending Paavu on Loom</span>
                  <span className="font-mono text-emerald-700 font-bold">{itemLabel} Pieces</span>
                </div>
                <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  {selectedUnitItem.defaultPieces.toLocaleString()}{" "}
                  <span className="text-xs font-bold text-emerald-600 font-sans">{itemsLabel}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {selectedUnitItem.defaultPieces.toLocaleString()} pending {itemsLabel.toLowerCase()} to weave
                </div>
              </div>

              {/* Weft Already Given */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">Total Weft Issued to Loom</div>
                <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  {selectedUnitItem.totalGivenBags}{" "}
                  <span className="text-xs font-bold text-slate-500 font-sans">Bags</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {selectedUnitItem.totalGivenKg.toLocaleString()} KG given so far
                </div>
              </div>

              {/* Current Weft Stock Remaining at Loom */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 flex justify-between">
                  <span>Stored Weft Remaining at Loom</span>
                  <Scale className="h-3.5 w-3.5 text-sky-600" />
                </div>
                <div className="text-xl font-black text-sky-950 font-mono tabular-nums">
                  {selectedUnitItem.currentLoomStock}{" "}
                  <span className="text-xs font-bold text-sky-700 font-sans">KG</span>
                  <span className="text-xs font-normal text-slate-400 font-sans ml-1.5">
                    ({selectedUnitItem.currentLoomStockBags} bags)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Ready on loom floor for weaving
                </div>
              </div>

              {/* Available Babin Sets at Loom */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 flex justify-between">
                  <span>Available Babin Sets at Loom</span>
                  <Layers className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <div className="text-xl font-black text-purple-950 font-mono tabular-nums">
                  {selectedUnitItem.suggestion.currentLoomBabinStock}{" "}
                  <span className="text-xs font-bold text-purple-700 font-sans">Sets</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Standard: 1 Babin Set = {selectedUnitItem.suggestion.piecesPerBabinSet} {itemsLabel}
                </div>
              </div>
            </div>

            {/* Col 2: Interactive Simulator (4 cols) */}
            <div className="lg:col-span-4 bg-sky-50/50 rounded-2xl p-5 border border-sky-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-900 uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-sky-600" />
                <span>Simulate Paavu {itemsLabel} to Run</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  How many Paavu {itemsLabel} to run on this loom?
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      customPiecesMap[selectedUnitItem.unit.id] !== undefined
                        ? customPiecesMap[selectedUnitItem.unit.id]
                        : selectedUnitItem.defaultPieces
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomPiecesMap((prev) => ({
                        ...prev,
                        [selectedUnitItem.unit.id]: val,
                      }));
                    }}
                    placeholder={`e.g. ${selectedUnitItem.defaultPieces}`}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-sky-300 bg-white font-mono font-black text-xl text-slate-900 focus:outline-none focus:border-sky-600 shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-sky-700 uppercase">
                    {itemsLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Enter integer pieces (decimals are ignored per scheme standard)
                </p>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPiecesMap((prev) => ({
                        ...prev,
                        [selectedUnitItem.unit.id]: selectedUnitItem.defaultPieces.toString(),
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-bold transition"
                  >
                    All Pending ({selectedUnitItem.defaultPieces})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPiecesMap((prev) => ({
                        ...prev,
                        [selectedUnitItem.unit.id]: "250",
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    250
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPiecesMap((prev) => ({
                        ...prev,
                        [selectedUnitItem.unit.id]: "500",
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    500
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPiecesMap((prev) => ({
                        ...prev,
                        [selectedUnitItem.unit.id]: "1000",
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    1,000
                  </button>
                </div>
              </div>

              {/* Weft Formula Breakdown */}
              <div className="bg-white p-3 rounded-xl border border-sky-100 text-xs space-y-1.5">
                <div className="font-bold text-slate-700 flex justify-between">
                  <span>Weft Required Formula:</span>
                  <span className="font-mono text-sky-800">
                    {selectedUnitItem.piecesToRun} × {kgPerPiece} kg
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                  <span>Total Weft Required:</span>
                  <span className="font-bold text-slate-900">{selectedUnitItem.suggestion.weftRequiredKg} KG</span>
                </div>
                <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                  <span>Minus Loom Stock:</span>
                  <span className="font-bold text-emerald-700">- {selectedUnitItem.currentLoomStock} KG</span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex justify-between font-mono font-bold text-xs text-sky-950">
                  <span>Net Weft Shortfall:</span>
                  <span className={selectedUnitItem.suggestion.shortfallKg > 0 ? "text-amber-700 font-black" : "text-emerald-700"}>
                    {selectedUnitItem.suggestion.shortfallKg} KG
                  </span>
                </div>
              </div>

              {/* Babin Sets Formula Breakdown */}
              <div className="bg-white p-3 rounded-xl border border-purple-100 text-xs space-y-1.5">
                <div className="font-bold text-slate-700 flex justify-between">
                  <span>Babin Sets Formula:</span>
                  <span className="font-mono text-purple-800">
                    {selectedUnitItem.piecesToRun} ÷ {selectedUnitItem.suggestion.piecesPerBabinSet} {itemsLabel}/set
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                  <span>Total Babin Sets Needed:</span>
                  <span className="font-bold text-slate-900">{selectedUnitItem.suggestion.babinSetsRequired} Sets</span>
                </div>
                <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                  <span>Minus Loom Babins:</span>
                  <span className="font-bold text-emerald-700">- {selectedUnitItem.suggestion.currentLoomBabinStock} Sets</span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex justify-between font-mono font-bold text-xs text-purple-950">
                  <span>Net Babin Shortfall:</span>
                  <span className={selectedUnitItem.suggestion.babinShortfall > 0 ? "text-amber-700 font-black" : "text-emerald-700"}>
                    {selectedUnitItem.suggestion.babinShortfall} Sets
                  </span>
                </div>
              </div>
            </div>

            {/* Col 3: Smart Godown Dispatch Suggestion (4 cols) */}
            <div className="lg:col-span-4 bg-gradient-to-br from-emerald-50/70 via-sky-50/50 to-blue-50/60 rounded-2xl p-5 border-2 border-emerald-300 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span>Godown Dispatch Suggestion</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                    {kgPerBag} kg/bag
                  </span>
                </div>

                {/* Big Recommendation Badge */}
                {selectedUnitItem.suggestion.shortfallKg === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 space-y-1">
                    <div className="text-sm font-black flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <span>Loom Weft Sufficient</span>
                    </div>
                    <p className="text-xs text-emerald-800 font-medium">
                      Loom already has {selectedUnitItem.currentLoomStock} KG, which is enough to run all{" "}
                      {selectedUnitItem.piecesToRun} {itemsLabel}. No godown weft dispatch needed.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white border-2 border-emerald-500 shadow-sm space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase">Suggested Godown Weft Dispatch:</div>
                    <div className="text-3xl font-black font-mono text-emerald-900 tabular-nums">
                      {selectedUnitItem.suggestion.suggestedBags}{" "}
                      <span className="text-lg font-bold text-emerald-700 font-sans">
                        Bags
                      </span>
                      <span className="text-sm font-semibold text-slate-500 font-mono ml-2">
                        ({selectedUnitItem.suggestion.suggestedKg} KG)
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      Calculation: ⌈{selectedUnitItem.suggestion.shortfallKg}kg ÷ {kgPerBag}kg⌉ = {selectedUnitItem.suggestion.suggestedBags} bags
                    </div>
                  </div>
                )}

                {/* Babin Dispatch Card */}
                {selectedUnitItem.suggestion.suggestedBabinSets > 0 ? (
                  <div className="p-3.5 rounded-xl bg-white border-2 border-purple-400 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-950 uppercase">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-purple-600" />
                        <span>Suggested Babin Sets Dispatch:</span>
                      </div>
                      <span className="text-base font-black font-mono text-purple-900">
                        {selectedUnitItem.suggestion.suggestedBabinSets} Sets
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      Calculation: ⌈{selectedUnitItem.suggestion.babinShortfall} sets⌉ = {selectedUnitItem.suggestion.suggestedBabinSets} Sets needed
                    </div>
                    {onOpenBabinModal && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenBabinModal(
                            selectedUnitItem.unit,
                            selectedUnitItem.suggestion.suggestedBabinSets
                          )
                        }
                        className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>⚡ Issue {selectedUnitItem.suggestion.suggestedBabinSets} Babin Sets to {selectedUnitItem.unit.weaverName}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                      Babin Sets Sufficient ({selectedUnitItem.suggestion.currentLoomBabinStock} Sets on loom)
                    </span>
                  </div>
                )}

                {/* Godown Availability Check */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Central Godown Weft Stock:</span>
                    <span className="font-mono text-slate-900">{godownStockBags} Bags ({godownStockKg.toLocaleString()} KG)</span>
                  </div>
                  {selectedUnitItem.suggestion.isGodownSufficient ? (
                    <div className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Available in Godown for immediate dispatch</span>
                    </div>
                  ) : (
                    <div className="text-rose-700 font-semibold text-[11px] flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Godown low stock! Needs additional yarn inward</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {selectedUnitItem.suggestion.suggestedBags > 0 && onOpenWeftModal && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenWeftModal(
                      selectedUnitItem.unit,
                      selectedUnitItem.suggestion.suggestedBags,
                      selectedUnitItem.suggestion.suggestedKg
                    )
                  }
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    ⚡ Dispatch {selectedUnitItem.suggestion.suggestedBags} Bags ({selectedUnitItem.suggestion.suggestedKg} KG) to {selectedUnitItem.unit.weaverName}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * 3. ALL-POWERLOOMS SOCIETY WEFT ALLOCATION MATRIX (TABLE)
       * ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Society Weft Requirement Matrix</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold font-mono">
                {displayedRows.length} Powerlooms
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Live powerloom allocation matrix: Adjust pieces per row to dynamically recalculate weft required and suggested bags.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search powerloom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                All ({unitSuggestions.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("NEED_DISPATCH")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "NEED_DISPATCH" ? "bg-amber-600 text-white shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                Need Dispatch ({unitSuggestions.filter((r) => r.suggestion.shortfallKg > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("SUFFICIENT")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === "SUFFICIENT" ? "bg-emerald-600 text-white shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                Stock Sufficient ({unitSuggestions.filter((r) => r.suggestion.shortfallKg === 0).length})
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-3.5">Powerloom Weaver</th>
                <th className="py-3 px-3 text-center">Looms</th>
                <th className="py-3 px-3 text-right">Remaining Paavu</th>
                <th className="py-3 px-3 text-right">Weft Given</th>
                <th className="py-3 px-3 text-right">Loom Stock</th>
                <th className="py-3 px-3.5 text-center bg-sky-50/70 border-x border-sky-100">
                  {itemsLabel} To Run
                </th>
                <th className="py-3 px-3 text-right">Weft Needed</th>
                <th className="py-3 px-3 text-right">Shortfall</th>
                <th className="py-3 px-3.5 text-center bg-emerald-50/80 border-x border-emerald-100">
                  Suggested Dispatch
                </th>
                <th className="py-3 px-3 text-center">Babin Sets</th>
                <th className="py-3 px-3 text-center">Godown Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    No powerloom units found matching search.
                  </td>
                </tr>
              ) : (
                displayedRows.map((r) => {
                  const isSelected = r.unit.id === selectedUnitId;
                  const needsDispatch = r.suggestion.shortfallKg > 0;

                  return (
                    <tr
                      key={r.unit.id}
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        isSelected ? "bg-sky-50/40" : ""
                      }`}
                      onClick={() => setSelectedUnitId(r.unit.id)}
                    >
                      {/* Weaver Name */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{r.unit.weaverName}</div>
                        <div className="text-[10px] text-slate-400">
                          {r.unit.location || "Tamil Nadu"}
                        </div>
                      </td>

                      {/* Looms */}
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {r.unit.machineCount || 1}
                      </td>

                      {/* Remaining Paavu */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900">
                          {r.defaultPieces.toLocaleString()} {itemsLabel}
                        </div>
                      </td>

                      {/* Weft Given */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        <div>{r.totalGivenBags} Bags</div>
                        <div className="text-[10px] text-slate-400">{r.totalGivenKg}kg</div>
                      </td>

                      {/* Current Loom Stock */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-bold text-sky-900">{r.currentLoomStock} KG</div>
                        <div className="text-[10px] text-slate-400">({r.currentLoomStockBags} bags)</div>
                      </td>

                      {/* Simulated Pieces to Run (Inline input!) */}
                      <td
                        className="py-2.5 px-3 bg-sky-50/40 border-x border-sky-100 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            customPiecesMap[r.unit.id] !== undefined
                              ? customPiecesMap[r.unit.id]
                              : r.defaultPieces
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomPiecesMap((prev) => ({
                              ...prev,
                              [r.unit.id]: val,
                            }));
                          }}
                          className="w-20 px-2 py-1 rounded-lg border border-sky-300 text-center font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-sky-600 bg-white shadow-2xs"
                        />
                      </td>

                      {/* Weft Required */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {r.suggestion.weftRequiredKg} KG
                      </td>

                      {/* Net Shortfall */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`font-bold ${
                            needsDispatch ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {needsDispatch ? `${r.suggestion.shortfallKg} KG` : "0 KG"}
                        </span>
                      </td>

                      {/* Suggested Dispatch (Bags) */}
                      <td className="py-3 px-3.5 bg-emerald-50/40 border-x border-emerald-100 text-center">
                        {r.suggestion.suggestedBags > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black font-mono text-xs shadow-2xs">
                            {r.suggestion.suggestedBags} Bags
                            <span className="text-[10px] font-normal text-emerald-100">
                              ({r.suggestion.suggestedKg}kg)
                            </span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold text-[11px]">
                            ✓ Stocked
                          </span>
                        )}
                      </td>

                      {/* Babin Sets */}
                      <td className="py-3 px-3 text-center font-mono">
                        <div className="text-[11px] font-bold text-slate-700">
                          {r.suggestion.currentLoomBabinStock} / {r.suggestion.babinSetsRequired} sets
                        </div>
                        {r.suggestion.suggestedBabinSets > 0 ? (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
                            +{r.suggestion.suggestedBabinSets} Sets
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold">✓ OK</span>
                        )}
                      </td>

                      {/* Godown Status */}
                      <td className="py-3 px-3 text-center">
                        {r.suggestion.status === "ENOUGH_AT_LOOM" ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                            Loom OK
                          </span>
                        ) : r.suggestion.isGodownSufficient ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            In Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            Low Stock
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {r.suggestion.suggestedBags > 0 && onOpenWeftModal ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenWeftModal(
                                r.unit,
                                r.suggestion.suggestedBags,
                                r.suggestion.suggestedKg
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition whitespace-nowrap cursor-pointer"
                          >
                            + Issue {r.suggestion.suggestedBags} Bags
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {displayedRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-3.5">Society Total ({displayedRows.length} looms)</td>
                  <td className="py-3 px-3 text-center">
                    {displayedRows.reduce((s, r) => s + (r.unit.machineCount || 1), 0)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {displayedRows.reduce((s, r) => s + r.defaultPieces, 0).toLocaleString()} {itemsLabel}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {displayedRows.reduce((s, r) => s + r.totalGivenBags, 0).toFixed(1)} Bags
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {displayedRows.reduce((s, r) => s + r.currentLoomStock, 0).toFixed(1)} KG
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono bg-sky-100/70 border-x border-sky-200">
                    {displayedRows.reduce((s, r) => s + r.piecesToRun, 0).toLocaleString()} {itemsLabel}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {displayedRows.reduce((s, r) => s + r.suggestion.weftRequiredKg, 0).toFixed(2)} KG
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-800">
                    {displayedRows.reduce((s, r) => s + r.suggestion.shortfallKg, 0).toFixed(2)} KG
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono bg-emerald-100/70 border-x border-emerald-200 text-emerald-950">
                    {displayedRows.reduce((s, r) => s + r.suggestion.suggestedBags, 0)} Bags
                  </td>
                  <td className="py-3 px-3 text-center text-xs font-bold text-slate-600">
                    {godownStockBags} Bags in Godown
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
