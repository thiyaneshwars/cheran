"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Plus,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Landmark,
  X,
  Filter,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

interface LiquidCashSectionProps {
  banks: any[];
  userRole: string;
  onBalanceChange?: () => void;
}

export const LiquidCashSection: React.FC<LiquidCashSectionProps> = ({
  banks,
  userRole,
  onBalanceChange,
}) => {
  const [liquidData, setLiquidData] = useState<{
    account: any;
    stats: {
      currentBalance: number;
      totalCashIn: number;
      totalCashOut: number;
      activeCount: number;
      revokedCount: number;
      totalEntries: number;
    };
    entries: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "CASH_IN" | "CASH_OUT" | "REVOKED">("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update Form State
  const [form, setForm] = useState({
    type: "CASH_IN" as "CASH_IN" | "CASH_OUT" | "ADJUSTMENT",
    amount: "" as string | number,
    category: "CASH_DRAWN_FROM_BANK",
    description: "",
    notes: "",
    bankAccountId: "",
    entryDate: new Date().toISOString().split("T")[0],
    voucherNo: "",
  });

  const fetchLiquidCash = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/liquid-cash");
      if (res.ok) {
        const json = await res.json();
        setLiquidData(json);
      }
    } catch (err) {
      console.error("Failed to load liquid cash data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidCash();
  }, []);

  const resetForm = () => {
    setForm({
      type: "CASH_IN",
      amount: "",
      category: "CASH_DRAWN_FROM_BANK",
      description: "",
      notes: "",
      bankAccountId: banks[0]?.id || "",
      entryDate: new Date().toISOString().split("T")[0],
      voucherNo: "",
    });
  };

  const handleOpenUpdate = (type: "CASH_IN" | "CASH_OUT" | "ADJUSTMENT" = "CASH_IN") => {
    const defaultCat =
      type === "CASH_IN"
        ? "CASH_DRAWN_FROM_BANK"
        : type === "CASH_OUT"
        ? "PETTY_EXPENSE"
        : "CASH_COUNT_RECONCILIATION";

    setForm({
      type,
      amount: "",
      category: defaultCat,
      description:
        type === "CASH_IN"
          ? "Cash drawn from bank for operations"
          : type === "CASH_OUT"
          ? "Petty cash and office operational expenses"
          : "Cash count physical reconciliation",
      notes: "",
      bankAccountId: (type === "CASH_IN" || type === "CASH_OUT") && banks.length > 0 ? banks[0].id : "",
      entryDate: new Date().toISOString().split("T")[0],
      voucherNo: "",
    });
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(form.amount.toString());
    if (isNaN(numAmt) || numAmt <= 0) {
      alert("Please enter a valid amount greater than zero.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/liquid-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          amount: numAmt,
          category: form.category,
          description: form.description || "Liquid cash transaction",
          notes: form.notes,
          bankAccountId: form.bankAccountId || undefined,
          voucherNo: form.voucherNo ? form.voucherNo.trim() : undefined,
          entryDate: form.entryDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update liquid cash");

      alert(data.message || "Liquid cash updated successfully!");
      setShowUpdateModal(false);
      resetForm();
      await fetchLiquidCash();
      if (onBalanceChange) onBalanceChange();
    } catch (err: any) {
      alert(err.message || "Error updating liquid cash");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRevoke = (entry: any) => {
    setSelectedEntry(entry);
    setRevokeReason("");
    setShowRevokeModal(true);
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    if (!revokeReason.trim() || revokeReason.trim().length < 3) {
      alert("Please provide a valid reason for revocation.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/liquid-cash/${selectedEntry.id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke entry");

      alert(data.message || "Entry revoked and balance safely restored!");
      setShowRevokeModal(false);
      setSelectedEntry(null);
      setRevokeReason("");
      await fetchLiquidCash();
      if (onBalanceChange) onBalanceChange();
    } catch (err: any) {
      alert(err.message || "Error revoking transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (!liquidData?.entries || liquidData.entries.length === 0) {
      alert("No liquid cash entries to export.");
      return;
    }

    const rows = liquidData.entries.map((e) => ({
      Voucher_No: e.voucherNo,
      Date: new Date(e.entryDate).toLocaleDateString("en-IN"),
      Type: e.type,
      Category: e.category,
      Description: e.description,
      Amount: e.amount,
      Balance_Before: e.balanceBefore,
      Balance_After: e.balanceAfter,
      Status: e.status,
      Linked_Bank: e.bankAccount ? `${e.bankAccount.bankName} - ${e.bankAccount.accountName}` : "None",
      Created_By: e.createdBy?.fullName || "Staff",
      Revoked_At: e.revokedAt ? new Date(e.revokedAt).toLocaleString("en-IN") : "",
      Revoked_By: e.revokedBy?.fullName || "",
      Revocation_Reason: e.revocationReason || "",
      Notes: e.notes || "",
    }));

    exportToCSV(`cheran_liquid_cash_register_${new Date().toISOString().split("T")[0]}`, rows);
  };

  // Filter entries
  const filteredEntries = (liquidData?.entries || []).filter((e) => {
    if (filterType === "CASH_IN" && (e.type !== "CASH_IN" || e.status === "REVOKED")) return false;
    if (filterType === "CASH_OUT" && (e.type !== "CASH_OUT" || e.status === "REVOKED")) return false;
    if (filterType === "REVOKED" && e.status !== "REVOKED") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchVoucher = e.voucherNo?.toLowerCase().includes(q);
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchCat = e.category?.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      const matchBank = e.bankAccount?.accountName?.toLowerCase().includes(q);
      return matchVoucher || matchDesc || matchCat || matchNotes || matchBank;
    }
    return true;
  });

  const currentBal = liquidData?.stats.currentBalance ?? 0;
  const numInputAmt = parseFloat(form.amount.toString()) || 0;
  let previewBal = currentBal;
  if (form.type === "CASH_IN") previewBal = currentBal + numInputAmt;
  else if (form.type === "CASH_OUT") previewBal = currentBal - numInputAmt;
  else if (form.type === "ADJUSTMENT") previewBal = numInputAmt;

  return (
    <div className="space-y-6 pt-4 border-t border-[#E5E9E3]">
      {/* Liquid Cash Main Section Card */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E5E9E3]">
          {/* Title & Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-[#EBF5F0] text-[#245B52] flex items-center justify-center shadow-2xs">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#26332F] tracking-tight">
                    Liquid Cash & Petty Cash
                  </h2>
                  <span className="rounded-full bg-[#EBF5F0] border border-[#C8E5D5] text-[#246944] text-[11px] font-bold px-2.5 py-0.5">
                    Live Cash In Hand
                  </span>
                </div>
                <p className="text-[14px] text-[#68756F]">
                  Cash in Hand & Petty Cash Register • Daily liquid cash operations
                </p>
              </div>
            </div>
            <p className="text-[13px] text-[#8E9B95] max-w-2xl pt-1">
              Real-time cash in hand managed by society accountants. Easily add cash in, record petty expenses, or adjust cash counts. Any entry can be revoked with one click.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              type="button"
              className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] hover:bg-[#DCEAE2] px-3.5 py-2.5 text-[13px] font-semibold text-[#26332F] transition"
            >
              <Download className="h-4 w-4 text-[#245B52]" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleOpenUpdate("ADJUSTMENT")}
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-[#D2D9D4] bg-white hover:bg-[#F7F8F5] px-3.5 py-2.5 text-[13px] font-semibold text-[#26332F] transition"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#68756F]" />
              <span>Adjust Count</span>
            </button>
            <button
              onClick={() => handleOpenUpdate("CASH_OUT")}
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-[#F3D7D7] bg-[#FDF2F2] hover:bg-[#FBE8E8] px-3.5 py-2.5 text-[13px] font-semibold text-[#B93838] transition"
            >
              <ArrowDownRight className="h-4 w-4 stroke-[2.5]" />
              <span>- Cash Out</span>
            </button>
            <button
              onClick={() => handleOpenUpdate("CASH_IN")}
              type="button"
              className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-[13px] font-semibold text-white shadow-xs transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Cash In</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Current Liquid Cash Balance */}
          <div className="rounded-xl border border-[#C8E5D5] bg-[#F4FAF6] p-4.5 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#246944] uppercase tracking-wider">
                Current Liquid Cash
              </span>
              <div className="h-7 w-7 rounded-lg bg-[#EBF5F0] text-[#245B52] flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#26332F] font-financial pt-1">
              {formatINR(currentBal)}
            </div>
            <p className="text-[12px] text-[#68756F]">Society Physical Cash in Hand</p>
          </div>

          {/* Card 2: Total Cash In */}
          <div className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-4.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#68756F] uppercase tracking-wider">
                Total Cash In
              </span>
              <div className="h-7 w-7 rounded-lg bg-[#EBF5F0] text-[#246944] flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#246944] font-financial pt-1">
              {formatINR(liquidData?.stats.totalCashIn ?? 0)}
            </div>
            <p className="text-[12px] text-[#8E9B95]">Total additions & deposits</p>
          </div>

          {/* Card 3: Total Cash Out */}
          <div className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-4.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#68756F] uppercase tracking-wider">
                Total Cash Out
              </span>
              <div className="h-7 w-7 rounded-lg bg-[#FDF2F2] text-[#B93838] flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#B93838] font-financial pt-1">
              {formatINR(liquidData?.stats.totalCashOut ?? 0)}
            </div>
            <p className="text-[12px] text-[#8E9B95]">Total disbursements & expenses</p>
          </div>

          {/* Card 4: Register Activity */}
          <div className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-4.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#68756F] uppercase tracking-wider">
                Register Activity
              </span>
              <div className="h-7 w-7 rounded-lg bg-white text-[#68756F] flex items-center justify-center border border-[#E5E9E3]">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#26332F] font-financial pt-1">
              {liquidData?.stats.activeCount ?? 0}
              <span className="text-xs font-normal text-[#8E9B95] ml-1.5">
                ({liquidData?.stats.revokedCount ?? 0} revoked)
              </span>
            </div>
            <p className="text-[12px] text-[#8E9B95]">Verified audit records</p>
          </div>
        </div>

        {/* Filter Tabs and Search Bar */}
        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 border border-[#E5E9E3] rounded-xl p-1 bg-[#F7F8F5]">
            <button
              onClick={() => setFilterType("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === "ALL"
                  ? "bg-white text-[#245B52] shadow-2xs"
                  : "text-[#68756F] hover:text-[#26332F]"
              }`}
            >
              All Records ({liquidData?.entries.length || 0})
            </button>
            <button
              onClick={() => setFilterType("CASH_IN")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === "CASH_IN"
                  ? "bg-white text-[#246944] shadow-2xs"
                  : "text-[#68756F] hover:text-[#26332F]"
              }`}
            >
              Cash In
            </button>
            <button
              onClick={() => setFilterType("CASH_OUT")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === "CASH_OUT"
                  ? "bg-white text-[#B93838] shadow-2xs"
                  : "text-[#68756F] hover:text-[#26332F]"
              }`}
            >
              Cash Out
            </button>
            <button
              onClick={() => setFilterType("REVOKED")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === "REVOKED"
                  ? "bg-white text-[#8E9B95] shadow-2xs"
                  : "text-[#68756F] hover:text-[#26332F]"
              }`}
            >
              Revoked ({liquidData?.stats.revokedCount || 0})
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8E9B95]" />
            <input
              type="text"
              placeholder="Search voucher, reason, bank..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] pl-9 pr-3 py-2 text-xs text-[#26332F] outline-none focus:border-[#245B52] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Liquid Cash Entries Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E9E3]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F8F5] text-[#68756F] border-b border-[#E5E9E3]">
                <th className="py-3 px-4 font-semibold">Date & Voucher</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Category & Description</th>
                <th className="py-3 px-4 font-semibold">Linked Bank</th>
                <th className="py-3 px-4 font-semibold text-right">Amount (₹)</th>
                <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                <th className="py-3 px-4 font-semibold">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E3] bg-white">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#8E9B95]">
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="h-8 w-8 text-[#CCD4CF]" />
                      <p className="font-semibold text-sm text-[#68756F]">No liquid cash entries found</p>
                      <p className="text-xs">
                        No transactions recorded yet • Click &quot;+ Cash In&quot; or &quot;- Cash Out&quot; to add an entry.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const isRevoked = e.status === "REVOKED";
                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-[#F9FAF8] transition ${
                        isRevoked ? "bg-[#FAFBF9] opacity-75" : ""
                      }`}
                    >
                      {/* Date & Voucher */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#26332F]">
                          {new Date(e.entryDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="font-mono text-[11px] text-[#68756F] mt-0.5">
                          {e.voucherNo}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#F1F3F0] border border-[#DCE0DC] px-2 py-0.5 text-[11px] font-semibold text-[#8E9B95] line-through">
                            {e.type}
                          </span>
                        ) : e.type === "CASH_IN" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#EBF5F0] border border-[#C8E5D5] px-2 py-0.5 text-[11px] font-bold text-[#246944]">
                            <ArrowUpRight className="h-3 w-3" />
                            <span>Cash In</span>
                          </span>
                        ) : e.type === "CASH_OUT" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#FDF2F2] border border-[#F3D7D7] px-2 py-0.5 text-[11px] font-bold text-[#B93838]">
                            <ArrowDownRight className="h-3 w-3" />
                            <span>Cash Out</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#F0F6F3] border border-[#DCEAE2] px-2 py-0.5 text-[11px] font-bold text-[#245B52]">
                            <SlidersHorizontal className="h-3 w-3" />
                            <span>Adjustment</span>
                          </span>
                        )}
                      </td>

                      {/* Category & Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-[#26332F] truncate">
                          {e.description || e.category}
                        </div>
                        <div className="text-[11px] text-[#68756F] truncate mt-0.5">
                          Category: {e.category}
                          {e.notes ? ` • Note: ${e.notes}` : ""}
                        </div>
                      </td>

                      {/* Linked Bank */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {e.bankAccount ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#245B52] bg-[#F0F6F3] border border-[#DCEAE2] px-2 py-0.5 rounded-md">
                            <Landmark className="h-3 w-3" />
                            <span>{e.bankAccount.bankName}</span>
                          </span>
                        ) : (
                          <span className="text-[#8E9B95] text-[11px] italic">Direct Cash</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-financial font-bold text-[13px] whitespace-nowrap">
                        {isRevoked ? (
                          <span className="text-[#8E9B95] line-through">
                            {formatINR(e.amount)}
                          </span>
                        ) : e.type === "CASH_IN" ? (
                          <span className="text-[#246944]">+{formatINR(e.amount)}</span>
                        ) : e.type === "CASH_OUT" ? (
                          <span className="text-[#B93838]">-{formatINR(e.amount)}</span>
                        ) : (
                          <span className="text-[#245B52]">{formatINR(e.amount)}</span>
                        )}
                      </td>

                      {/* Balance After */}
                      <td className="py-3 px-4 text-right font-financial font-semibold text-[13px] text-[#26332F] whitespace-nowrap">
                        {isRevoked ? (
                          <span className="text-[#8E9B95]">—</span>
                        ) : (
                          formatINR(e.balanceAfter)
                        )}
                      </td>

                      {/* Status & Revoke Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isRevoked ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded bg-[#F1F3F0] text-[#8E9B95] border border-[#DCE0DC] px-2 py-0.5 text-[10px] font-bold">
                              REVOKED
                            </span>
                            {e.revocationReason && (
                              <p className="text-[10px] text-[#8E9B95] max-w-[150px] truncate" title={e.revocationReason}>
                                Reason: {e.revocationReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenRevoke(e)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#F3D7D7] bg-white hover:bg-[#FDF2F2] px-2.5 py-1 text-[11px] font-bold text-[#B93838] transition shadow-2xs"
                            title="Revoke this cash entry and restore balance"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPDATE LIQUID CASH MODAL */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3] space-y-5 animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Update Liquid Cash
                </h3>
                <p className="text-[13px] text-[#68756F] mt-0.5">
                  Record cash in, cash expenses, or reconcile cash in hand.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="p-1 rounded-lg text-[#8E9B95] hover:text-[#26332F] hover:bg-[#F7F8F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-sm">
              {/* Type Switcher */}
              <div>
                <label className="font-semibold text-[#26332F] block mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        type: "CASH_IN",
                        category: "CASH_DRAWN_FROM_BANK",
                        description: "Cash drawn from bank",
                      });
                    }}
                    className={`rounded-xl border p-2.5 text-center font-bold text-xs transition ${
                      form.type === "CASH_IN"
                        ? "border-[#246944] bg-[#EBF5F0] text-[#246944]"
                        : "border-[#E5E9E3] bg-[#F7F8F5] text-[#68756F] hover:bg-[#EBF5F0]"
                    }`}
                  >
                    + Cash In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        type: "CASH_OUT",
                        category: "PETTY_EXPENSE",
                        description: "Petty cash & office expense",
                      });
                    }}
                    className={`rounded-xl border p-2.5 text-center font-bold text-xs transition ${
                      form.type === "CASH_OUT"
                        ? "border-[#B93838] bg-[#FDF2F2] text-[#B93838]"
                        : "border-[#E5E9E3] bg-[#F7F8F5] text-[#68756F] hover:bg-[#FDF2F2]"
                    }`}
                  >
                    - Cash Out
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        type: "ADJUSTMENT",
                        category: "CASH_COUNT_RECONCILIATION",
                        description: "Cash count adjustment",
                        bankAccountId: "",
                      });
                    }}
                    className={`rounded-xl border p-2.5 text-center font-bold text-xs transition ${
                      form.type === "ADJUSTMENT"
                        ? "border-[#245B52] bg-[#F0F6F3] text-[#245B52]"
                        : "border-[#E5E9E3] bg-[#F7F8F5] text-[#68756F] hover:bg-[#F0F6F3]"
                    }`}
                  >
                    = Adjustment
                  </button>
                </div>
              </div>

              {/* Amount Input with Live Balance Preview */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="font-semibold text-[#26332F]">
                    {form.type === "ADJUSTMENT" ? "New Verified Cash Count (₹)" : "Amount (₹)"}
                  </label>
                  <span className="text-xs text-[#68756F]">
                    Current Balance: <strong className="font-financial">{formatINR(currentBal)}</strong>
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-lg text-[#26332F] font-financial outline-none focus:border-[#245B52]"
                />
                {numInputAmt > 0 && (
                  <p className="text-xs text-[#246944] mt-1 font-medium">
                    → Balance After Update: <strong className="font-financial">{formatINR(previewBal)}</strong>
                  </p>
                )}
              </div>

              {/* Date & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.entryDate}
                    onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-medium text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-medium text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    {form.type === "CASH_IN" && (
                      <>
                        <option value="CASH_DRAWN_FROM_BANK">Cash Drawn from Bank</option>
                        <option value="DIRECT_COLLECTION">Direct Cash Collection</option>
                        <option value="MEMBER_RECEIPT">Member Deposit / Receipt</option>
                        <option value="CAPITAL_INFUSION">Capital / Reserve Infusion</option>
                        <option value="OTHER_INFLOW">Other Cash Inflow</option>
                      </>
                    )}
                    {form.type === "CASH_OUT" && (
                      <>
                        <option value="PETTY_EXPENSE">Petty Cash & Office Expense</option>
                        <option value="DAILY_WAGE_PAYMENT">Daily Wage Cash Payment</option>
                        <option value="CASH_DEPOSIT_TO_BANK">Deposited to Bank</option>
                        <option value="TRANSPORT_FREIGHT">Transport Freight Cash</option>
                        <option value="SUPPLIER_PAYMENT">Vendor / Supplier Payment</option>
                        <option value="OTHER_EXPENSE">Other Cash Expense</option>
                      </>
                    )}
                    {form.type === "ADJUSTMENT" && (
                      <>
                        <option value="CASH_COUNT_RECONCILIATION">Physical Cash Count Reconciliation</option>
                        <option value="OPENING_BALANCE_SETUP">Opening Balance Setup</option>
                        <option value="AUDIT_CORRECTION">Auditor Reconciliation</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Optional Linked Bank Account */}
              {form.type !== "ADJUSTMENT" && (
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    Linked Bank Account (Optional)
                  </label>
                  <select
                    value={form.bankAccountId}
                    onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-medium text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    <option value="">None (Independent Direct Cash)</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountName} (Balance: {formatINR(b.currentBalance)})
                      </option>
                    ))}
                  </select>
                  {form.bankAccountId && (
                    <p className="text-[12px] text-[#245B52] mt-1 bg-[#F0F6F3] p-2 rounded-lg border border-[#DCEAE2]">
                      {form.type === "CASH_IN"
                        ? `ℹ️ Cash drawn from bank: ₹${numInputAmt || 0} will be deducted from this bank and added to liquid cash.`
                        : `ℹ️ Cash deposited to bank: ₹${numInputAmt || 0} will be deducted from liquid cash and added to this bank.`}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="font-semibold text-[#26332F] block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drawn from SBI for weekly petty cash"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-medium text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-[#26332F] block mb-1">
                  Narration / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes for audit verification..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs font-medium text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 text-xs font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Save & Update Balance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVOKE CONFIRMATION MODAL */}
      {showRevokeModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FDF2F2] text-[#B93838] flex items-center justify-center">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#26332F]">
                  Revoke Liquid Cash Entry
                </h3>
                <p className="text-[12px] text-[#68756F]">
                  Restore balance and void transaction record
                </p>
              </div>
            </div>

            {/* Entry Summary Box */}
            <div className="rounded-xl border border-[#F3D7D7] bg-[#FDF8F8] p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#68756F]">Voucher No:</span>
                <span className="font-mono font-bold text-[#26332F]">{selectedEntry.voucherNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68756F]">Transaction Type:</span>
                <span className="font-bold text-[#26332F]">{selectedEntry.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68756F]">Amount:</span>
                <span className="font-bold text-sm text-[#B93838] font-financial">
                  {formatINR(selectedEntry.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68756F]">Description:</span>
                <span className="font-medium text-[#26332F]">{selectedEntry.description}</span>
              </div>
              {selectedEntry.bankAccount && (
                <div className="flex justify-between">
                  <span className="text-[#68756F]">Linked Bank:</span>
                  <span className="font-semibold text-[#245B52]">
                    {selectedEntry.bankAccount.bankName} ({selectedEntry.bankAccount.accountName})
                  </span>
                </div>
              )}
            </div>

            <div className="text-[12px] text-[#68756F] bg-[#F7F8F5] p-3 rounded-xl border border-[#E5E9E3] space-y-1">
              <p className="font-semibold text-[#26332F]">Impact of Revocation:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[#68756F]">
                <li>Liquid cash balance will be automatically restored.</li>
                {selectedEntry.bankAccount && (
                  <li>Linked bank account balance will be reversed automatically.</li>
                )}
                <li>Audit trail will record this revocation permanently.</li>
              </ul>
            </div>

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="font-semibold text-xs text-[#26332F] block mb-1">
                  Reason for Revocation <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    "Duplicate entry",
                    "Entered wrong amount",
                    "Voucher cancelled",
                    "Bank sync correction",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRevokeReason(preset)}
                      className="text-[11px] rounded-lg border border-[#E5E9E3] bg-[#F7F8F5] hover:bg-[#DCEAE2] px-2 py-1 text-[#26332F] transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Specify why this entry is being revoked..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-xs font-medium text-[#26332F] outline-none focus:border-[#B93838]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevokeModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2 text-xs font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#B93838] hover:bg-[#9E2A2A] px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Revoking..." : "Confirm Revocation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
