"use client";

import React, { useState, useEffect } from "react";
import {
  Factory,
  Layers,
  PackageCheck,
  Calendar,
  Send,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  RotateCw,
  Search,
  Warehouse,
  X,
  TrendingUp,
  CreditCard,
  FileText,
  Printer,
  Scale,
  Edit2,
  Trash2,
  BookOpen,
} from "lucide-react";
import { round2, formatINR } from "@/lib/decimal";
import { VeattiFinancialCards } from "./veatti/VeattiFinancialCards";
import { VeattiUnitsTab } from "./veatti/VeattiUnitsTab";
import { VeattiVaravuTab } from "./veatti/VeattiVaravuTab";
import { VeattiAdvanceTab } from "./veatti/VeattiAdvanceTab";
import { VeattiLedgerTab } from "./veatti/VeattiLedgerTab";
import { VeattiUnitDetailModal } from "./veatti/VeattiUnitDetailModal";
import { TraditionalRegisterTab } from "./veatti/TraditionalRegisterTab";
import { RegisterPowerloomModal } from "./veatti/RegisterPowerloomModal";
import { WeftSuggestionView } from "./veatti/WeftSuggestionView";
import {
  DirectEntryModal,
  DailyProductionModal,
  VaravuModal,
  AdvanceModal,
  ConfigureRateModal,
  PrintStatementModal,
} from "./veatti/VeattiModals";

