"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Plus,
  Search,
  RotateCw,
  Printer,
  Download,
  Scale,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  Factory,
  Package,
  Info,
  X,
  TrendingUp,
  Wallet,
  Coins,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  calculateBabinAllocation,
  calculateBabinSetFinancials,
  reconcilePowerloomBabinSets,
  isExcludedFromBabin,
  BABIN_DEFAULT_JARIGAI_PER_SAREE,
  BABIN_DEFAULT_SAREES_PER_SET,
  BABIN_DEFAULT_RATE_PER_SET,
  BABIN_DEFAULT_WAGE_PER_SET,
  BABIN_DEFAULT_PROFIT_PER_SET,
} from "@/lib/babin-calculations";
import { round2, round3, formatINR } from "@/lib/decimal";

export const BabinView: React.FC = () => {
  // Sub-Tab Switcher: "allocation" = Raw Thread (KG -> Sarees/Sets), "delivery" = Society Handover & Profit Settlement (Sets * ₹450)
  const [activeTab, setActiveTab] = useState<"allocation" | "delivery">("delivery");

  // Global Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Common Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // -------------------------------------------------------------
  // TAB 1: THREAD ALLOCATION STATE
  // -------------------------------------------------------------
  const [allocEntries, setAllocEntries] = useState<any[]>([]);
  const [allocSuggestions, setAllocSuggestions] = useState<any[]>([]);
  const [allocSummary, setAllocSummary] = useState<any>(null);
  const [allocLoading, setAllocLoading] = useState(false);

  const [allocForm, setAllocForm] = useState({
    date: new Date().toISOString().split("T")[0],
    powerloomName: "",
    jarigaiKg: "" as string | number,
    unitId: "",
    notes: "",
  });
  const [allocSaving, setAllocSaving] = useState(false);
  const [showAllocSuggestions, setShowAllocSuggestions] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<any | null>(null);
  const [showAllocEditModal, setShowAllocEditModal] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: SET HANDOVER & PROFIT SETTLEMENT STATE
  // -------------------------------------------------------------
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [powerloomSummaries, setPowerloomSummaries] = useState<any[]>([]);
  const [deliverySummary, setDeliverySummary] = useState<any>(null);
  const [deliverySuggestions, setDeliverySuggestions] = useState<any[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const [deliveryForm, setDeliveryForm] = useState({
    date: new Date().toISOString().split("T")[0],
    powerloomName: "",
    setsGiven: "" as string | number,
    ratePerSet: BABIN_DEFAULT_RATE_PER_SET,
    wagePerSet: BABIN_DEFAULT_WAGE_PER_SET,
    profitPerSet: BABIN_DEFAULT_PROFIT_PER_SET,
    settledAmount: "" as string | number,
    unitId: "",
    notes: "",
  });
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [showDeliverySuggestions, setShowDeliverySuggestions] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<any | null>(null);
  const [showDeliveryEditModal, setShowDeliveryEditModal] = useState(false);

  // Quick Settle Modal State
  const [settleTarget, setSettleTarget] = useState<any | null>(null);
  const [quickSettleAmount, setQuickSettleAmount] = useState<string | number>("");
  const [quickSettleSaving, setQuickSettleSaving] = useState(false);

  const allocSuggestionRef = useRef<HTMLDivElement>(null);
  const deliverySuggestionRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        allocSuggestionRef.current &&
        !allocSuggestionRef.current.contains(e.target as Node)
      ) {
        setShowAllocSuggestions(false);
      }
      if (
        deliverySuggestionRef.current &&
        !deliverySuggestionRef.current.contains(e.target as Node)
      ) {
        setShowDeliverySuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // -------------------------------------------------------------
  // FETCH DATA
  // -------------------------------------------------------------
  const fetchAllocationData = async () => {
    setAllocLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/production/babin?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const validEntries = (data.entries || []).filter((e: any) => !isExcludedFromBabin(e.powerloomName));
        const validSuggestions = (data.suggestions || []).filter((s: any) => !isExcludedFromBabin(s.name));
        setAllocEntries(validEntries);
        setAllocSuggestions(validSuggestions);
        setAllocSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to fetch babin allocations:", err);
    } finally {
      setAllocLoading(false);
    }
  };

  const fetchDeliveryData = async () => {
    setDeliveryLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/production/babin/delivery?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const validDeliveries = (data.deliveries || []).filter((d: any) => !isExcludedFromBabin(d.powerloomName));
        const validSummaries = (data.powerloomSummaries || []).filter((p: any) => !isExcludedFromBabin(p.powerloomName));
        const validSuggestions = (data.suggestions || []).filter((s: any) => !isExcludedFromBabin(s.name));
        setDeliveries(validDeliveries);
        setPowerloomSummaries(validSummaries);
        setDeliverySummary(data.summary || null);
        setDeliverySuggestions(validSuggestions);
      }
    } catch (err) {
      console.error("Failed to fetch babin deliveries:", err);
    } finally {
      setDeliveryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "allocation") {
      fetchAllocationData();
    } else {
      fetchDeliveryData();
    }
  }, [activeTab, search, startDate, endDate]);

  // Refresh both
  const handleRefresh = () => {
    if (activeTab === "allocation") {
      fetchAllocationData();
    } else {
      fetchDeliveryData();
    }
  };

  // -------------------------------------------------------------
  // TAB 1 ACTIONS: ALLOCATION SUBMISSION & EDIT
  // -------------------------------------------------------------
  const numAllocKg = parseFloat(allocForm.jarigaiKg as string) || 0;
  const liveAllocCalc = calculateBabinAllocation(numAllocKg);

  const filteredAllocSuggestions = allocSuggestions.filter(
    (s) =>
      !isExcludedFromBabin(s.name) &&
      s.name.toLowerCase().includes(allocForm.powerloomName.toLowerCase().trim())
  );

  const handleSelectAllocSuggestion = (s: { name: string; unitId?: string }) => {
    setAllocForm((prev) => ({
      ...prev,
      powerloomName: s.name,
      unitId: s.unitId || "",
    }));
    setShowAllocSuggestions(false);
  };

  const handleAllocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocForm.powerloomName.trim()) {
      alert("Please enter the powerloom name.");
      return;
    }
    if (numAllocKg <= 0) {
      alert("Please enter a valid Jarigai thread weight in KG.");
      return;
    }

    setAllocSaving(true);
    try {
      const res = await fetch("/api/production/babin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: allocForm.date,
          powerloomName: allocForm.powerloomName.trim(),
          jarigaiKg: numAllocKg,
          unitId: allocForm.unitId || null,
          notes: allocForm.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record babin entry");

      showToast(
        `✓ Babin allocation for ${data.powerloomName} recorded (${data.setsProduced} Sets, ${data.remainingSarees} Remaining)!`
      );

      setAllocForm((prev) => ({
        ...prev,
        powerloomName: "",
        jarigaiKg: "",
        unitId: "",
        notes: "",
      }));
      setShowAllocSuggestions(false);
      fetchAllocationData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAllocSaving(false);
    }
  };

  const handleAllocEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlloc) return;

    try {
      const res = await fetch(`/api/production/babin/${editingAlloc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editingAlloc.date,
          powerloomName: editingAlloc.powerloomName,
          jarigaiKg: Number(editingAlloc.jarigaiKg),
          unitId: editingAlloc.unitId || null,
          notes: editingAlloc.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update babin entry");

      showToast(`✓ Allocation for ${data.powerloomName} updated!`);
      setShowAllocEditModal(false);
      setEditingAlloc(null);
      fetchAllocationData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAllocDelete = async (entry: any) => {
    if (
      !confirm(
        `Are you sure you want to delete the allocation for "${entry.powerloomName}" (${entry.jarigaiKg} KG)?`
      )
    )
      return;

    try {
      const res = await fetch(`/api/production/babin/${entry.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete allocation");

      showToast(`✓ Allocation for ${entry.powerloomName} deleted.`);
      fetchAllocationData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // TAB 2 ACTIONS: DELIVERY SUBMISSION, QUICK SETTLE, EDIT & DELETE
  // -------------------------------------------------------------
  const numDeliverySets = parseInt(deliveryForm.setsGiven as string, 10) || 0;
  const numDeliverySettled = parseFloat(deliveryForm.settledAmount as string) || 0;

  const liveDeliveryCalc = calculateBabinSetFinancials(
    numDeliverySets,
    numDeliverySettled,
    deliveryForm.ratePerSet,
    deliveryForm.wagePerSet,
    deliveryForm.profitPerSet
  );

  // Matched powerloom info for live status preview
  const matchedPlSummary = powerloomSummaries.find(
    (p) => p.powerloomName.toLowerCase() === deliveryForm.powerloomName.toLowerCase().trim()
  );

  const filteredDeliverySuggestions = deliverySuggestions.filter(
    (s) =>
      !isExcludedFromBabin(s.name) &&
      s.name.toLowerCase().includes(deliveryForm.powerloomName.toLowerCase().trim())
  );

  const handleSelectDeliverySuggestion = (s: any) => {
    setDeliveryForm((prev) => ({
      ...prev,
      powerloomName: s.name,
      unitId: s.unitId || "",
    }));
    setShowDeliverySuggestions(false);
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryForm.powerloomName.trim()) {
      alert("Please enter the powerloom name.");
      return;
    }
    if (numDeliverySets <= 0) {
      alert("Please enter the number of Babin sets given to society (at least 1 set).");
      return;
    }

    setDeliverySaving(true);
    try {
      const res = await fetch("/api/production/babin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: deliveryForm.date,
          powerloomName: deliveryForm.powerloomName.trim(),
          setsGiven: numDeliverySets,
          ratePerSet: Number(deliveryForm.ratePerSet) || BABIN_DEFAULT_RATE_PER_SET,
          wagePerSet: Number(deliveryForm.wagePerSet) || BABIN_DEFAULT_WAGE_PER_SET,
          profitPerSet: Number(deliveryForm.profitPerSet) || BABIN_DEFAULT_PROFIT_PER_SET,
          settledAmount: numDeliverySettled,
          unitId: deliveryForm.unitId || null,
          notes: deliveryForm.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record Babin set delivery");

      showToast(
        `✓ ${data.setsGiven} Babin Sets from ${data.powerloomName} recorded (₹${data.totalAmount} total, ₹${data.totalProfit} society profit)!`
      );

      setDeliveryForm((prev) => ({
        ...prev,
        powerloomName: "",
        setsGiven: "",
        settledAmount: "",
        unitId: "",
        notes: "",
      }));
      setShowDeliverySuggestions(false);
      fetchDeliveryData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeliverySaving(false);
    }
  };

  const handleDeliveryEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelivery) return;

    try {
      const res = await fetch(`/api/production/babin/delivery/${editingDelivery.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editingDelivery.date,
          powerloomName: editingDelivery.powerloomName,
          setsGiven: parseInt(editingDelivery.setsGiven, 10),
          ratePerSet: Number(editingDelivery.ratePerSet) || BABIN_DEFAULT_RATE_PER_SET,
          wagePerSet: Number(editingDelivery.wagePerSet) || BABIN_DEFAULT_WAGE_PER_SET,
          profitPerSet: Number(editingDelivery.profitPerSet) || BABIN_DEFAULT_PROFIT_PER_SET,
          settledAmount: Number(editingDelivery.settledAmount) || 0,
          unitId: editingDelivery.unitId || null,
          notes: editingDelivery.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update Babin delivery");

      showToast(`✓ Delivery for ${data.powerloomName} updated!`);
      setShowDeliveryEditModal(false);
      setEditingDelivery(null);
      fetchDeliveryData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTarget) return;

    const amt = parseFloat(quickSettleAmount as string);
    if (isNaN(amt) || amt < 0) {
      alert("Please enter a valid settled amount.");
      return;
    }

    setQuickSettleSaving(true);
    try {
      const res = await fetch(`/api/production/babin/delivery/${settleTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settledAmount: amt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settlement amount");

      showToast(`✓ Settled amount for ${data.powerloomName} updated to ₹${data.settledAmount}!`);
      setSettleTarget(null);
      fetchDeliveryData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setQuickSettleSaving(false);
    }
  };

  const handleDeliveryDelete = async (delivery: any) => {
    if (
      !confirm(
        `Are you sure you want to delete the delivery record for "${delivery.powerloomName}" (${delivery.setsGiven} Sets)?`
      )
    )
      return;

    try {
      const res = await fetch(`/api/production/babin/delivery/${delivery.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete delivery");

      showToast(`✓ Delivery for ${delivery.powerloomName} deleted.`);
      fetchDeliveryData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === "allocation") {
      if (allocEntries.length === 0) return;
      const headers = [
        "Date",
        "Powerloom Name",
        "Jarigai KG Given",
        "Total Sarees",
        "No of Set Will Produce",
        "No of Saree Remaining",
        "Remaining Saree Weight (KG)",
        "Notes",
      ];
      const rows = allocEntries.map((r) => [
        r.date ? new Date(r.date).toLocaleDateString("en-GB") : "",
        `"${(r.powerloomName || "").replace(/"/g, '""')}"`,
        r.jarigaiKg || 0,
        r.totalSarees || 0,
        r.setsProduced || 0,
        r.remainingSarees || 0,
        r.remainingKg || 0,
        `"${(r.notes || "").replace(/"/g, '""')}"`,
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `Babin_Allocation_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (deliveries.length === 0) return;
      const headers = [
        "Date",
        "Powerloom Name",
        "Babin Set Given",
        "Rate Per Set",
        "Total Amount (₹450)",
        "Weaver Wage (₹250)",
        "Our Profit (₹200)",
        "Settled Amount",
        "Yet to Settle",
        "Payment Status",
        "Notes",
      ];
      const rows = deliveries.map((d) => [
        d.date ? new Date(d.date).toLocaleDateString("en-GB") : "",
        `"${(d.powerloomName || "").replace(/"/g, '""')}"`,
        d.setsGiven || 0,
        d.ratePerSet || 450,
        d.totalAmount || 0,
        d.totalWage || 0,
        d.totalProfit || 0,
        d.settledAmount || 0,
        d.yetToSettle || 0,
        d.paymentStatus || "PENDING",
        `"${(d.notes || "").replace(/"/g, '""')}"`,
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `Babin_Set_Deliveries_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans text-slate-900">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-[#1E2229] text-white px-5 py-3.5 font-bold text-xs shadow-2xl flex items-center gap-2.5 border border-white/20 animate-fade-in no-print">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Header Banner & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E2229] text-white font-black text-2xl shadow-sm">
            B
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Babin & Jarigai Set Ledger</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Raw Thread Allocation • ₹450/Set Delivery Handover (₹250 Wage + ₹200 Society Profit) • Delivered, Yet to Give & Extra Given
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print Register</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh Ledger"
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition"
          >
            <RotateCw
              className={`h-4 w-4 ${
                allocLoading || deliveryLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Sub-Tab Switcher Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 no-print">
        <button
          type="button"
          onClick={() => setActiveTab("delivery")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-black border-b-2 transition ${
            activeTab === "delivery"
              ? "border-slate-900 text-slate-900 bg-slate-50/60"
              : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Coins className="h-4 w-4 text-emerald-600" />
          <span>Society Set Handover & Profit Settlement (₹450/Set)</span>
          {deliverySummary?.totalEntries !== undefined && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {deliverySummary.totalEntries}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("allocation")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-black border-b-2 transition ${
            activeTab === "allocation"
              ? "border-slate-900 text-slate-900 bg-slate-50/60"
              : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Scale className="h-4 w-4 text-amber-600" />
          <span>Raw Thread Allocation (KG ÷ 0.024)</span>
          {allocSummary?.totalEntries !== undefined && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {allocSummary.totalEntries}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 2: SOCIETY SET HANDOVER & PROFIT SETTLEMENT (PRIMARY VIEW)            */}
      {/* ========================================================================= */}
      {activeTab === "delivery" && (
        <div className="space-y-6 animate-fade-in">
          {/* A. KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Total Babin Sets Handed Over */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="uppercase tracking-wider">Total Sets Given</span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-800">
                  <Package className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
                  {(deliverySummary?.totalSetsGiven || 0).toLocaleString("en-IN")}{" "}
                  <span className="text-sm font-bold text-slate-500">Sets</span>
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Received by Society from Powerlooms
              </p>
            </div>

            {/* Metric 2: Total Set Value @ ₹450 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="uppercase tracking-wider">Total Value (@ ₹450)</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Coins className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl sm:text-3xl font-black text-blue-900 font-mono tabular-nums">
                  {formatINR(deliverySummary?.totalAmount || 0)}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Gross value of finished sets delivered
              </p>
            </div>

            {/* Metric 3: Total Society Profit @ ₹200/Set */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span className="uppercase tracking-wider">Our Profit (@ ₹200/Set)</span>
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tabular-nums">
                  {formatINR(deliverySummary?.totalProfit || 0)}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-emerald-700">
                Added directly into Society Profit ledger
              </p>
            </div>

            {/* Metric 4: Settlement Status (Settled vs Yet to Settle) */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="uppercase tracking-wider">Yet to Settle</span>
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Wallet className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl sm:text-3xl font-black text-rose-700 font-mono tabular-nums">
                  {formatINR(deliverySummary?.totalYetToSettle || 0)}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-slate-600">
                Settled: <span className="font-bold text-emerald-700">{formatINR(deliverySummary?.totalSettled || 0)}</span>
              </p>
            </div>
          </div>

          {/* B. Powerloom Cumulative Status & Reconciliation Cards */}
          {powerloomSummaries.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Powerloom Set Reconciliation Summary
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Allocated vs Delivered • Yet to Give • Extra Given • Balance
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {powerloomSummaries.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block">
                          {p.powerloomName}
                        </span>
                        {p.location && (
                          <span className="text-[10px] text-slate-400">📍 {p.location}</span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          p.yetToSettle === 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {p.yetToSettle === 0 ? "Fully Settled" : "Pending Settle"}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs border-y border-slate-200 py-2">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Allocated</span>
                        <span className="font-mono font-bold text-slate-800">{p.allocatedSets}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Delivered</span>
                        <span className="font-mono font-black text-emerald-700">{p.deliveredSets}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Yet to Give</span>
                        <span className={`font-mono font-bold ${p.yetToGive > 0 ? "text-rose-700 font-black" : "text-slate-400"}`}>
                          {p.yetToGive}
                        </span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Extra Given</span>
                        <span className={`font-mono font-bold ${p.extraGiven > 0 ? "text-blue-700 font-black" : "text-slate-400"}`}>
                          {p.extraGiven}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-slate-500 font-medium">
                        Total Value: <strong className="text-slate-900 font-mono">{formatINR(p.totalAmount)}</strong>
                      </span>
                      <span className="text-slate-500 font-medium">
                        Yet to Settle: <strong className="text-rose-700 font-mono">{formatINR(p.yetToSettle)}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. New Babin Set Handover Entry Form */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5 no-print">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#1E2229] text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Record Babin Set Handover to Society
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Enter Date, Powerloom Name, Sets Given, and Settlement. ₹450 total = ₹250 weaver wage + ₹200 society profit.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Rate: ₹450/Set (₹250 Wage + ₹200 Our Profit)
              </span>
            </div>

            <form onSubmit={handleDeliverySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                {/* 1. Date */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={deliveryForm.date}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, date: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-slate-800 bg-white"
                    />
                  </div>
                </div>

                {/* 2. Powerloom Name with Suggestions Dropdown */}
                <div className="sm:col-span-4 relative" ref={deliverySuggestionRef}>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Powerloom Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Factory className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Type or select powerloom name..."
                      autoComplete="off"
                      value={deliveryForm.powerloomName}
                      onFocus={() => setShowDeliverySuggestions(true)}
                      onChange={(e) => {
                        setDeliveryForm({ ...deliveryForm, powerloomName: e.target.value, unitId: "" });
                        setShowDeliverySuggestions(true);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-slate-800 bg-white placeholder-slate-400"
                    />
                  </div>

                  {/* Suggestions Dropdown */}
                  {showDeliverySuggestions && filteredDeliverySuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                        Existing Powerlooms ({filteredDeliverySuggestions.length} suggestions)
                      </div>
                      {filteredDeliverySuggestions.map((s, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleSelectDeliverySuggestion(s)}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 transition flex items-center justify-between group"
                        >
                          <div>
                            <span className="font-bold text-slate-800 group-hover:text-emerald-700 block">
                              {s.name}
                            </span>
                            {s.location && (
                              <span className="text-[10px] text-slate-400">📍 {s.location}</span>
                            )}
                          </div>
                          <div className="text-right text-[10px]">
                            <span className="text-slate-500 block">
                              Allocated: <strong>{s.allocatedSets || 0}</strong> | Delivered: <strong>{s.deliveredSets || 0}</strong>
                            </span>
                            {s.yetToGive > 0 && (
                              <span className="text-rose-600 font-bold">Yet to Give: {s.yetToGive}</span>
                            )}
                            {s.extraGiven > 0 && (
                              <span className="text-blue-600 font-bold">Extra: {s.extraGiven}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Babin Set Given to Society */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Babin Set Given <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="e.g. 1, 2, 5"
                      value={deliveryForm.setsGiven}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, setsGiven: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-slate-800 bg-white text-slate-900 font-mono"
                    />
                  </div>
                </div>

                {/* 4. Settled Amount (₹) */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Amount Settled (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3.5 top-3 h-4 w-4 text-amber-600" />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 450 or 250"
                      value={deliveryForm.settledAmount}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, settledAmount: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-slate-800 bg-white text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Calculation Preview for Set Handover */}
              {numDeliverySets > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-emerald-600" />
                      <span>Live Financial & Set Tally Preview:</span>
                    </div>
                    {matchedPlSummary && (
                      <span className="text-[11px] text-slate-500 font-bold normal-case">
                        PL Allocated: {matchedPlSummary.allocatedSets} Sets • Prev Delivered: {matchedPlSummary.deliveredSets} Sets
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    {/* 1. Total ₹450 Amount */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Total Set Value (@ ₹450)
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono">
                        {formatINR(liveDeliveryCalc.totalAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ({numDeliverySets} Sets × ₹450)
                      </span>
                    </div>

                    {/* 2. Weaver Wage @ ₹250 */}
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                      <span className="text-[10px] text-amber-800 font-bold block uppercase">
                        Weaver Wage (@ ₹250)
                      </span>
                      <span className="text-base font-black text-amber-800 font-mono">
                        {formatINR(liveDeliveryCalc.totalWage)}
                      </span>
                      <span className="text-[10px] text-amber-700 block mt-0.5">
                        ({numDeliverySets} Sets × ₹250)
                      </span>
                    </div>

                    {/* 3. Society Profit @ ₹200 */}
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                        Our Profit (@ ₹200)
                      </span>
                      <span className="text-base font-black text-emerald-700 font-mono">
                        {formatINR(liveDeliveryCalc.totalProfit)}
                      </span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        ({numDeliverySets} Sets × ₹200)
                      </span>
                    </div>

                    {/* 4. Settled Amount */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Amount Settled
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono">
                        {formatINR(liveDeliveryCalc.settledAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Status: <strong className="text-slate-700">{liveDeliveryCalc.paymentStatus}</strong>
                      </span>
                    </div>

                    {/* 5. Yet to Settle */}
                    <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200">
                      <span className="text-[10px] text-rose-800 font-bold block uppercase">
                        Yet to Settle
                      </span>
                      <span className="text-base font-black text-rose-700 font-mono">
                        {formatINR(liveDeliveryCalc.yetToSettle)}
                      </span>
                      <span className="text-[10px] text-rose-700 block mt-0.5">
                        Balance payable
                      </span>
                    </div>
                  </div>

                  {/* Powerloom Reconciliation Impact */}
                  {matchedPlSummary && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        After recording this delivery: Powerloom Total Delivered will become{" "}
                        <strong className="text-slate-900 font-mono">
                          {matchedPlSummary.deliveredSets + numDeliverySets} Sets
                        </strong>
                      </span>
                      <div className="flex items-center gap-3">
                        {matchedPlSummary.allocatedSets > (matchedPlSummary.deliveredSets + numDeliverySets) ? (
                          <span className="text-rose-700 font-bold">
                            Yet to Give: {matchedPlSummary.allocatedSets - (matchedPlSummary.deliveredSets + numDeliverySets)} Sets
                          </span>
                        ) : (
                          <span className="text-blue-700 font-bold">
                            Extra Given: {(matchedPlSummary.deliveredSets + numDeliverySets) - matchedPlSummary.allocatedSets} Sets
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes & Submit Button */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end pt-1">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Optional Notes / Challan Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Received via Challan #104, 1st quality finish..."
                    value={deliveryForm.notes}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>

                <div className="sm:col-span-4 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={deliverySaving || !deliveryForm.powerloomName.trim() || numDeliverySets <= 0}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{deliverySaving ? "Saving Handover..." : "Save Set Handover"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* D. Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by powerloom name or notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-slate-800 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-slate-600 font-semibold">
                <span className="text-[10px] text-slate-400 font-bold px-1.5">FROM:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold outline-none"
                />
                <span className="text-[10px] text-slate-400 font-bold px-1.5">TO:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold outline-none"
                />
              </div>

              {(search || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* E. Society Handover Storage Register Table */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#1E2229] text-white font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 border-b border-slate-800">Date</th>
                  <th className="py-3.5 px-4 border-b border-slate-800">Powerloom Name</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-center">Babin Set Given</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">Total Amount (₹450)</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">Wage (₹250)</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">Our Profit (₹200)</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">Settled Amount</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">Yet to Settle</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-sm font-bold text-slate-600">
                          {search ? `No Babin handovers matching "${search}"` : "No Babin set handovers recorded yet"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {search
                            ? "Try adjusting your search query or clearing the filter."
                            : "Use the entry form above to enter the date, powerloom name, and Babin sets given to society."}
                        </p>
                        {search && (
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Clear filter</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  deliveries.map((d) => {
                    const dateObj = d.date ? new Date(d.date) : new Date();
                    const formattedDate = dateObj.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition group">
                        {/* 1. Date */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {formattedDate}
                        </td>

                        {/* 2. Powerloom Name */}
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                              <Factory className="h-3.5 w-3.5" />
                            </span>
                            <div>
                              <span>{d.powerloomName}</span>
                              {d.unit?.location && (
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  📍 {d.unit.location}
                                </span>
                              )}
                              {d.notes && (
                                <span className="text-[10px] text-slate-400 block font-normal italic">
                                  Note: {d.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Babin Set Given */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono tabular-nums">
                            <Package className="h-3 w-3 text-emerald-600" />
                            <span>{d.setsGiven} {d.setsGiven === 1 ? "Set" : "Sets"}</span>
                          </span>
                        </td>

                        {/* 4. Total Amount (@ ₹450) */}
                        <td className="py-3.5 px-4 text-right font-black font-mono tabular-nums text-slate-900">
                          {formatINR(d.totalAmount)}
                        </td>

                        {/* 5. Wage (@ ₹250) */}
                        <td className="py-3.5 px-4 text-right font-bold font-mono tabular-nums text-amber-800">
                          {formatINR(d.totalWage)}
                        </td>

                        {/* 6. Society Profit (@ ₹200) */}
                        <td className="py-3.5 px-4 text-right font-black font-mono tabular-nums text-emerald-700">
                          {formatINR(d.totalProfit)}
                        </td>

                        {/* 7. Settled Amount */}
                        <td className="py-3.5 px-4 text-right font-bold font-mono tabular-nums text-slate-700">
                          {formatINR(d.settledAmount)}
                        </td>

                        {/* 8. Yet to Settle */}
                        <td className="py-3.5 px-4 text-right">
                          {d.yetToSettle > 0 ? (
                            <span className="font-black text-rose-700 font-mono tabular-nums">
                              {formatINR(d.yetToSettle)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <Check className="h-3 w-3" /> Settled
                            </span>
                          )}
                        </td>

                        {/* 9. Actions */}
                        <td className="py-3.5 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100">
                            {/* Quick Settle Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSettleTarget(d);
                                setQuickSettleAmount(d.settledAmount);
                              }}
                              title="Update Settlement"
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            >
                              Settle
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDelivery({
                                  ...d,
                                  date: d.date ? new Date(d.date).toISOString().split("T")[0] : "",
                                });
                                setShowDeliveryEditModal(true);
                              }}
                              title="Edit Handover"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeliveryDelete(d)}
                              title="Delete Handover"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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

              {/* Table Footer Totals */}
              {deliveries.length > 0 && (
                <tfoot className="bg-slate-50 text-slate-900 font-extrabold border-t border-slate-200 text-xs">
                  <tr>
                    <td colSpan={2} className="py-3.5 px-4 text-slate-700 uppercase tracking-wider">
                      Total Summary ({deliveries.length} Handover Entries)
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-900 font-black">
                      {deliverySummary?.totalSetsGiven || 0} Sets
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-black">
                      {formatINR(deliverySummary?.totalAmount || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-800 font-black">
                      {formatINR(deliverySummary?.totalWage || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">
                      {formatINR(deliverySummary?.totalProfit || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-800 font-black">
                      {formatINR(deliverySummary?.totalSettled || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-black">
                      {formatINR(deliverySummary?.totalYetToSettle || 0)}
                    </td>
                    <td className="py-3.5 px-4 no-print"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: RAW THREAD ALLOCATION (KG -> SAREES & SETS)                       */}
      {/* ========================================================================= */}
      {activeTab === "allocation" && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="uppercase tracking-wider">Total Jarigai Thread Given</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Scale className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
                  {(allocSummary?.totalJarigaiKg || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{" "}
                  <span className="text-sm font-bold text-amber-700">KG</span>
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Cumulative raw Zari thread allocated
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="uppercase tracking-wider">Total Saree Output (÷ 0.024)</span>
                <span className="p-2 rounded-xl bg-slate-100 text-slate-800">
                  <Layers className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
                  {(allocSummary?.totalSarees || 0).toLocaleString("en-IN")}{" "}
                  <span className="text-sm font-bold text-slate-600">Sarees</span>
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Based on standard 0.024 KG/Saree requirement
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span className="uppercase tracking-wider">Sets Will Produce (÷ 200)</span>
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Package className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tabular-nums">
                  {(allocSummary?.totalSetsProduced || 0).toLocaleString("en-IN")}{" "}
                  <span className="text-sm font-bold text-emerald-700">Sets</span>
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-emerald-800 font-medium">
                Complete sets of 200 Sarees each
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-rose-700">
                <span className="uppercase tracking-wider">Remaining Sarees & Weight</span>
                <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Scale className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl sm:text-3xl font-black text-rose-700 font-mono tabular-nums">
                  {(allocSummary?.totalRemainingSarees || 0).toLocaleString("en-IN")}{" "}
                  <span className="text-sm font-bold text-rose-700">Sarees</span>
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-rose-700 font-mono">
                Weight: {(allocSummary?.totalRemainingKg || 0).toFixed(3)} KG remaining
              </p>
            </div>
          </div>

          {/* Allocation Entry Form */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5 no-print">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#1E2229] text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    New Raw Jarigai Thread Allocation
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Enter Date, Powerloom Name, and Jarigai KG. Saree count and Sets are calculated automatically.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                Formula: KG ÷ 0.024 = Sarees ÷ 200 = Sets
              </span>
            </div>

            <form onSubmit={handleAllocSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={allocForm.date}
                      onChange={(e) => setAllocForm({ ...allocForm, date: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-slate-800 bg-white"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 relative" ref={allocSuggestionRef}>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Powerloom Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Factory className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Type or select powerloom name..."
                      autoComplete="off"
                      value={allocForm.powerloomName}
                      onFocus={() => setShowAllocSuggestions(true)}
                      onChange={(e) => {
                        setAllocForm({ ...allocForm, powerloomName: e.target.value, unitId: "" });
                        setShowAllocSuggestions(true);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-slate-800 bg-white placeholder-slate-400"
                    />
                  </div>

                  {showAllocSuggestions && filteredAllocSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                        Existing Powerlooms ({filteredAllocSuggestions.length} suggestions)
                      </div>
                      {filteredAllocSuggestions.map((s, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleSelectAllocSuggestion(s)}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 transition flex items-center justify-between group"
                        >
                          <span className="font-bold text-slate-800 group-hover:text-emerald-700">
                            {s.name}
                          </span>
                          {s.location && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              📍 {s.location}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Jarigai Thread Given (KG) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Scale className="absolute left-3.5 top-3 h-4 w-4 text-amber-500" />
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                      placeholder="e.g. 5.000 or 4.8"
                      value={allocForm.jarigaiKg}
                      onChange={(e) => setAllocForm({ ...allocForm, jarigaiKg: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-slate-800 bg-white placeholder-slate-400 text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {numAllocKg > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                    <Info className="h-4 w-4 text-emerald-600" />
                    <span>Automatic Calculation Preview:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Step 1: Total Saree Count
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono">
                        {liveAllocCalc.totalSarees}{" "}
                        <span className="text-xs font-semibold text-slate-500">Sarees</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ({numAllocKg} kg ÷ 0.024)
                      </span>
                    </div>

                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                        Step 2: Sets Will Produce
                      </span>
                      <span className="text-base font-black text-emerald-700 font-mono">
                        {liveAllocCalc.setsProduced}{" "}
                        <span className="text-xs font-semibold text-emerald-600">Sets</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        ({liveAllocCalc.setsProduced * 200} Sarees @ 200/set)
                      </span>
                    </div>

                    <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200">
                      <span className="text-[10px] text-rose-800 font-bold block uppercase">
                        Step 3: Remaining Sarees
                      </span>
                      <span className="text-base font-black text-rose-700 font-mono">
                        {liveAllocCalc.remainingSarees}{" "}
                        <span className="text-xs font-semibold text-rose-600">Sarees</span>
                      </span>
                      <span className="text-[10px] text-rose-700 block mt-0.5">
                        (Remainder &lt; 200)
                      </span>
                    </div>

                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                      <span className="text-[10px] text-amber-800 font-bold block uppercase">
                        Step 4: Remaining Weight
                      </span>
                      <span className="text-base font-black text-amber-800 font-mono">
                        {liveAllocCalc.remainingKg.toFixed(3)}{" "}
                        <span className="text-xs font-semibold text-amber-700">KG</span>
                      </span>
                      <span className="text-[10px] text-amber-700 block mt-0.5">
                        ({liveAllocCalc.remainingSarees} × 0.024 kg)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end pt-1">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Optional Notes / Batch Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zari Mark-14, 1st quality raw spool..."
                    value={allocForm.notes}
                    onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>

                <div className="sm:col-span-4 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={allocSaving || !allocForm.powerloomName.trim() || numAllocKg <= 0}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{allocSaving ? "Saving Allocation..." : "Save Thread Allocation"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Search & Filter Bar for Raw Jarigai Thread Allocations */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search allocations by powerloom name or notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-slate-800 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-slate-600 font-semibold">
                <span className="text-[10px] text-slate-400 font-bold px-1.5">FROM:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold outline-none"
                />
                <span className="text-[10px] text-slate-400 font-bold px-1.5">TO:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold outline-none"
                />
              </div>

              {(search || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Allocation Table */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#1E2229] text-white font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 border-b border-slate-800">Date</th>
                  <th className="py-3.5 px-4 border-b border-slate-800">Powerloom Name</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">KG Given</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-center">No of Set Will Produce</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">No of Saree Remaining</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">Remaining Weight (KG)</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-right">Total Saree Output</th>
                  <th className="py-3.5 px-4 border-b border-slate-800 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {allocEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-sm font-bold text-slate-600">
                          {search ? `No allocations matching "${search}"` : "No Babin allocations recorded yet"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {search
                            ? "Try adjusting your search query or clearing the filter."
                            : "Use the entry form above to allocate raw thread in KG."}
                        </p>
                        {search && (
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Clear filter</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  allocEntries.map((r) => {
                    const d = r.date ? new Date(r.date) : new Date();
                    const formattedDate = d.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition group">
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                              <Factory className="h-3.5 w-3.5" />
                            </span>
                            <div>
                              <span>{r.powerloomName}</span>
                              {r.unit?.location && (
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  📍 {r.unit.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black font-mono tabular-nums text-slate-900">
                          {Number(r.jarigaiKg || 0).toFixed(3)}{" "}
                          <span className="text-[10px] font-semibold text-slate-500">KG</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono tabular-nums">
                            <Package className="h-3 w-3 text-emerald-600" />
                            <span>{r.setsProduced} {r.setsProduced === 1 ? "Set" : "Sets"}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            ({r.setsProduced * 200} Sarees)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {r.remainingSarees > 0 ? (
                            <div>
                              <span className="font-black text-rose-700 font-mono tabular-nums text-xs">
                                {r.remainingSarees} Sarees
                              </span>
                              <span className="text-[10px] text-rose-600/80 block font-medium">
                                (Remainder &lt; 200)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">— 0 (Exact Set)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold font-mono tabular-nums text-amber-800">
                          {Number(r.remainingKg || 0).toFixed(3)}{" "}
                          <span className="text-[10px] font-semibold text-amber-700">KG</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold font-mono tabular-nums text-slate-900">
                          {r.totalSarees}{" "}
                          <span className="text-[10px] font-semibold text-slate-500">Sarees</span>
                        </td>
                        <td className="py-3.5 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAlloc({
                                  ...r,
                                  date: r.date ? new Date(r.date).toISOString().split("T")[0] : "",
                                });
                                setShowAllocEditModal(true);
                              }}
                              title="Edit Entry"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAllocDelete(r)}
                              title="Delete Entry"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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

              {allocEntries.length > 0 && (
                <tfoot className="bg-slate-50 text-slate-900 font-extrabold border-t border-slate-200 text-xs">
                  <tr>
                    <td colSpan={2} className="py-3.5 px-4 text-slate-700 uppercase tracking-wider">
                      Total Summary ({allocEntries.length} Entries)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-black">
                      {(allocSummary?.totalJarigaiKg || 0).toFixed(3)} KG
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-700 font-black">
                      {allocSummary?.totalSetsProduced || 0} Sets
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-black">
                      {allocSummary?.totalRemainingSarees || 0} Sarees
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-800 font-black">
                      {(allocSummary?.totalRemainingKg || 0).toFixed(3)} KG
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-black">
                      {allocSummary?.totalSarees || 0} Sarees
                    </td>
                    <td className="py-3.5 px-4 no-print"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: QUICK SETTLE PAYMENT MODAL                           */}
      {/* ------------------------------------------------------------- */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Update Settlement Amount
                </h3>
                <p className="text-[11px] text-slate-500">
                  {settleTarget.powerloomName} • {settleTarget.setsGiven} Sets Handover
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettleTarget(null)}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSettleSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Total Set Value (@ ₹450):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatINR(settleTarget.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Weaver Wage (@ ₹250):</span>
                  <span className="font-mono font-bold text-amber-800">
                    {formatINR(settleTarget.totalWage)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Society Profit (@ ₹200):</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatINR(settleTarget.totalProfit)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Settled Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={quickSettleAmount}
                  onChange={(e) => setQuickSettleAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickSettleAmount(settleTarget.totalAmount)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                >
                  Pay Full ({formatINR(settleTarget.totalAmount)})
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSettleAmount(settleTarget.totalWage)}
                  className="flex-1 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px]"
                >
                  Pay Wage ({formatINR(settleTarget.totalWage)})
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettleTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSettleSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  {quickSettleSaving ? "Saving..." : "Save Settlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDIT DELIVERY MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {showDeliveryEditModal && editingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Set Handover Entry
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowDeliveryEditModal(false);
                  setEditingDelivery(null);
                }}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDeliveryEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={editingDelivery.date}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Powerloom Name</label>
                <input
                  type="text"
                  required
                  value={editingDelivery.powerloomName}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, powerloomName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Babin Sets Given</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={editingDelivery.setsGiven}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, setsGiven: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Settled Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editingDelivery.settledAmount}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, settledAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <input
                  type="text"
                  value={editingDelivery.notes || ""}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeliveryEditModal(false);
                    setEditingDelivery(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: EDIT ALLOCATION MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {showAllocEditModal && editingAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Thread Allocation
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAllocEditModal(false);
                  setEditingAlloc(null);
                }}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAllocEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={editingAlloc.date}
                  onChange={(e) => setEditingAlloc({ ...editingAlloc, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Powerloom Name</label>
                <input
                  type="text"
                  required
                  value={editingAlloc.powerloomName}
                  onChange={(e) => setEditingAlloc({ ...editingAlloc, powerloomName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jarigai Thread (KG)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={editingAlloc.jarigaiKg}
                  onChange={(e) => setEditingAlloc({ ...editingAlloc, jarigaiKg: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <input
                  type="text"
                  value={editingAlloc.notes || ""}
                  onChange={(e) => setEditingAlloc({ ...editingAlloc, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllocEditModal(false);
                    setEditingAlloc(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-black"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
