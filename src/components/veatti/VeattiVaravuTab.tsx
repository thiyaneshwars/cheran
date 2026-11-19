"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface VeattiVaravuTabProps {
  varavuEntries: any[];
  units: any[];
  onAddVaravu: () => void;
  onEditVaravu: (entry: any) => void;
  onDeleteVaravu: (entry: any) => void;
}

export const VeattiVaravuTab: React.FC<VeattiVaravuTabProps> = ({
  varavuEntries,
  units,
  onAddVaravu,
  onEditVaravu,
  onDeleteVaravu,
}) => {
  const [search, setSearch] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const filteredEntries = varavuEntries.filter((v) => {
    const unitName = v.unit?.weaverName || "";
    const matchesSearch =
      unitName.toLowerCase().includes(search.toLowerCase()) ||
      (v.referenceNo && v.referenceNo.toLowerCase().includes(search.toLowerCase())) ||
      (v.remarks && v.remarks.toLowerCase().includes(search.toLowerCase()));
    const matchesUnit = selectedUnitId ? v.unitId === selectedUnitId : true;
    return matchesSearch && matchesUnit;
  });

  const totalVaravuFiltered = filteredEntries.reduce((sum, v) => sum + (v.amount || 0), 0);
  const totalKgFiltered = filteredEntries.reduce((sum, v) => sum + (v.paavuKg || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header Banner & Tally Bar */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span>Individual Veatti Varavu Ledger</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Varavu Amount = Paavu KG × Configured Individual Rate. Every weaver has their independent rate.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Varavu Amount</span>
            <span className="text-lg font-black text-emerald-700">
              {formatINR(totalVaravuFiltered)}
            </span>
            <span className="text-[10px] text-slate-500 block font-semibold">({totalKgFiltered} KG allocated)</span>
          </div>

          <button
            type="button"
            onClick={onAddVaravu}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Varavu</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search weaver, ref number, remarks..."
              className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-300"
            />
          </div>

          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-300 font-semibold"
          >
            <option value="">-- All Veatti Units --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.weaverName} (₹{u.individualRate}/{u.rateUnit || "KG"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Varavu Table */}
      <div className="overflow-x-auto scrollbar-landscape pb-2 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Veatti / Weaver Name</th>
              <th className="py-3 px-4">Varavu Type</th>
              <th className="py-3 px-4">Paavu KG / Quantity</th>
              <th className="py-3 px-4">Applicable Rate</th>
              <th className="py-3 px-4">Calculated Amount (₹)</th>
              <th className="py-3 px-4">Payment Mode</th>
              <th className="py-3 px-4">Ref / Remarks</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <TrendingUp className="h-7 w-7 text-slate-300" />
                    <p className="font-semibold">No Varavu transactions found.</p>
                    <button
                      type="button"
                      onClick={onAddVaravu}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      + Record First Varavu
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEntries.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {new Date(v.transactionDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3 px-4 font-extrabold text-slate-900">
                    {v.unit?.weaverName || "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {v.varavuType?.replace(/_/g, " ") || "PAAVU PRODUCTION"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {v.paavuKg} KG
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    ₹{v.rate} / {v.rateUnit === "PER_METER" ? "Mtr" : "KG"}
                  </td>
                  <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                    {formatINR(v.amount)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {v.paymentMode || "CASH"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                    {v.referenceNo && (
                      <span className="font-bold text-slate-700 mr-1.5">
                        #{v.referenceNo}
                      </span>
                    )}
                    {v.remarks || "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditVaravu(v)}
                        title="Edit Varavu"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVaravu(v)}
                        title="Delete Varavu"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
  );
};

