"use client";

import React, { useState, useEffect } from "react";
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

interface TransactionsViewProps {
  banks: any[];
  userRole: string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  banks,
  userRole,
}) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [bankId, setBankId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTxn, setActiveTxn] = useState<any>(null);
  const [reverseReason, setReverseReason] = useState("");

  // New Transaction Form state
  const [form, setForm] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    section: "GENERAL",
    type: "EXPENSE_RECORDED",
    direction: "CREDIT",
    amount: 0,
    counterparty: "",
    bankAccountId: "",
    paymentMethod: "BANK_TRANSFER",
    notes: "",
    debitAccountCode: "5300",
    debitAccountName: "General Operating Expense",
    creditAccountCode: "1020",
    creditAccountName: "Bank Account",
  });

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const url = new URL("/api/transactions", window.location.origin);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", "20");
      if (search) url.searchParams.set("search", search);
      if (section) url.searchParams.set("section", section);
      if (type) url.searchParams.set("type", type);
      if (status) url.searchParams.set("status", status);
      if (bankId) url.searchParams.set("bankAccountId", bankId);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);

      const res = await fetch(url.toString());
      const data = await res.json();
      setTransactions(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [search, section, type, status, bankId, startDate, endDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amt = parseFloat(form.amount.toString());
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionDate: form.transactionDate,
          section: form.section,
          type: form.type,
          direction: form.direction,
          amount: amt,
          counterparty: form.counterparty,
          bankAccountId: form.bankAccountId || undefined,
          paymentMethod: form.paymentMethod,
          notes: form.notes,
          lines: [
            {
              accountCode: form.debitAccountCode,
              accountName: form.debitAccountName,
              debit: amt,
              credit: 0,
            },
            {
              accountCode: form.creditAccountCode,
              accountName: form.creditAccountName,
              debit: 0,
              credit: amt,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create transaction");
      alert("Transaction posted successfully!");
      setShowAddModal(false);
      fetchTransactions(1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTxn) return;
    try {
      const res = await fetch(`/api/transactions/${activeTxn.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reverseReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reverse transaction");
      alert(data.message || "Transaction reversed safely!");
      setShowReverseModal(false);
      setActiveTxn(null);
      setReverseReason("");
      fetchTransactions(pagination.page);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const sectionNameMap: Record<string, string> = {
    SIZING_BILL: "Sizing Bill",
    POWERLOOM: "Powerloom",
    DAILY_WAGE: "Daily Wage",
    TRANSPORT: "Transport",
    BANK_TRANSFER: "Bank Transfer",
    GENERAL: "General Society",
  };

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E9E3]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#26332F] tracking-tight">
            General Transactions & Daybook
          </h1>
          <p className="text-[14px] text-[#68756F] mt-0.5">
            Centralized receipts, payments, and double-entry voucher records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print">
          <button
            onClick={() => exportToCSV("Central_Transactions_Ledger", transactions)}
            className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-white hover:bg-[#F7F8F5] px-4 py-2.5 text-[14px] font-semibold text-[#26332F] shadow-xs transition"
          >
            <Download className="h-4 w-4 text-[#68756F]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-white hover:bg-[#F7F8F5] px-4 py-2.5 text-[14px] font-semibold text-[#26332F] shadow-xs transition"
          >
            <Printer className="h-4 w-4 text-[#68756F]" />
            <span>Print</span>
          </button>
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-[14px] font-semibold text-white shadow-xs transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-5 shadow-xs no-print space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E9E3]">
          <span className="text-sm font-bold text-[#26332F] flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#245B52]" />
            <span>Search & Filter Criteria</span>
          </span>
          {(search || section || bankId || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch("");
                setSection("");
                setBankId("");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs font-semibold text-[#B93838] hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 text-xs">
          <div className="sm:col-span-2">
            <label className="font-semibold text-[#26332F] block mb-1">
              Search Voucher / Narration / Party
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#68756F]" />
              <input
                type="text"
                placeholder="Voucher #, counterparty, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] pl-10 pr-3.5 py-2.5 text-sm text-[#26332F] font-medium outline-none focus:border-[#245B52] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#26332F] block mb-1">
              Section
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-2.5 font-medium text-sm text-[#26332F] outline-none focus:border-[#245B52]"
            >
              <option value="">All Sections</option>
              <option value="SIZING_BILL">Sizing Bill</option>
              <option value="POWERLOOM">Powerloom</option>
              <option value="DAILY_WAGE">Daily Wage</option>
              <option value="TRANSPORT">Transport</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="GENERAL">General Society</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#26332F] block mb-1">
              Bank Account
            </label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-2.5 font-medium text-sm text-[#26332F] outline-none focus:border-[#245B52]"
            >
              <option value="">All Bank Accounts</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:col-span-2 md:col-span-1 lg:col-span-1">
            <div>
              <label className="font-semibold text-[#26332F] block mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-2 text-xs text-[#26332F]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#26332F] block mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-2 text-xs text-[#26332F]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E9E3] bg-white shadow-xs printable-area">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E9E3] bg-[#F7F8F5] text-[#26332F] font-semibold text-[13px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Voucher No</th>
                <th className="py-3.5 px-4">Section</th>
                <th className="py-3.5 px-4">Party & Narration</th>
                <th className="py-3.5 px-4">Bank Account</th>
                <th className="py-3.5 px-4 text-right text-[#246944]">Inflow / Debit (₹)</th>
                <th className="py-3.5 px-4 text-right text-[#B93838]">Outflow / Credit (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#68756F]">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#68756F]">
                    No transactions match the selected criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-[#F7F8F5] transition ${
                      t.status === "REVERSED" ? "bg-[#F7F8F5]/60 opacity-70" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#68756F]">
                      {new Date(t.transactionDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#245B52]">
                      <div className="flex items-center gap-1.5">
                        <ReceiptText className="h-4 w-4 text-[#245B52] shrink-0" />
                        <span>{t.referenceNo}</span>
                      </div>
                      {t.reversalOfId && (
                        <span className="inline-block mt-0.5 rounded-md bg-[#F0F6F3] border border-[#DCEAE2] px-1.5 py-0.2 text-[10px] font-semibold text-[#245B52]">
                          Reversal Entry
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-xs text-[#26332F]">
                        {sectionNameMap[t.section] || t.section}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#26332F]">{t.counterparty || "-"}</div>
                      <div className="text-xs text-[#68756F] truncate max-w-xs" title={t.notes}>
                        {t.notes || t.type.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#68756F]">
                      {t.bankAccount ? (
                        <div className="font-medium text-[#26332F] flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-[#68756F]" />
                          <span>{t.bankAccount.accountName}</span>
                        </div>
                      ) : (
                        <span className="text-[#8E9B95] italic">Non-cash credit</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[15px] font-financial text-[#246944] whitespace-nowrap">
                      {t.direction === "DEBIT" ? `+ ${formatINR(t.amount)}` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[15px] font-financial text-[#B93838] whitespace-nowrap">
                      {t.direction === "CREDIT" ? `- ${formatINR(t.amount)}` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          t.status === "POSTED"
                            ? "bg-[#EBF5F0] text-[#246944] border border-[#C8E5D5]"
                            : t.status === "REVERSED"
                            ? "bg-[#FDF2F2] text-[#B93838] line-through border border-[#F7D2D2]"
                            : "bg-[#FEF8EC] text-[#975A16] border border-[#F7E4BE]"
                        }`}
                      >
                        {t.status === "POSTED" && <CheckCircle2 className="h-3 w-3" />}
                        <span>{t.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center no-print whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setActiveTxn(t);
                            setShowDetailsModal(true);
                          }}
                          title="View Journal Lines"
                          className="flex items-center gap-1 rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] hover:bg-[#DCEAE2] px-2.5 py-1 text-xs font-semibold text-[#26332F] transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Lines</span>
                        </button>
                        {t.status === "POSTED" &&
                          !t.reversalOfId &&
                          ["ADMIN", "ACCOUNTANT"].includes(userRole) && (
                            <button
                              onClick={() => {
                                setActiveTxn(t);
                                setShowReverseModal(true);
                              }}
                              title="Reverse Transaction"
                              className="flex items-center gap-1 rounded-xl border border-[#F7D2D2] bg-[#FDF2F2] hover:bg-[#FBE5E5] px-2.5 py-1 text-xs font-semibold text-[#B93838] transition"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Reverse</span>
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

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#E5E9E3] bg-[#F7F8F5] px-6 py-3.5 text-xs text-[#68756F] no-print gap-3">
          <div className="font-medium">
            Showing {transactions.length} of {pagination.total} records (Page {pagination.page} of {pagination.totalPages})
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchTransactions(pagination.page - 1)}
              className="rounded-xl border border-[#E5E9E3] bg-white px-3.5 py-1.5 font-semibold text-[#26332F] disabled:opacity-40 hover:bg-[#F7F8F5] shadow-xs transition"
            >
              ← Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchTransactions(pagination.page + 1)}
              className="rounded-xl border border-[#E5E9E3] bg-white px-3.5 py-1.5 font-semibold text-[#26332F] disabled:opacity-40 hover:bg-[#F7F8F5] shadow-xs transition"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Record General Ledger Transaction
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Posts a balanced double-entry voucher event directly into general ledgers.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.transactionDate}
                    onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-medium text-[#26332F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Section</label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-medium text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    <option value="GENERAL">General Society</option>
                    <option value="SIZING_BILL">Sizing Bill</option>
                    <option value="POWERLOOM">Powerloom</option>
                    <option value="DAILY_WAGE">Daily Wage</option>
                    <option value="TRANSPORT">Transport</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Transaction Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-medium text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    <option value="EXPENSE_RECORDED">Expense Recorded</option>
                    <option value="PAYMENT_PAID">Payment Paid</option>
                    <option value="PAYMENT_RECEIVED">Payment Received</option>
                    <option value="BILL_ISSUED">Bill Issued</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-[#26332F] text-base font-financial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Counterparty (Payee / Payor)</label>
                  <input
                    type="text"
                    value={form.counterparty}
                    onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                    placeholder="Payee / Counterparty name"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Bank Account (if cash moved)</label>
                  <select
                    value={form.bankAccountId}
                    onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-medium text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    <option value="">Non-cash transaction (Credit voucher)</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} (Balance: {formatINR(b.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Balanced Double-Entry Preview */}
              <div className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-4 space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#26332F] block">
                  Double-Entry Balanced Journal Postings:
                </span>
                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-[#EBF5F0] border border-[#C8E5D5]">
                  <span className="font-medium text-[#246944]">
                    Debit (Dr): {form.debitAccountName} ({form.debitAccountCode})
                  </span>
                  <span className="font-bold text-[#246944]">{formatINR(form.amount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-[#FDF2F2] border border-[#F7D2D2]">
                  <span className="font-medium text-[#B93838]">
                    Credit (Cr): {form.creditAccountName} ({form.creditAccountCode})
                  </span>
                  <span className="font-bold text-[#B93838]">{formatINR(form.amount)}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#26332F] block mb-1">Narration / Particulars</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  placeholder="Narration / transaction description"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] px-5 py-2.5 font-bold text-white hover:bg-[#1D4B43] shadow-xs"
                >
                  Post Journal Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Transaction Modal */}
      {showReverseModal && activeTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-lg border border-[#F7D2D2]">
            <div className="flex items-center gap-2.5 text-[#B93838]">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-xl font-bold">
                Reverse Transaction: {activeTxn.referenceNo}
              </h3>
            </div>
            <p className="text-xs text-[#68756F] mt-2 leading-relaxed">
              In accordance with society statutory audit rules, the original voucher is preserved. An equal compensating reversing entry will be generated, restoring all affected account and bank balances.
            </p>

            <form onSubmit={handleReverse} className="mt-5 space-y-4 text-xs">
              <div className="rounded-xl bg-[#FDF2F2] border border-[#F7D2D2] p-4 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#68756F]">Voucher Amount:</span>
                  <span className="font-bold text-[#B93838] text-base font-financial">{formatINR(activeTxn.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#68756F]">Counterparty:</span>
                  <span className="font-semibold text-[#26332F]">{activeTxn.counterparty || activeTxn.type}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#26332F] block mb-1">
                  Reason for Traceable Reversal (Audit Trail Record):
                </label>
                <textarea
                  required
                  rows={3}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-xs text-[#26332F] outline-none focus:border-[#B93838]"
                  placeholder="Reason for traceable reversal"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#B93838] px-5 py-2.5 font-bold text-white hover:bg-[#9E2A2A] shadow-xs"
                >
                  Execute Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && activeTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3]">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Journal Voucher: {activeTxn.referenceNo}
                </h3>
                <p className="text-xs text-[#68756F] font-mono mt-0.5">
                  Date: {new Date(activeTxn.transactionDate).toLocaleDateString("en-IN")} • Status: {activeTxn.status}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-xl p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-[#26332F] block mb-1">Narration & Particulars:</span>
                <p className="text-[#26332F] bg-[#F7F8F5] p-3 rounded-xl border border-[#E5E9E3]">
                  {activeTxn.notes || "No notes provided"}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[#26332F] block mb-2">
                  Balanced Journal Lines:
                </span>
                <div className="rounded-xl border border-[#E5E9E3] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8F5] text-[#26332F] font-semibold border-b border-[#E5E9E3]">
                      <tr>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Account Head</th>
                        <th className="py-2.5 px-3 text-right text-[#246944]">Debit (₹)</th>
                        <th className="py-2.5 px-3 text-right text-[#B93838]">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
                      {activeTxn.journalEntries?.[0]?.lines?.map((l: any) => (
                        <tr key={l.id}>
                          <td className="py-2.5 px-3 font-mono font-bold">{l.accountCode}</td>
                          <td className="py-2.5 px-3">{l.accountName}</td>
                          <td className="py-2.5 px-3 text-right text-[#246944] font-bold">
                            {l.debit > 0 ? formatINR(l.debit) : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#B93838] font-bold">
                            {l.credit > 0 ? formatINR(l.credit) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-xl border border-[#E5E9E3] px-4 py-2 text-xs font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
