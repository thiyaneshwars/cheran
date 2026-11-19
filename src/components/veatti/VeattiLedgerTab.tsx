"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  RotateCw,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
} from "lucide-react";
import { formatINR, round2 } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

interface VeattiLedgerTabProps {
  units: any[];
  onSelectUnit: (unit: any) => void;
  onEditTransaction: (tx: any) => void;
  onDeleteTransaction: (tx: any) => void;
  onPrintStatement: (selectedUnit: any, filteredRows: any[]) => void;
}

export const VeattiLedgerTab: React.FC<VeattiLedgerTabProps> = ({
  units,
  onSelectUnit,
  onEditTransaction,
  onDeleteTransaction,
  onPrintStatement,
}) => {
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUnitId) params.append("unitId", selectedUnitId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedType && selectedType !== "ALL") params.append("type", selectedType);
      if (search) params.append("search", search);

      const res = await fetch(`/api/production/ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLedgerRows(data.ledgerRows || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to fetch accounting ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedUnitId, startDate, endDate, selectedType, search]);

  const handleExportCSV = () => {
    if (ledgerRows.length === 0) {
      alert("No ledger records to export.");
      return;
    }

    const exportData = ledgerRows.map((row) => ({
      Date: new Date(row.date).toLocaleDateString("en-IN"),
      "Veatti / Weaver": row.weaverName,
      Type: row.type,
      "Paavu KG": row.paavuKg ?? "—",
      Rate: row.rate ? `₹${row.rate}` : "—",
      "Varavu (₹)": row.varavuAmount ? row.varavuAmount : "—",
      "Production (Mtr)": row.productionMeters ? `${row.productionMeters}m` : "—",
      "Govt Handover (Mtr)": row.handoverMeters ? `${row.handoverMeters}m` : "—",
      "Advance (₹)": row.advanceAmount ? row.advanceAmount : "—",
      "Running Balance (₹)": row.runningBalance,
      Notes: row.notes || "—",
    }));

    const unitName = selectedUnitId
      ? units.find((u) => u.id === selectedUnitId)?.weaverName || "Veatti"
      : "All_Veattis";

    exportToCSV(`Veatti_Accounting_Ledger_${unitName}`, exportData);
  };

  const handleTriggerPrint = () => {
    const unit = selectedUnitId ? units.find((u) => u.id === selectedUnitId) : null;
    onPrintStatement(unit, ledgerRows);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner & Summary Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-slate-900 text-white">
                <FileText className="h-4 w-4" />
              </span>
              <span>Complete Veatti Production & Financial Register</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Digital replacement for handwritten register: Track Paavu, Production, Varavu, Handover, Advance & Running Balance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Export CSV / Excel</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print A4 Statement</span>
            </button>
            <button
              type="button"
              onClick={fetchLedger}
              title="Refresh Ledger"
              className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Financial Tally Ribbon (Section 5) */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Opening Balance</span>
              <span className="text-sm font-black text-slate-800">₹0.00</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-600 uppercase block">Total Credit (Varavu)</span>
              <span className="text-sm font-black text-emerald-700">
                {formatINR(summary.totalCredit || summary.totalVaravu)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-600 uppercase block">Total Debit (Advance)</span>
              <span className="text-sm font-black text-amber-700">
                {formatINR(summary.totalDebit || summary.totalAdvance)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
              <span className="text-[10px] font-bold text-blue-600 uppercase block">Loom Production</span>
              <span className="text-sm font-black text-blue-700">
                {(summary.totalProduction || 0).toLocaleString("en-IN")} Mtr
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border col-span-2 sm:col-span-1 ${
                summary.closingBalance >= 0
                  ? "bg-emerald-100/50 border-emerald-300 text-emerald-800"
                  : "bg-rose-100/50 border-rose-300 text-rose-800"
              }`}
            >
              <span className="text-[10px] font-bold uppercase block">
                {summary.closingBalance >= 0 ? "Closing Balance (Payable)" : "Excess Advance Issued"}
              </span>
              <span className="text-base font-black">
                {formatINR(Math.abs(summary.closingBalance))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          {/* Weaver Filter */}
          <div className="min-w-[180px]">
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-300"
            >
              <option value="">-- All Veattis --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.weaverName} (₹{u.individualRate}/{u.rateUnit || "KG"})
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-300"
            >
              <option value="ALL">All Entries</option>
              <option value="VARAVU">Varavu (Wages)</option>
              <option value="ADVANCE">Advance (Cash/Bank)</option>
              <option value="PRODUCTION">Loom Production</option>
              <option value="HANDOVER">Govt Handover</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none"
            />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search weaver..."
              className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-300"
            />
          </div>
        </div>

        {(selectedUnitId || startDate || endDate || selectedType !== "ALL" || search) && (
          <button
            type="button"
            onClick={() => {
              setSelectedUnitId("");
              setStartDate("");
              setEndDate("");
              setSelectedType("ALL");
              setSearch("");
            }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 whitespace-nowrap px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Accounting Ledger Table (Exact columns matching Image 2 reference) */}
      <div className="overflow-x-auto scrollbar-landscape pb-2 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs min-w-[1100px]">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-3 whitespace-nowrap">Date</th>
              <th className="py-3 px-3">Veatti / Weaver</th>
              <th className="py-3 px-3 text-right">Paavu KG</th>
              <th className="py-3 px-3 text-right">Rate</th>
              <th className="py-3 px-3 text-right bg-emerald-50/70 text-emerald-800">Varavu (Credit)</th>
              <th className="py-3 px-3 text-right">Production</th>
              <th className="py-3 px-3 text-right">Handover</th>
              <th className="py-3 px-3 text-right bg-amber-50/70 text-amber-800">Advance (Debit)</th>
              <th className="py-3 px-3 text-right bg-slate-100/70 text-slate-800">Running Balance</th>
              <th className="py-3 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RotateCw className="h-5 w-5 animate-spin text-emerald-600" />
                    <span className="font-semibold">Calculating real-time running balance ledger...</span>
                  </div>
                </td>
              </tr>
            ) : ledgerRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileText className="h-7 w-7 text-slate-300" />
                    <p className="font-semibold">No accounting transactions found for this period.</p>
                  </div>
                </td>
              </tr>
            ) : (
              ledgerRows.map((row) => {
                const isPayable = row.runningBalance >= 0;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition font-mono text-[11px]">
                    {/* Date */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-sans font-medium">
                      {new Date(row.date).toLocaleDateString("en-IN")}
                    </td>

                    {/* Weaver */}
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          const unit = units.find((u) => u.id === row.unitId);
                          if (unit) onSelectUnit(unit);
                        }}
                        className="hover:text-emerald-700 text-left transition"
                      >
                        {row.weaverName}
                      </button>
                    </td>

                    {/* Paavu KG */}
                    <td className="py-3 px-3 text-right font-bold text-slate-800">
                      {row.paavuKg !== undefined && row.paavuKg !== null ? `${row.paavuKg} kg` : "—"}
                    </td>

                    {/* Rate */}
                    <td className="py-3 px-3 text-right text-slate-700">
                      {row.rate ? `₹${row.rate}` : "—"}
                    </td>

                    {/* Varavu */}
                    <td className="py-3 px-3 text-right font-black text-emerald-700 bg-emerald-50/30">
                      {row.varavuAmount ? formatINR(row.varavuAmount) : "—"}
                    </td>

                    {/* Production */}
                    <td className="py-3 px-3 text-right text-slate-800">
                      {row.productionMeters ? `${row.productionMeters}m` : "—"}
                    </td>

                    {/* Handover */}
                    <td className="py-3 px-3 text-right text-blue-700">
                      {row.handoverMeters ? `${row.handoverMeters}m` : "—"}
                    </td>

                    {/* Advance */}
                    <td className="py-3 px-3 text-right font-black text-amber-700 bg-amber-50/30">
                      {row.advanceAmount ? formatINR(row.advanceAmount) : "—"}
                    </td>

                    {/* Running Balance */}
                    <td
                      className={`py-3 px-3 text-right font-black ${
                        isPayable ? "text-emerald-700 bg-emerald-50/50" : "text-rose-700 bg-rose-50/50"
                      }`}
                    >
                      {formatINR(row.runningBalance)}
                      <span className="text-[9px] block text-slate-400 font-sans font-normal">
                        {isPayable ? "Payable" : "Excess Adv"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-sans">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(row)}
                          title="Edit Transaction"
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(row)}
                          title="Delete Transaction"
                          className="p-1 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition"
                        >
                          <Trash2 className="h-3 w-3" />
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

