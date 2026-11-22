"use client";

import React, { useState } from "react";
import {
  Search,
  Eye,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  CreditCard,
  Factory,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface VeattiUnitsTabProps {
  units: any[];
  search: string;
  setSearch: (s: string) => void;
  onSelectUnit: (unit: any) => void;
  onEditUnit: (unit: any) => void;
  onDeleteUnit: (unit: any) => void;
  onAddProduction: (unit: any) => void;
  onAddVaravu: (unit: any) => void;
  onAddAdvance: (unit: any) => void;
  onDirectEntryClick: () => void;
}

export const VeattiUnitsTab: React.FC<VeattiUnitsTabProps> = ({
  units,
  search,
  setSearch,
  onSelectUnit,
  onEditUnit,
  onDeleteUnit,
  onAddProduction,
  onAddVaravu,
  onAddAdvance,
  onDirectEntryClick,
}) => {
  const filteredUnits = units.filter(
    (u) =>
      u.weaverName.toLowerCase().includes(search.toLowerCase()) ||
      (u.location && u.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search weaver or unit name, location..."
            className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 font-medium shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">
            Showing {filteredUnits.length} of {units.length} units
          </span>
          <button
            type="button"
            onClick={onDirectEntryClick}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Direct Entry / New Contract</span>
          </button>
        </div>
      </div>

      {/* Main Units Table */}
      <div className="overflow-x-auto scrollbar-landscape pb-2 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs min-w-[1000px]">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Powerloom Unit / Weaver</th>
              <th className="py-3 px-4">Paavu Given & Weight</th>
              <th className="py-3 px-4">Configured Rate</th>
              <th className="py-3 px-4">Loom Produced</th>
              <th className="py-3 px-4">In Godown</th>
              <th className="py-3 px-4">Govt Handover</th>
              <th className="py-3 px-4">Varavu (₹)</th>
              <th className="py-3 px-4">Advance (₹)</th>
              <th className="py-3 px-4">Net Balance</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredUnits.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Factory className="h-8 w-8 text-slate-300" />
                    <p className="font-semibold">No powerloom units found.</p>
                    <button
                      type="button"
                      onClick={onDirectEntryClick}
                      className="mt-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      + Direct Entry / Add Unit
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUnits.map((u) => {
                const progress =
                  u.targetMeters > 0 ? Math.round((u.handoveredMeters / u.targetMeters) * 100) : 0;
                const isPayable = u.currentBalance > 0;
                const isExcess = u.currentBalance < 0;

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 transition group"
                  >
                    {/* Weaver & Location */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectUnit(u)}
                        className="text-left font-extrabold text-slate-900 hover:text-emerald-700 transition block flex items-center gap-1.5"
                      >
                        <span>{u.weaverName}</span>
                      </button>
                      <span className="text-[11px] text-slate-400 block">{u.location || "Powerloom Shed"}</span>
                      {u.machineCount && (
                        <span className="text-[10px] text-slate-500 font-semibold mt-0.5 inline-block">
                          {u.machineCount} {u.machineCount === 1 ? "Loom" : "Looms"} • {u.babinCount || 0} Babins
                        </span>
                      )}
                    </td>

                    {/* Paavu Given */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <span>{u.paavuCount} Paavu</span>
                        <span className="text-slate-400 font-normal">({u.paavuWeightKg || 0} KG)</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {(u.paavuMeters || 0).toLocaleString("en-IN")} Pieces
                      </span>
                    </td>

                    {/* Rate */}
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 block">
                        ₹{u.individualRate || 0}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        per {u.rateUnit === "PER_METER" ? "Piece" : "KG"}
                      </span>
                    </td>

                    {/* Loom Produced */}
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      {(u.totalProducedMeters || 0).toLocaleString("en-IN")} pcs
                    </td>

                    {/* Godown */}
                    <td className="py-3.5 px-4 font-bold text-amber-600">
                      {(u.godownMeters || 0).toLocaleString("en-IN")} pcs
                    </td>

                    {/* Handover & Progress */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-blue-600 block">
                        {(u.handoveredMeters || 0).toLocaleString("en-IN")} pcs
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{progress}%</span>
                      </div>
                    </td>

                    {/* Varavu */}
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      {formatINR(u.totalVaravuAmount || 0)}
                    </td>

                    {/* Advance */}
                    <td className="py-3.5 px-4 font-bold text-amber-600">
                      {formatINR(u.totalAdvancePaid || 0)}
                    </td>

                    {/* Net Balance Status */}
                    <td className="py-3.5 px-4">
                      {isPayable ? (
                        <div className="inline-flex flex-col items-start">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PAYABLE
                          </span>
                          <span className="font-extrabold text-emerald-700 text-xs mt-0.5">
                            {formatINR(u.currentBalance)}
                          </span>
                        </div>
                      ) : isExcess ? (
                        <div className="inline-flex flex-col items-start">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            EXCESS ADVANCE
                          </span>
                          <span className="font-extrabold text-rose-700 text-xs mt-0.5">
                            {formatINR(Math.abs(u.currentBalance))}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                          BALANCED
                        </span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Individual Ledger */}
                        <button
                          type="button"
                          onClick={() => onSelectUnit(u)}
                          title="Open Individual Powerloom Ledger & Accounts"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Add Daily Production */}
                        <button
                          type="button"
                          onClick={() => onAddProduction(u)}
                          title="Add Daily Production Entry"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition"
                        >
                          <Factory className="h-3.5 w-3.5" />
                        </button>

                        {/* Add Varavu */}
                        <button
                          type="button"
                          onClick={() => onAddVaravu(u)}
                          title="Add Varavu (Wages/Credit)"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                        </button>

                        {/* Add Advance */}
                        <button
                          type="button"
                          onClick={() => onAddAdvance(u)}
                          title="Add Advance Payment"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 transition"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit Unit */}
                        <button
                          type="button"
                          onClick={() => onEditUnit(u)}
                          title="Edit Contract & Info"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Unit */}
                        <button
                          type="button"
                          onClick={() => onDeleteUnit(u)}
                          title="Delete Unit"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

