"use client";

import React, { useState, useEffect } from "react";
import {
  Factory,
  Layers,
  PackageCheck,
  Warehouse,
  Send,
  Clock,
  ArrowRight,
  RotateCw,
} from "lucide-react";

interface ProductionDashboardProps {
  onNavigate: (tab: "production-dashboard" | "veatti" | "saree" | "govt-handover") => void;
}

export const ProductionDashboardView: React.FC<ProductionDashboardProps> = ({
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "VEATTI" | "SAREE">("ALL");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production/overview");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load production overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-600">
          Loading Production Dashboard...
        </p>
      </div>
    );
  }

  const { veatti, saree, totalConsolidated } = data.overview;

  return (
    <div className="space-y-7 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Header Banner & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E2229] text-white shadow-xs">
              <Factory className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Textile Production Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Powerloom Weaving Operations • Dhoti & Saree Divisions
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher: All / Veatti / Saree */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === "ALL"
                ? "bg-[#1E2229] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Parallel Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("VEATTI")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === "VEATTI"
                ? "bg-[#1E2229] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <span>Veatti Division</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("SAREE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === "SAREE"
                ? "bg-[#1E2229] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <span>Saree Division</span>
          </button>

          <button
            type="button"
            onClick={fetchOverview}
            title="Refresh Data"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white transition"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Consolidated High-Level KPI Summary (Visible on All Overview) */}
      {activeFilter === "ALL" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Produced */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="tracking-wider uppercase">TOTAL PRODUCED</span>
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Factory className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {totalConsolidated.totalProducedMeters.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-semibold text-emerald-600">Pcs</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              From all powerloom units
            </p>
          </div>

          {/* Card 2: Godown Available */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="tracking-wider uppercase">IN GODOWN STOCK</span>
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Warehouse className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {totalConsolidated.godownAvailableMeters.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-semibold text-amber-600">Pcs</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Ready for government delivery
            </p>
          </div>

          {/* Card 3: Handovered to Government */}
          <div
            onClick={() => onNavigate("govt-handover")}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="tracking-wider uppercase">GOVT HANDOVERED</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Send className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {totalConsolidated.totalHandoveredMeters.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-semibold text-blue-600">Pcs</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-blue-600 font-semibold flex items-center gap-1">
              <span>View Govt Handover Ledger &rarr;</span>
            </p>
          </div>

          {/* Card 4: Balance Yet to Handover */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="tracking-wider uppercase">YET TO HANDOVER</span>
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {totalConsolidated.balanceToHandoverMeters.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-semibold text-rose-600">Pcs</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Target balance remaining
            </p>
          </div>
        </div>
      )}

      {/* 3. Side-by-Side Detailed Sections: Veatti & Saree */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VEATTI SECTION CARD */}
        {(activeFilter === "ALL" || activeFilter === "VEATTI") && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6 flex flex-col justify-between">
            <div>
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl bg-slate-100 text-slate-900 border border-slate-200/80 flex items-center justify-center font-bold text-lg">
                    V
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Veatti Division
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Powerloom Dhoti Production & Warp Management
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("veatti")}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>Open Section</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 3 Core Metrics requested by user for Veatti */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
                {/* 1. Produced from Powerloom */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-center">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                    Loom Produced
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                    {veatti.totalProducedMeters.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    Total Produced (Pcs)
                  </span>
                </div>

                {/* 2. Available in Godown */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-center">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                    Godown Stock
                  </span>
                  <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
                    {veatti.godownAvailableMeters.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-amber-600 font-semibold">
                    Available in Godown (Pcs)
                  </span>
                </div>

                {/* 3. Handovered in Government */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-center">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                    Govt Handovered
                  </span>
                  <span className="text-2xl font-extrabold text-blue-600 mt-1 block">
                    {veatti.totalHandoveredMeters.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    Delivered to Govt (Pcs)
                  </span>
                </div>
              </div>

              {/* Target & Tally Bar */}
              <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-600">
                    Handover Progress ({veatti.targetMeters > 0 ? Math.round((veatti.totalHandoveredMeters / veatti.targetMeters) * 100) : 0}%)
                  </span>
                  <span className="text-slate-900 font-bold">
                    Target: {veatti.targetMeters.toLocaleString("en-IN")} Pcs
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1E2229] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, veatti.targetMeters > 0 ? (veatti.totalHandoveredMeters / veatti.targetMeters) * 100 : 0)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>Yet to Handover:</span>
                  <span className="font-extrabold text-rose-600">
                    {veatti.balanceToHandoverMeters.toLocaleString("en-IN")} Pcs
                  </span>
                </div>
              </div>

              {/* Paavu Status Counters */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Unloaded Paavu</span>
                  <span className="text-sm font-bold text-amber-600">
                    {veatti.unloadedPaavuCount} Nos
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Running in Loom</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {veatti.runningPaavuCount} Looms
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Completed Paavu</span>
                  <span className="text-sm font-bold text-slate-800">
                    {veatti.completedPaavuCount} Beams
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate("veatti")}
                className="w-full py-3 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2"
              >
                <span>Manage Veatti Powerloom & Paavu Registers</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* SAREE SECTION CARD */}
        {(activeFilter === "ALL" || activeFilter === "SAREE") && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6 flex flex-col justify-between">
            <div>
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl bg-slate-100 text-slate-900 border border-slate-200/80 flex items-center justify-center font-bold text-lg">
                    S
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Saree Division
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Powerloom Saree Production & Jacquard Tracking
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("saree")}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>Open Section</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 3 Core Metrics requested by user for Saree */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
                {/* 1. Produced from Powerloom */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-center">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                    Loom Produced
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                    {saree.totalProducedMeters.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    Total Produced (Pcs)
                  </span>
                </div>

                {/* 2. Available in Godown */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-center">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                    Godown Stock
                  </span>
                  <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
                    {saree.godownAvailableMeters.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-amber-600 font-semibold">
                    Available in Godown (Pcs)
                  </span>
                </div>

                {/* 3. Handovered in Government */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-center">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                    Govt Handovered
                  </span>
                  <span className="text-2xl font-extrabold text-blue-600 mt-1 block">
                    {saree.totalHandoveredMeters.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    Delivered to Govt (Pcs)
                  </span>
                </div>
              </div>

              {/* Target & Tally Bar */}
              <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-600">
                    Handover Progress ({saree.targetMeters > 0 ? Math.round((saree.totalHandoveredMeters / saree.targetMeters) * 100) : 0}%)
                  </span>
                  <span className="text-slate-900 font-bold">
                    Target: {saree.targetMeters.toLocaleString("en-IN")} Pcs
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1E2229] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, saree.targetMeters > 0 ? (saree.totalHandoveredMeters / saree.targetMeters) * 100 : 0)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>Yet to Handover:</span>
                  <span className="font-extrabold text-rose-600">
                    {saree.balanceToHandoverMeters.toLocaleString("en-IN")} Pcs
                  </span>
                </div>
              </div>

              {/* Paavu Status Counters */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Unloaded Paavu</span>
                  <span className="text-sm font-bold text-amber-600">
                    {saree.unloadedPaavuCount} Nos
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Running in Loom</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {saree.runningPaavuCount} Looms
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Completed Paavu</span>
                  <span className="text-sm font-bold text-slate-800">
                    {saree.completedPaavuCount} Beams
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate("saree")}
                className="w-full py-3 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2"
              >
                <span>Manage Saree Powerloom & Paavu Registers</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Live Unloaded Paavu Quick-Board */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-amber-500" />
              <span>Unloaded Paavu Waiting Pool</span>
            </h3>
            <p className="text-xs text-slate-500">
              Sized warp beams ready to be assigned and loaded into machine looms
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-xs font-semibold text-amber-800 self-start sm:self-auto">
            {data.unloadedPaavus.length} Paavu Ready to Load
          </span>
        </div>

        {data.unloadedPaavus.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No unloaded paavus in queue. All paavus are loaded onto running looms!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.unloadedPaavus.map((p: any) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 flex flex-col justify-between gap-3 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-extrabold text-slate-900 block">
                      {p.paavuNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {p.weaverName || "Society Loom Unit"}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      p.clothType === "VEATTI"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                        : "bg-purple-50 text-purple-700 border border-purple-200/70"
                    }`}
                  >
                    {p.clothType === "VEATTI" ? "Veatti" : "Saree"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500">Warp Length:</span>
                  <span className="font-bold text-slate-900">{p.paavuMeters} Meters</span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(p.clothType === "VEATTI" ? "veatti" : "saree")}
                  className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-800 transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>Load onto Machine Loom</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
