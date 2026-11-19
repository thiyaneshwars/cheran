"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Search,
  Plus,
  Edit2,
  Trash2,
  Landmark,
  Coins,
  Smartphone,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface VeattiAdvanceTabProps {
  advanceEntries: any[];
  units: any[];
  onAddAdvance: () => void;
  onEditAdvance: (entry: any) => void;
  onDeleteAdvance: (entry: any) => void;
}

export const VeattiAdvanceTab: React.FC<VeattiAdvanceTabProps> = ({
  advanceEntries,
  units,
  onAddAdvance,
  onEditAdvance,
  onDeleteAdvance,
}) => {
  const [search, setSearch] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const filteredEntries = advanceEntries.filter((a) => {
    const unitName = a.unit?.weaverName || "";
    const matchesSearch =
      unitName.toLowerCase().includes(search.toLowerCase()) ||
      (a.referenceNo && a.referenceNo.toLowerCase().includes(search.toLowerCase())) ||
      (a.description && a.description.toLowerCase().includes(search.toLowerCase()));
    const matchesUnit = selectedUnitId ? a.unitId === selectedUnitId : true;
    return matchesSearch && matchesUnit;
  });

  const totalAdvanceFiltered = filteredEntries.reduce((sum, a) => sum + (a.amount || 0), 0);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "BANK_TRANSFER":
        return <Landmark className="h-3 w-3 text-blue-600 inline mr-1" />;
      case "UPI":
        return <Smartphone className="h-3 w-3 text-purple-600 inline mr-1" />;
      default:
        return <Coins className="h-3 w-3 text-amber-600 inline mr-1" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner & Tally */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
              <CreditCard className="h-4 w-4" />
            </span>
            <span>Individual Veatti Advance Ledger</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Track all cash, bank transfer, and UPI advance disbursements given to each weaver.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Advance Paid</span>
            <span className="text-lg font-black text-amber-700">
              {formatINR(totalAdvanceFiltered)}
            </span>
          </div>

          <button
            type="button"
            onClick={onAddAdvance}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Advance</span>
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
              placeholder="Search weaver, voucher no, description..."
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
                {u.weaverName} (Adv: {formatINR(u.totalAdvancePaid)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advance Table */}
      <div className="overflow-x-auto scrollbar-landscape pb-2 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Veatti / Weaver Name</th>
              <th className="py-3 px-4">Advance Amount (₹)</th>
              <th className="py-3 px-4">Payment Mode</th>
              <th className="py-3 px-4">Voucher / Ref No</th>
              <th className="py-3 px-4">Description / Purpose</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <CreditCard className="h-7 w-7 text-slate-300" />
                    <p className="font-semibold">No advance transactions found.</p>
                    <button
                      type="button"
                      onClick={onAddAdvance}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold"
                    >
                      + Record First Advance
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEntries.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {new Date(a.advanceDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3 px-4 font-extrabold text-slate-900">
                    {a.unit?.weaverName || "—"}
                  </td>
                  <td className="py-3 px-4 font-black text-amber-600 text-sm">
                    {formatINR(a.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold inline-flex items-center">
                      {getModeIcon(a.paymentMode)}
                      {a.paymentMode || "CASH"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">
                    {a.referenceNo || "—"}
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-sm truncate">
                    {a.description || "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditAdvance(a)}
                        title="Edit Advance"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAdvance(a)}
                        title="Delete Advance"
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

