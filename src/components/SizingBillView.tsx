"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
  Calculator,
  ArrowDownRight,
  Wallet,
  Sparkles,
  Eye,
  Calendar,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

interface SizingBillViewProps {
  banks: any[];
  parties: any[];
  userRole: string;
  onRefresh?: () => void;
}

export const SizingBillView: React.FC<SizingBillViewProps> = ({
  banks,
  parties,
  userRole,
  onRefresh,
}) => {
  // Sizing Type Filter: "VETTI" | "SAREE" | "ALL"
  const [billTypeFilter, setBillTypeFilter] = useState<"VETTI" | "SAREE" | "ALL">("VETTI");

  const [bills, setBills] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalCredited: 0, amountSettled: 0, amountOutstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeBill, setActiveBill] = useState<any>(null);
  const [detailBill, setDetailBill] = useState<any>(null);
  const [liquidCashBalance, setLiquidCashBalance] = useState<number>(0);

  // Form state for New Bill:
  const [form, setForm] = useState({
    billType: "VETTI" as "VETTI" | "SAREE",
    billNumber: "",
    billDate: new Date().toISOString().split("T")[0],
    numberOfBeams: "" as string | number,
    noOfBags: 0,
    bagWeightKg: 0,
    ratePerKg: 0,
    dueDate: "",
    bankAccountId: "",
    notes: "",
  });

  // Settlement Form state
  const [settleForm, setSettleForm] = useState({
    selectedBillId: "",
    amount: 0,
    bankAccountId: "society_liquid_cash",
    paymentMethod: "LIQUID_CASH" as "LIQUID_CASH" | "BANK_TRANSFER",
    referenceNo: "",
    notes: "",
    settlementDate: new Date().toISOString().split("T")[0],
  });

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

  const fetchBills = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/sections/sizing", window.location.origin);
      if (billTypeFilter !== "ALL") {
        url.searchParams.set("billType", billTypeFilter);
      }
      if (search) url.searchParams.set("search", search);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);

      const res = await fetch(url.toString());
      const data = await res.json();
      setBills(data.bills || []);
      setSummary(data.summary || { totalCredited: 0, amountSettled: 0, amountOutstanding: 0 });
    } catch (err: any) {
      console.error("Failed to load sizing bills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidCash();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [billTypeFilter, search, statusFilter, startDate, endDate]);

  // When changing billTypeFilter, update default billType in create form
  const handleTypeTabChange = (type: "VETTI" | "SAREE" | "ALL") => {
    setBillTypeFilter(type);
    if (type === "VETTI" || type === "SAREE") {
      setForm((prev) => ({ ...prev, billType: type }));
    }
  };

  // Calculations for Add Form
  const totalWeightKg = (form.noOfBags || 0) * (form.bagWeightKg || 0);
  const calculatedTotalAmount = totalWeightKg * (form.ratePerKg || 0);

  const handleOpenCreateModal = () => {
    setForm({
      billType: billTypeFilter === "SAREE" ? "SAREE" : "VETTI",
      billNumber: "",
      billDate: new Date().toISOString().split("T")[0],
      numberOfBeams: "",
      noOfBags: 0,
      bagWeightKg: 0,
      ratePerKg: 0,
      dueDate: "",
      bankAccountId: "",
      notes: "",
    });
    setShowCreateModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedTotalAmount <= 0) {
      alert("Please enter valid No of Bags, Bags in kg, and Rate per kg. Total cannot be 0.");
      return;
    }
    try {
      const res = await fetch("/api/sections/sizing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billType: form.billType,
          billNumber: form.billNumber || undefined,
          billDate: form.billDate,
          numberOfBeams: form.numberOfBeams !== "" ? parseFloat(form.numberOfBeams.toString()) : undefined,
          noOfBags: parseFloat(form.noOfBags.toString()) || 0,
          bagWeightKg: parseFloat(form.bagWeightKg.toString()) || 0,
          ratePerKg: parseFloat(form.ratePerKg.toString()) || 0,
          dueDate: form.dueDate || undefined,
          bankAccountId: form.bankAccountId || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create sizing bill");
      alert(`${form.billType === "VETTI" ? "Vetti" : "Saree"} sizing bill created successfully.`);
      setShowCreateModal(false);
      fetchBills();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Settlement Modal
  const handleOpenSettlement = (bill?: any) => {
    const targetBill = bill || bills.find((b) => b.outstandingAmount > 0) || null;
    setActiveBill(targetBill);
    const preferLiquidCash = liquidCashBalance >= (targetBill?.outstandingAmount || 0);
    setSettleForm({
      selectedBillId: targetBill ? targetBill.id : "",
      amount: targetBill ? targetBill.outstandingAmount : 0,
      bankAccountId: preferLiquidCash ? "society_liquid_cash" : (banks[0]?.id || ""),
      paymentMethod: preferLiquidCash ? "LIQUID_CASH" : "BANK_TRANSFER",
      referenceNo: "",
      notes: "",
      settlementDate: new Date().toISOString().split("T")[0],
    });
    setShowSettleModal(true);
  };

  const handleOpenDetailModal = (bill: any) => {
    setDetailBill(bill);
    setShowDetailModal(true);
  };

  const handleBillSelectChange = (billId: string) => {
    const found = bills.find((b) => b.id === billId);
    setActiveBill(found || null);
    setSettleForm((prev) => ({
      ...prev,
      selectedBillId: billId,
      amount: found ? found.outstandingAmount : 0,
    }));
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    const billToSettle = activeBill || bills.find((b) => b.id === settleForm.selectedBillId);
    if (!billToSettle) {
      alert("Please select a valid bill to settle.");
      return;
    }
    const settleAmt = parseFloat(settleForm.amount.toString()) || 0;
    if (settleAmt <= 0) {
      alert("Settlement amount must be greater than zero.");
      return;
    }
    if (settleAmt > billToSettle.outstandingAmount) {
      alert(`Settlement amount cannot exceed pending due (${formatINR(billToSettle.outstandingAmount)}).`);
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
      const res = await fetch(`/api/sections/sizing/${billToSettle.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: settleAmt,
          bankAccountId: settleForm.paymentMethod === "LIQUID_CASH" ? "society_liquid_cash" : settleForm.bankAccountId,
          paymentMethod: settleForm.paymentMethod,
          referenceNo: settleForm.referenceNo || undefined,
          notes: settleForm.notes || undefined,
          settlementDate: settleForm.settlementDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle bill");
      alert(
        data.message ||
          `Settlement of ₹${settleAmt.toLocaleString("en-IN")} recorded! Balance and pending balance have been reduced.`
      );
      setShowSettleModal(false);
      setActiveBill(null);
      fetchBills();
      fetchLiquidCash();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Selected bank for settlement preview
  const isLiquidCash = settleForm.paymentMethod === "LIQUID_CASH";
  const selectedBank = banks.find((b) => b.id === settleForm.bankAccountId);
  const currentBankBalance = selectedBank?.currentBalance || 0;
  const bankBalanceAfterSettle = currentBankBalance - (parseFloat(settleForm.amount.toString()) || 0);
  const liquidCashAfterSettle = liquidCashBalance - (parseFloat(settleForm.amount.toString()) || 0);
  const pendingDueAfterSettle = (activeBill?.outstandingAmount || 0) - (parseFloat(settleForm.amount.toString()) || 0);

  // Pending bills list for the settlement modal selector
  const pendingBillsList = bills.filter((b) => b.outstandingAmount > 0);

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* =========================================================================
          1. PAGE HEADER WITH VETTI / SALLI SWITCHER & ACTIONS
      ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-3 border-b border-[#E5E9E3]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#245B52]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#26332F] tracking-tight">
              Sizing Bill Register
            </h1>
          </div>
          <p className="text-[14px] text-[#68756F] mt-1">
            Yarn sizing bills • Bags, weight & rate calculations for Vetti & Saree yarn
          </p>
        </div>

        {/* Right Corner Controls: Vetti/Saree Scroll Switcher, Export, Settlement, Add Bill */}
        <div className="flex flex-wrap items-center gap-3">
          {/* =====================================================================
              VETTI & SAREE SCROLL / TOGGLE BUTTON
          ===================================================================== */}
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200 shadow-xs">
            <button
              type="button"
              id="vetti-toggle-btn"
              onClick={() => handleTypeTabChange("VETTI")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-bold transition-all ${
                billTypeFilter === "VETTI"
                  ? "bg-[#1E2229] text-white shadow-xs scale-100"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>Vetti</span>
            </button>

            <button
              type="button"
              id="saree-toggle-btn"
              onClick={() => handleTypeTabChange("SAREE")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-bold transition-all ${
                billTypeFilter === "SAREE"
                  ? "bg-[#1E2229] text-white shadow-xs scale-100"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>Saree</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeTabChange("ALL")}
              className={`rounded-xl px-3.5 py-2 text-[13px] font-bold transition-all ${
                billTypeFilter === "ALL"
                  ? "bg-[#1E2229] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              All
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={() => exportToCSV(`Sizing_${billTypeFilter}_Bills_Register`, bills)}
            className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-white hover:bg-[#F7F8F5] px-3.5 py-2.5 text-[14px] font-semibold text-[#26332F] shadow-xs transition"
          >
            <Download className="h-4 w-4 text-[#68756F]" />
            <span>Export CSV</span>
          </button>

          {/* Settlement Button */}
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={() => handleOpenSettlement()}
              className="flex items-center gap-2 rounded-xl border border-[#C8E5D5] bg-[#EBF5F0] hover:bg-[#DCF0E5] px-4 py-2.5 text-[14px] font-bold text-[#1F6E45] shadow-xs transition active:scale-98"
            >
              <Wallet className="h-4 w-4 stroke-[2.2]" />
              <span>Settlement</span>
            </button>
          )}

          {/* Add New Bill Button */}
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-[14px] font-bold text-white shadow-xs transition active:scale-98"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add New Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. 3-COLUMN FINANCIAL SUMMARY CARDS
      ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Bill Amount */}
        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-[#26332F]">
              Total Bill Amount
            </span>
            <span className="rounded-full bg-[#F0F6F3] text-[#245B52] border border-[#DCEAE2] px-2.5 py-0.5 text-xs font-bold">
              {billTypeFilter === "ALL" ? "All Bills" : `${billTypeFilter} Bills`}
            </span>
          </div>
          <span className="text-[12px] text-[#68756F] block">
            Calculated Sizing Invoiced Value
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-[#26332F] font-financial pt-1">
            {formatINR(summary.totalCredited)}
          </div>
          <p className="text-[13px] text-[#68756F]">
            Total value of yarn sizing ({bills.length} bills)
          </p>
        </div>

        {/* Amount Settled */}
        <div className="rounded-2xl border border-[#C8E5D5] bg-[#EBF5F0]/60 p-6 shadow-xs space-y-2">
          <span className="text-[14px] font-bold text-[#246944] block">
            Amount Settled
          </span>
          <span className="text-[12px] text-[#246944]/80 block">
            Paid from Society Treasury
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-[#246944] font-financial pt-1">
            {formatINR(summary.amountSettled)}
          </div>
          <p className="text-[13px] text-[#246944]/90 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Settled and deducted from bank treasury
          </p>
        </div>

        {/* Balance Pending */}
        <div className="rounded-2xl border border-[#F7E4BE] bg-[#FEF8EC]/60 p-6 shadow-xs space-y-2">
          <span className="text-[14px] font-bold text-[#975A16] block">
            Balance Pending
          </span>
          <span className="text-[12px] text-[#975A16]/80 block">
            Outstanding Due Pending Settlement
          </span>
          <div className="text-3xl sm:text-4xl font-bold text-[#975A16] font-financial pt-1">
            {formatINR(summary.amountOutstanding)}
          </div>
          <p className="text-[13px] text-[#975A16]/90 flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Outstanding amount yet to be settled
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. SEARCH & DATE & STATUS FILTERS
      ========================================================================= */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#68756F]" />
          <input
            type="text"
            placeholder={`Search ${billTypeFilter === "ALL" ? "" : billTypeFilter} bill number or notes...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] pl-10 pr-3.5 py-2.5 text-sm text-[#26332F] outline-none focus:border-[#245B52] focus:bg-white font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Filters */}
          <div className="flex items-center gap-1.5 bg-[#F7F8F5] border border-[#E5E9E3] rounded-xl px-2.5 py-1.5 text-xs text-[#26332F]">
            <Calendar className="h-3.5 w-3.5 text-[#68756F]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-[#26332F] outline-none font-medium"
              title="Start Date"
            />
            <span className="text-[#68756F]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-[#26332F] outline-none font-medium"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-[11px] font-bold text-[#B93838] hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#68756F]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] px-3 py-2 text-xs font-semibold text-[#26332F] outline-none focus:border-[#245B52]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Due</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Settled</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. SIZING BILLS TABLE (VETTI / SAREE)
      ========================================================================= */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E9E3] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E9E3] bg-[#F7F8F5] text-[#26332F] font-semibold text-[13px]">
              <tr>
                <th className="py-3.5 px-4">Bill No</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">No of Beams</th>
                <th className="py-3.5 px-4 text-right">No of Bags</th>
                <th className="py-3.5 px-4 text-right">Bags in kg</th>
                <th className="py-3.5 px-4 text-right">Total Weight</th>
                <th className="py-3.5 px-4 text-right">Rate/kg (₹)</th>
                <th className="py-3.5 px-4 text-right font-bold">Total Value (₹)</th>
                <th className="py-3.5 px-4 text-right text-[#246944]">Settled (₹)</th>
                <th className="py-3.5 px-4 text-right text-[#975A16]">Pending (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#68756F]">
                    Loading sizing bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#68756F]">
                    No {billTypeFilter === "ALL" ? "" : billTypeFilter} bills found. Click &quot;+ Add New Bill&quot; to create one.
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F7F8F5] transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#245B52]">
                      {b.billNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          b.billType === "VETTI"
                            ? "bg-[#E6F4EA] text-[#1E7E34] border border-[#C3E6CB]"
                            : "bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]"
                        }`}
                      >
                        {b.billType === "VETTI" ? "Vetti" : "Saree"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#68756F]">
                      {new Date(b.billDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#245B52]">
                      {b.numberOfBeams != null ? `${b.numberOfBeams} Beams` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold">
                      {b.noOfBags || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {b.bagWeightKg ? `${b.bagWeightKg} kg` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#245B52]">
                      {b.totalKg ? `${b.totalKg} kg` : b.quantity ? `${b.quantity} kg` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {formatINR(b.ratePerKg || b.rate || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#26332F] font-financial text-[15px]">
                      {formatINR(b.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#246944] font-financial text-[15px]">
                      {formatINR(b.amountSettled)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#975A16] font-financial text-[15px]">
                      {formatINR(b.outstandingAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          b.paymentStatus === "PAID"
                            ? "bg-[#EBF5F0] text-[#246944] border border-[#C8E5D5]"
                            : b.paymentStatus === "PARTIALLY_PAID"
                            ? "bg-[#F0F6F3] text-[#245B52] border border-[#DCEAE2]"
                            : "bg-[#FEF8EC] text-[#975A16] border border-[#F7E4BE]"
                        }`}
                      >
                        {b.paymentStatus === "PAID"
                          ? "Fully Paid"
                          : b.paymentStatus === "PARTIALLY_PAID"
                          ? "Partially Paid"
                          : "Pending Due"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(b)}
                          className="rounded-xl border border-[#DCEAE2] bg-[#F0F6F3] hover:bg-[#DCEAE2] px-2.5 py-1.5 text-xs font-semibold text-[#245B52] transition flex items-center gap-1"
                          title="View complete bill details and settlements"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                        {b.outstandingAmount > 0 && ["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
                          <button
                            type="button"
                            onClick={() => handleOpenSettlement(b)}
                            className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition"
                          >
                            Settle
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
          5. ADD NEW SIZING BILL MODAL
          - Optional Number of Beams
          - No of bags, bags in kg, rate per kg
          - Live calculation decides total value
      ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Add New {form.billType === "VETTI" ? "Vetti" : "Saree"} Bill
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  {form.billType === "VETTI" ? "Vetti" : "Saree"} sizing bill entry • No of bags × Bags in kg × Rate per kg
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

            <form onSubmit={handleCreate} className="mt-5 space-y-4 text-xs">
              {/* Type Switcher inside Modal */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1.5">
                  Yarn Sizing Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, billType: "VETTI" })}
                    className={`rounded-xl py-2.5 font-bold text-center border transition ${
                      form.billType === "VETTI"
                        ? "bg-[#245B52] text-white border-[#245B52] shadow-xs"
                        : "bg-[#F7F8F5] text-[#26332F] border-[#E5E9E3] hover:bg-white"
                    }`}
                  >
                    Vetti Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, billType: "SAREE" })}
                    className={`rounded-xl py-2.5 font-bold text-center border transition ${
                      form.billType === "SAREE"
                        ? "bg-[#245B52] text-white border-[#245B52] shadow-xs"
                        : "bg-[#F7F8F5] text-[#26332F] border-[#E5E9E3] hover:bg-white"
                    }`}
                  >
                    Saree Bill
                  </button>
                </div>
              </div>

              {/* Bill Number & Bill Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    Bill Number
                  </label>
                  <input
                    type="text"
                    value={form.billNumber}
                    onChange={(e) => setForm({ ...form, billNumber: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-mono text-sm"
                    placeholder="Auto generated"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.billDate}
                    onChange={(e) => setForm({ ...form, billDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Number of Beams (Optional - New Field) */}
              <div className="rounded-xl border border-[#D5DDD2] bg-[#F7F8F5] p-3">
                <label className="font-bold text-[#26332F] block mb-1">
                  Number of Beams <span className="text-xs font-normal text-[#68756F]">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.numberOfBeams}
                  onChange={(e) => setForm({ ...form, numberOfBeams: e.target.value })}
                  placeholder="Enter beam count (optional, e.g. 4)"
                  className="w-full rounded-xl border border-[#E5E9E3] bg-white p-2.5 font-semibold text-sm text-[#26332F]"
                />
                <span className="text-[11px] text-[#68756F] mt-1 block">
                  Optional field: Users can save the bill with or without entering the number of beams.
                </span>
              </div>

              {/* No of Bags & Bags in kg */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">
                    No of Bags *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={form.noOfBags || ""}
                    onChange={(e) =>
                      setForm({ ...form, noOfBags: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-base text-[#26332F]"
                  />
                  <span className="text-[11px] text-[#68756F] mt-0.5 block">
                    Bags count
                  </span>
                </div>
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">
                    Bags in kg (Weight per Bag) *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={form.bagWeightKg || ""}
                    onChange={(e) =>
                      setForm({ ...form, bagWeightKg: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-base text-[#26332F]"
                  />
                  <span className="text-[11px] text-[#68756F] mt-0.5 block">
                    Weight in kg per bag
                  </span>
                </div>
              </div>

              {/* Rate per kg */}
              <div className="pt-1">
                <label className="font-bold text-[#26332F] block mb-1">
                  Rate per kg (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-[#68756F]">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={form.ratePerKg || ""}
                    onChange={(e) =>
                      setForm({ ...form, ratePerKg: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[#E5E9E3] pl-8 pr-3 p-2.5 font-bold text-base text-[#26332F]"
                  />
                </div>
                <span className="text-[11px] text-[#68756F] mt-0.5 block">
                  Sizing charges per kilogram
                </span>
              </div>

              {/* LIVE CALCULATION CARD (DECIDES TOTAL VALUE) */}
              <div className="rounded-2xl bg-[#F0F6F3] border border-[#C8E5D5] p-4.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#245B52]">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Calculator className="h-4 w-4" />
                    Calculation Breakdown:
                  </span>
                  <span className="font-mono font-bold">
                    {form.noOfBags || 0} bags × {form.bagWeightKg || 0} kg ={" "}
                    <strong>{totalWeightKg.toLocaleString("en-IN")} kg</strong>
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-[#DCEAE2]">
                  <div>
                    <span className="font-bold text-[#245B52] text-sm block">
                      Total Bill Amount:
                    </span>
                    <span className="text-[11px] text-[#68756F]">
                      {totalWeightKg} kg × ₹{form.ratePerKg || 0}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-[#245B52] font-financial">
                    {formatINR(calculatedTotalAmount)}
                  </span>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="font-semibold text-[#68756F] block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-xs"
                  placeholder="Yarn count / mill reference"
                />
              </div>

              {/* Modal Actions */}
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
                  className="rounded-xl bg-[#245B52] px-6 py-2.5 font-bold text-white hover:bg-[#1D4B43] shadow-xs transition active:scale-98"
                >
                  Save Bill ({formatINR(calculatedTotalAmount)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. SETTLEMENT MODAL WITH LIQUID CASH & BANK ACCOUNT OPTIONS
      ========================================================================= */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Record Settlement
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Pay via Liquid Cash or Bank Account treasury.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettle} className="mt-5 space-y-4 text-xs">
              {/* Select Bill to Settle */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Select Sizing Bill to Settle *
                </label>
                <select
                  required
                  value={settleForm.selectedBillId}
                  onChange={(e) => handleBillSelectChange(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                >
                  <option value="">-- Choose a pending bill --</option>
                  {pendingBillsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.billNumber} ({b.billType}){b.numberOfBeams ? ` • ${b.numberOfBeams} beams` : ""} • Total: {formatINR(b.totalAmount)} • Due:{" "}
                      {formatINR(b.outstandingAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {activeBill && (
                <div className="rounded-xl bg-[#FEF8EC] border border-[#F7E4BE] p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#975A16] font-semibold">Bill No:</span>
                    <span className="font-bold font-mono text-[#26332F]">{activeBill.billNumber}</span>
                  </div>
                  {activeBill.numberOfBeams && (
                    <div className="flex justify-between">
                      <span className="text-[#975A16] font-semibold">Number of Beams:</span>
                      <span className="font-bold text-[#26332F]">{activeBill.numberOfBeams} Beams</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#975A16] font-semibold">Current Pending Due:</span>
                    <span className="font-bold text-base text-[#975A16] font-financial">
                      {formatINR(activeBill.outstandingAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Settlement Amount */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Settlement Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={activeBill?.outstandingAmount || undefined}
                  step="any"
                  required
                  value={settleForm.amount || ""}
                  onChange={(e) =>
                    setSettleForm({ ...settleForm, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-base text-[#26332F] font-financial"
                  placeholder="Enter amount to pay"
                />
              </div>

              {/* PAYMENT METHOD SELECTOR: LIQUID CASH vs BANK ACCOUNT */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1.5">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSettleForm({
                        ...settleForm,
                        paymentMethod: "LIQUID_CASH",
                        bankAccountId: "society_liquid_cash",
                      })
                    }
                    className={`rounded-xl p-3 text-left border transition ${
                      settleForm.paymentMethod === "LIQUID_CASH"
                        ? "bg-[#F0F6F3] border-[#245B52] shadow-xs ring-1 ring-[#245B52]"
                        : "bg-[#F7F8F5] border-[#E5E9E3] hover:bg-white"
                    }`}
                  >
                    <div className="font-bold text-[#245B52] flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" />
                      <span>Liquid Cash</span>
                    </div>
                    <div className="text-[11px] text-[#68756F] mt-0.5">Physical Cash in Hand</div>
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
                    className={`rounded-xl p-3 text-left border transition ${
                      settleForm.paymentMethod === "BANK_TRANSFER"
                        ? "bg-[#F0F6F3] border-[#245B52] shadow-xs ring-1 ring-[#245B52]"
                        : "bg-[#F7F8F5] border-[#E5E9E3] hover:bg-white"
                    }`}
                  >
                    <div className="font-bold text-[#245B52] flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />
                      <span>Bank Account</span>
                    </div>
                    <div className="text-[11px] text-[#68756F] mt-0.5">Direct Bank Disbursement</div>
                    <div className="text-xs font-semibold text-[#68756F] mt-1">
                      {banks.length} accounts
                    </div>
                  </button>
                </div>
              </div>

              {/* If Bank selected, show Bank Account dropdown */}
              {settleForm.paymentMethod === "BANK_TRANSFER" && (
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">
                    Select Bank Account *
                  </label>
                  <select
                    required
                    value={settleForm.bankAccountId}
                    onChange={(e) => setSettleForm({ ...settleForm, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                  >
                    <option value="">-- Select Bank Account --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} ({b.bankName}) • Current Balance: {formatINR(b.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* BALANCE IMPACT PREVIEW */}
              {settleForm.paymentMethod === "LIQUID_CASH" ? (
                <div className="rounded-xl bg-[#F0F6F3] border border-[#C8E5D5] p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[#245B52]">
                    <span>Society Liquid Cash Before:</span>
                    <span className="font-bold font-financial">{formatINR(liquidCashBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#B93838] font-semibold">
                    <span>Less Settle Amount:</span>
                    <span className="font-bold font-financial">- {formatINR(settleForm.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#DCEAE2] text-[#245B52] font-bold">
                    <span>Liquid Cash Balance After:</span>
                    <span className={`text-sm font-financial font-black ${liquidCashAfterSettle < 0 ? "text-[#B93838]" : ""}`}>
                      {formatINR(liquidCashAfterSettle)}
                    </span>
                  </div>
                  {liquidCashAfterSettle < 0 && (
                    <p className="text-[11px] text-[#B93838] font-bold">
                      Warning: Insufficient liquid cash balance. Please deposit cash or choose a bank account.
                    </p>
                  )}
                  {activeBill && (
                    <div className="flex justify-between items-center pt-1 border-t border-[#DCEAE2] text-[#975A16] font-semibold">
                      <span>Pending Bill Due After:</span>
                      <span className="text-sm font-financial font-bold">
                        {formatINR(Math.max(0, pendingDueAfterSettle))}
                      </span>
                    </div>
                  )}
                </div>
              ) : selectedBank ? (
                <div className="rounded-xl bg-[#F0F6F3] border border-[#C8E5D5] p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[#245B52]">
                    <span>Bank Balance Before:</span>
                    <span className="font-bold font-financial">{formatINR(currentBankBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#B93838] font-semibold">
                    <span>Less Settle Amount:</span>
                    <span className="font-bold font-financial">- {formatINR(settleForm.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#DCEAE2] text-[#245B52] font-bold">
                    <span>Bank Balance After Settlement:</span>
                    <span className="text-sm font-financial font-black">
                      {formatINR(bankBalanceAfterSettle)}
                    </span>
                  </div>
                  {activeBill && (
                    <div className="flex justify-between items-center pt-1 border-t border-[#DCEAE2] text-[#975A16] font-semibold">
                      <span>Pending Bill Due After:</span>
                      <span className="text-sm font-financial font-bold">
                        {formatINR(Math.max(0, pendingDueAfterSettle))}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Payment Ref & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    Settlement Date
                  </label>
                  <input
                    type="date"
                    required
                    value={settleForm.settlementDate}
                    onChange={(e) => setSettleForm({ ...settleForm, settlementDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    {settleForm.paymentMethod === "LIQUID_CASH" ? "Cash Voucher / Ref No" : "UTR / Cheque / Ref No"}
                  </label>
                  <input
                    type="text"
                    value={settleForm.referenceNo}
                    onChange={(e) => setSettleForm({ ...settleForm, referenceNo: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                    placeholder={settleForm.paymentMethod === "LIQUID_CASH" ? "Cash Voucher No" : "UTR / Cheque No"}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-[#68756F] block mb-1">
                  Notes / Narration
                </label>
                <input
                  type="text"
                  value={settleForm.notes}
                  onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  placeholder="Settlement remarks"
                />
              </div>

              {/* Modal Buttons */}
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
                  disabled={settleForm.paymentMethod === "LIQUID_CASH" && liquidCashAfterSettle < 0}
                  className="rounded-xl bg-[#245B52] px-6 py-2.5 font-bold text-white hover:bg-[#1D4B43] shadow-xs transition active:scale-98 disabled:opacity-50"
                >
                  Confirm Settlement ({formatINR(settleForm.amount || 0)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. SIZING BILL DETAIL MODAL
      ========================================================================= */}
      {showDetailModal && detailBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xl text-[#245B52]">{detailBill.billNumber}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    detailBill.billType === "VETTI" ? "bg-[#E6F4EA] text-[#1E7E34]" : "bg-[#E8F0FE] text-[#1A73E8]"
                  }`}>
                    {detailBill.billType} Sizing
                  </span>
                </div>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Full details and settlement history
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-5 text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-3">
                  <span className="text-[#68756F] block">Total Amount</span>
                  <span className="text-lg font-bold text-[#26332F] font-financial">
                    {formatINR(detailBill.totalAmount)}
                  </span>
                </div>
                <div className="rounded-xl border border-[#C8E5D5] bg-[#EBF5F0] p-3">
                  <span className="text-[#246944] block">Amount Settled</span>
                  <span className="text-lg font-bold text-[#246944] font-financial">
                    {formatINR(detailBill.amountSettled)}
                  </span>
                </div>
                <div className="rounded-xl border border-[#F7E4BE] bg-[#FEF8EC] p-3">
                  <span className="text-[#975A16] block">Outstanding Balance</span>
                  <span className="text-lg font-bold text-[#975A16] font-financial">
                    {formatINR(detailBill.outstandingAmount)}
                  </span>
                </div>
              </div>

              {/* Bill Parameters Grid */}
              <div className="rounded-xl border border-[#E5E9E3] p-4 bg-white grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[#68756F] block">Bill Date:</span>
                  <span className="font-bold text-[#26332F]">
                    {new Date(detailBill.billDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[#68756F] block">Number of Beams:</span>
                  <span className="font-bold text-[#245B52]">
                    {detailBill.numberOfBeams != null ? `${detailBill.numberOfBeams} Beams` : "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-[#68756F] block">No of Bags:</span>
                  <span className="font-bold text-[#26332F]">{detailBill.noOfBags} Bags</span>
                </div>
                <div>
                  <span className="text-[#68756F] block">Weight per Bag:</span>
                  <span className="font-bold text-[#26332F]">{detailBill.bagWeightKg} kg</span>
                </div>
                <div>
                  <span className="text-[#68756F] block">Total Weight:</span>
                  <span className="font-bold text-[#245B52]">{detailBill.totalKg} kg</span>
                </div>
                <div>
                  <span className="text-[#68756F] block">Rate per kg:</span>
                  <span className="font-bold text-[#26332F]">₹{detailBill.ratePerKg}/kg</span>
                </div>
                {detailBill.notes && (
                  <div className="col-span-2 sm:col-span-3 border-t border-[#E5E9E3] pt-2">
                    <span className="text-[#68756F] block">Notes:</span>
                    <span className="font-medium text-[#26332F]">{detailBill.notes}</span>
                  </div>
                )}
              </div>

              {/* Settlement History */}
              <div>
                <h4 className="font-bold text-sm text-[#26332F] mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#245B52]" />
                  Settlement History ({detailBill.settlements?.length || 0})
                </h4>
                {(!detailBill.settlements || detailBill.settlements.length === 0) ? (
                  <div className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-4 text-center text-[#68756F]">
                    No settlements recorded yet for this bill.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#E5E9E3]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F8F5] border-b border-[#E5E9E3] font-semibold text-[#26332F]">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Settlement / Voucher No</th>
                          <th className="py-2.5 px-3">Payment Source</th>
                          <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E9E3]">
                        {detailBill.settlements.map((st: any) => (
                          <tr key={st.id} className="hover:bg-[#F7F8F5]">
                            <td className="py-2.5 px-3 whitespace-nowrap text-[#68756F]">
                              {new Date(st.settlementDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#245B52]">
                              {st.settlementNumber || st.referenceNo || "-"}
                            </td>
                            <td className="py-2.5 px-3">
                              {st.paymentMethod === "LIQUID_CASH" ? (
                                <span className="rounded-full bg-[#F0F6F3] text-[#245B52] border border-[#C8E5D5] px-2 py-0.5 text-[10px] font-bold">
                                  Liquid Cash
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] px-2 py-0.5 text-[10px] font-bold">
                                  {st.bankAccount?.bankName || "Bank Transfer"}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#246944] font-financial">
                              {formatINR(st.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="rounded-xl bg-[#245B52] px-5 py-2 font-bold text-white hover:bg-[#1D4B43]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