export const VeattiProductionView: React.FC = () => {
  const [units, setUnits] = useState<any[]>([]);
  const [paavus, setPaavus] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [dailyProductions, setDailyProductions] = useState<any[]>([]);
  const [varavuEntries, setVaravuEntries] = useState<any[]>([]);
  const [advanceEntries, setAdvanceEntries] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [weftInventory, setWeftInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Tabs - Traditional Register is default
  const [activeTab, setActiveTab] = useState<
    "register" | "units" | "weft" | "unloaded" | "machines" | "handovers" | "varavu" | "advance" | "ledger"
  >("register");

  // Selected entities for modals
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState<any>(null);
  const [selectedUnitForAction, setSelectedUnitForAction] = useState<any>(null);
  const [selectedPaavu, setSelectedPaavu] = useState<any>(null);
  const [editingProduction, setEditingProduction] = useState<any>(null);
  const [editingVaravu, setEditingVaravu] = useState<any>(null);
  const [editingAdvance, setEditingAdvance] = useState<any>(null);
  const [editingUnit, setEditingUnit] = useState<any>(null);

  // Modals Visibility
  const [showRegisterPowerloomModal, setShowRegisterPowerloomModal] = useState(false);

  // Modals Visibility
  const [showDirectEntryModal, setShowDirectEntryModal] = useState(false);
  const [showAddPaavuModal, setShowAddPaavuModal] = useState(false);
  const [showLoadMachineModal, setShowLoadMachineModal] = useState(false);
  const [showCompletePaavuModal, setShowCompletePaavuModal] = useState(false);
  const [showGovtHandoverModal, setShowGovtHandoverModal] = useState(false);
  const [showDailyProdModal, setShowDailyProdModal] = useState(false);
  const [showVaravuModal, setShowVaravuModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showConfigureRateModal, setShowConfigureRateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printUnit, setPrintUnit] = useState<any>(null);
  const [printRows, setPrintRows] = useState<any[]>([]);

  // Paavu Form (for modal)
  const [paavuForm, setPaavuForm] = useState({
    paavuNumber: "",
    paavuMeters: "" as number | string,
    paavuWeightKg: "" as number | string,
    weaverName: "",
    unitId: "",
    notes: "",
  });

  // Machine Load & Complete Forms
  const [loadMachineForm, setLoadMachineForm] = useState({
    machineNumber: "",
    notes: "",
  });

  const [completePaavuForm, setCompletePaavuForm] = useState({
    actualProducedMeters: "" as string | number,
    notes: "",
  });

  // Handover Form
  const [handoverForm, setHandoverForm] = useState({
    unitId: "",
    challanNo: "",
    meters: "" as string | number,
    recipientDept: "Tamil Nadu Handlooms & Textiles / Co-optex",
    vehicleNo: "",
    officerName: "",
    notes: "",
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [unitsRes, paavusRes, handoversRes, dailyRes, varavuRes, advRes, overviewRes] =
        await Promise.all([
          fetch("/api/production/units?clothType=VEATTI"),
          fetch("/api/production/paavus?clothType=VEATTI"),
          fetch("/api/production/handover?clothType=VEATTI"),
          fetch("/api/production/daily"),
          fetch("/api/production/varavu"),
          fetch("/api/production/advance"),
          fetch("/api/production/overview?type=VEATTI"),
        ]);

      if (unitsRes.ok) setUnits(await unitsRes.json());
      if (paavusRes.ok) setPaavus(await paavusRes.json());
      if (handoversRes.ok) setHandovers(await handoversRes.json());
      if (dailyRes.ok) setDailyProductions(await dailyRes.json());
      if (varavuRes.ok) setVaravuEntries(await varavuRes.json());
      if (advRes.ok) setAdvanceEntries(await advRes.json());
      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        setOverview(ovData.overview?.veatti || null);
        setWeftInventory(ovData.overview?.weftInventory || null);
      }
    } catch (err) {
      console.error("Failed to load Veatti production data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregated KPIs
  const totalProduced = units.reduce((acc, u) => acc + (u.totalProducedMeters || 0), 0);
  const totalHandovered = handovers.reduce(
    (acc, h) => acc + (h.pieces && h.pieces > 0 ? h.pieces : Math.floor((h.meters || 0) / 3.65)),
    0
  );
  const totalPaavuMeters = units.reduce(
    (acc, u) => acc + (u.paavuMeters || 0),
    0
  );
  const rawTarget = units.reduce((acc, u) => acc + (u.targetMeters || 0), 0);
  const totalTarget = rawTarget > totalProduced ? rawTarget : (totalPaavuMeters > 0 ? totalPaavuMeters : totalProduced);
  const godownStock = Math.max(0, totalProduced - totalHandovered);
  const balanceToHandover = Math.max(0, totalTarget - totalHandovered);
  const totalBabinCount = units.reduce((acc, u) => acc + (u.babinCount || 0), 0);
  const remainingPaavuMeters = units.reduce(
    (acc, u) => acc + (u.remainingPaavuMeters !== undefined ? u.remainingPaavuMeters : Math.max(0, (u.paavuMeters || 0) - (u.totalProducedMeters || 0))),
    0
  );

  // Financial KPIs
  const totalPaavuKg = units.reduce((acc, u) => {
    if (u.paavuWeightKg > 0) return acc + u.paavuWeightKg;
    const m = u.paavuMeters || 0;
    const ratio = u.conversionRatio || 12;
    return acc + (ratio > 0 ? m / ratio : 0);
  }, 0);
  const totalVaravu = units.reduce((acc, u) => acc + (u.totalVaravuAmount || 0), 0);
  const totalAdvance = units.reduce((acc, u) => acc + (u.totalAdvancePaid || 0), 0);
  const netBalance = totalVaravu - totalAdvance;
  const amountPayable = units.reduce((acc, u) => acc + (u.currentBalance > 0 ? u.currentBalance : 0), 0);
  const excessAdvance = units.reduce(
    (acc, u) => acc + (u.currentBalance < 0 ? Math.abs(u.currentBalance) : 0),
    0
  );

  // Filtered lists for paavu sub-views
  const unloadedPaavus = paavus.filter((p) => p.status === "UNLOADED");
  const runningPaavus = paavus.filter((p) => p.status === "RUNNING");
  const completedPaavus = paavus.filter((p) => p.status === "COMPLETED");

  // ================= PAAVU ACTIONS =================
  const handleCreatePaavu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/production/paavus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clothType: "VEATTI",
          paavuNumber: paavuForm.paavuNumber,
          paavuMeters: Number(paavuForm.paavuMeters),
          paavuWeightKg: Number(paavuForm.paavuWeightKg),
          weaverName: paavuForm.weaverName || null,
          unitId: paavuForm.unitId || null,
          notes: paavuForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create paavu");

      showToast(`✓ Paavu ${paavuForm.paavuNumber} added to Unloaded Pool!`);
      setShowAddPaavuModal(false);
      setPaavuForm({
        paavuNumber: "",
        paavuMeters: "",
        paavuWeightKg: "",
        weaverName: "",
        unitId: "",
        notes: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLoadMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaavu) return;
    try {
      const res = await fetch(`/api/production/paavus/${selectedPaavu.id}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineNumber: loadMachineForm.machineNumber,
          notes: loadMachineForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load onto machine");

      showToast(`✓ Paavu ${selectedPaavu.paavuNumber} loaded into ${loadMachineForm.machineNumber}!`);
      setShowLoadMachineModal(false);
      setSelectedPaavu(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompletePaavu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaavu) return;
    try {
      const res = await fetch(`/api/production/paavus/${selectedPaavu.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualProducedMeters: Number(completePaavuForm.actualProducedMeters),
          notes: completePaavuForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete paavu");

      const diff = data.verification?.meterDifference ?? 0;
      showToast(
        `✓ Paavu ${selectedPaavu.paavuNumber} completed! Difference: ${diff > 0 ? "+" : ""}${diff}m vs warp meter. Tally updated.`
      );
      setShowCompletePaavuModal(false);
      setSelectedPaavu(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePaavu = async (p: any) => {
    if (!confirm(`Are you sure you want to delete Paavu ${p.paavuNumber}?`)) return;
    try {
      const res = await fetch(`/api/production/paavus/${p.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`✓ Paavu ${p.paavuNumber} deleted.`);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ================= GOVT HANDOVER =================
  const handleGovtHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/production/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clothType: "VEATTI",
          unitId: handoverForm.unitId || null,
          challanNo: handoverForm.challanNo,
          meters: Number(handoverForm.meters),
          recipientDept: handoverForm.recipientDept,
          vehicleNo: handoverForm.vehicleNo,
          officerName: handoverForm.officerName,
          notes: handoverForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record handover");

      showToast(`✓ Government Handover of ${handoverForm.meters}m recorded! Godown and balance tallied.`);
      setShowGovtHandoverModal(false);
      setHandoverForm({
        unitId: "",
        challanNo: "",
        meters: "",
        recipientDept: "Tamil Nadu Handlooms & Textiles / Co-optex",
        vehicleNo: "",
        officerName: "",
        notes: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ================= DELETE ACTIONS =================
  const handleDeleteUnit = async (u: any) => {
    if (
      !confirm(
        `Are you sure you want to delete "${u.weaverName}"? This will delete all associated paavus, production, varavu, and advances for this unit.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/production/units/${u.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`✓ Unit "${u.weaverName}" deleted.`);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProduction = async (prod: any) => {
    if (!confirm(`Delete production entry of ${prod.netProduction || prod.dailyMeters}m?`)) return;
    try {
      const res = await fetch(`/api/production/daily/${prod.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("✓ Production entry deleted and godown stock updated.");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteVaravu = async (varavu: any) => {
    if (!confirm(`Delete Varavu entry of ${formatINR(varavu.amount)}?`)) return;
    try {
      const res = await fetch(`/api/production/varavu/${varavu.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("✓ Varavu entry deleted and financial balance recalculated.");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAdvance = async (adv: any) => {
    if (!confirm(`Delete Advance entry of ${formatINR(adv.amount)}?`)) return;
    try {
      const res = await fetch(`/api/production/advance/${adv.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("✓ Advance payment deleted and financial balance recalculated.");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteGovtHandover = async (h: any) => {
    if (
      !confirm(
        `Are you sure you want to delete Government Handover Challan #${h.challanNo} (${h.meters} Meters)? Godown stock and handover balances will be recalculated automatically.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/production/handover/${h.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`✓ Government Handover Challan #${h.challanNo} deleted.`);
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete government handover");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-white text-slate-900 px-5 py-3.5 font-bold text-xs shadow-xl flex items-center gap-2.5 border border-slate-200/90 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Header Banner & Global Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-2xl shadow-sm">
            D
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-normal leading-snug flex items-center gap-2.5">
              <span>Dhothi Production &amp; Accounting Ledger</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed tracking-normal">
              Digital Powerloom Society Accounting: Paavu Allocation, Loom Production, Varavu, Advance & Auto-Tally
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Register Powerloom */}
          <button
            type="button"
            onClick={() => setShowRegisterPowerloomModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Factory className="h-4 w-4" />
            <span>+ Register Powerloom</span>
          </button>

          {/* Govt Handover */}
          <button
            type="button"
            onClick={() => setShowGovtHandoverModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-blue-50/70 border border-slate-300 text-slate-800 text-xs font-bold shadow-2xs transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Send className="h-4 w-4 text-blue-600" />
            <span>+ Govt Handover</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchData}
            title="Refresh All Ledgers"
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Eight Dashboard Cards (Section 6 Integration) */}
      <VeattiFinancialCards
        clothType="VEATTI"
        totalProduced={totalProduced}
        godownStock={godownStock}
        totalHandovered={totalHandovered}
        balanceToHandover={balanceToHandover}
        totalPaavuKg={totalPaavuKg}
        totalPaavuMeters={totalPaavuMeters}
        totalVaravu={totalVaravu}
        totalAdvance={totalAdvance}
        netBalance={netBalance}
        amountPayable={amountPayable}
        excessAdvance={excessAdvance}
        unitCount={units.length}
        totalBabinCount={totalBabinCount}
        remainingPaavuMeters={remainingPaavuMeters}
      />

      {/* 3. Navigation Tabs - Lightweight Segmented Pill Navigation */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-print">
        {/* Tab: Traditional Register */}
        <button
          type="button"
          onClick={() => setActiveTab("register")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2.5 text-xs font-bold whitespace-nowrap cursor-pointer border ${
            activeTab === "register"
              ? "bg-white text-emerald-950 border-slate-200/90 shadow-xs"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60 border-transparent"
          }`}
        >
          <BookOpen className="h-4 w-4 text-emerald-600" />
          <span>Traditional Register</span>
        </button>

        {/* Tab: Powerloom Units */}
        <button
          type="button"
          onClick={() => setActiveTab("units")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2.5 text-xs font-bold whitespace-nowrap cursor-pointer border ${
            activeTab === "units"
              ? "bg-white text-emerald-950 border-slate-200/90 shadow-xs"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60 border-transparent"
          }`}
        >
          <Factory className="h-4 w-4 text-emerald-600" />
          <span>Powerloom Units ({units.length})</span>
        </button>

        {/* Tab: Weft & Godown Allocation */}
        <button
          type="button"
          onClick={() => setActiveTab("weft")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2.5 text-xs font-bold whitespace-nowrap cursor-pointer border ${
            activeTab === "weft"
              ? "bg-white text-sky-950 border-slate-200/90 shadow-xs"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60 border-transparent"
          }`}
        >
          <Scale className="h-4 w-4 text-sky-600" />
          <span>Weft &amp; Godown Suggester</span>
        </button>

        {/* Tab: Unloaded Paavu */}
        <button
          type="button"
          onClick={() => setActiveTab("unloaded")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2.5 text-xs font-bold whitespace-nowrap cursor-pointer border ${
            activeTab === "unloaded"
              ? "bg-white text-amber-950 border-slate-200/90 shadow-xs"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60 border-transparent"
          }`}
        >
          <PackageCheck className="h-4 w-4 text-amber-600" />
          <span>Unloaded Paavu ({unloadedPaavus.length})</span>
        </button>

        {/* Tab: Loom Machines */}
        <button
          type="button"
          onClick={() => setActiveTab("machines")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2.5 text-xs font-bold whitespace-nowrap cursor-pointer border ${
            activeTab === "machines"
              ? "bg-white text-emerald-950 border-slate-200/90 shadow-xs"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60 border-transparent"
          }`}
        >
          <Layers className="h-4 w-4 text-emerald-600" />
          <span>Loom Machines ({runningPaavus.length} Running)</span>
        </button>

        {/* Tab: Government Handover */}
        <button
          type="button"
          onClick={() => setActiveTab("handovers")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2.5 text-xs font-bold whitespace-nowrap cursor-pointer border ${
            activeTab === "handovers"
              ? "bg-white text-blue-950 border-slate-200/90 shadow-xs"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60 border-transparent"
          }`}
        >
          <Send className="h-4 w-4 text-blue-600" />
          <span>Government Handover ({handovers.length})</span>
        </button>

        {/* Tab: Consolidated Ledger */}
        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 text-xs font-bold whitespace-nowrap cursor-pointer border ${
            activeTab === "ledger"
              ? "bg-white text-slate-950 border-slate-200/90 shadow-xs"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60 border-transparent"
          }`}
        >
          <FileText className="h-4 w-4 text-slate-700" />
          <span>Consolidated Ledger</span>
        </button>
      </div>

      {/* 4. TAB 0: TRADITIONAL HANDWRITTEN REGISTER (Image 2 Authentic Ledger) */}
      {activeTab === "register" && (
        <TraditionalRegisterTab
          clothType="VEATTI"
          units={units}
          weftInventory={weftInventory}
          onRefresh={fetchData}
          onOpenRegisterModal={() => setShowRegisterPowerloomModal(true)}
          onOpenDirectEntryModal={(u) => {
            setEditingUnit(u || null);
            setShowDirectEntryModal(true);
          }}
          onOpenAddPaavuModal={(u) => {
            if (u) {
              setPaavuForm((prev) => ({
                ...prev,
                unitId: u.id,
                weaverName: u.weaverName,
              }));
            }
            setShowAddPaavuModal(true);
          }}
          onOpenDailyProdModal={(u) => {
            if (u) setSelectedUnitForAction(u);
            setEditingProduction(null);
            setShowDailyProdModal(true);
          }}
          onOpenVaravuModal={(u) => {
            if (u) setSelectedUnitForAction(u);
            setEditingVaravu(null);
            setShowVaravuModal(true);
          }}
          onOpenAdvanceModal={(u) => {
            if (u) setSelectedUnitForAction(u);
            setEditingAdvance(null);
            setShowAdvanceModal(true);
          }}
        />
      )}

      {/* 4.5 TAB: WEFT & GODOWN ALLOCATION */}
      {activeTab === "weft" && (
        <WeftSuggestionView
          clothType="VEATTI"
          units={units}
          weftInventory={weftInventory}
          onRefresh={fetchData}
          onOpenWeftModal={(u, bags, kg) => {
            setActiveTab("register");
          }}
          onOpenBabinModal={(u, sets) => {
            setActiveTab("register");
          }}
        />
      )}

      {/* 5. TAB 1: POWERLOOM UNITS & PRODUCTION */}
      {activeTab === "units" && (
        <VeattiUnitsTab
          units={units}
          search={search}
          setSearch={setSearch}
          onSelectUnit={(u) => setSelectedUnitForDetail(u)}
          onEditUnit={(u) => {
            setEditingUnit(u);
            setShowDirectEntryModal(true);
          }}
          onDeleteUnit={handleDeleteUnit}
          onAddProduction={(u) => {
            setSelectedUnitForAction(u);
            setEditingProduction(null);
            setShowDailyProdModal(true);
          }}
          onAddVaravu={(u) => {
            setSelectedUnitForAction(u);
            setEditingVaravu(null);
            setShowVaravuModal(true);
          }}
          onAddAdvance={(u) => {
            setSelectedUnitForAction(u);
            setEditingAdvance(null);
            setShowAdvanceModal(true);
          }}
          onDirectEntryClick={() => {
            setEditingUnit(null);
            setShowDirectEntryModal(true);
          }}
        />
      )}

      {/* 5. TAB 2: UNLOADED PAAVU SECTION */}
      {activeTab === "unloaded" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-amber-600" />
                <span>Unloaded Paavu Pool</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Warp beams delivered to shed waiting to be loaded onto loom machines. When loaded, they automatically move to Running status!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPaavuModal(true)}
              className="px-4 py-2 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-bold text-xs shadow-md transition self-start sm:self-auto"
            >
              + Add Unloaded Paavu
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unloadedPaavus.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                No unloaded paavu currently waiting. All paavu beams are assigned to loom machines!
              </div>
            ) : (
              unloadedPaavus.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4 hover:border-amber-400 transition shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">{p.paavuNumber}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        UNLOADED
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      <span className="text-slate-400 block text-[11px]">Weaver / Unit:</span>
                      <span className="font-bold text-slate-900">
                        {p.weaverName || p.unit?.weaverName || "Society Loom Shed"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Warp Length:</span>
                        <span className="font-extrabold text-slate-900">{p.paavuMeters} m</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Weight:</span>
                        <span className="font-extrabold text-slate-900">{p.paavuWeightKg || 0} kg</span>
                      </div>
                    </div>

                    {p.notes && <p className="text-[11px] text-slate-400 italic">{p.notes}</p>}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaavu(p);
                        setShowLoadMachineModal(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Load into Loom Machine</span>
                    </button>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeletePaavu(p)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700"
                      >
                        Delete Paavu
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 3: INDIVIDUAL MACHINE LOOMS */}
      {activeTab === "machines" && (
        <div className="space-y-6">
          {/* Active Running Machines */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Currently Running Loom Machines ({runningPaavus.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {runningPaavus.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                  No machines currently running. Load an unloaded paavu to begin weaving!
                </div>
              ) : (
                runningPaavus.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-emerald-300 bg-white p-5 flex flex-col justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <Factory className="h-4 w-4 text-emerald-600" />
                          <span>{p.machineNumber}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          RUNNING
                        </span>
                      </div>

                      <div className="text-xs">
                        <span className="text-slate-400 block text-[11px]">Paavu Number:</span>
                        <span className="font-extrabold text-slate-900">{p.paavuNumber}</span>
                      </div>

                      <div className="text-xs">
                        <span className="text-slate-400 block text-[11px]">Powerloom Weaver:</span>
                        <span className="font-semibold text-slate-900">
                          {p.weaverName || p.unit?.weaverName || "Loom Operator"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Warp Length Given:</span>
                          <span className="font-black text-emerald-600">{p.paavuMeters} m</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Produced So Far:</span>
                          <span className="font-black text-slate-900">{p.actualProducedMeters || 0} m</span>
                        </div>
                      </div>

                      {p.loadedAt && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>Loaded: {new Date(p.loadedAt).toLocaleDateString("en-IN")}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaavu(p);
                        setCompletePaavuForm({
                          actualProducedMeters: p.paavuMeters,
                          notes: "",
                        });
                        setShowCompletePaavuModal(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Mark Completed & Cross-Verify Meters</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Machines History & Variance Verification */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>Completed Paavu Verification Ledger ({completedPaavus.length})</span>
            </h3>

            <div className="overflow-x-auto scrollbar-landscape pb-2 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs min-w-[1150px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4.5 whitespace-nowrap">Paavu &amp; Machine No</th>
                    <th className="py-3.5 px-4.5 whitespace-nowrap">Weaver Name</th>
                    <th className="py-3.5 px-4.5 text-right whitespace-nowrap">Paavu Meter Given</th>
                    <th className="py-3.5 px-4.5 text-right whitespace-nowrap">Actual Meter Got</th>
                    <th className="py-3.5 px-4.5 text-right whitespace-nowrap">Difference (Wastage / Stretch)</th>
                    <th className="py-3.5 px-4.5 text-center whitespace-nowrap">Variance %</th>
                    <th className="py-3.5 px-4.5 text-right whitespace-nowrap">Completed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {completedPaavus.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No completed paavus recorded yet.
                      </td>
                    </tr>
                  ) : (
                    completedPaavus.map((p) => {
                      const diff = p.meterDifference ?? 0;
                      const isPositive = diff >= 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4.5 whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 block">{p.paavuNumber}</span>
                            <span className="text-[11px] text-slate-400">{p.machineNumber}</span>
                          </td>
                          <td className="py-3.5 px-4.5 font-semibold text-slate-900 whitespace-nowrap">
                            {p.weaverName || "Loom Operator"}
                          </td>
                          <td className="py-3.5 px-4.5 text-right font-bold text-slate-900 font-mono tabular-nums whitespace-nowrap">
                            {p.paavuMeters.toLocaleString("en-IN")} m
                          </td>
                          <td className="py-3.5 px-4.5 text-right font-black text-emerald-600 font-mono tabular-nums whitespace-nowrap">
                            {p.actualProducedMeters.toLocaleString("en-IN")} m
                          </td>
                          <td className="py-3.5 px-4.5 text-right whitespace-nowrap font-mono tabular-nums">
                            <span
                              className={`inline-flex items-center gap-1.5 font-black ${
                                isPositive ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              <span>{isPositive ? `+${diff}` : diff} m</span>
                              <span className="text-[11px] font-normal text-slate-400 font-sans">
                                {isPositive ? "(Surplus)" : "(Wastage)"}
                              </span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4.5 text-center font-bold text-slate-800 font-mono tabular-nums whitespace-nowrap">
                            {p.variancePercent ? `${p.variancePercent}%` : "0%"}
                          </td>
                          <td className="py-3.5 px-4.5 text-right text-slate-600 whitespace-nowrap font-mono text-xs">
                            {p.completedAt
                              ? new Date(p.completedAt).toLocaleDateString("en-IN")
                              : "—"}
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

      {/* 7. TAB 4: GOVT HANDOVERS LOG */}
      {activeTab === "handovers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">
              Government & Co-optex Handover Challans
            </h3>
            <button
              type="button"
              onClick={() => setShowGovtHandoverModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
            >
              + Record Govt Handover
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-landscape pb-2 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs min-w-[1150px]">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4.5 whitespace-nowrap">Challan / Order No</th>
                  <th className="py-3.5 px-4.5 whitespace-nowrap">Handover Date</th>
                  <th className="py-3.5 px-4.5 text-right whitespace-nowrap">Quantity Handovered</th>
                  <th className="py-3.5 px-4.5 whitespace-nowrap">Weaver / Unit</th>
                  <th className="py-3.5 px-4.5 whitespace-nowrap">Recipient Department</th>
                  <th className="py-3.5 px-4.5 whitespace-nowrap">Vehicle Number</th>
                  <th className="py-3.5 px-4.5 whitespace-nowrap">Inspection Officer</th>
                  <th className="py-3.5 px-4.5 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {handovers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No government handovers recorded yet.
                    </td>
                  </tr>
                ) : (
                  handovers.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 transition group">
                      <td className="py-3.5 px-4.5 font-extrabold text-slate-900 whitespace-nowrap font-mono">{h.challanNo}</td>
                      <td className="py-3.5 px-4.5 text-slate-600 whitespace-nowrap font-mono text-xs">
                        {new Date(h.handoverDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4.5 text-right font-black text-blue-700 text-xs font-mono tabular-nums whitespace-nowrap">
                        {h.meters.toLocaleString("en-IN")} Meters
                      </td>
                      <td className="py-3.5 px-4.5 font-semibold text-slate-800 whitespace-nowrap">
                        {h.unit?.weaverName || "Society Pool"}
                      </td>
                      <td className="py-3.5 px-4.5 text-slate-900 font-medium whitespace-nowrap">{h.recipientDept}</td>
                      <td className="py-3.5 px-4.5 text-slate-500 font-mono whitespace-nowrap">{h.vehicleNo || "—"}</td>
                      <td className="py-3.5 px-4.5 text-slate-600 whitespace-nowrap">{h.officerName || "—"}</td>
                      <td className="py-3.5 px-4.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteGovtHandover(h)}
                          title="Delete Government Handover"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: COMPLETE ACCOUNTING LEDGER (Image 2 style) */}
      {activeTab === "ledger" && (
        <VeattiLedgerTab
          units={units}
          onSelectUnit={(u) => setSelectedUnitForDetail(u)}
          onEditTransaction={(tx) => {
            if (tx.type === "VARAVU") {
              const fullEntry = varavuEntries.find((v) => v.id === tx.id);
              if (fullEntry) {
                setEditingVaravu(fullEntry);
                setShowVaravuModal(true);
              }
            } else if (tx.type === "ADVANCE") {
              const fullEntry = advanceEntries.find((a) => a.id === tx.id);
              if (fullEntry) {
                setEditingAdvance(fullEntry);
                setShowAdvanceModal(true);
              }
            } else if (tx.type === "PRODUCTION") {
              const fullEntry = dailyProductions.find((p) => p.id === tx.id);
              if (fullEntry) {
                setEditingProduction(fullEntry);
                setShowDailyProdModal(true);
              }
            }
          }}
          onDeleteTransaction={(tx) => {
            if (tx.type === "VARAVU") {
              const fullEntry = varavuEntries.find((v) => v.id === tx.id);
              if (fullEntry) handleDeleteVaravu(fullEntry);
            } else if (tx.type === "ADVANCE") {
              const fullEntry = advanceEntries.find((a) => a.id === tx.id);
              if (fullEntry) handleDeleteAdvance(fullEntry);
            } else if (tx.type === "PRODUCTION") {
              const fullEntry = dailyProductions.find((p) => p.id === tx.id);
              if (fullEntry) handleDeleteProduction(fullEntry);
            }
          }}
          onPrintStatement={(selectedUnit, filteredRows) => {
            setPrintUnit(selectedUnit);
            setPrintRows(filteredRows);
            setShowPrintModal(true);
          }}
        />
      )}

      {/* =========================================================================
       * ALL MODALS
       * ========================================================================= */}

      {/* Modal: Direct Entry / Edit Unit */}
      <DirectEntryModal
        isOpen={showDirectEntryModal}
        onClose={() => setShowDirectEntryModal(false)}
        onSuccess={() => {
          showToast("✓ Dhothi powerloom production contract saved successfully!");
          fetchData();
        }}
        initialData={editingUnit}
      />

      {/* Modal: Individual Veatti Detail Page / Modal */}
      {selectedUnitForDetail && (
        <VeattiUnitDetailModal
          unit={selectedUnitForDetail}
          onClose={() => setSelectedUnitForDetail(null)}
          onRefresh={fetchData}
          onOpenAddPaavu={(u) => {
            setPaavuForm({
              paavuNumber: "",
              paavuMeters: "",
              paavuWeightKg: "",
              weaverName: u.weaverName,
              unitId: u.id,
              notes: "",
            });
            setShowAddPaavuModal(true);
          }}
          onOpenAddProduction={(u) => {
            setSelectedUnitForAction(u);
            setEditingProduction(null);
            setShowDailyProdModal(true);
          }}
          onOpenAddVaravu={(u) => {
            setSelectedUnitForAction(u);
            setEditingVaravu(null);
            setShowVaravuModal(true);
          }}
          onOpenAddAdvance={(u) => {
            setSelectedUnitForAction(u);
            setEditingAdvance(null);
            setShowAdvanceModal(true);
          }}
          onEditUnitInfo={(u) => {
            setEditingUnit(u);
            setShowDirectEntryModal(true);
          }}
          onEditPaavu={(p) => {
            setSelectedPaavu(p);
            // Can trigger machine or direct edit
          }}
          onDeletePaavu={handleDeletePaavu}
          onEditProduction={(p) => {
            setEditingProduction(p);
            setShowDailyProdModal(true);
          }}
          onDeleteProduction={handleDeleteProduction}
          onEditVaravu={(v) => {
            setEditingVaravu(v);
            setShowVaravuModal(true);
          }}
          onDeleteVaravu={handleDeleteVaravu}
          onEditAdvance={(a) => {
            setEditingAdvance(a);
            setShowAdvanceModal(true);
          }}
          onDeleteAdvance={handleDeleteAdvance}
          onConfigureRate={(u) => {
            setSelectedUnitForAction(u);
            setShowConfigureRateModal(true);
          }}
        />
      )}

      {/* Modal: Add Paavu */}
      {showAddPaavuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Add Paavu to Unloaded Pool
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPaavuModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePaavu} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Paavu Number *</label>
                <input
                  type="text"
                  required
                  value={paavuForm.paavuNumber}
                  onChange={(e) => setPaavuForm({ ...paavuForm, paavuNumber: e.target.value })}
                  placeholder="e.g. PV-V-102"
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Paavu Weight (KG)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={paavuForm.paavuWeightKg}
                    onChange={(e) => {
                      const kg = Number(e.target.value);
                      setPaavuForm({
                        ...paavuForm,
                        paavuWeightKg: kg,
                        paavuMeters: kg * 12,
                      });
                    }}
                    className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Paavu Meters *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={paavuForm.paavuMeters}
                    onChange={(e) => setPaavuForm({ ...paavuForm, paavuMeters: Number(e.target.value) })}
                    className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Powerloom Weaver / Unit</label>
                <select
                  value={paavuForm.unitId}
                  onChange={(e) => {
                    const sel = units.find((u) => u.id === e.target.value);
                    setPaavuForm({
                      ...paavuForm,
                      unitId: e.target.value,
                      weaverName: sel ? sel.weaverName : "",
                    });
                  }}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                >
                  <option value="">-- General Society Warp Shed --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.weaverName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <input
                  type="text"
                  value={paavuForm.notes}
                  onChange={(e) => setPaavuForm({ ...paavuForm, notes: e.target.value })}
                  placeholder="e.g. Sized beam from Mill-B"
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddPaavuModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-extrabold shadow-md"
                >
                  Add to Unloaded Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Load onto Machine */}
      {showLoadMachineModal && selectedPaavu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Load Paavu into Machine Loom
              </h3>
              <button
                type="button"
                onClick={() => setShowLoadMachineModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Paavu No:</span>
                <span className="font-extrabold text-slate-900">{selectedPaavu.paavuNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Warp Length:</span>
                <span className="font-bold text-amber-600">{selectedPaavu.paavuMeters} Meters</span>
              </div>
            </div>

            <form onSubmit={handleLoadMachine} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Machine Number / Loom No *
                </label>
                <input
                  type="text"
                  required
                  value={loadMachineForm.machineNumber}
                  onChange={(e) =>
                    setLoadMachineForm({ ...loadMachineForm, machineNumber: e.target.value })
                  }
                  placeholder="e.g. Loom #1, Loom #2"
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-bold outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowLoadMachineModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Start Weaving</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Paavu & Verify Meters */}
      {showCompletePaavuModal && selectedPaavu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Complete Weaving & Meter Cross-Verification
              </h3>
              <button
                type="button"
                onClick={() => setShowCompletePaavuModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Machine / Loom:</span>
                <span className="font-extrabold text-slate-900">{selectedPaavu.machineNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Paavu Meter Given:</span>
                <span className="font-extrabold text-slate-900">{selectedPaavu.paavuMeters} Meters</span>
              </div>
            </div>

            <form onSubmit={handleCompletePaavu} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Actual Meter Got from Machine *
                </label>
                <input
                  type="number"
                  required
                  step="0.1"
                  value={completePaavuForm.actualProducedMeters}
                  onChange={(e) =>
                    setCompletePaavuForm({
                      ...completePaavuForm,
                      actualProducedMeters: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 text-base font-black outline-none focus:border-emerald-500"
                />
              </div>

              {/* Difference preview */}
              {(() => {
                const diff =
                  Number(completePaavuForm.actualProducedMeters || 0) - Number(selectedPaavu.paavuMeters || 0);
                return (
                  <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Computed Difference:</span>
                    <span
                      className={`font-black text-sm ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {diff >= 0 ? "+" : ""}
                      {round2(diff)} Meters
                    </span>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCompletePaavuModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md"
                >
                  Confirm Completion & Tally
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Govt Handover */}
      {showGovtHandoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Government Handover</h3>
              <button
                type="button"
                onClick={() => setShowGovtHandoverModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGovtHandover} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Challan / Consignment No *
                </label>
                <input
                  type="text"
                  required
                  value={handoverForm.challanNo}
                  onChange={(e) => setHandoverForm({ ...handoverForm, challanNo: e.target.value })}
                  placeholder="e.g. TN-COOP-2026-089"
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Total Meters Handovered *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={handoverForm.meters}
                  onChange={(e) => setHandoverForm({ ...handoverForm, meters: Number(e.target.value) })}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 text-base font-black outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Link to Unit</label>
                <select
                  value={handoverForm.unitId}
                  onChange={(e) => setHandoverForm({ ...handoverForm, unitId: e.target.value })}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                >
                  <option value="">-- General Society Dhothi Batch --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.weaverName} (Target: {u.targetMeters}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Recipient Department</label>
                <input
                  type="text"
                  value={handoverForm.recipientDept}
                  onChange={(e) => setHandoverForm({ ...handoverForm, recipientDept: e.target.value })}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle No</label>
                  <input
                    type="text"
                    value={handoverForm.vehicleNo}
                    onChange={(e) => setHandoverForm({ ...handoverForm, vehicleNo: e.target.value })}
                    className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Officer Name</label>
                  <input
                    type="text"
                    value={handoverForm.officerName}
                    onChange={(e) => setHandoverForm({ ...handoverForm, officerName: e.target.value })}
                    className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowGovtHandoverModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md"
                >
                  Record Handover & Tally
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Daily Production */}
      <DailyProductionModal
        isOpen={showDailyProdModal}
        onClose={() => {
          setShowDailyProdModal(false);
          setEditingProduction(null);
        }}
        onSuccess={() => {
          showToast("✓ Daily Loom Production recorded & auto-tallied!");
          fetchData();
        }}
        units={units}
        defaultUnit={selectedUnitForAction}
        editingEntry={editingProduction}
      />

      {/* Modal: Varavu Transaction */}
      <VaravuModal
        isOpen={showVaravuModal}
        onClose={() => {
          setShowVaravuModal(false);
          setEditingVaravu(null);
        }}
        onSuccess={() => {
          showToast("✓ Varavu transaction saved & balance recalculated!");
          fetchData();
        }}
        units={units}
        defaultUnit={selectedUnitForAction}
        editingEntry={editingVaravu}
      />

      {/* Modal: Advance Payment */}
      <AdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => {
          setShowAdvanceModal(false);
          setEditingAdvance(null);
        }}
        onSuccess={() => {
          showToast("✓ Advance payment recorded & balance recalculated!");
          fetchData();
        }}
        units={units}
        defaultUnit={selectedUnitForAction}
        editingEntry={editingAdvance}
      />

      {/* Modal: Configure Rate */}
      <ConfigureRateModal
        isOpen={showConfigureRateModal}
        onClose={() => setShowConfigureRateModal(false)}
        onSuccess={() => {
          showToast("✓ Rate configured & applicable ledger updated!");
          fetchData();
        }}
        unit={selectedUnitForAction}
      />

      {/* Modal: Print A4 Statement */}
      <PrintStatementModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        selectedUnit={printUnit}
        ledgerRows={printRows}
      />

      {/* Modal: Register Powerloom Unit (Step 1) */}
      <RegisterPowerloomModal
        isOpen={showRegisterPowerloomModal}
        onClose={() => setShowRegisterPowerloomModal(false)}
        defaultClothType="VEATTI"
        lockClothType={true}
        onSuccess={() => {
          showToast("✓ Dhothi powerloom unit registered successfully!");
          fetchData();
        }}
      />
    </div>
  );
};
