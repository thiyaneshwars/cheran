"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Download,
  CheckCircle2,
  Clock,
  Wallet,
  AlertCircle,
  HelpCircle,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  TrendingUp,
  Coins,
  Building2,
  DollarSign,
  Filter,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

interface DailyWageViewProps {
  banks: any[];
  workers: any[];
  userRole: string;
}

export const DailyWageView: React.FC<DailyWageViewProps> = ({
  banks,
  workers,
  userRole,
}) => {
  const [wages, setWages] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalGross: 0,
    totalCredited: 0,
    amountSettled: 0,
    amountOutstanding: 0,
    babinWagesTotal: 0,
    othersWagesTotal: 0,
    totalBabinRuns: 0,
    totalBabinDistributed: 0,
    totalDailyProfit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [wageTypeFilter, setWageTypeFilter] = useState<"ALL" | "BABIN" | "OTHERS">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Liquid Cash Balance
  const [liquidCashBalance, setLiquidCashBalance] = useState<number>(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeWage, setActiveWage] = useState<any>(null);

  // Form State for Recording New Wage: exactly two main options (BABIN vs OTHERS)
  const [entryType, setEntryType] = useState<"BABIN" | "OTHERS">("BABIN");
  const [formData, setFormData] = useState({
    workDate: new Date().toISOString().split("T")[0],
    // Babin fields
    babinRuns: "" as string | number,
    babinDistributed: "" as string | number,
    dailyProfit: "" as string | number,
    // Others fields
    workDescription: "",
    // Common fields
    amount: "" as string | number,
    paymentMethod: "LIQUID_CASH" as "BANK_TRANSFER" | "LIQUID_CASH",
    bankAccountId: "",
    notes: "",
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    id: "",
    wageType: "BABIN" as "BABIN" | "OTHERS",
    workDate: new Date().toISOString().split("T")[0],
    babinRuns: "" as string | number,
    babinDistributed: "" as string | number,
    dailyProfit: "" as string | number,
    workDescription: "",
    amount: "" as string | number,
    paymentMethod: "LIQUID_CASH" as "BANK_TRANSFER" | "LIQUID_CASH",
    bankAccountId: "",
    notes: "",
  });

  // Fetch Liquid Cash Balance
  const fetchLiquidCash = async () => {
    try {
      const res = await fetch("/api/liquid-cash");
      if (res.ok) {
        const json = await res.json();
        setLiquidCashBalance(json.stats?.currentBalance ?? json.account?.currentBalance ?? 0);
      }
    } catch (err) {
      console.error("Failed to load liquid cash balance:", err);
    }
  };

  // Fetch Wage Records
  const fetchWages = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/sections/daily-wage", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (wageTypeFilter !== "ALL") url.searchParams.set("wageType", wageTypeFilter);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);

      const res = await fetch(url.toString());
      const data = await res.json();
      setWages(data.wages || []);
      setSummary(
        data.summary || {
          totalGross: 0,
          totalCredited: 0,
          amountSettled: 0,
          amountOutstanding: 0,
          babinWagesTotal: 0,
          othersWagesTotal: 0,
          totalBabinRuns: 0,
          totalBabinDistributed: 0,
          totalDailyProfit: 0,
        }
      );
    } catch (err: any) {
      console.error("Failed to fetch daily wage records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidCash();
  }, []);

  useEffect(() => {
    fetchWages();
  }, [search, wageTypeFilter, startDate, endDate]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEntryType("BABIN");
    setFormData({
      workDate: new Date().toISOString().split("T")[0],
      babinRuns: "",
      babinDistributed: "",
      dailyProfit: "",
      workDescription: "",
      amount: "",
      paymentMethod: liquidCashBalance > 0 ? "LIQUID_CASH" : "BANK_TRANSFER",
      bankAccountId: banks[0]?.id || "",
      notes: "",
    });
    fetchLiquidCash();
    setShowCreateModal(true);
  };

  // Submit Create Wage
  const handleCreateWage = async (e: React.FormEvent) => {
    e.preventDefault();
    const wageAmount = parseFloat(formData.amount.toString()) || 0;
    if (wageAmount <= 0) {
      alert("Please enter a valid wage amount greater than 0.");
      return;
    }

    if (formData.paymentMethod === "LIQUID_CASH" && wageAmount > liquidCashBalance) {
      alert(`Insufficient Liquid Cash balance (${formatINR(liquidCashBalance)}). Please choose a bank account or reduce the payment amount.`);
      return;
    }

    if (formData.paymentMethod === "BANK_TRANSFER" && !formData.bankAccountId) {
      alert("Please select a bank account to disburse the wage payment.");
      return;
    }

    try {
      const payload: any = {
        wageType: entryType,
        workDate: formData.workDate,
        amount: wageAmount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.paymentMethod === "BANK_TRANSFER" ? formData.bankAccountId : null,
        notes: formData.notes || undefined,
      };

      if (entryType === "BABIN") {
        payload.babinRuns = parseFloat(formData.babinRuns.toString()) || 0;
        payload.babinDistributed = parseFloat(formData.babinDistributed.toString()) || 0;
        if (formData.dailyProfit !== "" && formData.dailyProfit !== null && formData.dailyProfit !== undefined) {
          payload.dailyProfit = parseFloat(formData.dailyProfit.toString());
        }
      } else {
        payload.workDescription = formData.workDescription || "Others Daily Wage";
      }

      const res = await fetch("/api/sections/daily-wage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record wage");

      alert(`${entryType === "BABIN" ? "Babin" : "Others"} daily wage record saved successfully.`);
      setShowCreateModal(false);
      fetchWages();
      fetchLiquidCash();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open View Modal
  const handleOpenViewModal = (wage: any) => {
    setActiveWage(wage);
    setShowViewModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (wage: any) => {
    setActiveWage(wage);
    setEditFormData({
      id: wage.id,
      wageType: (wage.wageType as "BABIN" | "OTHERS") || "OTHERS",
      workDate: wage.workDate ? wage.workDate.split("T")[0] : new Date().toISOString().split("T")[0],
      babinRuns: wage.babinRuns ?? "",
      babinDistributed: wage.babinDistributed ?? "",
      dailyProfit: wage.dailyProfit ?? "",
      workDescription: wage.workDescription || "",
      amount: wage.amountPaid || wage.grossWages || "",
      paymentMethod: (wage.paymentMethod as "BANK_TRANSFER" | "LIQUID_CASH") || "LIQUID_CASH",
      bankAccountId: wage.bankAccountId || (banks[0]?.id || ""),
      notes: wage.notes || "",
    });
    fetchLiquidCash();
    setShowEditModal(true);
  };

  // Submit Edit Wage
  const handleEditWage = async (e: React.FormEvent) => {
    e.preventDefault();
    const wageAmount = parseFloat(editFormData.amount.toString()) || 0;
    if (wageAmount <= 0) {
      alert("Please enter a valid wage amount greater than 0.");
      return;
    }

    try {
      const payload: any = {
        wageType: editFormData.wageType,
        workDate: editFormData.workDate,
        amount: wageAmount,
        paymentMethod: editFormData.paymentMethod,
        bankAccountId: editFormData.paymentMethod === "BANK_TRANSFER" ? editFormData.bankAccountId : null,
        notes: editFormData.notes || undefined,
      };

      if (editFormData.wageType === "BABIN") {
        payload.babinRuns = parseFloat(editFormData.babinRuns.toString()) || 0;
        payload.babinDistributed = parseFloat(editFormData.babinDistributed.toString()) || 0;
        if (editFormData.dailyProfit !== "" && editFormData.dailyProfit !== null && editFormData.dailyProfit !== undefined) {
          payload.dailyProfit = parseFloat(editFormData.dailyProfit.toString());
        }
      } else {
        payload.workDescription = editFormData.workDescription || "Others Daily Wage";
      }

      const res = await fetch(`/api/sections/daily-wage/${editFormData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update wage record");

      alert("Daily wage record updated successfully.");
      setShowEditModal(false);
      fetchWages();
      fetchLiquidCash();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Wage (Admin Only)
  const handleDeleteWage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this wage entry? The associated cash or bank outflow will be reversed.")) {
      return;
    }

    try {
      const res = await fetch(`/api/sections/daily-wage/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete wage record");
      alert("Wage entry deleted and financial balances reversed.");
      fetchWages();
      fetchLiquidCash();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* 1. Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E9E3]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#26332F] tracking-tight">
            Daily Wage Register
          </h1>
          <p className="text-[14px] text-[#68756F] mt-0.5">
            Babin and general daily wages • Outgoing labor expense ledger with cash & bank integration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCSV("Daily_Wage_Register", wages)}
            className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-white hover:bg-[#F7F8F5] px-4 py-2.5 text-[14px] font-semibold text-[#26332F] shadow-xs transition"
          >
            <Download className="h-4 w-4 text-[#68756F]" />
            <span>Export CSV</span>
          </button>
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-[14px] font-semibold text-white shadow-xs transition active:scale-98"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Record Daily Wage</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Performance Indicators (KPI Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Total Wages Given */}
        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#26332F] block">Total Wages Paid</span>
            <Wallet className="h-5 w-5 text-[#245B52]" />
          </div>
          <span className="text-[12px] text-[#68756F] block">Total Daily Wage Expenses</span>
          <div className="text-3xl font-bold text-[#26332F] font-financial pt-1">
            {formatINR(summary.amountSettled || summary.totalGross || 0)}
          </div>
          <p className="text-[12px] text-[#68756F]">
            Across {wages.length} recorded entries
          </p>
        </div>

        {/* Babin Wages Total */}
        <div className="rounded-2xl border border-[#C8E5D5] bg-[#EBF5F0]/60 p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#246944] block">Babin Wages</span>
            <Layers className="h-5 w-5 text-[#246944]" />
          </div>
          <span className="text-[12px] text-[#246944]/80 block">Runs & Distribution Wages</span>
          <div className="text-3xl font-bold text-[#246944] font-financial pt-1">
            {formatINR(summary.babinWagesTotal || 0)}
          </div>
          <p className="text-[12px] text-[#246944]/90 flex items-center gap-1 font-medium">
            <span>Runs: {summary.totalBabinRuns}</span> • <span>Dist: {summary.totalBabinDistributed}</span>
          </p>
        </div>

        {/* Others Wages Total */}
        <div className="rounded-2xl border border-[#DCEAE2] bg-[#F0F6F3]/60 p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#245B52] block">Others Wages</span>
            <Users className="h-5 w-5 text-[#245B52]" />
          </div>
          <span className="text-[12px] text-[#245B52]/80 block">Manual & General Wages</span>
          <div className="text-3xl font-bold text-[#245B52] font-financial pt-1">
            {formatINR(summary.othersWagesTotal || 0)}
          </div>
          <p className="text-[12px] text-[#68756F]">
            General labor & operational shifts
          </p>
        </div>

        {/* Daily Profit Metric (Optional Babin Metric tracked separately) */}
        <div className="rounded-2xl border border-[#F7E4BE] bg-[#FEF8EC]/60 p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#975A16] block">Babin Profit Per Day</span>
            <TrendingUp className="h-5 w-5 text-[#975A16]" />
          </div>
          <span className="text-[12px] text-[#975A16]/80 block">Tracked Separately</span>
          <div className="text-3xl font-bold text-[#975A16] font-financial pt-1">
            {formatINR(summary.totalDailyProfit || 0)}
          </div>
          <p className="text-[11px] text-[#975A16]/90 font-medium">
            * Recorded separately; not added to cash/bank
          </p>
        </div>
      </div>

      {/* 3. Action Bar, Wage Type Filter Tabs & Date Filters */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Wage Type Tabs (BABIN vs OTHERS vs ALL) */}
          <div className="inline-flex rounded-xl bg-[#F0F4EF] p-1 border border-[#D8E2D5]">
            <button
              onClick={() => setWageTypeFilter("ALL")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                wageTypeFilter === "ALL"
                  ? "bg-white text-[#245B52] shadow-xs"
                  : "text-[#68756F] hover:text-[#26332F]"
              }`}
            >
              All Wages ({wages.length})
            </button>
            <button
              onClick={() => setWageTypeFilter("BABIN")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                wageTypeFilter === "BABIN"
                  ? "bg-[#245B52] text-white shadow-xs"
                  : "text-[#68756F] hover:text-[#26332F]"
              }`}
            >
              🧵 Babin
            </button>
            <button
              onClick={() => setWageTypeFilter("OTHERS")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                wageTypeFilter === "OTHERS"
                  ? "bg-[#245B52] text-white shadow-xs"
                  : "text-[#68756F] hover:text-[#26332F]"
              }`}
            >
              💼 Others
            </button>
          </div>

          {/* Liquid Cash Quick Pill */}
          <div className="flex items-center gap-2 rounded-xl bg-[#F0F6F3] border border-[#C8E5D5] px-3.5 py-2 text-xs text-[#245B52]">
            <Coins className="h-4 w-4 text-[#245B52]" />
            <span>Liquid Cash Balance:</span>
            <strong className="font-financial font-bold text-sm">{formatINR(liquidCashBalance)}</strong>
          </div>
        </div>

        {/* Search & Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[#E5E9E3]">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#68756F]" />
            <input
              type="text"
              placeholder="Search description, particulars, remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] pl-10 pr-3.5 py-2.5 text-xs text-[#26332F] outline-none focus:border-[#245B52] focus:bg-white font-medium"
            />
          </div>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] px-3 py-2 text-xs text-[#26332F] outline-none focus:border-[#245B52]"
              placeholder="From Date"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] px-3 py-2 text-xs text-[#26332F] outline-none focus:border-[#245B52]"
              placeholder="To Date"
            />
            {(startDate || endDate || search) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSearch("");
                }}
                className="rounded-xl border border-[#E5E9E3] px-3 py-2 text-xs font-semibold text-[#68756F] hover:bg-[#F7F8F5] whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Daily Wages Data Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E9E3] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E9E3] bg-[#F7F8F5] text-[#26332F] font-semibold text-[13px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Particulars / Details</th>
                <th className="py-3.5 px-4 text-center">Babin Runs</th>
                <th className="py-3.5 px-4 text-center">Distributed</th>
                <th className="py-3.5 px-4 text-right">Profit / Day</th>
                <th className="py-3.5 px-4 text-right font-bold text-[#245B52]">Wages Paid (₹)</th>
                <th className="py-3.5 px-4 text-center">Payment Method</th>
                <th className="py-3.5 px-4">Remarks</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#68756F]">
                    Loading daily wage entries...
                  </td>
                </tr>
              ) : wages.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#68756F]">
                    No {wageTypeFilter === "ALL" ? "" : wageTypeFilter} wage records found. Click &quot;Record Daily Wage&quot; to add one.
                  </td>
                </tr>
              ) : (
                wages.map((w) => (
                  <tr key={w.id} className="hover:bg-[#F7F8F5] transition">
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#68756F] font-medium text-xs">
                      {new Date(w.workDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          w.wageType === "BABIN"
                            ? "bg-[#E6F4EA] text-[#1E7E34] border border-[#C3E6CB]"
                            : "bg-[#E8F0FE] text-[#1967D2] border border-[#C2D7FA]"
                        }`}
                      >
                        {w.wageType === "BABIN" ? "🧵 Babin" : "💼 Others"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#26332F]">
                      {w.workDescription || (w.wageType === "BABIN" ? "Babin Daily Wage" : "Others Daily Wage")}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">
                      {w.wageType === "BABIN" && (w.babinRuns ?? 0) > 0 ? (
                        <span className="rounded bg-[#F0F4EF] px-2 py-0.5 font-bold text-[#245B52]">
                          {w.babinRuns} runs
                        </span>
                      ) : (
                        <span className="text-[#68756F]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">
                      {w.wageType === "BABIN" && (w.babinDistributed ?? 0) > 0 ? (
                        <span className="rounded bg-[#F0F4EF] px-2 py-0.5 font-bold text-[#245B52]">
                          {w.babinDistributed} dist
                        </span>
                      ) : (
                        <span className="text-[#68756F]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-financial text-[#975A16] font-semibold">
                      {w.dailyProfit !== null && w.dailyProfit !== undefined ? formatINR(w.dailyProfit) : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#245B52] font-financial text-[15px]">
                      {formatINR(w.amountPaid || w.grossWages)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {w.paymentMethod === "LIQUID_CASH" ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#EBF5F0] text-[#246944] border border-[#C8E5D5]">
                          💵 Liquid Cash
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#F0F4EF] text-[#245B52] border border-[#D5DDD2]">
                          🏦 Bank {w.bankAccount?.accountName ? `(${w.bankAccount.accountName})` : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-[160px] truncate text-xs text-[#68756F]">
                      {w.notes || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenViewModal(w)}
                          title="View Details"
                          className="rounded-lg p-1.5 text-[#245B52] hover:bg-[#F0F6F3] border border-[#E5E9E3] transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
                          <button
                            onClick={() => handleOpenEditModal(w)}
                            title="Edit Record"
                            className="rounded-lg p-1.5 text-[#975A16] hover:bg-[#FEF8EC] border border-[#E5E9E3] transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {userRole === "ADMIN" && (
                          <button
                            onClick={() => handleDeleteWage(w.id)}
                            title="Delete"
                            className="rounded-lg p-1.5 text-[#B93838] hover:bg-[#FDF2F2] border border-[#E5E9E3] transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          5. RECORD DAILY WAGE MODAL: EXACTLY TWO MAIN OPTIONS (BABIN vs OTHERS)
      ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Record Daily Wage
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Select Babin or Others to enter wage details with direct cash/bank payment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            {/* TWO MAIN OPTIONS TOGGLE */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEntryType("BABIN")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition ${
                  entryType === "BABIN"
                    ? "border-[#245B52] bg-[#F0F6F3] text-[#245B52] shadow-xs"
                    : "border-[#E5E9E3] bg-white text-[#68756F] hover:border-[#C8E5D5]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  <span className="font-bold text-sm">1. Babin</span>
                </div>
                <span className="text-[11px] mt-1 text-[#68756F]">
                  Runs, distribution & daily wages
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType("OTHERS")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition ${
                  entryType === "OTHERS"
                    ? "border-[#245B52] bg-[#F0F6F3] text-[#245B52] shadow-xs"
                    : "border-[#E5E9E3] bg-white text-[#68756F] hover:border-[#C8E5D5]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-bold text-sm">2. Others</span>
                </div>
                <span className="text-[11px] mt-1 text-[#68756F]">
                  Flexible manual wage entry
                </span>
              </button>
            </div>

            <form onSubmit={handleCreateWage} className="mt-5 space-y-4 text-xs">
              {/* Date */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.workDate}
                  onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm"
                />
              </div>

              {/* A. BABIN SPECIFIC FIELDS */}
              {entryType === "BABIN" && (
                <div className="space-y-4 rounded-2xl bg-[#F7F8F5] p-4 border border-[#E5E9E3]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#26332F] block mb-1">
                        Babin Runs for the Day *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={formData.babinRuns}
                        onChange={(e) => setFormData({ ...formData, babinRuns: e.target.value })}
                        placeholder="Number of runs"
                        className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#26332F] block mb-1">
                        Babin Distributed *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={formData.babinDistributed}
                        onChange={(e) => setFormData({ ...formData, babinDistributed: e.target.value })}
                        placeholder="Distributed count"
                        className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white"
                      />
                    </div>
                  </div>

                  {/* Optional Profit Per Day */}
                  <div>
                    <label className="font-bold text-[#26332F] block mb-1">
                      Profit Per Day (₹) — <span className="text-[#68756F] font-normal">Optional</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.dailyProfit}
                      onChange={(e) => setFormData({ ...formData, dailyProfit: e.target.value })}
                      placeholder="Optional daily profit (stored separately)"
                      className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white font-financial"
                    />
                    <p className="text-[11px] text-[#68756F] mt-1">
                      * Stored as a separate metric; does not automatically alter bank/cash balance.
                    </p>
                  </div>
                </div>
              )}

              {/* B. OTHERS SPECIFIC FIELDS */}
              {entryType === "OTHERS" && (
                <div className="space-y-4 rounded-2xl bg-[#F7F8F5] p-4 border border-[#E5E9E3]">
                  <div>
                    <label className="font-bold text-[#26332F] block mb-1">
                      Description or Wage Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.workDescription}
                      onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                      placeholder="e.g. Loading labor, machine maintenance, winding"
                      className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#26332F] block mb-1">
                      Remarks
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Optional notes or worker name"
                      className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Total Amount of Wages Given */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  {entryType === "BABIN"
                    ? "Total Amount of Wages Given (₹) *"
                    : "Wage Amount (₹) *"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-[#68756F]">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Enter total wages paid"
                    className="w-full rounded-xl border border-[#E5E9E3] pl-8 pr-3 p-2.5 font-bold text-base text-[#245B52] font-financial"
                  />
                </div>
              </div>

              {/* Payment Method: Bank Account or Liquid Cash */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1.5">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: "LIQUID_CASH" })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold border transition ${
                      formData.paymentMethod === "LIQUID_CASH"
                        ? "border-[#245B52] bg-[#245B52] text-white shadow-xs"
                        : "border-[#E5E9E3] bg-white text-[#26332F] hover:bg-[#F0F6F3]"
                    }`}
                  >
                    <span>💵 Liquid Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: "BANK_TRANSFER" })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold border transition ${
                      formData.paymentMethod === "BANK_TRANSFER"
                        ? "border-[#245B52] bg-[#245B52] text-white shadow-xs"
                        : "border-[#E5E9E3] bg-white text-[#26332F] hover:bg-[#F0F6F3]"
                    }`}
                  >
                    <span>🏦 Bank Account</span>
                  </button>
                </div>
              </div>

              {/* Liquid Cash Live Balance Validation */}
              {formData.paymentMethod === "LIQUID_CASH" && (
                <div className="rounded-xl bg-[#F0F6F3] border border-[#C8E5D5] p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center text-[#245B52]">
                    <span>Society Liquid Cash Balance:</span>
                    <span className="font-bold font-financial text-sm">{formatINR(liquidCashBalance)}</span>
                  </div>
                  {parseFloat(formData.amount.toString()) > 0 && (
                    <div className="flex justify-between items-center pt-1 border-t border-[#DCEAE2] text-[#245B52] font-semibold">
                      <span>Liquid Cash Balance After Wage Outflow:</span>
                      <span className="font-bold font-financial text-sm">
                        {formatINR(liquidCashBalance - (parseFloat(formData.amount.toString()) || 0))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Bank Account Selection */}
              {formData.paymentMethod === "BANK_TRANSFER" && (
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">
                    Select Bank Account to Disburse Wages From *
                  </label>
                  <select
                    required
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    <option value="">-- Choose Bank Account --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} ({b.bankName}) • Balance: {formatINR(b.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    formData.paymentMethod === "LIQUID_CASH" &&
                    parseFloat(formData.amount.toString()) > liquidCashBalance
                  }
                  className={`rounded-xl px-6 py-2.5 font-bold text-white shadow-xs transition active:scale-98 ${
                    formData.paymentMethod === "LIQUID_CASH" &&
                    parseFloat(formData.amount.toString()) > liquidCashBalance
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#245B52] hover:bg-[#1D4B43]"
                  }`}
                >
                  Save Wage Payment ({formatINR(parseFloat(formData.amount.toString()) || 0)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. VIEW INDIVIDUAL RECORD MODAL
      ========================================================================= */}
      {showViewModal && activeWage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    activeWage.wageType === "BABIN"
                      ? "bg-[#E6F4EA] text-[#1E7E34] border border-[#C3E6CB]"
                      : "bg-[#E8F0FE] text-[#1967D2] border border-[#C2D7FA]"
                  }`}
                >
                  {activeWage.wageType === "BABIN" ? "🧵 Babin Wage Entry" : "💼 Others Wage Entry"}
                </span>
                <h3 className="text-xl font-bold text-[#26332F] mt-1">
                  {activeWage.workDescription || (activeWage.wageType === "BABIN" ? "Babin Wage" : "Others Daily Wage")}
                </h3>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F8F5] p-4 rounded-xl border border-[#E5E9E3]">
              <div>
                <span className="text-[#68756F] block">Date:</span>
                <span className="font-bold text-[#26332F] text-sm">
                  {new Date(activeWage.workDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-[#68756F] block">Payment Method:</span>
                <span className="font-bold text-[#245B52] text-sm">
                  {activeWage.paymentMethod === "LIQUID_CASH" ? "💵 Liquid Cash" : "🏦 Bank Transfer"}
                </span>
              </div>

              {activeWage.wageType === "BABIN" && (
                <>
                  <div>
                    <span className="text-[#68756F] block">Babin Runs:</span>
                    <span className="font-bold text-[#26332F]">{activeWage.babinRuns ?? "-"} runs</span>
                  </div>
                  <div>
                    <span className="text-[#68756F] block">Babin Distributed:</span>
                    <span className="font-bold text-[#26332F]">{activeWage.babinDistributed ?? "-"} distributed</span>
                  </div>
                  {activeWage.dailyProfit !== null && activeWage.dailyProfit !== undefined && (
                    <div className="col-span-2 pt-2 border-t border-[#E5E9E3]">
                      <span className="text-[#68756F] block">Profit Per Day (Separate):</span>
                      <span className="font-bold text-[#975A16] font-financial text-base">
                        {formatINR(activeWage.dailyProfit)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {activeWage.notes && (
                <div className="col-span-2 pt-2 border-t border-[#E5E9E3]">
                  <span className="text-[#68756F] block">Remarks / Notes:</span>
                  <span className="text-[#26332F] font-medium">{activeWage.notes}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#EBF5F0] border border-[#C8E5D5] p-4 flex justify-between items-center">
              <div>
                <span className="text-xs text-[#246944] font-semibold block">Total Wages Paid:</span>
                <span className="text-xs text-[#246944]/80">Status: Disbursed & Recorded</span>
              </div>
              <div className="text-2xl font-bold text-[#246944] font-financial">
                {formatINR(activeWage.amountPaid || activeWage.grossWages)}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="rounded-xl border border-[#E5E9E3] px-5 py-2 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
              >
                Close
              </button>
              {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenEditModal(activeWage);
                  }}
                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-5 py-2 font-semibold text-white"
                >
                  Edit Entry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. EDIT INDIVIDUAL RECORD MODAL
      ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Edit Daily Wage Record
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Updating this record adjusts linked financial postings without duplicating transactions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditWage} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Wage Type</label>
                  <select
                    value={editFormData.wageType}
                    onChange={(e) => setEditFormData({ ...editFormData, wageType: e.target.value as any })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-sm bg-white"
                  >
                    <option value="BABIN">🧵 Babin</option>
                    <option value="OTHERS">💼 Others</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editFormData.workDate}
                    onChange={(e) => setEditFormData({ ...editFormData, workDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm"
                  />
                </div>
              </div>

              {editFormData.wageType === "BABIN" ? (
                <div className="space-y-4 rounded-2xl bg-[#F7F8F5] p-4 border border-[#E5E9E3]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#26332F] block mb-1">Babin Runs</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editFormData.babinRuns}
                        onChange={(e) => setEditFormData({ ...editFormData, babinRuns: e.target.value })}
                        className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#26332F] block mb-1">Babin Distributed</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editFormData.babinDistributed}
                        onChange={(e) => setEditFormData({ ...editFormData, babinDistributed: e.target.value })}
                        className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#26332F] block mb-1">Profit Per Day (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      value={editFormData.dailyProfit}
                      onChange={(e) => setEditFormData({ ...editFormData, dailyProfit: e.target.value })}
                      className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white font-financial"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl bg-[#F7F8F5] p-4 border border-[#E5E9E3]">
                  <div>
                    <label className="font-bold text-[#26332F] block mb-1">Description / Category</label>
                    <input
                      type="text"
                      required
                      value={editFormData.workDescription}
                      onChange={(e) => setEditFormData({ ...editFormData, workDescription: e.target.value })}
                      className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#26332F] block mb-1">Remarks</label>
                    <input
                      type="text"
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Total Wages Amount */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Wages Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-[#68756F]">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] pl-8 pr-3 p-2.5 font-bold text-base text-[#245B52] font-financial"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1.5">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, paymentMethod: "LIQUID_CASH" })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold border transition ${
                      editFormData.paymentMethod === "LIQUID_CASH"
                        ? "border-[#245B52] bg-[#245B52] text-white shadow-xs"
                        : "border-[#E5E9E3] bg-white text-[#26332F] hover:bg-[#F0F6F3]"
                    }`}
                  >
                    <span>💵 Liquid Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, paymentMethod: "BANK_TRANSFER" })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold border transition ${
                      editFormData.paymentMethod === "BANK_TRANSFER"
                        ? "border-[#245B52] bg-[#245B52] text-white shadow-xs"
                        : "border-[#E5E9E3] bg-white text-[#26332F] hover:bg-[#F0F6F3]"
                    }`}
                  >
                    <span>🏦 Bank Account</span>
                  </button>
                </div>
              </div>

              {editFormData.paymentMethod === "BANK_TRANSFER" && (
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Select Bank Account *</label>
                  <select
                    required
                    value={editFormData.bankAccountId}
                    onChange={(e) => setEditFormData({ ...editFormData, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    <option value="">-- Choose Bank Account --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} ({b.bankName}) • Balance: {formatINR(b.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-6 py-2.5 font-bold text-white shadow-xs transition active:scale-98"
                >
                  Update & Save ({formatINR(parseFloat(editFormData.amount.toString()) || 0)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
