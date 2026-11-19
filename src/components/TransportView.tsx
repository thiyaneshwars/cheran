"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Search,
  Download,
  CheckCircle2,
  Clock,
  ArrowRight,
  Wallet,
  Layers,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

interface TransportViewProps {
  banks: any[];
  userRole: string;
}

export const TransportView: React.FC<TransportViewProps> = ({
  banks,
  userRole,
}) => {
  const [bills, setBills] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalCredited: 0, amountSettled: 0, amountOutstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [liquidCashBalance, setLiquidCashBalance] = useState<number>(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [activeBill, setActiveBill] = useState<any>(null);

  const [form, setForm] = useState({
    transactionNumber: "",
    transactionDate: new Date().toISOString().split("T")[0],
    transporterName: "",
    vehicleNumber: "",
    sourceLocation: "",
    destinationLocation: "",
    description: "",
    freightCharge: 0,
    additionalExpenses: 0,
    dueDate: "",
    bankAccountId: "",
    notes: "",
  });

  const [settleForm, setSettleForm] = useState({
    amount: 0,
    bankAccountId: "society_liquid_cash",
    paymentMethod: "LIQUID_CASH" as "LIQUID_CASH" | "BANK_TRANSFER",
    referenceNo: "",
    notes: "",
  });

  const fetchLiquidCash = async () => {
    try {
      const res = await fetch("/api/liquid-cash");
      if (res.ok) {
        const json = await res.json();
        setLiquidCashBalance(json.stats?.currentBalance ?? json.account?.currentBalance ?? 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/sections/transport", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (statusFilter) url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString());
      const data = await res.json();
      setBills(data.bills || []);
      setSummary(data.summary || { totalCredited: 0, amountSettled: 0, amountOutstanding: 0 });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidCash();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/sections/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          freightCharge: parseFloat(form.freightCharge.toString()),
          additionalExpenses: parseFloat(form.additionalExpenses.toString()) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create transport bill");
      alert("Freight bill posted successfully!");
      setShowCreateModal(false);
      fetchBills();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill) return;
    const settleAmt = parseFloat(settleForm.amount.toString()) || 0;
    if (settleAmt <= 0) {
      alert("Please enter a valid settlement amount.");
      return;
    }
    if (settleForm.paymentMethod === "LIQUID_CASH") {
      if (settleAmt > liquidCashBalance) {
        alert(`Insufficient Liquid Cash balance (${formatINR(liquidCashBalance)}). Available balance is less than settlement amount.`);
        return;
      }
    } else {
      if (!settleForm.bankAccountId || settleForm.bankAccountId === "society_liquid_cash") {
        alert("Please select a bank account to make the settlement from.");
        return;
      }
    }

    try {
      const res = await fetch(`/api/sections/transport/${activeBill.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: settleAmt,
          paymentMethod: settleForm.paymentMethod,
          bankAccountId: settleForm.paymentMethod === "LIQUID_CASH" ? "society_liquid_cash" : settleForm.bankAccountId,
          referenceNo: settleForm.referenceNo || undefined,
          notes: settleForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle transport bill");
      alert(data.message || "Freight settlement confirmed successfully.");
      setShowSettleModal(false);
      setActiveBill(null);
      fetchBills();
      fetchLiquidCash();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalCalculated =
    parseFloat(form.freightCharge.toString() || "0") +
    parseFloat(form.additionalExpenses.toString() || "0");

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E9E3]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#26332F] tracking-tight">
            Transport & Freight Register
          </h1>
          <p className="text-[14px] text-[#68756F] mt-0.5">
            Logistics & Freight Register • Yarn & fabric transport expenses and payables
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCSV("Transport_Register", bills)}
            className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-white hover:bg-[#F7F8F5] px-4 py-2.5 text-[14px] font-semibold text-[#26332F] shadow-xs transition"
          >
            <Download className="h-4 w-4 text-[#68756F]" />
            <span>Export CSV</span>
          </button>
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-[14px] font-semibold text-white shadow-xs transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Freight Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Standard Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 shadow-xs space-y-2">
          <span className="text-[14px] font-bold text-[#26332F] block">
            Total Freight Credited
          </span>
          <span className="text-[12px] text-[#68756F] block">
            Total Freight Invoiced
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-[#26332F] font-financial pt-1">
            {formatINR(summary.totalCredited)}
          </div>
          <p className="text-[13px] text-[#68756F]">
            Total transportation and freight value recorded
          </p>
        </div>

        <div className="rounded-2xl border border-[#C8E5D5] bg-[#EBF5F0]/60 p-6 shadow-xs space-y-2">
          <span className="text-[14px] font-bold text-[#246944] block">
            Amount Settled
          </span>
          <span className="text-[12px] text-[#246944]/80 block">
            Settled to Transporters
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-[#246944] font-financial pt-1">
            {formatINR(summary.amountSettled)}
          </div>
          <p className="text-[13px] text-[#246944]/90 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Disbursed from society bank accounts
          </p>
        </div>

        <div className="rounded-2xl border border-[#F7D2D2] bg-[#FDF2F2]/60 p-6 shadow-xs space-y-2">
          <span className="text-[14px] font-bold text-[#B93838] block">
            Balance Pending
          </span>
          <span className="text-[12px] text-[#B93838]/80 block">
            Outstanding Due to Transporters
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-[#B93838] font-financial pt-1">
            {formatINR(summary.amountOutstanding)}
          </div>
          <p className="text-[13px] text-[#B93838]/90 flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Outstanding accounts payable due to lorry owners
          </p>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#68756F]" />
          <input
            type="text"
            placeholder="Search bill number, transporter, vehicle, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] pl-10 pr-3.5 py-2.5 text-sm text-[#26332F] outline-none focus:border-[#245B52] focus:bg-white font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#68756F]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] px-3.5 py-2 text-xs font-semibold text-[#26332F] outline-none focus:border-[#245B52]"
          >
            <option value="">All Invoices</option>
            <option value="PENDING">Pending Due</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Settled</option>
          </select>
        </div>
      </div>

      {/* Transport Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E9E3] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E9E3] bg-[#F7F8F5] text-[#26332F] font-semibold text-[13px]">
              <tr>
                <th className="py-3.5 px-4">Bill No</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Transporter Name</th>
                <th className="py-3.5 px-4">Vehicle Number</th>
                <th className="py-3.5 px-4">Route</th>
                <th className="py-3.5 px-4 text-right">Freight (₹)</th>
                <th className="py-3.5 px-4 text-right">Toll/Extra (₹)</th>
                <th className="py-3.5 px-4 text-right">Total (₹)</th>
                <th className="py-3.5 px-4 text-right text-[#246944]">Settled (₹)</th>
                <th className="py-3.5 px-4 text-right text-[#B93838]">Pending (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-[#68756F]">
                    Loading transport bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-[#68756F]">
                    No transport bills found.
                  </td>
                </tr>
              ) : (
                bills.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F7F8F5] transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#245B52]">
                      {t.transactionNumber}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#68756F]">
                      {new Date(t.transactionDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#26332F]">{t.transporterName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#26332F]">{t.vehicleNumber || "-"}</td>
                    <td className="py-3.5 px-4 text-[#68756F]">
                      {t.sourceLocation && t.destinationLocation
                        ? `${t.sourceLocation} → ${t.destinationLocation}`
                        : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">{formatINR(t.freightCharge)}</td>
                    <td className="py-3.5 px-4 text-right text-[#68756F]">
                      {t.additionalExpenses > 0 ? formatINR(t.additionalExpenses) : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#26332F] font-financial text-[15px]">
                      {formatINR(t.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#246944] font-financial text-[15px]">
                      {formatINR(t.amountSettled)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#B93838] font-financial text-[15px]">
                      {formatINR(t.outstandingAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          t.paymentStatus === "PAID"
                            ? "bg-[#EBF5F0] text-[#246944] border border-[#C8E5D5]"
                            : t.paymentStatus === "PARTIALLY_PAID"
                            ? "bg-[#F0F6F3] text-[#245B52] border border-[#DCEAE2]"
                            : "bg-[#FDF2F2] text-[#B93838] border border-[#F7D2D2]"
                        }`}
                      >
                        {t.paymentStatus === "PAID"
                          ? "Fully Settled"
                          : t.paymentStatus === "PARTIALLY_PAID"
                          ? "Partially Paid"
                          : "Pending Due"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {t.outstandingAmount > 0 && ["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
                        <button
                          onClick={() => {
                            setActiveBill(t);
                            setSettleForm({
                              ...settleForm,
                              amount: t.outstandingAmount,
                            });
                            setShowSettleModal(true);
                          }}
                          className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Transport Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3]">
            <h3 className="text-xl font-bold text-[#26332F]">
              Create Transport Freight Bill
            </h3>
            <p className="text-xs text-[#68756F] mt-1">
              Freight charges accrue once and clear liability when settled via bank transfer.
            </p>

            <form onSubmit={handleCreate} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Bill Reference No</label>
                  <input
                    type="text"
                    value={form.transactionNumber}
                    onChange={(e) => setForm({ ...form, transactionNumber: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-mono"
                    placeholder="Auto generated if empty"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Freight Date</label>
                  <input
                    type="date"
                    required
                    value={form.transactionDate}
                    onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Transporter / Agency Name</label>
                  <input
                    type="text"
                    required
                    value={form.transporterName}
                    onChange={(e) => setForm({ ...form, transporterName: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold"
                    placeholder="Transporter / lorry name"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Vehicle Registration Number</label>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 uppercase font-mono font-bold"
                    placeholder="Vehicle / lorry number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Origin Location</label>
                  <input
                    type="text"
                    value={form.sourceLocation}
                    onChange={(e) => setForm({ ...form, sourceLocation: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                    placeholder="From location"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Destination Location</label>
                  <input
                    type="text"
                    value={form.destinationLocation}
                    onChange={(e) => setForm({ ...form, destinationLocation: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                    placeholder="To destination"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Freight Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={form.freightCharge}
                    onChange={(e) => setForm({ ...form, freightCharge: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Toll & Incidental Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.additionalExpenses}
                    onChange={(e) =>
                      setForm({ ...form, additionalExpenses: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#DCEAE2] bg-[#F0F6F3] p-4 flex justify-between items-center text-xs">
                <span className="font-bold text-[#245B52]">Calculated Total Freight Charge:</span>
                <span className="text-xl font-bold font-financial text-[#245B52]">
                  {formatINR(totalCalculated)}
                </span>
              </div>

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
                  className="rounded-xl bg-[#245B52] px-5 py-2.5 font-bold text-white hover:bg-[#1D4B43] shadow-xs"
                >
                  Save Freight Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Transport Modal */}
      {showSettleModal && activeBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3]">
            <h3 className="text-xl font-bold text-[#26332F]">
              Record Freight Settlement: {activeBill.transactionNumber}
            </h3>
            <p className="text-xs text-[#68756F] mt-1">
              Transporter: <strong>{activeBill.transporterName}</strong> • Balance Due:{" "}
              <strong className="text-[#B93838] text-sm font-financial">
                {formatINR(activeBill.outstandingAmount)}
              </strong>
            </p>

            <form onSubmit={handleSettle} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#26332F] block mb-1">Disbursement Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={activeBill.outstandingAmount}
                  step="any"
                  required
                  value={settleForm.amount}
                  onChange={(e) =>
                    setSettleForm({ ...settleForm, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-[#26332F] text-base font-financial"
                />
              </div>

              {/* Payment Method Selector: Liquid Cash vs Bank Account */}
              <div>
                <label className="font-semibold text-[#26332F] block mb-1.5">Disbursement Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSettleForm({
                        ...settleForm,
                        paymentMethod: "LIQUID_CASH",
                        bankAccountId: "society_liquid_cash",
                      })
                    }
                    className={`rounded-xl p-2.5 text-left border transition ${
                      settleForm.paymentMethod === "LIQUID_CASH"
                        ? "bg-[#F0F6F3] border-[#245B52] ring-1 ring-[#245B52]"
                        : "bg-[#F7F8F5] border-[#E5E9E3]"
                    }`}
                  >
                    <div className="font-bold text-[#245B52] flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      <span>Liquid Cash</span>
                    </div>
                    <div className="text-[11px] text-[#68756F]">Physical Cash in Hand</div>
                    <div className="text-xs font-bold text-[#245B52] font-financial mt-1">
                      Avail: {formatINR(liquidCashBalance)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSettleForm({
                        ...settleForm,
                        paymentMethod: "BANK_TRANSFER",
                        bankAccountId: banks[0]?.id || "",
                      })
                    }
                    className={`rounded-xl p-2.5 text-left border transition ${
                      settleForm.paymentMethod === "BANK_TRANSFER"
                        ? "bg-[#F0F6F3] border-[#245B52] ring-1 ring-[#245B52]"
                        : "bg-[#F7F8F5] border-[#E5E9E3]"
                    }`}
                  >
                    <div className="font-bold text-[#245B52] flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Bank Account</span>
                    </div>
                    <div className="text-[11px] text-[#68756F]">Direct Bank Transfer</div>
                    <div className="text-xs font-semibold text-[#68756F] mt-1">
                      {banks.length} accounts
                    </div>
                  </button>
                </div>
              </div>

              {settleForm.paymentMethod === "BANK_TRANSFER" && (
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Select Bank Account</label>
                  <select
                    required
                    value={settleForm.bankAccountId}
                    onChange={(e) => setSettleForm({ ...settleForm, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    <option value="">Select bank account</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} (Balance: {formatINR(b.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {settleForm.paymentMethod === "LIQUID_CASH" && (
                <div className="rounded-xl bg-[#F0F6F3] border border-[#C8E5D5] p-3 text-xs space-y-1">
                  <div className="flex justify-between text-[#245B52]">
                    <span>Liquid Cash Avail:</span>
                    <span className="font-bold font-financial">{formatINR(liquidCashBalance)}</span>
                  </div>
                  <div className="flex justify-between text-[#245B52] font-bold border-t border-[#DCEAE2] pt-1">
                    <span>Balance After:</span>
                    <span className={`font-financial ${liquidCashBalance - (settleForm.amount || 0) < 0 ? "text-[#B93838]" : ""}`}>
                      {formatINR(liquidCashBalance - (settleForm.amount || 0))}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-[#68756F] block mb-1">Reference No / Voucher No (Optional)</label>
                <input
                  type="text"
                  value={settleForm.referenceNo}
                  onChange={(e) => setSettleForm({ ...settleForm, referenceNo: e.target.value })}
                  placeholder="e.g. UTR or Cash Voucher"
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleForm.paymentMethod === "LIQUID_CASH" && settleForm.amount > liquidCashBalance}
                  className="rounded-xl bg-[#245B52] px-5 py-2.5 font-bold text-white hover:bg-[#1D4B43] shadow-xs disabled:opacity-50"
                >
                  Confirm Settlement ({formatINR(settleForm.amount || 0)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
