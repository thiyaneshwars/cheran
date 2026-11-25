"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Plus,
  Search,
  Download,
  CheckCircle2,
  Clock,
  Layers,
  Wallet,
  Calculator,
  UserPlus,
  MapPin,
  FileText,
  BadgePercent,
  Coins,
  Check,
  Trash2,
  Eye,
  Edit2,
  Calendar,
  Filter,
  DollarSign,
  Building2,
  ArrowRight,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

interface PowerloomViewProps {
  banks: any[];
  parties: any[];
  userRole: string;
  onRefresh?: () => void;
}

export const PowerloomView: React.FC<PowerloomViewProps> = ({
  banks,
  parties,
  userRole,
  onRefresh,
}) => {
  // Category Switcher: "ALL" | "VETTI" | "SAREE" (Defaults to "ALL" so all saved entries are visible!)
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "VETTI" | "SAREE">("ALL");

  // Section Tab: "CONTRACTS" (Main Table) | "ADVANCE_SETTLEMENT" (Dedicated Advance & Settlement Section)
  const [activeSectionTab, setActiveSectionTab] = useState<"CONTRACTS" | "ADVANCE_SETTLEMENT">("CONTRACTS");

  const [records, setRecords] = useState<any[]>([]);
  const [weavers, setWeavers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalCredited: 0, amountSettled: 0, amountOutstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWeaverModal, setShowWeaverModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [activeRecord, setActiveRecord] = useState<any>(null);

  // Liquid Cash Balance
  const [liquidCashBalance, setLiquidCashBalance] = useState<number>(0);

  // Dedicated Advance Form State
  const [advanceForm, setAdvanceForm] = useState({
    weaverId: "",
    weaverName: "",
    weaverLocation: "",
    category: "VETTI" as "VETTI" | "SAREE",
    advanceAmount: "" as string | number,
    totalAmountToSettle: "" as string | number,
    paymentSource: "LIQUID_CASH" as "LIQUID_CASH" | "BANK_TRANSFER",
    bankAccountId: "",
    advanceDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // New Weaver form state
  const [weaverForm, setWeaverForm] = useState({
    name: "",
    location: "",
    category: "VETTI" as "VETTI" | "SAREE",
    phone: "",
    loomCount: 1,
    notes: "",
  });

  // Record Powerloom Contract form state (Contract/Voucher Number removed)
  const [form, setForm] = useState({
    category: "VETTI" as "VETTI" | "SAREE",
    weaverName: "",
    weaverLocation: "",
    loomReference: "",
    transactionDate: new Date().toISOString().split("T")[0],
    noOfPaavu: "" as string | number,
    totalMeters: "" as string | number,
    wageRate: "" as string | number,
    weftBags: "" as string | number,
    weftKg: "" as string | number,
    bobbinSets: "" as string | number,
    // Advance Amount & Settlement fields
    advanceDate: new Date().toISOString().split("T")[0],
    advancePaid: "" as string | number,
    advanceSource: "LIQUID_CASH" as "LIQUID_CASH" | "BANK_TRANSFER" | "EXISTING_ADVANCE",
    totalAmount: "" as string | number, // Total Amount to Be Settled
    advanceIncludedInSettled: false,
    dueDate: "",
    bankAccountId: "",
    notes: "",
  });

  // Edit Powerloom Form State
  const [editForm, setEditForm] = useState({
    id: "",
    weaverName: "",
    weaverLocation: "",
    loomReference: "",
    noOfPaavu: "" as string | number,
    totalMeters: "" as string | number,
    wageRate: "" as string | number,
    weftBags: "" as string | number,
    weftKg: "" as string | number,
    bobbinSets: "" as string | number,
    advanceDate: "",
    advancePaid: "" as string | number,
    totalAmount: "" as string | number,
    dueDate: "",
    notes: "",
  });

  // Settlement Form state
  const [settleForm, setSettleForm] = useState({
    selectedRecordId: "",
    amount: 0,
    bankAccountId: "society_liquid_cash",
    paymentMethod: "LIQUID_CASH" as "LIQUID_CASH" | "BANK_TRANSFER" | "EXISTING_ADVANCE",
    referenceNo: "",
    notes: "",
    settlementDate: new Date().toISOString().split("T")[0],
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

  // Fetch Weavers
  const fetchWeavers = async () => {
    try {
      const res = await fetch("/api/sections/powerloom/weavers");
      if (res.ok) {
        const data = await res.json();
        setWeavers(data || []);
      }
    } catch (err) {
      console.error("Failed to load weavers:", err);
    }
  };

  // Fetch Contracts / Records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/sections/powerloom", window.location.origin);
      if (categoryFilter !== "ALL") {
        url.searchParams.set("category", categoryFilter);
      }
      if (search) url.searchParams.set("search", search);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);

      const res = await fetch(url.toString());
      const data = await res.json();
      setRecords(data.records || []);
      setSummary(data.summary || { totalCredited: 0, amountSettled: 0, amountOutstanding: 0 });
    } catch (err: any) {
      console.error("Failed to load powerloom contracts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeavers();
    fetchLiquidCash();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [categoryFilter, search, statusFilter, startDate, endDate]);

  const handleCategoryTabChange = (cat: "ALL" | "VETTI" | "SAREE") => {
    setCategoryFilter(cat);
    if (cat === "VETTI" || cat === "SAREE") {
      setForm((prev) => ({ ...prev, category: cat }));
      setWeaverForm((prev) => ({ ...prev, category: cat }));
    }
  };

  // Live calculations for contract modal
  const formMeters = parseFloat(form.totalMeters.toString()) || 0;
  const formRate = parseFloat(form.wageRate.toString()) || 0;
  const formAdvance = parseFloat(form.advancePaid.toString()) || 0;
  const grossWagesCalculated = formMeters * formRate;

  // Auto total to be settled if not manually entered
  const defaultTotalToSettle = grossWagesCalculated > 0
    ? (form.advanceIncludedInSettled ? grossWagesCalculated : Math.max(0, grossWagesCalculated - formAdvance))
    : formAdvance;

  const currentTotalAmount = form.totalAmount !== "" ? (parseFloat(form.totalAmount.toString()) || 0) : defaultTotalToSettle;
  const currentSettled = form.advanceIncludedInSettled ? formAdvance : 0;
  const currentRemainingBalance = Math.max(0, currentTotalAmount - currentSettled);

  // Open Contract Create Modal
  const handleOpenCreateModal = () => {
    fetchWeavers();
    const currentCat = categoryFilter === "SAREE" ? "SAREE" : "VETTI";
    const availableWeavers = weavers.filter((w) => categoryFilter === "ALL" || w.category === currentCat);
    const defaultWeaver = availableWeavers[0] || weavers[0] || null;

    setForm({
      category: defaultWeaver ? (defaultWeaver.category as "VETTI" | "SAREE") : currentCat,
      weaverName: defaultWeaver ? defaultWeaver.name : "",
      weaverLocation: defaultWeaver ? defaultWeaver.location : "",
      loomReference: defaultWeaver ? `Loom #1-${defaultWeaver.loomCount || 1}` : "",
      transactionDate: new Date().toISOString().split("T")[0],
      noOfPaavu: defaultWeaver?.paavuCount && defaultWeaver.paavuCount > 0 ? defaultWeaver.paavuCount : "",
      totalMeters: defaultWeaver?.paavuMeters && defaultWeaver.paavuMeters > 0 ? defaultWeaver.paavuMeters : "",
      wageRate: "",
      weftBags: "",
      weftKg: "",
      bobbinSets: "",
      advanceDate: new Date().toISOString().split("T")[0],
      advancePaid: defaultWeaver?.availableAdvance && defaultWeaver.availableAdvance > 0 ? defaultWeaver.availableAdvance : "",
      advanceSource: defaultWeaver?.availableAdvance > 0 ? "EXISTING_ADVANCE" : (liquidCashBalance > 0 ? "LIQUID_CASH" : "BANK_TRANSFER"),
      totalAmount: "",
      advanceIncludedInSettled: false,
      dueDate: "",
      bankAccountId: banks[0]?.id || "",
      notes: "",
    });
    fetchLiquidCash();
    setShowCreateModal(true);
  };

  // Open Weaver Registration Modal
  const handleOpenWeaverModal = () => {
    fetchWeavers();
    setWeaverForm({
      name: "",
      location: "",
      category: categoryFilter === "SAREE" ? "SAREE" : "VETTI",
      phone: "",
      loomCount: 1,
      notes: "",
    });
    setShowWeaverModal(true);
  };

  // Handle Weaver Registration Submit
  const handleRegisterWeaver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/sections/powerloom/weavers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weaverForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register weaver");
      alert("Weaver registered successfully.");
      setShowWeaverModal(false);
      fetchWeavers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Weaver Selection in Contract Modal
  const handleSelectWeaverInForm = (weaverId: string) => {
    const chosen = weavers.find((w) => w.id === weaverId);
    if (chosen) {
      const availAdv = chosen.availableAdvance || 0;
      setForm((prev) => ({
        ...prev,
        weaverName: chosen.name,
        weaverLocation: chosen.location || "",
        category: (chosen.category as "VETTI" | "SAREE") || prev.category,
        loomReference: chosen.loomCount ? `Loom #1-${chosen.loomCount}` : prev.loomReference,
        noOfPaavu: chosen.paavuCount && chosen.paavuCount > 0 ? chosen.paavuCount : prev.noOfPaavu,
        totalMeters: chosen.paavuMeters && chosen.paavuMeters > 0 ? chosen.paavuMeters : prev.totalMeters,
        advanceSource: availAdv > 0 ? "EXISTING_ADVANCE" : prev.advanceSource,
        advancePaid: availAdv > 0 ? availAdv : prev.advancePaid,
      }));
    }
  };

  // Handle Contract Create Submit (No Contract / Voucher No required)
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const weaverNameToUse = form.weaverName.trim() || "General Powerloom Unit";
      const advAmt = parseFloat(form.advancePaid.toString()) || 0;

      if (advAmt > 0 && form.advanceSource === "LIQUID_CASH" && advAmt > liquidCashBalance) {
        alert(`Insufficient Liquid Cash balance (${formatINR(liquidCashBalance)}) for advance payment.`);
        return;
      }

      const totalToSettle = form.totalAmount !== ""
        ? parseFloat(form.totalAmount.toString())
        : (grossWagesCalculated > 0
            ? (form.advanceIncludedInSettled ? grossWagesCalculated : Math.max(0, grossWagesCalculated - advAmt))
            : advAmt);

      const res = await fetch("/api/sections/powerloom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          weaverName: weaverNameToUse,
          weaverLocation: form.weaverLocation || undefined,
          loomReference: form.loomReference || undefined,
          transactionDate: form.transactionDate,
          noOfPaavu: parseFloat(form.noOfPaavu.toString()) || 0,
          totalMeters: parseFloat(form.totalMeters.toString()) || 0,
          wageRate: parseFloat(form.wageRate.toString()) || 0,
          grossWages: grossWagesCalculated > 0 ? grossWagesCalculated : undefined,
          weftBags: parseFloat(form.weftBags.toString()) || 0,
          weftKg: parseFloat(form.weftKg.toString()) || 0,
          bobbinSets: parseFloat(form.bobbinSets.toString()) || 0,
          advanceDate: form.advanceDate || form.transactionDate,
          advancePaid: advAmt,
          totalAmount: totalToSettle,
          advanceIncludedInSettled: form.advanceIncludedInSettled,
          paymentMethod: advAmt > 0 ? form.advanceSource : "BANK_TRANSFER",
          bankAccountId: form.advanceSource === "LIQUID_CASH" ? "society_liquid_cash" : (form.bankAccountId || undefined),
          dueDate: form.dueDate || undefined,
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create powerloom record");

      alert(`${form.category === "VETTI" ? "Vetti" : "Saree"} powerloom record saved successfully.`);
      setShowCreateModal(false);
      fetchRecords();
      fetchWeavers();
      fetchLiquidCash();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Settlement Modal
  const handleOpenSettlement = (record?: any) => {
    const target = record || records.find((r) => r.outstandingAmount > 0) || null;
    setActiveRecord(target);

    // Look up weaver's unadjusted advance credit
    const targetWeaver = target
      ? weavers.find(
          (w) => w.name && target.weaverName && w.name.trim().toLowerCase() === target.weaverName.trim().toLowerCase()
        )
      : null;
    const targetAdv = targetWeaver?.availableAdvance || 0;

    const defaultMethod = targetAdv > 0
      ? "EXISTING_ADVANCE"
      : (liquidCashBalance >= (target?.outstandingAmount || 0) ? "LIQUID_CASH" : "BANK_TRANSFER");

    setSettleForm({
      selectedRecordId: target ? target.id : "",
      amount: target ? target.outstandingAmount : 0,
      bankAccountId: defaultMethod === "LIQUID_CASH" ? "society_liquid_cash" : (banks[0]?.id || ""),
      paymentMethod: defaultMethod,
      referenceNo: "",
      notes: "",
      settlementDate: new Date().toISOString().split("T")[0],
    });
    fetchLiquidCash();
    setShowSettleModal(true);
  };

  const handleRecordSelectChange = (recordId: string) => {
    const found = records.find((r) => r.id === recordId);
    setActiveRecord(found || null);

    const targetWeaver = found
      ? weavers.find(
          (w) => w.name && found.weaverName && w.name.trim().toLowerCase() === found.weaverName.trim().toLowerCase()
        )
      : null;
    const targetAdv = targetWeaver?.availableAdvance || 0;

    setSettleForm((prev) => ({
      ...prev,
      selectedRecordId: recordId,
      amount: found ? found.outstandingAmount : 0,
      paymentMethod: targetAdv > 0 ? "EXISTING_ADVANCE" : prev.paymentMethod,
    }));
  };

  // Active weaver advance for settlement preview
  const activeWeaver = activeRecord
    ? weavers.find(
        (w) => w.name && activeRecord.weaverName && w.name.trim().toLowerCase() === activeRecord.weaverName.trim().toLowerCase()
      )
    : null;
  const activeWeaverAdvance = activeWeaver?.availableAdvance || 0;

  // Handle Settlement Submit
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recordToSettle = activeRecord || records.find((r) => r.id === settleForm.selectedRecordId);
    if (!recordToSettle) {
      alert("Please select a valid record to settle.");
      return;
    }
    const settleAmt = parseFloat(settleForm.amount.toString()) || 0;
    if (settleAmt <= 0) {
      alert("Settlement amount must be greater than zero.");
      return;
    }
    if (settleAmt > recordToSettle.outstandingAmount) {
      alert(`Settlement amount cannot exceed pending due (${formatINR(recordToSettle.outstandingAmount)}).`);
      return;
    }

    if (settleForm.paymentMethod === "LIQUID_CASH") {
      if (settleAmt > liquidCashBalance) {
        alert(`Insufficient Liquid Cash balance (${formatINR(liquidCashBalance)}). Available balance is less than settlement amount.`);
        return;
      }
    } else if (settleForm.paymentMethod === "BANK_TRANSFER") {
      if (!settleForm.bankAccountId || settleForm.bankAccountId === "society_liquid_cash") {
        alert("Please select a valid bank account to make the settlement from.");
        return;
      }
    } else if (settleForm.paymentMethod === "EXISTING_ADVANCE") {
      if (settleAmt > activeWeaverAdvance) {
        alert(`Settlement amount cannot exceed weaver's available advance credit (${formatINR(activeWeaverAdvance)}).`);
        return;
      }
    }

    try {
      const res = await fetch(`/api/sections/powerloom/${recordToSettle.id}/settle`, {
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
      if (!res.ok) throw new Error(data.error || "Failed to record settlement");

      alert(data.message || "Settlement recorded successfully!");
      setShowSettleModal(false);
      fetchRecords();
      fetchLiquidCash();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Dedicated Advance & Settlement Quick Submission
  const handlePayAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const advAmt = parseFloat(advanceForm.advanceAmount.toString()) || 0;
    if (advAmt <= 0) {
      alert("Please enter a valid advance amount.");
      return;
    }
    if (!advanceForm.weaverName) {
      alert("Please select a registered powerloom weaver.");
      return;
    }
    if (advanceForm.paymentSource === "LIQUID_CASH" && advAmt > liquidCashBalance) {
      alert(`Insufficient Liquid Cash balance (${formatINR(liquidCashBalance)}). Please choose a bank account or reduce the advance.`);
      return;
    }
    if (advanceForm.paymentSource === "BANK_TRANSFER" && !advanceForm.bankAccountId) {
      alert("Please select a bank account to pay advance from.");
      return;
    }

    const totalToSettle = advanceForm.totalAmountToSettle !== ""
      ? parseFloat(advanceForm.totalAmountToSettle.toString())
      : advAmt;

    try {
      const res = await fetch("/api/sections/powerloom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: advanceForm.category,
          weaverName: advanceForm.weaverName,
          weaverLocation: advanceForm.weaverLocation || undefined,
          advanceDate: advanceForm.advanceDate,
          advancePaid: advAmt,
          totalAmount: totalToSettle,
          paymentMethod: advanceForm.paymentSource,
          bankAccountId: advanceForm.paymentSource === "LIQUID_CASH" ? "society_liquid_cash" : advanceForm.bankAccountId,
          transactionDate: advanceForm.advanceDate,
          notes: advanceForm.notes || "Advance payment recorded",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record advance");

      alert("Advance payment recorded successfully.");
      setShowAdvanceModal(false);
      fetchRecords();
      fetchWeavers();
      fetchLiquidCash();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open View Modal for complete record visibility & settlement history
  const handleOpenViewModal = (record: any) => {
    setActiveRecord(record);
    setShowViewModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (record: any) => {
    setActiveRecord(record);
    setEditForm({
      id: record.id,
      weaverName: record.weaverName || "",
      weaverLocation: record.weaverLocation || "",
      loomReference: record.loomReference || "",
      noOfPaavu: record.noOfPaavu ?? "",
      totalMeters: record.totalMeters ?? "",
      wageRate: record.wageRate ?? "",
      weftBags: record.weftBags ?? "",
      weftKg: record.weftKg ?? "",
      bobbinSets: record.bobbinSets ?? "",
      advanceDate: record.advanceDate ? record.advanceDate.split("T")[0] : "",
      advancePaid: record.advancePaid ?? "",
      totalAmount: record.totalAmount ?? "",
      dueDate: record.dueDate ? record.dueDate.split("T")[0] : "",
      notes: record.notes || "",
    });
    setShowEditModal(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        weaverName: editForm.weaverName,
        weaverLocation: editForm.weaverLocation || null,
        loomReference: editForm.loomReference || null,
        noOfPaavu: parseFloat(editForm.noOfPaavu.toString()) || 0,
        totalMeters: parseFloat(editForm.totalMeters.toString()) || 0,
        wageRate: parseFloat(editForm.wageRate.toString()) || 0,
        weftBags: parseFloat(editForm.weftBags.toString()) || 0,
        weftKg: parseFloat(editForm.weftKg.toString()) || 0,
        bobbinSets: parseFloat(editForm.bobbinSets.toString()) || 0,
        advanceDate: editForm.advanceDate || null,
        advancePaid: parseFloat(editForm.advancePaid.toString()) || 0,
        notes: editForm.notes || null,
        dueDate: editForm.dueDate || null,
      };

      if (editForm.totalAmount !== "") {
        payload.totalAmount = parseFloat(editForm.totalAmount.toString());
      }

      const res = await fetch(`/api/sections/powerloom/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update record");

      alert("Powerloom record updated successfully.");
      setShowEditModal(false);
      fetchRecords();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered lists
  const pendingRecordsList = records.filter((r) => r.outstandingAmount > 0);
  const categoryWeaversList = weavers.filter(
    (w) => categoryFilter === "ALL" || w.category === categoryFilter
  );

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* =========================================================================
          1. PAGE HEADER WITH VETTI / SAREE SWITCHER & ACTION BUTTONS
      ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-3 border-b border-[#E5E9E3]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#245B52]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#26332F] tracking-tight">
              Powerloom Production Register
            </h1>
          </div>
          <p className="text-[14px] text-[#68756F] mt-1">
            Weaving contracts for Vetti & Saree • Paavu, meters, wages, weft bags, and advance tracking
          </p>
        </div>

        {/* Right Corner Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Switcher: All / Vetti / Saree */}
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => handleCategoryTabChange("ALL")}
              className={`rounded-xl px-4 py-2 text-[13px] font-bold transition-all ${
                categoryFilter === "ALL"
                  ? "bg-[#1E2229] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              All ({records.length})
            </button>
            <button
              type="button"
              onClick={() => handleCategoryTabChange("VETTI")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold transition-all ${
                categoryFilter === "VETTI"
                  ? "bg-[#1E2229] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>Vetti</span>
            </button>
            <button
              type="button"
              onClick={() => handleCategoryTabChange("SAREE")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold transition-all ${
                categoryFilter === "SAREE"
                  ? "bg-[#1E2229] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>Saree</span>
            </button>
          </div>

          {/* Manage Weavers */}
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={handleOpenWeaverModal}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-[13px] font-bold text-slate-700 shadow-xs transition"
            >
              <UserPlus className="h-4 w-4 text-slate-500" />
              <span>Weavers ({weavers.length})</span>
            </button>
          )}

          {/* Pay Advance Button */}
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={() => {
                fetchWeavers();
                const available = weavers.filter((w) => categoryFilter === "ALL" || w.category === categoryFilter);
                const firstWeaver = available[0] || weavers[0];
                setAdvanceForm({
                  weaverId: firstWeaver?.id || "",
                  weaverName: firstWeaver?.name || "",
                  weaverLocation: firstWeaver?.location || "",
                  category: (firstWeaver?.category as "VETTI" | "SAREE") || (categoryFilter === "SAREE" ? "SAREE" : "VETTI"),
                  advanceAmount: "",
                  totalAmountToSettle: "",
                  paymentSource: liquidCashBalance > 0 ? "LIQUID_CASH" : "BANK_TRANSFER",
                  bankAccountId: banks[0]?.id || "",
                  advanceDate: new Date().toISOString().split("T")[0],
                  notes: "",
                });
                fetchLiquidCash();
                setShowAdvanceModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#F7E4BE] bg-[#FEF8EC] hover:bg-[#FDF3DE] px-3.5 py-2.5 text-[13px] font-bold text-[#975A16] shadow-xs transition active:scale-98"
            >
              <Coins className="h-4 w-4" />
              <span>Advance & Settlement</span>
            </button>
          )}

          {/* Settlement Button */}
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={() => handleOpenSettlement()}
              className="flex items-center gap-2 rounded-xl border border-[#C8E5D5] bg-[#EBF5F0] hover:bg-[#DCF0E5] px-4 py-2.5 text-[13px] font-bold text-[#1F6E45] shadow-xs transition active:scale-98"
            >
              <Wallet className="h-4 w-4 stroke-[2.2]" />
              <span>Record Settlement</span>
            </button>
          )}

          {/* Add Contract Button */}
          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-[13px] font-bold text-white shadow-xs transition active:scale-98"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. FINANCIAL SUMMARY CARDS
      ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 shadow-xs space-y-1">
          <span className="text-[13px] font-bold text-[#26332F] block">Total Weaving Value</span>
          <span className="text-[11px] text-[#68756F] block">Gross Billing Turnover</span>
          <div className="text-3xl font-bold text-[#26332F] font-financial pt-1">
            {formatINR(summary.totalCredited)}
          </div>
          <p className="text-[12px] text-[#68756F]">
            Across {records.length} total entries
          </p>
        </div>

        <div className="rounded-2xl border border-[#F7E4BE] bg-[#FEF8EC]/60 p-6 shadow-xs space-y-1">
          <span className="text-[13px] font-bold text-[#975A16] block">Total Advances Given</span>
          <span className="text-[11px] text-[#975A16]/80 block">Disbursed Advances</span>
          <div className="text-3xl font-bold text-[#975A16] font-financial pt-1">
            {formatINR(records.reduce((acc, r) => acc + (r.advancePaid || 0), 0))}
          </div>
          <p className="text-[12px] text-[#975A16]">
            Tracked across weaver accounts
          </p>
        </div>

        <div className="rounded-2xl border border-[#C8E5D5] bg-[#EBF5F0]/60 p-6 shadow-xs space-y-1">
          <span className="text-[13px] font-bold text-[#246944] block">Amount Settled</span>
          <span className="text-[11px] text-[#246944]/80 block">Total Payments Completed</span>
          <div className="text-3xl font-bold text-[#246944] font-financial pt-1">
            {formatINR(summary.amountSettled)}
          </div>
          <p className="text-[12px] text-[#246944]">
            Disbursed from Cash or Bank
          </p>
        </div>

        <div className="rounded-2xl border border-[#F7D2D2] bg-[#FDF2F2]/60 p-6 shadow-xs space-y-1">
          <span className="text-[13px] font-bold text-[#B93838] block">Remaining Balance</span>
          <span className="text-[11px] text-[#B93838]/80 block">Outstanding Payable Dues</span>
          <div className="text-3xl font-bold text-[#B93838] font-financial pt-1">
            {formatINR(summary.amountOutstanding)}
          </div>
          <p className="text-[12px] text-[#B93838]">
            Total to Settle − Settled
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. SECTION NAVIGATION TABS: ALL ENTRIES vs ADVANCE AMOUNT & SETTLEMENT
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setActiveSectionTab("CONTRACTS")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeSectionTab === "CONTRACTS"
                ? "bg-[#14233C] text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Powerloom Production Entries ({records.length})
          </button>
          <button
            onClick={() => setActiveSectionTab("ADVANCE_SETTLEMENT")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeSectionTab === "ADVANCE_SETTLEMENT"
                ? "bg-[#14233C] text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Advance Amount &amp; Settlement Tracker
          </button>
        </div>

        {/* Liquid Cash Live Badge */}
        <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-1.5 text-xs text-slate-800 shadow-xs">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-slate-500">Liquid Cash:</span>
          <strong className="font-financial font-bold text-slate-900">{formatINR(liquidCashBalance)}</strong>
        </div>
      </div>

      {/* =========================================================================
          4. SEARCH & DATE RANGE FILTERS
      ========================================================================= */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#68756F]" />
            <input
              type="text"
              placeholder="Search weaver name, location, entry id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] pl-10 pr-3.5 py-2 text-xs text-[#26332F] outline-none focus:border-[#245B52] focus:bg-white font-medium"
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
            {(startDate || endDate || search || statusFilter) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSearch("");
                  setStatusFilter("");
                }}
                className="rounded-xl border border-[#E5E9E3] px-3 py-2 text-xs font-semibold text-[#68756F] hover:bg-[#F7F8F5] whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. MAIN SECTION DISPLAY
      ========================================================================= */}
      {activeSectionTab === "CONTRACTS" ? (
        /* TABLE A: COMPLETE POWERLOOM PRODUCTION ENTRIES TABLE */
        <div className="overflow-hidden rounded-2xl border border-[#E5E9E3] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E9E3] bg-[#F7F8F5] text-[#26332F] font-semibold text-[13px]">
                <tr>
                  <th className="py-3.5 px-4">Entry / Ref</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Weaver & Location</th>
                  <th className="py-3.5 px-4 text-right">Paavu</th>
                  <th className="py-3.5 px-4 text-right">Meters</th>
                  <th className="py-3.5 px-4 text-right">Rate (₹)</th>
                  <th className="py-3.5 px-4 text-right">Gross (₹)</th>
                  <th className="py-3.5 px-4 text-right text-[#975A16]">Advance (₹)</th>
                  <th className="py-3.5 px-4 text-right font-bold">Total to Settle (₹)</th>
                  <th className="py-3.5 px-4 text-right text-[#246944]">Settled (₹)</th>
                  <th className="py-3.5 px-4 text-right text-[#B93838]">Balance (₹)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-[#68756F]">
                      Loading powerloom records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-[#68756F]">
                      No powerloom records found. Click &quot;Add Entry&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F7F8F5] transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#245B52]">
                        {r.transactionNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            r.category === "VETTI"
                              ? "bg-[#E6F4EA] text-[#1E7E34] border border-[#C3E6CB]"
                              : "bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]"
                          }`}
                        >
                          {r.category === "VETTI" ? "Vetti" : "Saree"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#68756F] text-xs">
                        {new Date(r.transactionDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#26332F]">
                          {r.weaverName || r.party?.name || "Powerloom Weaver"}
                        </div>
                        {r.weaverLocation && (
                          <div className="text-xs text-[#68756F] flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-[#245B52]" />
                            <span>{r.weaverLocation}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium">
                        {r.noOfPaavu ? `${r.noOfPaavu} Paavu` : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#245B52]">
                        {r.totalMeters || r.productionQuantity || 0} m
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium">
                        {formatINR(r.wageRate || r.rate || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#26332F]">
                        {formatINR(r.grossWages || r.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#975A16]">
                        {r.advancePaid > 0 ? formatINR(r.advancePaid) : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#26332F] font-financial text-[14px]">
                        {formatINR(r.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#246944] font-financial text-[14px]">
                        {formatINR(r.amountSettled)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#B93838] font-financial text-[14px]">
                        {formatINR(r.outstandingAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            r.paymentStatus === "PAID"
                              ? "bg-[#EBF5F0] text-[#246944] border border-[#C8E5D5]"
                              : r.paymentStatus === "PARTIALLY_PAID"
                              ? "bg-[#F0F6F3] text-[#245B52] border border-[#DCEAE2]"
                              : "bg-[#FEF8EC] text-[#975A16] border border-[#F7E4BE]"
                          }`}
                        >
                          {r.paymentStatus === "PAID"
                            ? "Fully Settled"
                            : r.paymentStatus === "PARTIALLY_PAID"
                            ? "Partially Paid"
                            : "Pending Due"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenViewModal(r)}
                            title="View Full Details & Settlements"
                            className="rounded-lg p-1.5 text-[#245B52] hover:bg-[#F0F6F3] border border-[#E5E9E3] transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
                            <button
                              onClick={() => handleOpenEditModal(r)}
                              title="Edit Entry"
                              className="rounded-lg p-1.5 text-[#975A16] hover:bg-[#FEF8EC] border border-[#E5E9E3] transition"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {r.outstandingAmount > 0 && ["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
                            <button
                              onClick={() => handleOpenSettlement(r)}
                              className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition"
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
      ) : (
        /* TABLE B: DEDICATED ADVANCE AMOUNT & SETTLEMENT SECTION */
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#FEF8EC] border border-[#F7E4BE] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#975A16]">
            <div>
              <strong className="text-sm font-bold block text-[#7D4A12]">
                Advance Amount & Settlement Tracking
              </strong>
              <span>
                Formula: <strong>Remaining Balance = Total Amount to Be Settled − Total Amount Already Settled</strong>. Advances are tracked separately and recorded atomically.
              </span>
            </div>
            <button
              onClick={() => {
                fetchWeavers();
                const available = weavers.filter((w) => categoryFilter === "ALL" || w.category === categoryFilter);
                const firstWeaver = available[0] || weavers[0];
                setAdvanceForm({
                  weaverId: firstWeaver?.id || "",
                  weaverName: firstWeaver?.name || "",
                  weaverLocation: firstWeaver?.location || "",
                  category: (firstWeaver?.category as "VETTI" | "SAREE") || (categoryFilter === "SAREE" ? "SAREE" : "VETTI"),
                  advanceAmount: "",
                  totalAmountToSettle: "",
                  paymentSource: liquidCashBalance > 0 ? "LIQUID_CASH" : "BANK_TRANSFER",
                  bankAccountId: banks[0]?.id || "",
                  advanceDate: new Date().toISOString().split("T")[0],
                  notes: "",
                });
                fetchLiquidCash();
                setShowAdvanceModal(true);
              }}
              className="rounded-xl bg-[#975A16] hover:bg-[#7D4A12] text-white px-4 py-2 font-bold shadow-xs whitespace-nowrap transition"
            >
              + Record Advance Payment
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E5E9E3] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E5E9E3] bg-[#F7F8F5] text-[#26332F] font-semibold text-[13px]">
                  <tr>
                    <th className="py-3.5 px-4">Contract / Weaver</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">1. Advance Date</th>
                    <th className="py-3.5 px-4 text-right text-[#975A16]">2. Advance Amount (₹)</th>
                    <th className="py-3.5 px-4 text-right font-bold text-[#26332F]">3. Total Amount to Be Settled (₹)</th>
                    <th className="py-3.5 px-4 text-right text-[#246944]">4. Amount Settled (₹)</th>
                    <th className="py-3.5 px-4 text-right font-bold text-[#B93838]">5. Remaining Balance (₹)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Settlement Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#68756F]">
                        Loading advance and settlement records...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#68756F]">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => {
                      const remBalance = Math.max(0, r.totalAmount - r.amountSettled);
                      return (
                        <tr key={r.id} className="hover:bg-[#F7F8F5] transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#26332F]">{r.weaverName || "Weaver"}</div>
                            <div className="font-mono text-xs text-[#245B52]">{r.transactionNumber}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                r.category === "VETTI"
                                  ? "bg-[#E6F4EA] text-[#1E7E34] border border-[#C3E6CB]"
                                  : "bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]"
                              }`}
                            >
                              {r.category === "VETTI" ? "Vetti" : "Saree"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs text-[#68756F]">
                            {r.advanceDate
                              ? new Date(r.advanceDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-financial font-semibold text-[#975A16]">
                            {r.advancePaid > 0 ? formatINR(r.advancePaid) : "-"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-financial font-bold text-[#26332F]">
                            {formatINR(r.totalAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-financial font-semibold text-[#246944]">
                            {formatINR(r.amountSettled)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-financial font-bold text-[#B93838] text-[15px]">
                            {formatINR(remBalance)}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                r.paymentStatus === "PAID"
                                  ? "bg-[#EBF5F0] text-[#246944] border border-[#C8E5D5]"
                                  : r.paymentStatus === "PARTIALLY_PAID"
                                  ? "bg-[#F0F6F3] text-[#245B52] border border-[#DCEAE2]"
                                  : "bg-[#FEF8EC] text-[#975A16] border border-[#F7E4BE]"
                              }`}
                            >
                              {r.paymentStatus === "PAID" ? "Settled" : "Pending Due"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {r.outstandingAmount > 0 && ["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
                                <button
                                  onClick={() => handleOpenSettlement(r)}
                                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
                                >
                                  + Settle
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenViewModal(r)}
                                title="View History"
                                className="rounded-lg p-1.5 text-[#245B52] hover:bg-[#F0F6F3] border border-[#E5E9E3]"
                              >
                                <Eye className="h-4 w-4" />
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
        </div>
      )}

      {/* =========================================================================
          6. ADD INDIVIDUAL POWERLOOM ENTRY MODAL (NO CONTRACT/VOUCHER NO)
      ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Record {form.category === "VETTI" ? "Vetti" : "Saree"} Powerloom Entry
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Paavu, meters, wages, advance & settlement tracking
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

            <form onSubmit={handleCreateContract} className="mt-5 space-y-4 text-xs">
              {/* Category Radio Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const targetCat = "VETTI";
                    const matching = weavers.filter((w) => w.category === targetCat);
                    const sel = matching.find((w) => w.name === form.weaverName) || matching[0];
                    setForm((prev) => ({
                      ...prev,
                      category: targetCat,
                      ...(sel ? {
                        weaverName: sel.name,
                        weaverLocation: sel.location || "",
                        loomReference: sel.loomCount ? `Loom #1-${sel.loomCount}` : prev.loomReference,
                        noOfPaavu: sel.paavuCount && sel.paavuCount > 0 ? sel.paavuCount : prev.noOfPaavu,
                        totalMeters: sel.paavuMeters && sel.paavuMeters > 0 ? sel.paavuMeters : prev.totalMeters,
                      } : {}),
                    }));
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition ${
                    form.category === "VETTI"
                      ? "border-[#245B52] bg-[#F0F6F3] text-[#245B52] shadow-xs"
                      : "border-[#E5E9E3] bg-white text-[#68756F]"
                  }`}
                >
                  <span>🌿 Vetti Contract</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetCat = "SAREE";
                    const matching = weavers.filter((w) => w.category === targetCat);
                    const sel = matching.find((w) => w.name === form.weaverName) || matching[0];
                    setForm((prev) => ({
                      ...prev,
                      category: targetCat,
                      ...(sel ? {
                        weaverName: sel.name,
                        weaverLocation: sel.location || "",
                        loomReference: sel.loomCount ? `Loom #1-${sel.loomCount}` : prev.loomReference,
                        noOfPaavu: sel.paavuCount && sel.paavuCount > 0 ? sel.paavuCount : prev.noOfPaavu,
                        totalMeters: sel.paavuMeters && sel.paavuMeters > 0 ? sel.paavuMeters : prev.totalMeters,
                      } : {}),
                    }));
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition ${
                    form.category === "SAREE"
                      ? "border-[#245B52] bg-[#F0F6F3] text-[#245B52] shadow-xs"
                      : "border-[#E5E9E3] bg-white text-[#68756F]"
                  }`}
                >
                  <span>🌸 Saree Contract</span>
                </button>
              </div>

              {/* Weaver / Powerloom Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#26332F]">
                    Select Powerloom (From Production or Register) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      handleOpenWeaverModal();
                    }}
                    className="text-xs font-semibold text-[#245B52] hover:underline"
                  >
                    + Register New Weaver
                  </button>
                </div>
                <select
                  required
                  value={weavers.find((w) => w.name === form.weaverName && w.category === form.category)?.id || weavers.find((w) => w.name === form.weaverName)?.id || ""}
                  onChange={(e) => handleSelectWeaverInForm(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-sm bg-white outline-none focus:border-[#245B52]"
                >
                  <option value="">-- Choose Powerloom Unit ({weavers.length} Available) --</option>
                  {/* Division Match */}
                  {weavers
                    .filter((w) => w.category === form.category)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} • {w.location} ({w.category}) {w.loomCount ? `• ${w.loomCount} Looms` : ""} {w.paavuCount ? `• ${w.paavuCount} Paavu (${w.paavuMeters}m)` : ""} {w.availableAdvance > 0 ? `• [Existing Adv: ${formatINR(w.availableAdvance)}]` : ""}
                      </option>
                    ))}
                  {/* Other Division Powerlooms */}
                  {weavers.filter((w) => w.category !== form.category).length > 0 && (
                    <optgroup label="Other Division Powerlooms">
                      {weavers
                        .filter((w) => w.category !== form.category)
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} • {w.location} ({w.category}) {w.loomCount ? `• ${w.loomCount} Looms` : ""}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                {form.weaverName && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#245B52] bg-[#F0F6F3] px-2.5 py-1 rounded-lg">
                    <span>
                      Selected Powerloom: <strong>{form.weaverName}</strong> {form.weaverLocation ? `(${form.weaverLocation})` : ""}
                    </span>
                    {weavers.find((w) => w.name === form.weaverName)?.loomCount && (
                      <span className="font-semibold text-slate-600">
                        {weavers.find((w) => w.name === form.weaverName)?.loomCount} Looms Registered
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Date (Contract/Voucher Number field removed per requirement 3.A) */}
              <div>
                <label className="font-semibold text-[#26332F] block mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.transactionDate}
                  onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm"
                />
              </div>

              {/* Production Parameters: Paavu, Meters, Wage Rate */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">
                    No of Paavu
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.noOfPaavu}
                    onChange={(e) => setForm({ ...form, noOfPaavu: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm font-semibold"
                    placeholder="e.g. 4"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">
                    Total Meters
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.totalMeters}
                    onChange={(e) => setForm({ ...form, totalMeters: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm font-semibold"
                    placeholder="e.g. 1200"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">
                    Wage Rate / Meter (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.wageRate}
                    onChange={(e) => setForm({ ...form, wageRate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm font-semibold font-financial"
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              {/* ADVANCE AMOUNT & SETTLEMENT SECTION IN FORM */}
              <div className="rounded-2xl bg-[#FEF8EC] border border-[#F7E4BE] p-4 space-y-3">
                <h4 className="font-bold text-sm text-[#975A16] flex items-center gap-1.5">
                  <Coins className="h-4 w-4" />
                  <span>Advance Amount & Settlement Tracking</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#26332F] block mb-1">1. Advance Date</label>
                    <input
                      type="date"
                      value={form.advanceDate}
                      onChange={(e) => setForm({ ...form, advanceDate: e.target.value })}
                      className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#26332F] block mb-1">2. Advance Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.advancePaid}
                      onChange={(e) => setForm({ ...form, advancePaid: e.target.value })}
                      placeholder="Advance paid"
                      className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs bg-white font-financial font-bold text-[#975A16]"
                    />
                  </div>
                </div>

                {formAdvance > 0 && (
                  <div>
                    <label className="font-bold text-[#26332F] block mb-1">Advance Payment Source</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, advanceSource: "LIQUID_CASH" })}
                        className={`p-2 rounded-xl text-xs font-bold border transition ${
                          form.advanceSource === "LIQUID_CASH"
                            ? "bg-[#245B52] text-white border-[#245B52]"
                            : "bg-white text-[#26332F] border-[#E5E9E3]"
                        }`}
                      >
                        💵 Liquid Cash ({formatINR(liquidCashBalance)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, advanceSource: "BANK_TRANSFER" })}
                        className={`p-2 rounded-xl text-xs font-bold border transition ${
                          form.advanceSource === "BANK_TRANSFER"
                            ? "bg-[#245B52] text-white border-[#245B52]"
                            : "bg-white text-[#26332F] border-[#E5E9E3]"
                        }`}
                      >
                        🏦 Bank Account
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-[#F7E4BE] space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#26332F] block mb-1">
                        3. Total Amount to Be Settled (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form.totalAmount !== "" ? form.totalAmount : defaultTotalToSettle}
                        onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                        placeholder="Total amount to settle"
                        className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs bg-white font-financial font-bold text-[#26332F]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#26332F] block mb-1">
                        4. Amount Settled (₹)
                      </label>
                      <div className="p-2 bg-white rounded-xl border border-[#E5E9E3] font-financial font-bold text-[#246944] text-xs">
                        {formatINR(currentSettled)}
                      </div>
                    </div>
                  </div>

                  {formAdvance > 0 && (
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.advanceIncludedInSettled}
                        onChange={(e) => setForm({ ...form, advanceIncludedInSettled: e.target.checked })}
                        className="rounded border-[#E5E9E3] text-[#245B52] focus:ring-0"
                      />
                      <span className="text-xs text-[#26332F] font-semibold">
                        Include Advance Amount ({formatINR(formAdvance)}) directly in Amount Settled
                      </span>
                    </label>
                  )}

                  <div className="rounded-xl bg-white p-3 border border-[#E5E9E3] flex justify-between items-center">
                    <span className="font-bold text-xs text-[#26332F]">5. Remaining Balance to Be Settled:</span>
                    <span className="font-bold text-base text-[#B93838] font-financial">
                      {formatINR(currentRemainingBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-[#26332F] block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional contract notes"
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-xs"
                />
              </div>

              {/* Buttons */}
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
                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-6 py-2.5 font-bold text-white shadow-xs transition active:scale-98"
                >
                  Save Entry ({formatINR(currentTotalAmount)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. VIEW FULL RECORD & SETTLEMENT HISTORY MODAL
      ========================================================================= */}
      {showViewModal && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-[#245B52]">
                    {activeRecord.transactionNumber}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      activeRecord.category === "VETTI"
                        ? "bg-[#E6F4EA] text-[#1E7E34] border border-[#C3E6CB]"
                        : "bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]"
                    }`}
                  >
                    {activeRecord.category === "VETTI" ? "Vetti" : "Saree"}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#26332F] mt-1">
                  {activeRecord.weaverName || "Powerloom Weaver"}
                </h3>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F7F8F5] p-4 rounded-xl border border-[#E5E9E3]">
              <div>
                <span className="text-[#68756F] block">Date:</span>
                <span className="font-bold text-[#26332F]">
                  {new Date(activeRecord.transactionDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-[#68756F] block">Location:</span>
                <span className="font-bold text-[#26332F]">{activeRecord.weaverLocation || "-"}</span>
              </div>
              <div>
                <span className="text-[#68756F] block">Loom Reference:</span>
                <span className="font-bold text-[#26332F]">{activeRecord.loomReference || "-"}</span>
              </div>
              <div>
                <span className="text-[#68756F] block">Paavu:</span>
                <span className="font-bold text-[#26332F]">{activeRecord.noOfPaavu || "-"}</span>
              </div>
              <div>
                <span className="text-[#68756F] block">Total Meters:</span>
                <span className="font-bold text-[#245B52]">{activeRecord.totalMeters || 0} m</span>
              </div>
              <div>
                <span className="text-[#68756F] block">Wage Rate:</span>
                <span className="font-bold text-[#26332F]">{formatINR(activeRecord.wageRate || 0)}/m</span>
              </div>
            </div>

            {/* 5 Required Fields Box */}
            <div className="rounded-xl bg-[#FEF8EC] border border-[#F7E4BE] p-4 space-y-2">
              <span className="font-bold text-xs text-[#975A16] block uppercase tracking-wide">
                Advance Amount & Settlement Tracking
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-[#F7E4BE]">
                <div>
                  <span className="text-[#975A16] block text-[11px]">1. Advance Date</span>
                  <span className="font-bold text-[#26332F]">
                    {activeRecord.advanceDate
                      ? new Date(activeRecord.advanceDate).toLocaleDateString("en-IN")
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[#975A16] block text-[11px]">2. Advance Amount</span>
                  <span className="font-bold text-[#975A16] font-financial">
                    {formatINR(activeRecord.advancePaid || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[#975A16] block text-[11px]">3. Total to Settle</span>
                  <span className="font-bold text-[#26332F] font-financial">
                    {formatINR(activeRecord.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[#975A16] block text-[11px]">4. Amount Settled</span>
                  <span className="font-bold text-[#246944] font-financial">
                    {formatINR(activeRecord.amountSettled)}
                  </span>
                </div>
                <div>
                  <span className="text-[#975A16] block text-[11px]">5. Remaining Balance</span>
                  <span className="font-bold text-[#B93838] font-financial text-sm">
                    {formatINR(activeRecord.outstandingAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Settlement History Table */}
            <div className="space-y-2">
              <span className="font-bold text-[#26332F] block">Settlement History:</span>
              {activeRecord.settlements && activeRecord.settlements.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-[#E5E9E3]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8F5] text-[#26332F] border-b border-[#E5E9E3] font-semibold">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Ref No</th>
                        <th className="p-2.5">Payment Method</th>
                        <th className="p-2.5 text-right">Amount (₹)</th>
                        <th className="p-2.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E9E3]">
                      {activeRecord.settlements.map((s: any) => (
                        <tr key={s.id}>
                          <td className="p-2.5 whitespace-nowrap">
                            {new Date(s.settlementDate).toLocaleDateString("en-IN")}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-[#245B52]">{s.settlementNumber}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            {s.paymentMethod === "LIQUID_CASH" ? "💵 Liquid Cash" : "🏦 Bank"}
                          </td>
                          <td className="p-2.5 text-right font-financial font-bold text-[#246944]">
                            {formatINR(s.amount)}
                          </td>
                          <td className="p-2.5 text-[#68756F]">{s.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center text-[#68756F] bg-[#F7F8F5] rounded-xl border border-[#E5E9E3]">
                  No separate settlements recorded yet for this entry.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="rounded-xl border border-[#E5E9E3] px-5 py-2 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
              >
                Close
              </button>
              {activeRecord.outstandingAmount > 0 && ["ADMIN", "ACCOUNTANT", "DATA_ENTRY"].includes(userRole) && (
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenSettlement(activeRecord);
                  }}
                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-5 py-2 font-bold text-white shadow-xs"
                >
                  Record Settlement
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. EDIT POWERLOOM ENTRY MODAL
      ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade text-xs">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">Edit Powerloom Entry</h3>
                <p className="text-xs text-[#68756F] mt-0.5">Update details, advance, and total amount to settle</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Weaver Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.weaverName}
                    onChange={(e) => setEditForm({ ...editForm, weaverName: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.weaverLocation}
                    onChange={(e) => setEditForm({ ...editForm, weaverLocation: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Paavu</label>
                  <input
                    type="number"
                    value={editForm.noOfPaavu}
                    onChange={(e) => setEditForm({ ...editForm, noOfPaavu: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Meters</label>
                  <input
                    type="number"
                    value={editForm.totalMeters}
                    onChange={(e) => setEditForm({ ...editForm, totalMeters: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Rate / m (₹)</label>
                  <input
                    type="number"
                    value={editForm.wageRate}
                    onChange={(e) => setEditForm({ ...editForm, wageRate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs font-financial"
                  />
                </div>
              </div>

              {/* Advance & Total to Settle */}
              <div className="grid grid-cols-2 gap-3 bg-[#F7F8F5] p-3 rounded-xl border border-[#E5E9E3]">
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Advance Amount (₹)</label>
                  <input
                    type="number"
                    value={editForm.advancePaid}
                    onChange={(e) => setEditForm({ ...editForm, advancePaid: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs bg-white font-financial"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Advance Date</label>
                  <input
                    type="date"
                    value={editForm.advanceDate}
                    onChange={(e) => setEditForm({ ...editForm, advanceDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-[#26332F] block mb-1">Total Amount to Be Settled (₹)</label>
                  <input
                    type="number"
                    value={editForm.totalAmount}
                    onChange={(e) => setEditForm({ ...editForm, totalAmount: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs bg-white font-financial font-bold text-[#26332F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#26332F] block mb-1">Notes</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-6 py-2 font-bold text-white shadow-xs"
                >
                  Update & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          9. RECORD SETTLEMENT MODAL (LIQUID CASH & BANK INTEGRATION)
      ========================================================================= */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade text-xs">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Record Powerloom Settlement
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Amount settled reduces balance directly and posts to cash or bank records.
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

            <form onSubmit={handleSettleSubmit} className="mt-5 space-y-4">
              {/* Select Record */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Select Powerloom Entry to Settle *
                </label>
                <select
                  required
                  value={settleForm.selectedRecordId}
                  onChange={(e) => handleRecordSelectChange(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                >
                  <option value="">-- Choose an entry with pending dues --</option>
                  {pendingRecordsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.transactionNumber} • {r.weaverName} • Due: {formatINR(r.outstandingAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {activeRecord && (
                <div className="rounded-xl bg-[#FEF8EC] border border-[#F7E4BE] p-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#975A16] font-semibold">Total Amount to Be Settled:</span>
                    <span className="font-bold text-[#26332F] font-financial">{formatINR(activeRecord.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#975A16] font-semibold">Total Already Settled:</span>
                    <span className="font-bold text-[#246944] font-financial">{formatINR(activeRecord.amountSettled)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#F7E4BE]">
                    <span className="text-[#975A16] font-semibold">Current Remaining Balance:</span>
                    <span className="font-bold text-base text-[#B93838] font-financial">
                      {formatINR(activeRecord.outstandingAmount)}
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
                  max={activeRecord?.outstandingAmount || undefined}
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

              {/* Payment Method */}
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
                    className={`p-2.5 rounded-xl font-bold border transition ${
                      settleForm.paymentMethod === "LIQUID_CASH"
                        ? "border-[#245B52] bg-[#245B52] text-white shadow-xs"
                        : "border-[#E5E9E3] bg-white text-[#26332F]"
                    }`}
                  >
                    💵 Liquid Cash ({formatINR(liquidCashBalance)})
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
                    className={`p-2.5 rounded-xl font-bold border transition ${
                      settleForm.paymentMethod === "BANK_TRANSFER"
                        ? "border-[#245B52] bg-[#245B52] text-white shadow-xs"
                        : "border-[#E5E9E3] bg-white text-[#26332F]"
                    }`}
                  >
                    🏦 Bank Transfer
                  </button>
                </div>
              </div>

              {settleForm.paymentMethod === "BANK_TRANSFER" && (
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">
                    Select Bank Account to Pay From *
                  </label>
                  <select
                    required
                    value={settleForm.bankAccountId}
                    onChange={(e) => setSettleForm({ ...settleForm, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white"
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

              {/* Settlement Date & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Settlement Date</label>
                  <input
                    type="date"
                    required
                    value={settleForm.settlementDate}
                    onChange={(e) => setSettleForm({ ...settleForm, settlementDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Notes / Ref</label>
                  <input
                    type="text"
                    value={settleForm.notes}
                    onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })}
                    placeholder="e.g. Final settlement"
                    className="w-full rounded-xl border border-[#E5E9E3] p-2"
                  />
                </div>
              </div>

              {/* Live Preview */}
              {activeRecord && settleForm.amount > 0 && (
                <div className="rounded-xl bg-[#F0F6F3] p-3 border border-[#C8E5D5] flex justify-between items-center">
                  <span className="text-[#245B52] font-semibold">Remaining Balance After Settlement:</span>
                  <span className="font-bold text-base text-[#245B52] font-financial">
                    {formatINR(Math.max(0, activeRecord.outstandingAmount - settleForm.amount))}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    settleForm.paymentMethod === "LIQUID_CASH" &&
                    settleForm.amount > liquidCashBalance
                  }
                  className={`rounded-xl px-6 py-2.5 font-bold text-white shadow-xs transition ${
                    settleForm.paymentMethod === "LIQUID_CASH" &&
                    settleForm.amount > liquidCashBalance
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#245B52] hover:bg-[#1D4B43]"
                  }`}
                >
                  Confirm Settlement ({formatINR(settleForm.amount || 0)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          10. DEDICATED PAY ADVANCE TO WEAVER MODAL
      ========================================================================= */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade text-xs">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Record Powerloom Advance Payment
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Record advance payment and establish total amount to be settled.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePayAdvanceSubmit} className="mt-5 space-y-4">
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Select Powerloom Weaver *
                </label>
                <select
                  required
                  value={advanceForm.weaverId}
                  onChange={(e) => {
                    const sel = weavers.find((w) => w.id === e.target.value);
                    if (sel) {
                      setAdvanceForm({
                        ...advanceForm,
                        weaverId: sel.id,
                        weaverName: sel.name,
                        weaverLocation: sel.location,
                        category: (sel.category as "VETTI" | "SAREE") || advanceForm.category,
                      });
                    }
                  }}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                >
                  <option value="">-- Choose Powerloom (from Production or Register) --</option>
                  {weavers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} • {w.location} ({w.category}) {w.loomCount ? `• ${w.loomCount} Looms` : ""} {w.availableAdvance > 0 ? `• [Existing Adv: ${formatINR(w.availableAdvance)}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">1. Advance Date *</label>
                  <input
                    type="date"
                    required
                    value={advanceForm.advanceDate}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, advanceDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">2. Advance Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={advanceForm.advanceAmount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, advanceAmount: e.target.value })}
                    placeholder="Enter advance amount"
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold font-financial text-[#975A16]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  3. Total Amount to Be Settled (₹) — <span className="font-normal text-[#68756F]">Defaults to advance if unknown</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={advanceForm.totalAmountToSettle}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, totalAmountToSettle: e.target.value })}
                  placeholder="Total amount to settle (or leave blank)"
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold font-financial text-[#26332F]"
                />
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdvanceForm({ ...advanceForm, paymentSource: "LIQUID_CASH" })}
                    className={`p-2.5 rounded-xl font-bold border transition ${
                      advanceForm.paymentSource === "LIQUID_CASH"
                        ? "border-[#245B52] bg-[#245B52] text-white shadow-xs"
                        : "border-[#E5E9E3] bg-white text-[#26332F]"
                    }`}
                  >
                    💵 Liquid Cash ({formatINR(liquidCashBalance)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceForm({ ...advanceForm, paymentSource: "BANK_TRANSFER" })}
                    className={`p-2.5 rounded-xl font-bold border transition ${
                      advanceForm.paymentSource === "BANK_TRANSFER"
                        ? "border-[#245B52] bg-[#245B52] text-white shadow-xs"
                        : "border-[#E5E9E3] bg-white text-[#26332F]"
                    }`}
                  >
                    🏦 Bank Transfer
                  </button>
                </div>
              </div>

              {advanceForm.paymentSource === "BANK_TRANSFER" && (
                <div>
                  <label className="font-bold text-[#26332F] block mb-1">Select Bank Account *</label>
                  <select
                    required
                    value={advanceForm.bankAccountId}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, bankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white"
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

              <div>
                <label className="font-semibold text-[#26332F] block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  placeholder="e.g. Loom setup advance, festival advance"
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    advanceForm.paymentSource === "LIQUID_CASH" &&
                    parseFloat(advanceForm.advanceAmount.toString()) > liquidCashBalance
                  }
                  className={`rounded-xl px-6 py-2.5 font-bold text-white shadow-xs transition ${
                    advanceForm.paymentSource === "LIQUID_CASH" &&
                    parseFloat(advanceForm.advanceAmount.toString()) > liquidCashBalance
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#975A16] hover:bg-[#7D4A12]"
                  }`}
                >
                  Pay Advance ({formatINR(parseFloat(advanceForm.advanceAmount.toString()) || 0)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          11. REGISTER WEAVER MODAL
      ========================================================================= */}
      {showWeaverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade text-xs">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Manage Powerloom Weavers & Units
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Powerlooms from both Production Register and Accounting are synced here
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWeaverModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            {/* List of active powerloom units */}
            <div className="mt-4 space-y-2">
              <span className="font-bold text-[#26332F] text-xs block">
                Active Powerlooms ({weavers.length})
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {weavers.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 bg-[#F7F8F5] rounded-xl border border-[#E5E9E3]">
                    No powerlooms registered yet.
                  </div>
                ) : (
                  weavers.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#26332F] flex items-center gap-2">
                          <span>{w.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              w.category === "VETTI"
                                ? "bg-[#E6F4EA] text-[#1E7E34] border border-[#C3E6CB]"
                                : "bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]"
                            }`}
                          >
                            {w.category === "VETTI" ? "Vetti" : "Saree"}
                          </span>
                          {w.isFromProduction && (
                            <span className="bg-[#EBF5F0] text-[#246944] text-[10px] px-1.5 py-0.5 rounded font-semibold border border-[#C8E5D5]">
                              Production Synced
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#68756F] mt-0.5">
                          {w.location} • {w.loomCount || 1} Looms
                          {w.paavuCount ? ` • ${w.paavuCount} Paavu (${w.paavuMeters}m)` : ""}
                          {w.availableAdvance > 0 ? ` • Adv: ${formatINR(w.availableAdvance)}` : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E9E3]">
              <span className="font-bold text-[#26332F] text-xs block mb-3">
                + Register New Powerloom Weaver
              </span>
              <form onSubmit={handleRegisterWeaver} className="space-y-4">
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Powerloom / Weaver Name *
                </label>
                <input
                  type="text"
                  required
                  value={weaverForm.name}
                  onChange={(e) => setWeaverForm({ ...weaverForm, name: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-sm text-[#26332F]"
                  placeholder="Enter weaver or loom name"
                />
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Location / Area *
                </label>
                <input
                  type="text"
                  required
                  value={weaverForm.location}
                  onChange={(e) => setWeaverForm({ ...weaverForm, location: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-sm"
                  placeholder="e.g. Pallipalayam, Sirumugai"
                />
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1.5">Category *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWeaverForm({ ...weaverForm, category: "VETTI" })}
                    className={`rounded-xl p-2.5 font-bold border transition ${
                      weaverForm.category === "VETTI"
                        ? "border-[#245B52] bg-[#F0F6F3] text-[#245B52]"
                        : "border-[#E5E9E3] bg-white text-[#68756F]"
                    }`}
                  >
                    Vetti Weaving
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeaverForm({ ...weaverForm, category: "SAREE" })}
                    className={`rounded-xl p-2.5 font-bold border transition ${
                      weaverForm.category === "SAREE"
                        ? "border-[#245B52] bg-[#F0F6F3] text-[#245B52]"
                        : "border-[#E5E9E3] bg-white text-[#68756F]"
                    }`}
                  >
                    Saree Weaving
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={weaverForm.phone}
                    onChange={(e) => setWeaverForm({ ...weaverForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                    placeholder="Mobile number"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Loom Count</label>
                  <input
                    type="number"
                    min="1"
                    value={weaverForm.loomCount}
                    onChange={(e) => setWeaverForm({ ...weaverForm, loomCount: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowWeaverModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-6 py-2.5 font-bold text-white shadow-xs"
                >
                  Register Weaver
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
