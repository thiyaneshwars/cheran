"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Factory,
  PackageCheck,
  TrendingUp,
  CreditCard,
  Layers,
  Send,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  RotateCw,
  Wallet,
  Scale,
  Printer,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { formatINR, round2 } from "@/lib/decimal";

interface VeattiUnitDetailModalProps {
  unit: any;
  onClose: () => void;
  onRefresh: () => void;
  onOpenAddPaavu: (unit: any) => void;
  onOpenAddProduction: (unit: any) => void;
  onOpenAddVaravu: (unit: any) => void;
  onOpenAddAdvance: (unit: any) => void;
  onEditUnitInfo: (unit: any) => void;
  onEditPaavu: (paavu: any) => void;
  onDeletePaavu: (paavu: any) => void;
  onEditProduction: (prod: any) => void;
  onDeleteProduction: (prod: any) => void;
  onEditVaravu: (varavu: any) => void;
  onDeleteVaravu: (varavu: any) => void;
  onEditAdvance: (adv: any) => void;
  onDeleteAdvance: (adv: any) => void;
  onConfigureRate: (unit: any) => void;
}

export const VeattiUnitDetailModal: React.FC<VeattiUnitDetailModalProps> = ({
  unit,
  onClose,
  onRefresh,
  onOpenAddPaavu,
  onOpenAddProduction,
  onOpenAddVaravu,
  onOpenAddAdvance,
  onEditUnitInfo,
  onEditPaavu,
  onDeletePaavu,
  onEditProduction,
  onDeleteProduction,
  onEditVaravu,
  onDeleteVaravu,
  onEditAdvance,
  onDeleteAdvance,
  onConfigureRate,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "paavus" | "production" | "varavu" | "advance" | "rates"
  >("overview");
  const [unitData, setUnitData] = useState<any>(unit);
  const [loading, setLoading] = useState(false);

  const fetchUnitDetails = async () => {
    if (!unit?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/production/units/${unit.id}`);
      if (res.ok) {
        const data = await res.json();
        setUnitData(data);
      }
    } catch (err) {
      console.error("Failed to load unit details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnitDetails();
  }, [unit?.id]);

  if (!unitData) return null;

  const isPayable = unitData.currentBalance > 0;
  const isExcess = unitData.currentBalance < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white font-black text-lg">
              {unitData.weaverName.slice(0, 1)}
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {unitData.weaverName}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {unitData.location || "Shed"} • {unitData.machineCount || 1} Looms • Rate: ₹
                {unitData.individualRate}/{unitData.rateUnit || "KG"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchUnitDetails}
              title="Refresh Unit Details"
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Financial & Production Summary Cards */}
        <div className="px-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Production */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50">
            <div className="flex justify-between items-center text-slate-500 text-[11px] font-bold">
              <span>LOOM PRODUCTION</span>
              <Factory className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-black text-slate-900">
                {(unitData.totalProducedMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="text-xs text-emerald-600 font-bold">m</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Godown: {(unitData.godownMeters || 0).toLocaleString("en-IN")}m
            </span>
          </div>

          {/* Card 2: Varavu Earned */}
          <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
            <div className="flex justify-between items-center text-emerald-700 text-[11px] font-bold">
              <span>VARAVU EARNED</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-black text-emerald-700">
                {formatINR(unitData.totalVaravuAmount || 0)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {unitData.paavuWeightKg || 0} KG @ ₹{unitData.individualRate}
            </span>
          </div>

          {/* Card 3: Advance Paid */}
          <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
            <div className="flex justify-between items-center text-amber-700 text-[11px] font-bold">
              <span>ADVANCE PAID</span>
              <CreditCard className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-black text-amber-700">
                {formatINR(unitData.totalAdvancePaid || 0)}
              </span>
            </div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
              Initial: {formatINR(unitData.initialAdvance || 0)}
            </span>
          </div>

          {/* Card 4: Net Balance */}
          <div
            className={`p-3.5 rounded-2xl border ${
              isPayable
                ? "border-emerald-300 bg-emerald-100/50 text-emerald-800"
                : isExcess
                ? "border-rose-300 bg-rose-100/50 text-rose-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span>{isPayable ? "AMOUNT PAYABLE" : isExcess ? "EXCESS ADVANCE" : "BALANCED"}</span>
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-black">
                {formatINR(Math.abs(unitData.currentBalance || 0))}
              </span>
            </div>
            <span className="text-[10px] font-semibold block mt-0.5">
              {isPayable ? "Weaver payout due" : isExcess ? "Excess held by weaver" : "Fully settled"}
            </span>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-1 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab("overview")}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === "overview"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Basic Info & Contracts
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("paavus")}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === "paavus"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Paavu Allocations ({unitData.paavus?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("production")}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === "production"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Daily Loom Production ({unitData.dailyProductions?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("varavu")}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === "varavu"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Varavu Entries ({unitData.varavuEntries?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("advance")}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === "advance"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Advance Entries ({unitData.advanceEntries?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("rates")}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === "rates"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Rate History ({unitData.rateHistories?.length || 0})
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 text-xs">
          {/* TAB 1: OVERVIEW & BASIC INFO */}
          {activeSubTab === "overview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Contract Details & Parameters</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onConfigureRate(unitData)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Configure Rate (₹{unitData.individualRate})
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditUnitInfo(unitData)}
                    className="px-3 py-1.5 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-bold"
                  >
                    Edit Basic Info
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Entry Date:</span>
                  <span className="font-bold text-slate-800">
                    {unitData.entryDate
                      ? new Date(unitData.entryDate).toLocaleDateString("en-IN")
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Weaver / Unit:</span>
                  <span className="font-bold text-slate-800">{unitData.weaverName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Location / Shed:</span>
                  <span className="font-bold text-slate-800">{unitData.location || "Society Loom Shed"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">No. of Paavu Given:</span>
                  <span className="font-bold text-slate-800">{unitData.paavuCount} Paavu</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Total Paavu Meters:</span>
                  <span className="font-bold text-slate-800">{(unitData.paavuMeters || 0).toLocaleString("en-IN")} m</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Paavu Weight (KG):</span>
                  <span className="font-bold text-slate-800">{unitData.paavuWeightKg || 0} KG</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Individual Veatti Rate:</span>
                  <span className="font-extrabold text-emerald-700">
                    ₹{unitData.individualRate || 0} / {unitData.rateUnit || "KG"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Conversion Rule:</span>
                  <span className="font-bold text-slate-800">{unitData.conversionRatio || 12} Meters/KG</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Weft Multiplier:</span>
                  <span className="font-extrabold text-sky-800 font-mono">
                    {unitData.weftMultiplier || (unitData.clothType === "SAREE" ? 0.182 : 0.119)} kg/m
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Opening Weft Left:</span>
                  <span className="font-extrabold text-sky-800 font-mono">
                    {unitData.initialWeftKg || 0} KG
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Machine / Loom Count:</span>
                  <span className="font-bold text-slate-800">{unitData.machineCount || 1} Machines</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Babin Count:</span>
                  <span className="font-bold text-slate-800">{unitData.babinCount || 0} Babins</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Target Handover Meters:</span>
                  <span className="font-bold text-slate-800">{(unitData.targetMeters || 0).toLocaleString("en-IN")} m</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Target Handover Date:</span>
                  <span className="font-bold text-slate-800">
                    {unitData.targetDate ? new Date(unitData.targetDate).toLocaleDateString("en-IN") : "—"}
                  </span>
                </div>
              </div>

              {unitData.notes && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">Notes:</span>
                  <p className="text-slate-700 font-medium">{unitData.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAAVU ALLOCATIONS */}
          {activeSubTab === "paavus" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Allocated Paavu Records ({unitData.paavus?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAddPaavu(unitData)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold"
                >
                  + Add Paavu
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Paavu Number</th>
                      <th className="py-2.5 px-3">Weight (KG)</th>
                      <th className="py-2.5 px-3">Allocated Meters</th>
                      <th className="py-2.5 px-3">Produced</th>
                      <th className="py-2.5 px-3">Remaining</th>
                      <th className="py-2.5 px-3">Machine No</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!unitData.paavus || unitData.paavus.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          No paavu records assigned yet.
                        </td>
                      </tr>
                    ) : (
                      unitData.paavus.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{p.paavuNumber}</td>
                          <td className="py-2.5 px-3 font-semibold">{p.paavuWeightKg || 0} kg</td>
                          <td className="py-2.5 px-3 font-bold">{p.paavuMeters} m</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600">
                            {p.actualProducedMeters || 0} m
                          </td>
                          <td className="py-2.5 px-3 font-bold text-rose-600">
                            {p.remainingMeters !== undefined ? p.remainingMeters : Math.max(0, p.paavuMeters - (p.actualProducedMeters || 0))} m
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{p.machineNumber || "Unloaded"}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === "COMPLETED"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : p.status === "RUNNING"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditPaavu(p)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePaavu(p)}
                                className="p-1 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DAILY LOOM PRODUCTION */}
          {activeSubTab === "production" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Daily Loom Production Logs ({unitData.dailyProductions?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAddProduction(unitData)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  + Record Loom Production
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Paavu Ref</th>
                      <th className="py-2.5 px-3">Daily Meters</th>
                      <th className="py-2.5 px-3">Wastage / Adj</th>
                      <th className="py-2.5 px-3 font-bold text-emerald-700">Net Production</th>
                      <th className="py-2.5 px-3">Remarks</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!unitData.dailyProductions || unitData.dailyProductions.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          No daily production entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      unitData.dailyProductions.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            {new Date(p.productionDate).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {p.paavuRef || p.paavu?.paavuNumber || "Loom Batch"}
                          </td>
                          <td className="py-2.5 px-3 font-bold">{p.dailyMeters} m</td>
                          <td className="py-2.5 px-3 text-rose-600 font-semibold">{p.wastageMeters} m</td>
                          <td className="py-2.5 px-3 font-black text-emerald-700">{p.netProduction} m</td>
                          <td className="py-2.5 px-3 text-slate-500">{p.remarks || "—"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditProduction(p)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteProduction(p)}
                                className="p-1 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: VARAVU ENTRIES */}
          {activeSubTab === "varavu" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Varavu Transactions ({unitData.varavuEntries?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAddVaravu(unitData)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  + Add Varavu
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Paavu KG</th>
                      <th className="py-2.5 px-3">Rate</th>
                      <th className="py-2.5 px-3 font-bold text-emerald-700">Varavu Amount</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Remarks</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!unitData.varavuEntries || unitData.varavuEntries.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          No Varavu entries recorded for this Veatti.
                        </td>
                      </tr>
                    ) : (
                      unitData.varavuEntries.map((v: any) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-600">
                            {new Date(v.transactionDate).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 font-bold">{v.varavuType?.replace(/_/g, " ")}</td>
                          <td className="py-2.5 px-3 font-bold">{v.paavuKg} KG</td>
                          <td className="py-2.5 px-3 font-semibold">₹{v.rate}</td>
                          <td className="py-2.5 px-3 font-black text-emerald-700">{formatINR(v.amount)}</td>
                          <td className="py-2.5 px-3 text-slate-600">{v.paymentMode}</td>
                          <td className="py-2.5 px-3 text-slate-500">{v.remarks || "—"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditVaravu(v)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteVaravu(v)}
                                className="p-1 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ADVANCE ENTRIES */}
          {activeSubTab === "advance" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Advance Payments Given ({unitData.advanceEntries?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAddAdvance(unitData)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold"
                >
                  + Add Advance
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 font-bold text-amber-700">Advance Amount</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Ref No</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!unitData.advanceEntries || unitData.advanceEntries.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No advance entries recorded for this Veatti.
                        </td>
                      </tr>
                    ) : (
                      unitData.advanceEntries.map((a: any) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-600">
                            {new Date(a.advanceDate).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 font-black text-amber-700">{formatINR(a.amount)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{a.paymentMode}</td>
                          <td className="py-2.5 px-3 font-mono">{a.referenceNo || "—"}</td>
                          <td className="py-2.5 px-3 text-slate-500">{a.description || "—"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditAdvance(a)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAdvance(a)}
                                className="p-1 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: RATE HISTORY */}
          {activeSubTab === "rates" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">
                    Individual Rate History ({unitData.rateHistories?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Current Active Rate: ₹{unitData.individualRate} per {unitData.rateUnit || "KG"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onConfigureRate(unitData)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold"
                >
                  Configure New Rate
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Effective Date</th>
                      <th className="py-2.5 px-3">Applicable Rate</th>
                      <th className="py-2.5 px-3">Previous Rate</th>
                      <th className="py-2.5 px-3">Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!unitData.rateHistories || unitData.rateHistories.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Initial rate: ₹{unitData.individualRate} per {unitData.rateUnit || "KG"}
                        </td>
                      </tr>
                    ) : (
                      unitData.rateHistories.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-600">
                            {new Date(r.effectiveDate).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-emerald-700">
                            ₹{r.rate} / {r.rateUnit || "KG"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {r.previousRate !== null ? `₹${r.previousRate}` : "Initial"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{r.notes || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

