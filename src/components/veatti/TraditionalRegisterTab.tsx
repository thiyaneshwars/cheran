"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Factory,
  Layers,
  PackageCheck,
  Calendar,
  Plus,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  Printer,
  Scale,
  Edit2,
  Trash2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  ArrowRight,
  Check,
  Download,
} from "lucide-react";
import {
  calculateWeftConsumed,
  calculateTraditionalWage,
  calculateBagsToKg,
  computeTraditionalRegisterLedger,
  calculateSareeBabinConsumed,
  calculateMetersFromSarees,
  calculateSareesFromMeters,
  SAREE_DEFAULT_LENGTH_METERS,
  SAREE_SAREES_PER_BABIN_SET,
  SAREE_METERS_PER_BABIN_SET,
  calculateVeattiBabinConsumed,
  calculateMetersFromVeattis,
  calculateVeattisFromMeters,
  VEATTI_DEFAULT_LENGTH_METERS,
  VEATTI_VEATTIS_PER_BABIN_SET,
  VEATTI_METERS_PER_BABIN_SET,
  TRADITIONAL_WEFT_FACTOR,
  TRADITIONAL_DEFAULT_WAGE_RATE,
  TRADITIONAL_KG_PER_BAG,
  VEATTI_KG_PER_BAG,
  SAREE_KG_PER_BAG,
  getKgPerBag,
} from "@/lib/veatti-calculations";
import { formatINR, round2 } from "@/lib/decimal";

interface TraditionalRegisterTabProps {
  units: any[];
  onRefresh: () => void;
  onOpenRegisterModal: () => void;
  onOpenDirectEntryModal?: (unit?: any) => void;
  onOpenAddPaavuModal?: (unit?: any) => void;
  onOpenDailyProdModal?: (unit?: any) => void;
  onOpenVaravuModal?: (unit?: any) => void;
  onOpenAdvanceModal?: (unit?: any) => void;
  clothType?: "VEATTI" | "SAREE";
}

export const TraditionalRegisterTab: React.FC<TraditionalRegisterTabProps> = ({
  units,
  onRefresh,
  onOpenRegisterModal,
  onOpenDirectEntryModal,
  onOpenAddPaavuModal,
  onOpenDailyProdModal,
  onOpenVaravuModal,
  onOpenAdvanceModal,
  clothType = "VEATTI",
}) => {
  // Selected Powerloom in Scroll Selector
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [filterType, setFilterType] = useState<"ALL" | "VEATTI" | "SAREE">(clothType || "VEATTI");
  const [searchQuery, setSearchQuery] = useState("");

  // Register Entries State for selected unit
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Table Filtering & Search State
  const [entryFilterType, setEntryFilterType] = useState<
    "ALL" | "PRODUCED" | "PAAVU" | "WEFT_BAG" | "CASH" | "BABIN"
  >("ALL");
  const [entrySearch, setEntrySearch] = useState<string>("");

  // Quick Entry Modal & Editing Modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);

  // Landscape Scroll Reference & Helper
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollTable = (direction: "left" | "right") => {
    if (tableContainerRef.current) {
      const offset = direction === "left" ? -450 : 450;
      tableContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Fast Inline Quick-Add Strip State
  const [inlineType, setInlineType] = useState<"PRODUCED" | "PAAVU" | "WEFT_BAG" | "CASH" | "BABIN">("PRODUCED");
  const [inlineValue, setInlineValue] = useState<string>("");
  const [inlineSarees, setInlineSarees] = useState<string>("");
  const [inlineVeattis, setInlineVeattis] = useState<string>("");
  const [inlineBags, setInlineBags] = useState<string>("");
  const [inlineDesc, setInlineDesc] = useState<string>(
    clothType === "SAREE" ? "Saree Production" : "Veatti Production"
  );
  const [inlineDate, setInlineDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [inlineSaving, setInlineSaving] = useState(false);

  // Modal Entry Form State
  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split("T")[0],
    entryType: "PRODUCED" as "PAAVU" | "PRODUCED" | "WEFT_BAG" | "CASH" | "BABIN",
    description: "",
    paavuGivenMeters: "" as string | number,
    paavuProducedMeters: "" as string | number,
    sareeCount: "" as string | number,
    veattiCount: "" as string | number,
    weftGivenKg: "" as string | number,
    weftBagsGiven: "" as string | number,
    babinCount: "" as string | number,
    beamCount: "" as string | number,
    wageRate: 19 as string | number,
    cashPaid: "" as string | number,
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtered powerlooms for the horizontal scroll bar
  const filteredUnits = units.filter((u) => {
    const matchesType = clothType ? u.clothType === clothType : (filterType === "ALL" ? true : u.clothType === filterType);
    const matchesSearch =
      !searchQuery.trim() ||
      u.weaverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Auto-select first filtered unit on mount or units change
  useEffect(() => {
    if (filteredUnits.length > 0 && (!selectedUnitId || !filteredUnits.some((u) => u.id === selectedUnitId))) {
      const firstId = filteredUnits[0].id;
      setSelectedUnitId(firstId);
      fetchRegisterEntries(firstId);
    }
  }, [filteredUnits, selectedUnitId]);

  // Selected Unit Object
  const selectedUnit = filteredUnits.find((u) => u.id === selectedUnitId) || filteredUnits[0] || null;

  // Fetch register entries whenever selectedUnit changes
  const fetchRegisterEntries = async (unitId: string) => {
    if (!unitId) return;
    setLoadingEntries(true);
    try {
      const res = await fetch(`/api/production/register?unitId=${unitId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to fetch register entries:", err);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (selectedUnitId) {
      fetchRegisterEntries(selectedUnitId);
      // Pre-fill wage rate from unit
      const u = units.find((x) => x.id === selectedUnitId);
      if (u) {
        setEntryForm((prev) => ({
          ...prev,
          wageRate: u.individualRate || TRADITIONAL_DEFAULT_WAGE_RATE,
        }));
      }
    }
  }, [selectedUnitId]);

  // Active configured weft multiplier and kg per bag for this powerloom:
  // Veatti: 60 kg/bag • Saree: 50 kg/bag
  const activeKgPerBag = getKgPerBag(clothType || selectedUnit?.clothType);
  const activeWeftMultiplier = selectedUnit?.weftMultiplier || (clothType === "SAREE" ? 0.182 : 0.119);

  // Handle Inline Quick Entry Submit
  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit || !inlineValue) return;

    setInlineSaving(true);
    try {
      const numVal = parseFloat(inlineValue) || 0;
      const rate = selectedUnit.individualRate || TRADITIONAL_DEFAULT_WAGE_RATE;

      let payload: any = {
        unitId: selectedUnit.id,
        date: inlineDate,
        entryType: inlineType,
        description: inlineDesc.trim() || `${inlineType} entry`,
      };

      if (inlineType === "PRODUCED") {
        payload.paavuProducedMeters = numVal;
        payload.wageRate = rate;
      } else if (inlineType === "PAAVU") {
        payload.paavuGivenMeters = numVal;
      } else if (inlineType === "WEFT_BAG") {
        const bags = parseFloat(inlineBags) || 0;
        payload.weftBagsGiven = bags;
        payload.weftGivenKg = numVal > 0 ? numVal : calculateBagsToKg(bags, activeKgPerBag);
      } else if (inlineType === "CASH") {
        payload.cashPaid = numVal;
      } else if (inlineType === "BABIN") {
        payload.babinCount = Math.round(numVal);
      }

      const res = await fetch("/api/production/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to add register entry");
      }

      // Reset inline form
      setInlineValue("");
      setInlineSarees("");
      setInlineVeattis("");
      setInlineBags("");
      fetchRegisterEntries(selectedUnit.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInlineSaving(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = (type: "PAAVU" | "PRODUCED" | "WEFT_BAG" | "CASH" | "BABIN" = "PRODUCED") => {
    setEditingEntry(null);
    setEntryForm({
      date: new Date().toISOString().split("T")[0],
      entryType: type,
      description:
        type === "PAAVU"
          ? "Warp Issued / Paavu Given"
          : type === "PRODUCED"
          ? (clothType === "SAREE" ? "Saree Production" : "Veatti Production")
          : type === "WEFT_BAG"
          ? "Weft Yarn Issued"
          : type === "CASH"
          ? "Wage Cash Paid"
          : "Babin Issued",
      paavuGivenMeters: "",
      paavuProducedMeters: "",
      sareeCount: "",
      veattiCount: "",
      weftGivenKg: "",
      weftBagsGiven: "",
      babinCount: "",
      beamCount: "",
      wageRate: selectedUnit?.individualRate || (clothType === "SAREE" ? 45 : TRADITIONAL_DEFAULT_WAGE_RATE),
      cashPaid: "",
      notes: "",
    });
    setErrorMsg(null);
    setShowEntryModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (entry: any) => {
    setEditingEntry(entry);
    setEntryForm({
      date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : "",
      entryType: entry.entryType,
      description: entry.description || "",
      paavuGivenMeters: entry.paavuGivenMeters || "",
      paavuProducedMeters: entry.paavuProducedMeters || "",
      sareeCount: entry.paavuProducedMeters && clothType === "SAREE" ? calculateSareesFromMeters(entry.paavuProducedMeters) : "",
      veattiCount: entry.paavuProducedMeters && clothType === "VEATTI" ? calculateVeattisFromMeters(entry.paavuProducedMeters) : "",
      weftGivenKg: entry.weftGivenKg || "",
      weftBagsGiven: entry.weftBagsGiven || "",
      babinCount: entry.babinCount || "",
      beamCount: entry.beamCount || "",
      wageRate: entry.wageRate || selectedUnit?.individualRate || (clothType === "SAREE" ? 45 : TRADITIONAL_DEFAULT_WAGE_RATE),
      cashPaid: entry.cashPaid || "",
      notes: entry.notes || "",
    });
    setErrorMsg(null);
    setShowEntryModal(true);
  };

  // Auto-calculated previews for entry form
  const previewProduced = Number(entryForm.paavuProducedMeters) || 0;
  const previewSarees = Number(entryForm.sareeCount) || (previewProduced > 0 && clothType === "SAREE" ? calculateSareesFromMeters(previewProduced) : 0);
  const previewVeattis = Number(entryForm.veattiCount) || (previewProduced > 0 && clothType === "VEATTI" ? calculateVeattisFromMeters(previewProduced) : 0);
  const previewGivenPaavu = Number(entryForm.paavuGivenMeters) || 0;
  const previewRate = Number(entryForm.wageRate) || (clothType === "SAREE" ? 45 : TRADITIONAL_DEFAULT_WAGE_RATE);
  const previewWeftConsumed = calculateWeftConsumed(previewProduced, activeWeftMultiplier);
  const previewBabinConsumed = clothType === "SAREE" ? calculateSareeBabinConsumed(previewProduced) : calculateVeattiBabinConsumed(previewProduced);
  const previewWageEarned = calculateTraditionalWage(previewProduced, previewRate);
  const previewCashPaid = Number(entryForm.cashPaid) || 0;
  const previewWeftBags = Number(entryForm.weftBagsGiven) || 0;
  const previewWeftGiven =
    Number(entryForm.weftGivenKg) || (previewWeftBags > 0 ? calculateBagsToKg(previewWeftBags, activeKgPerBag) : 0);

  // Projected Live Running Tallies
  const currentPaavuRemaining = summary?.remainingPaavu ?? (selectedUnit?.remainingPaavuMeters || 0);
  const currentWeftStock = summary?.weftStock ?? (selectedUnit?.weftStockKg ?? selectedUnit?.initialWeftKg ?? 0);
  const currentBabinCount = summary?.remainingBabin ?? summary?.totalBabin ?? (selectedUnit?.babinCount || 0);
  const currentNetBalance = summary?.netBalance ?? (selectedUnit?.currentBalance || 0);

  const previewBabin = Number(entryForm.babinCount) || 0;
  const projectedRemainingPaavu = round2(
    currentPaavuRemaining + previewGivenPaavu - previewProduced
  );
  const projectedWeftStock = Number(
    (currentWeftStock + previewWeftGiven - previewWeftConsumed).toFixed(3)
  );
  const projectedBabinCount = round2(
    Math.max(0, currentBabinCount + previewBabin - previewBabinConsumed)
  );
  const projectedNetBalance = round2(
    currentNetBalance + previewWageEarned - previewCashPaid
  );

  // Save / Update Entry
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        unitId: selectedUnit.id,
        date: entryForm.date,
        entryType: entryForm.entryType,
        description: entryForm.description.trim() || `${entryForm.entryType} Entry`,
        paavuGivenMeters: previewGivenPaavu,
        paavuProducedMeters: previewProduced,
        weftGivenKg: previewWeftGiven,
        weftBagsGiven: previewWeftBags,
        babinCount: Number(entryForm.babinCount) || 0,
        beamCount: Number(entryForm.beamCount) || 0,
        wageRate: previewRate,
        cashPaid: previewCashPaid,
        notes: entryForm.notes.trim() || null,
      };

      const url = editingEntry
        ? `/api/production/register/${editingEntry.id}`
        : "/api/production/register";
      const method = editingEntry ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save register entry");

      setShowEntryModal(false);
      setEditingEntry(null);
      fetchRegisterEntries(selectedUnit.id);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save register entry");
    } finally {
      setSaving(false);
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (entry: any) => {
    const formattedDate = entry.date ? new Date(entry.date).toLocaleDateString("en-GB") : "";
    if (
      !confirm(
        `Are you sure you want to delete this register entry ("${entry.description || entry.entryType}" on ${formattedDate})?\n\nThis will permanently remove the record and automatically recalculate all Paavu, Weft stock, and financial tallies.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/production/register/${entry.id}`, { method: "DELETE" });
      if (res.ok) {
        const targetUnitId = selectedUnit?.id || entry.unitId || selectedUnitId;
        if (targetUnitId) {
          fetchRegisterEntries(targetUnitId);
        }
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete entry");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered rows for the register table
  const displayedEntries = entries.filter((e) => {
    const matchesType = entryFilterType === "ALL" ? true : e.entryType === entryFilterType;
    const matchesSearch =
      !entrySearch.trim() ||
      (e.description && e.description.toLowerCase().includes(entrySearch.toLowerCase())) ||
      (e.notes && e.notes.toLowerCase().includes(entrySearch.toLowerCase())) ||
      (e.date && new Date(e.date).toLocaleDateString("en-GB").includes(entrySearch));
    return matchesType && matchesSearch;
  });

  // Export Register as CSV
  const handleExportCSV = () => {
    if (!selectedUnit || entries.length === 0) return;
    const headers = [
      "Date",
      "Description",
      "Entry Type",
      "Paavu Given (m)",
      "Paavu Produced (m)",
      "Remaining Paavu (m)",
      "Weft Given (kg)",
      "Weft Bags",
      "Weft Consumed (kg)",
      "Weft Balance (kg)",
      "Babin Count",
      "Wage Rate (Rs/m)",
      "Wage Earned (Rs)",
      "Cash Paid (Rs)",
      "Net Balance (Rs)",
      "Notes",
    ];
    const rows = entries.map((r) => [
      r.date ? new Date(r.date).toLocaleDateString("en-GB") : "",
      `"${(r.description || "").replace(/"/g, '""')}"`,
      r.entryType || "",
      r.paavuGivenMeters || 0,
      r.paavuProducedMeters || 0,
      r.remainingPaavuMeters || 0,
      r.weftGivenKg || 0,
      r.weftBagsGiven || 0,
      r.weftConsumedKg || 0,
      r.weftBalanceKg || 0,
      r.babinCount || 0,
      r.wageRate || 0,
      r.wageEarned || 0,
      r.cashPaid || 0,
      r.netBalance || 0,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Register_${selectedUnit.weaverName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Register Handler
  const handlePrintRegister = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-only CSS */}
      <style jsx global>{`
        @media print {
          nav, aside, header, button, .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 10pt !important;
          }
          .print-only {
            display: block !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #333 !important;
            padding: 4px 6px !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      {/* Print Official Header */}
      <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider text-center">
          Tamil Nadu Powerloom Weavers Cooperative Production Society
        </h1>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-center text-slate-600 mt-1">
          Powerloom Production, Weft Inventory & Wage Accounting Register
        </h2>
        {selectedUnit && (
          <div className="flex justify-between items-center text-xs mt-4 pt-2 border-t border-slate-300">
            <div>
              <strong>Powerloom Unit:</strong> {selectedUnit.weaverName} ({selectedUnit.clothType})
            </div>
            <div>
              <strong>Location:</strong> {selectedUnit.location || "Main Shed"} • <strong>Looms:</strong> {selectedUnit.machineCount}
            </div>
            <div>
              <strong>Applicable Wage Rate:</strong> ₹{selectedUnit.individualRate || TRADITIONAL_DEFAULT_WAGE_RATE}/m
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
       * SECTION 1: POWERLOOM HORIZONTAL SCROLL SELECTOR
       * ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-2xs">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Select Powerloom Unit</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold font-mono">
                  {units.length} Units
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Scroll horizontally and click a powerloom to inspect or update its register ledger
              </p>
            </div>
          </div>

          {/* Filter & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {clothType ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    clothType === "SAREE" ? "bg-purple-600" : "bg-emerald-600"
                  }`}
                />
                <span>
                  {filteredUnits.length} {clothType === "SAREE" ? "Saree Units" : "Veatti Units"}
                </span>
              </div>
            ) : (
              /* Filter Chips */
              <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setFilterType("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterType === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900"
                  }`}
                >
                  All ({units.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("VEATTI")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterType === "VEATTI" ? "bg-emerald-600 text-white shadow-2xs" : "hover:text-slate-900"
                  }`}
                >
                  Veatti ({units.filter((u) => u.clothType === "VEATTI").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("SAREE")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterType === "SAREE" ? "bg-purple-600 text-white shadow-2xs" : "hover:text-slate-900"
                  }`}
                >
                  Saree ({units.filter((u) => u.clothType === "SAREE").length})
                </button>
              </div>
            )}

            {/* + Register Powerloom Button */}
            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ Register Powerloom</span>
            </button>
          </div>
        </div>

        {/* Search bar inside scroll area */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search powerloom by name or location (Komarapalayam, Pallipalayam...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-slate-50/50"
          />
        </div>

        {/* Scrollable Cards Container */}
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-300">
          {filteredUnits.length === 0 ? (
            <div className="py-6 px-4 text-center w-full text-slate-400 text-xs font-semibold">
              No powerloom units found. Click "+ Register Powerloom" to add one.
            </div>
          ) : (
            filteredUnits.map((u) => {
              const isSelected = u.id === selectedUnitId;
              const isVeatti = u.clothType === "VEATTI";
              const netBal = u.currentBalance ?? 0;
              const isPayable = netBal > 0;
              const isExcess = netBal < 0;

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUnitId(u.id)}
                  className={`flex-shrink-0 text-left p-4.5 rounded-2xl border-2 transition-all duration-150 min-w-[320px] sm:min-w-[350px] ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                  }`}
                >
                  {/* Top: Name & Cloth Type Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="font-black text-base text-slate-900 tracking-tight truncate">
                      {u.weaverName}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                        isVeatti
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {isVeatti ? "Veatti" : "Saree"}
                    </span>
                  </div>

                  {/* Location & Looms */}
                  <div className="text-xs text-slate-500 font-medium mb-3.5 flex items-center gap-2 flex-wrap">
                    <span>📍 {u.location || "Tamil Nadu"}</span>
                    <span>•</span>
                    <span>{u.machineCount || 1} Looms</span>
                    <span>•</span>
                    <span className="text-purple-700 font-semibold">{u.babinCount || 0} Babins</span>
                    <span>•</span>
                    <span className="text-sky-700 font-bold font-mono text-[11px] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {u.weftMultiplier || (isVeatti ? 0.119 : 0.182)} kg/m
                    </span>
                    {Number(u.initialWeftKg) > 0 && (
                      <span className="text-sky-800 font-bold font-mono text-[11px] bg-sky-100/60 px-2 py-0.5 rounded-md border border-sky-300">
                        Init: {u.initialWeftKg} kg
                      </span>
                    )}
                  </div>

                  {/* 3 Live Mini Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100 text-xs">
                    {/* Remaining Paavu */}
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="text-slate-500 font-semibold text-[10px] truncate">Remaining</div>
                      <div className="font-black font-mono tabular-nums text-slate-900 truncate">
                        {(u.remainingPaavuMeters ?? (u.paavuMeters - (u.totalProducedMeters || 0))).toLocaleString()}{" "}
                        <span className="text-[10px] font-normal text-slate-400">m</span>
                      </div>
                    </div>

                    {/* Weft Stock */}
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="text-slate-500 font-semibold text-[10px] truncate">Weft Stock</div>
                      <div className="font-black font-mono tabular-nums text-slate-900 truncate">
                        {u.weftStockKg || 0} <span className="text-[10px] font-normal text-slate-400">kg</span>
                      </div>
                    </div>

                    {/* Net Balance */}
                    <div
                      className={`p-2 rounded-xl border space-y-0.5 ${
                        isPayable
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : isExcess
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="font-semibold text-[10px] truncate">
                        {isPayable ? "+ Payable" : isExcess ? "- Excess" : "Settled"}
                      </div>
                      <div className="font-black font-mono tabular-nums truncate">
                        {isPayable ? "+" : isExcess ? "-" : ""}
                        {formatINR(Math.abs(netBal))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
       * SECTION 2: SELECTED POWERLOOM ACTIVE HEADER CARD & TALLY SUMMARY
       * ========================================================================= */}
      {selectedUnit && (
        <div className="bg-white text-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5 no-print">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedUnit.clothType === "VEATTI" ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"
                }`}>
                  {selectedUnit.clothType === "VEATTI" ? "Veatti Production" : "Saree Production"}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {selectedUnit.location ? `📍 ${selectedUnit.location}` : "Tamil Nadu"} • {selectedUnit.machineCount} Looms
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{selectedUnit.weaverName}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono">
                  Wage Rate: ₹{selectedUnit.individualRate || TRADITIONAL_DEFAULT_WAGE_RATE}/m
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-mono">
                  Weft Factor: {activeWeftMultiplier} kg/m
                </span>
                {Number(selectedUnit.initialWeftKg) > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-100/70 border border-sky-300 text-sky-900 font-mono">
                    Opening Weft: {selectedUnit.initialWeftKg} kg
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Traditional Powerloom Accounting Register • Weft Multiplier:{" "}
                <span className="text-sky-700 font-bold font-mono">{activeWeftMultiplier} kg/m</span>
                {Number(selectedUnit.initialWeftKg) > 0 && (
                  <>
                    {" "}• Opening Weft:{" "}
                    <span className="text-sky-800 font-bold font-mono">{selectedUnit.initialWeftKg} kg</span>
                  </>
                )}
                {" "}• Wage Rate:{" "}
                <span className="text-emerald-700 font-bold font-mono">
                  ₹{selectedUnit.individualRate || TRADITIONAL_DEFAULT_WAGE_RATE}/m
                </span>
              </p>
            </div>

            {/* Quick Action Buttons for this Powerloom */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAddModal("PRODUCED")}
                className={`px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                  clothType === "SAREE" ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>{clothType === "SAREE" ? "Saree Produced" : "Veatti Produced"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddModal("PAAVU")}
                className="px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 font-bold text-xs border border-slate-200 hover:border-amber-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <PackageCheck className="h-4 w-4 text-amber-600" />
                <span>Paavu Given</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddModal("WEFT_BAG")}
                className="px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-700 font-bold text-xs border border-slate-200 hover:border-sky-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Scale className="h-4 w-4 text-sky-600" />
                <span>Weft (KG)</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddModal("CASH")}
                className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 font-bold text-xs border border-slate-200 hover:border-emerald-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>Wage Cash</span>
              </button>

              {/* Add Babin Issued */}
              <button
                type="button"
                onClick={() => handleOpenAddModal("BABIN")}
                className="px-3 py-2 rounded-xl bg-white hover:bg-purple-50 text-slate-700 font-bold text-xs border border-slate-200 hover:border-purple-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Layers className="h-4 w-4 text-purple-600" />
                <span>+ Babin</span>
              </button>

              {/* Direct Entry / Edit Contract */}
              {onOpenDirectEntryModal && (
                <button
                  type="button"
                  onClick={() => onOpenDirectEntryModal(selectedUnit)}
                  title="Direct Entry / Edit Weaver Contract"
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit Contract</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintRegister}
                title="Print A4 Register Ledger"
                className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition border border-slate-200 shadow-2xs cursor-pointer"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 5 Core Traditional Live Tally Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-5 border-t border-slate-100">
            {/* Card 1: Remaining Paavu Meter */}
            <div className="p-4.5 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200/70 shadow-xs space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center justify-between">
                <span>Remaining Paavu</span>
                <PackageCheck className="h-4 w-4 text-amber-600 flex-shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
                {(summary?.remainingPaavu ?? 0).toLocaleString()}{" "}
                <span className="text-xs font-semibold text-slate-500 font-sans">Meters</span>
              </div>
              <div className="text-xs text-slate-500 font-mono leading-normal">
                Given: {summary?.totalPaavuGiven ?? 0}m • Produced:{" "}
                {summary?.totalProduced ?? 0}m
              </div>
            </div>

            {/* Card 2: Available Weft Stock (KG) */}
            <div className="p-4.5 sm:p-5 rounded-2xl bg-sky-50/60 border border-sky-200/70 shadow-xs space-y-2">
              <div className="text-xs font-bold text-sky-900 flex items-center justify-between">
                <span>Weft Stock Available</span>
                <Scale className="h-4 w-4 text-sky-600 flex-shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-sky-950">
                {summary?.weftStock ?? selectedUnit.weftStockKg ?? 0}{" "}
                <span className="text-xs font-semibold text-slate-500 font-sans">KG</span>
              </div>
              <div className="text-xs text-slate-500 font-mono leading-normal">
                Opening: {selectedUnit.initialWeftKg || 0}kg • Given: {summary?.totalWeftGiven || selectedUnit.initialWeftKg || 0}kg • Consumed: {summary?.totalWeftConsumed || 0}kg
              </div>
            </div>

            {/* Card 3: Available Babin Sets */}
            <div className="p-4.5 sm:p-5 rounded-2xl bg-purple-50/60 border border-purple-200/70 shadow-xs space-y-2">
              <div className="text-xs font-bold text-purple-900 flex items-center justify-between">
                <span>Available Babin Sets</span>
                <Layers className="h-4 w-4 text-purple-600 flex-shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
                {(summary?.remainingBabin !== undefined
                  ? summary.remainingBabin
                  : summary?.totalBabin !== undefined
                  ? summary.totalBabin
                  : (selectedUnit.babinCount || 0)
                ).toLocaleString()}{" "}
                <span className="text-xs font-semibold text-slate-500 font-sans">
                  Sets
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono leading-normal">
                {clothType === "SAREE" ? (
                  <>
                    Issued: {summary?.totalBabinIssued ?? summary?.totalBabin ?? selectedUnit.babinCount ?? 0} Sets • Consumed:{" "}
                    {summary?.totalBabinConsumed ?? 0} Sets (1 set / 200 Sarees)
                  </>
                ) : (
                  <>
                    Issued: {summary?.totalBabinIssued ?? summary?.totalBabin ?? selectedUnit.babinCount ?? 0} Sets • Consumed:{" "}
                    {summary?.totalBabinConsumed ?? 0} Sets (1 set / 500 Veattis)
                  </>
                )}
              </div>
            </div>

            {/* Card 4: Total Wage Earned vs Cash Paid */}
            <div className="p-4.5 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 shadow-xs space-y-2">
              <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span>Total Wages Earned</span>
                <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-emerald-900">
                {formatINR(summary?.totalWageEarned || selectedUnit.totalVaravuAmount || 0)}
              </div>
              <div className="text-xs text-slate-500 font-mono leading-normal">
                Cash Paid: {formatINR(summary?.totalCashPaid || selectedUnit.totalAdvancePaid || 0)}
              </div>
            </div>

            {/* Card 5: Net Balance (+ or -) */}
            {(() => {
              const currentBal = summary?.netBalance ?? selectedUnit.currentBalance ?? 0;
              const isPayable = currentBal > 0;
              const isExcess = currentBal < 0;

              return (
                <div
                  className={`p-4.5 sm:p-5 rounded-2xl border shadow-xs space-y-2 ${
                    isPayable
                      ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                      : isExcess
                      ? "bg-rose-50 border-rose-200 text-rose-950"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span className={isPayable ? "text-emerald-900" : isExcess ? "text-rose-900" : "text-slate-700"}>
                      {isPayable ? "Payable (+ Society Owes)" : isExcess ? "Excess Advance (- Held)" : "Balance Settled"}
                    </span>
                    <DollarSign className={`h-4 w-4 flex-shrink-0 ${isPayable ? "text-emerald-600" : isExcess ? "text-rose-600" : "text-slate-500"}`} />
                  </div>
                  <div className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${isPayable ? "text-emerald-700" : isExcess ? "text-rose-700" : "text-slate-900"}`}>
                    {isPayable ? "+" : isExcess ? "-" : ""}
                    {formatINR(Math.abs(currentBal))}
                  </div>
                  <div className="text-xs text-slate-500 leading-normal">
                    {isPayable ? "Amount payable to powerloom" : isExcess ? "Excess advance held by powerloom" : "Account perfectly balanced"}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* =========================================================================
       * SECTION 3: FAST INLINE ENTRY STRIP (OPERATE ERGONOMICS)
       * Allows rapid entry directly from the keyboard without opening a modal
       * ========================================================================= */}
      {selectedUnit && (
        <form
          onSubmit={handleInlineSubmit}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 no-print space-y-3"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Fast Register Entry Strip
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                • Quickly add daily production, warp, weft, or cash directly into ledger
              </span>
            </div>

            {/* Type Selector Pills */}
            <div className="flex items-center gap-1 text-xs font-bold bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setInlineType("PRODUCED");
                  setInlineDesc(clothType === "SAREE" ? "Saree Production" : "Veatti Production");
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  inlineType === "PRODUCED"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Produced Mtrs
              </button>
              <button
                type="button"
                onClick={() => {
                  setInlineType("PAAVU");
                  setInlineDesc("Paavu Warp Issued");
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  inlineType === "PAAVU"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Paavu Given
              </button>
              <button
                type="button"
                onClick={() => {
                  setInlineType("WEFT_BAG");
                  setInlineDesc("Weft Yarn Issued");
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  inlineType === "WEFT_BAG"
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Weft Bags/KG
              </button>
              <button
                type="button"
                onClick={() => {
                  setInlineType("CASH");
                  setInlineDesc("Wage Cash Paid");
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  inlineType === "CASH"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Cash Paid
              </button>
              <button
                type="button"
                onClick={() => {
                  setInlineType("BABIN");
                  setInlineDesc("Babin Issued");
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  inlineType === "BABIN"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Babin
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Date */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={inlineDate}
                onChange={(e) => setInlineDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Description
              </label>
              <input
                type="text"
                required
                value={inlineDesc}
                onChange={(e) => setInlineDesc(e.target.value)}
                placeholder={
                  clothType === "SAREE" ? "e.g. 2556m Saree, 240 bags..." : "e.g. 2556m Veatti, 240 bags..."
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>

            {/* Dynamic Value Input */}
            {inlineType === "PRODUCED" && clothType === "SAREE" ? (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-700 mb-1">
                    Sarees (Count)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 200"
                    value={inlineSarees}
                    onChange={(e) => {
                      const count = e.target.value;
                      setInlineSarees(count);
                      const num = parseFloat(count) || 0;
                      if (num > 0) {
                        setInlineValue(String(calculateMetersFromSarees(num)));
                      } else if (!count) {
                        setInlineValue("");
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs font-black font-mono text-purple-900 focus:outline-none focus:border-purple-600 bg-purple-50/30"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                    <span>Produced (Meters) *</span>
                    {parseFloat(inlineValue) > 0 && (
                      <span className="text-[10px] font-mono text-purple-700 font-bold">
                        Babin: -{calculateSareeBabinConsumed(inlineValue)} Sets
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 1100"
                    value={inlineValue}
                    onChange={(e) => {
                      const m = e.target.value;
                      setInlineValue(m);
                      const num = parseFloat(m) || 0;
                      if (num > 0) {
                        setInlineSarees(String(calculateSareesFromMeters(num)));
                      } else if (!m) {
                        setInlineSarees("");
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black font-mono text-emerald-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </>
            ) : inlineType === "PRODUCED" ? (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Veattis (Pieces)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 500"
                    value={inlineVeattis}
                    onChange={(e) => {
                      const count = e.target.value;
                      setInlineVeattis(count);
                      const num = parseFloat(count) || 0;
                      if (num > 0) {
                        setInlineValue(String(calculateMetersFromVeattis(num)));
                      } else if (!count) {
                        setInlineValue("");
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs font-black font-mono text-emerald-900 focus:outline-none focus:border-emerald-600 bg-emerald-50/30"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                    <span>Produced (Meters) *</span>
                    {parseFloat(inlineValue) > 0 && (
                      <span className="text-[10px] font-mono text-purple-700 font-bold">
                        Babin: -{calculateVeattiBabinConsumed(inlineValue)} Sets
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 1000"
                    value={inlineValue}
                    onChange={(e) => {
                      const m = e.target.value;
                      setInlineValue(m);
                      const num = parseFloat(m) || 0;
                      if (num > 0) {
                        setInlineVeattis(String(calculateVeattisFromMeters(num)));
                      } else if (!m) {
                        setInlineVeattis("");
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black font-mono text-emerald-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </>
            ) : inlineType === "WEFT_BAG" ? (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Bags ({activeKgPerBag} kg/bag)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    value={inlineBags}
                    onChange={(e) => {
                      const b = parseFloat(e.target.value) || 0;
                      setInlineBags(e.target.value);
                      if (b > 0) setInlineValue(String(calculateBagsToKg(b, activeKgPerBag)));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Weft Weight (KG) * ({activeKgPerBag} kg/bag)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder={`e.g. ${20 * activeKgPerBag}`}
                    value={inlineValue}
                    onChange={(e) => setInlineValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black font-mono text-sky-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </>
            ) : inlineType === "BABIN" ? (
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Babin Sets Issued *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 5 (Sets)"
                  value={inlineValue}
                  onChange={(e) => setInlineValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>
            ) : (
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                  <span>
                    {inlineType === "PAAVU"
                      ? "Paavu Meters Given *"
                      : "Cash Paid Amount (₹) *"}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder={
                    inlineType === "PAAVU"
                      ? "e.g. 3170"
                      : "e.g. 100000"
                  }
                  value={inlineValue}
                  onChange={(e) => setInlineValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={inlineSaving || !inlineValue}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4 text-white" />
                <span>{inlineSaving ? "Adding..." : "Add to Register"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =========================================================================
       * SECTION 4: THE 13-COLUMN AUTHENTIC REGISTER TABLE
       * Built with two-tier structured header for maximum accounting clarity
       * ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Control Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 no-print">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Traditional Powerloom Accounting Register</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold whitespace-nowrap">
                13 Columns Ledger
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Complete warp, weft, and wage settlement ledger for powerloom production units.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenAddModal("PRODUCED")}
              className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                clothType === "SAREE" ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <Plus className="h-4 w-4 text-white" />
              <span>+ Detailed Entry</span>
            </button>
            <button
              type="button"
              onClick={() => fetchRegisterEntries(selectedUnitId)}
              className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title="Refresh Register"
            >
              <RotateCw className={`h-4 w-4 ${loadingEntries ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table Filter & Search Toolbar (Audit Controls) */}
        <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setEntryFilterType("ALL")}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                entryFilterType === "ALL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setEntryFilterType("PRODUCED")}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                entryFilterType === "PRODUCED"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Produced ({entries.filter((e) => e.entryType === "PRODUCED").length})
            </button>
            <button
              type="button"
              onClick={() => setEntryFilterType("PAAVU")}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                entryFilterType === "PAAVU"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Paavu ({entries.filter((e) => e.entryType === "PAAVU").length})
            </button>
            <button
              type="button"
              onClick={() => setEntryFilterType("WEFT_BAG")}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                entryFilterType === "WEFT_BAG"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-sky-50 text-sky-800 hover:bg-sky-100"
              }`}
            >
              Weft ({entries.filter((e) => e.entryType === "WEFT_BAG").length})
            </button>
            <button
              type="button"
              onClick={() => setEntryFilterType("CASH")}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                entryFilterType === "CASH"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100"
              }`}
            >
              Cash ({entries.filter((e) => e.entryType === "CASH").length})
            </button>
            <button
              type="button"
              onClick={() => setEntryFilterType("BABIN")}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                entryFilterType === "BABIN"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-purple-50 text-purple-800 hover:bg-purple-100"
              }`}
            >
              Babin ({entries.filter((e) => e.entryType === "BABIN").length})
            </button>
          </div>

          {/* Search in Register & Export */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search date, description..."
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-slate-50/50"
              />
            </div>

            {/* Landscape Horizontal Scroll Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 no-print">
              <span className="text-[10px] font-black uppercase text-slate-400 px-1 hidden md:inline">Scroll:</span>
              <button
                type="button"
                onClick={() => scrollTable("left")}
                title="Scroll Table Left"
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Left</span>
              </button>
              <button
                type="button"
                onClick={() => scrollTable("right")}
                title="Scroll Table Right"
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
              >
                <span className="hidden sm:inline">Right</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={entries.length === 0}
              title="Download CSV Spreadsheet"
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5 disabled:opacity-40 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Scrollable Register Table */}
        <div
          ref={tableContainerRef}
          className="overflow-x-auto scrollbar-landscape pb-2 focus:outline-none"
          tabIndex={0}
        >
          <table className="w-full text-left text-xs border-collapse min-w-[2150px]">
            {/* Double-Deck Header */}
            <thead>
              {/* Level 1: Category Groups */}
              <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[11px] tracking-wider border-b border-slate-300 text-center">
                <th colSpan={3} className="py-3 px-4 border-r border-slate-300 bg-slate-100">
                  Transaction Details
                </th>
                <th colSpan={3} className="py-3 px-4 border-r border-slate-300 bg-amber-50 text-amber-900">
                  Warp &amp; Production Progress
                </th>
                <th colSpan={3} className="py-3 px-4 border-r border-slate-300 bg-sky-50 text-sky-900">
                  Weft Inventory &amp; Stock Balance ({activeWeftMultiplier} kg/m)
                </th>
                <th colSpan={1} className="py-3 px-4 border-r border-slate-300 bg-slate-100">
                  Loom Equipment
                </th>
                <th colSpan={4} className="py-3 px-4 border-r border-slate-300 bg-emerald-50 text-emerald-900">
                  Weaving Wages &amp; Cash Settlement
                </th>
                <th
                  colSpan={1}
                  className="py-3 px-4 sticky right-0 z-30 bg-slate-100 border-l border-slate-300 text-center uppercase tracking-wider text-[11px] font-bold text-slate-700 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] no-print"
                >
                  Manage
                </th>
              </tr>

              {/* Level 2: Specific Columns */}
              <tr className="bg-slate-50 text-slate-700 font-bold text-xs tracking-normal border-b border-slate-300">
                <th className="py-3.5 px-4 w-14 min-w-[56px] text-center border-r border-slate-200 whitespace-nowrap">#</th>
                <th className="py-3.5 px-4.5 min-w-[140px] border-r border-slate-200 whitespace-nowrap">Date</th>
                <th className="py-3.5 px-4.5 min-w-[280px] border-r border-slate-200 whitespace-nowrap">Description</th>

                {/* Warp & Production */}
                <th className="py-3.5 px-4.5 min-w-[155px] text-right border-r border-slate-200 whitespace-nowrap">Paavu Given (m)</th>
                <th className="py-3.5 px-4.5 min-w-[150px] text-right bg-emerald-50/60 text-emerald-800 border-r border-slate-200 whitespace-nowrap">Produced (m)</th>
                <th className="py-3.5 px-4.5 min-w-[180px] text-right bg-amber-50/70 text-amber-900 border-r border-slate-300 whitespace-nowrap">Remaining Paavu (m)</th>

                {/* Weft Inventory */}
                <th className="py-3.5 px-4.5 min-w-[155px] text-right border-r border-slate-200 whitespace-nowrap">Weft Given (kg)</th>
                <th className="py-3.5 px-4.5 min-w-[185px] text-right bg-sky-50/60 text-sky-800 border-r border-slate-200 whitespace-nowrap">
                  Weft Consumed ({activeWeftMultiplier} kg/m)
                </th>
                <th className="py-3.5 px-4.5 min-w-[170px] text-right bg-sky-100/70 text-sky-900 border-r border-slate-300 whitespace-nowrap">Weft Balance (kg)</th>

                {/* Loom & Babin */}
                <th className="py-3.5 px-4.5 min-w-[130px] text-center border-r border-slate-300 whitespace-nowrap">
                  Babin Sets
                </th>

                {/* Wages & Cash */}
                <th className="py-3.5 px-4.5 min-w-[140px] text-right border-r border-slate-200 whitespace-nowrap">Wage Rate (₹/m)</th>
                <th className="py-3.5 px-4.5 min-w-[170px] text-right bg-emerald-50/70 text-emerald-800 border-r border-slate-200 whitespace-nowrap">Wage Earned (₹)</th>
                <th className="py-3.5 px-4.5 min-w-[160px] text-right bg-rose-50/60 text-rose-800 border-r border-slate-200 whitespace-nowrap">Cash Paid (₹)</th>
                <th className="py-3.5 px-4.5 min-w-[185px] text-right bg-slate-200/80 font-black border-r border-slate-300 whitespace-nowrap">Net Balance (+/-)</th>

                {/* Actions */}
                <th className="py-3.5 px-4.5 text-center sticky right-0 z-30 bg-slate-100 border-l border-slate-300 min-w-[130px] w-36 uppercase text-[10px] font-black tracking-wider text-slate-700 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] no-print whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="text-sm font-bold text-slate-600">No register entries found for this powerloom</p>
                      <p className="text-xs text-slate-400">
                        Use the fast entry strip above or click "+ Detailed Entry" to record Paavu allocation,{" "}
                        {clothType === "SAREE" ? "Saree" : "Veatti"} production, Weft bags, or Cash paid.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : displayedEntries.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="text-sm font-bold text-slate-600">No matching register entries found</p>
                      <p className="text-xs text-slate-400">
                        No transactions match the selected filter ({entryFilterType}) or search query.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEntryFilterType("ALL");
                          setEntrySearch("");
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold mt-1 shadow-2xs hover:bg-slate-800 transition"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedEntries.map((row, idx) => {
                  const isPayable = (row.netBalance ?? 0) > 0;
                  const isExcess = (row.netBalance ?? 0) < 0;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/90 transition group border-b border-slate-100"
                    >
                      {/* # */}
                      <td className="py-3.5 px-4 text-center text-slate-400 text-xs font-mono border-r border-slate-100 whitespace-nowrap">
                        {idx + 1}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4.5 whitespace-nowrap text-slate-900 font-bold border-r border-slate-100 font-mono text-xs">
                        {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "-"}
                      </td>

                      {/* Description & Type */}
                      <td className="py-3.5 px-4.5 border-r border-slate-100 whitespace-nowrap">
                        <div className="font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap text-xs">
                          <span className="whitespace-nowrap">{row.description}</span>
                          {row.entryType === "PRODUCED" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold whitespace-nowrap">
                              Produced
                            </span>
                          )}
                          {row.entryType === "PAAVU" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold whitespace-nowrap">
                              Paavu
                            </span>
                          )}
                          {row.entryType === "WEFT_BAG" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold whitespace-nowrap">
                              Weft
                            </span>
                          )}
                          {row.entryType === "CASH" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold whitespace-nowrap">
                              Cash
                            </span>
                          )}
                          {row.entryType === "BABIN" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold whitespace-nowrap">
                              Babin
                            </span>
                          )}
                        </div>
                        {row.notes && (
                          <div className="text-xs text-slate-400 truncate max-w-[260px] mt-0.5">
                            {row.notes}
                          </div>
                        )}
                      </td>

                      {/* Paavu Given */}
                      <td className="py-3.5 px-4.5 text-right font-mono tabular-nums border-r border-slate-100 whitespace-nowrap text-xs">
                        {row.paavuGivenMeters > 0 ? (
                          <span className="font-bold text-slate-900">
                            {row.paavuGivenMeters.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Paavu Produced */}
                      <td className="py-3.5 px-4.5 text-right bg-emerald-50/30 font-mono tabular-nums border-r border-slate-100 whitespace-nowrap text-xs">
                        {row.paavuProducedMeters > 0 ? (
                          <span className="font-black text-emerald-700">
                            {row.paavuProducedMeters.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Remaining Paavu */}
                      <td className="py-3.5 px-4.5 text-right bg-amber-50/40 font-black font-mono tabular-nums text-amber-900 border-r border-slate-200 whitespace-nowrap text-xs">
                        {(row.remainingPaavuMeters ?? 0).toLocaleString()}
                      </td>

                      {/* Weft Given (KG) */}
                      <td className="py-3.5 px-4.5 text-right font-mono tabular-nums border-r border-slate-100 whitespace-nowrap text-xs">
                        {row.weftGivenKg > 0 ? (
                          <span className="font-bold text-slate-900 whitespace-nowrap">
                            {row.weftGivenKg}
                            {row.weftBagsGiven > 0 && (
                              <span className="ml-1 text-[11px] text-slate-400 font-normal">
                                ({row.weftBagsGiven} bags)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Weft Consumed (Produced * 0.119) */}
                      <td className="py-3.5 px-4.5 text-right bg-sky-50/40 font-bold font-mono tabular-nums text-sky-800 border-r border-slate-100 whitespace-nowrap text-xs">
                        {row.weftConsumedKg > 0 ? (
                          <span>{row.weftConsumedKg}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Weft Balance */}
                      <td className="py-3.5 px-4.5 text-right bg-sky-100/50 font-black font-mono tabular-nums text-sky-900 border-r border-slate-200 whitespace-nowrap text-xs">
                        {row.weftBalanceKg ?? 0}
                      </td>

                      {/* Babin Sets */}
                      <td className="py-3.5 px-4.5 text-center border-r border-slate-200 whitespace-nowrap text-xs">
                        {row.entryType === "BABIN" ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 font-bold font-mono text-[11px] whitespace-nowrap">
                              +{row.babinCount} Sets
                            </span>
                            {row.babinBalance !== undefined && (
                              <div className="text-[10px] font-mono text-purple-700">
                                Bal: {row.babinBalance} Sets
                              </div>
                            )}
                          </div>
                        ) : row.entryType === "PRODUCED" && (row.babinConsumed || 0) > 0 ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 font-bold font-mono text-[11px] whitespace-nowrap">
                              -{row.babinConsumed} Sets
                            </span>
                            {row.babinBalance !== undefined && (
                              <div className="text-[10px] font-mono text-slate-500">
                                Bal: {row.babinBalance} Sets
                              </div>
                            )}
                          </div>
                        ) : row.babinCount > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-bold font-mono whitespace-nowrap">
                            +{row.babinCount} Sets
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Wage Rate (₹) */}
                      <td className="py-3.5 px-4.5 text-right text-slate-600 font-semibold font-mono tabular-nums border-r border-slate-100 whitespace-nowrap text-xs">
                        {row.paavuProducedMeters > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono tabular-nums whitespace-nowrap">
                            <span className="text-slate-400">@</span>
                            <span>₹{row.wageRate}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Wage Earned */}
                      <td className="py-3.5 px-4.5 text-right bg-emerald-50/50 font-black font-mono tabular-nums text-emerald-700 border-r border-slate-100 whitespace-nowrap text-xs">
                        {row.wageEarned > 0 ? formatINR(row.wageEarned) : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Cash Paid */}
                      <td className="py-3.5 px-4.5 text-right bg-rose-50/40 font-black font-mono tabular-nums text-rose-700 border-r border-slate-100 whitespace-nowrap text-xs">
                        {row.cashPaid > 0 ? formatINR(row.cashPaid) : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Net Balance (+ or -) */}
                      <td
                        className={`py-3.5 px-4.5 text-right font-black font-mono tabular-nums border-r border-slate-200 whitespace-nowrap text-xs ${
                          isPayable
                            ? "text-emerald-700 bg-emerald-50/70"
                            : isExcess
                            ? "text-rose-700 bg-rose-50/70"
                            : "text-slate-700 bg-slate-100"
                        }`}
                      >
                        <span className="whitespace-nowrap">
                          {isPayable ? "+ " : isExcess ? "- " : ""}
                          {formatINR(Math.abs(row.netBalance ?? 0))}
                        </span>
                      </td>

                      {/* Actions (Sticky Right in Landscape) */}
                      <td className="py-3.5 px-4.5 text-center whitespace-nowrap sticky right-0 z-20 bg-white group-hover:bg-slate-50 transition border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] no-print min-w-[130px] w-36">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            title="Edit Entry"
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200 transition shadow-2xs cursor-pointer flex items-center justify-center"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(row)}
                            title="Delete Entry"
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-900 border border-rose-200 transition shadow-2xs cursor-pointer flex items-center justify-center"
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

            {/* Table Footer: Tally Summary Row */}
            {entries.length > 0 && summary && (
              <tfoot>
                <tr className="bg-slate-100/90 text-slate-900 font-bold text-xs border-t-2 border-slate-300">
                  <td colSpan={3} className="py-4 px-4.5 text-center uppercase tracking-wider text-slate-800 font-black whitespace-nowrap">
                    TOTAL REGISTER TALLY
                  </td>
                  {/* Total Paavu Given */}
                  <td className="py-4 px-4.5 text-right text-slate-900 font-mono tabular-nums font-bold whitespace-nowrap">
                    {summary.totalPaavuGiven.toLocaleString()}m
                  </td>
                  {/* Total Produced */}
                  <td className="py-4 px-4.5 text-right text-emerald-800 font-mono tabular-nums font-bold whitespace-nowrap">
                    {summary.totalProduced.toLocaleString()}m
                  </td>
                  {/* Final Remaining Paavu */}
                  <td className="py-4 px-4.5 text-right text-amber-900 font-mono tabular-nums font-bold whitespace-nowrap">
                    {summary.remainingPaavu.toLocaleString()}m
                  </td>
                  {/* Total Weft Given */}
                  <td className="py-4 px-4.5 text-right text-slate-900 font-mono tabular-nums font-bold whitespace-nowrap">
                    {summary.totalWeftGiven}kg
                  </td>
                  {/* Total Weft Consumed */}
                  <td className="py-4 px-4.5 text-right text-sky-800 font-mono tabular-nums font-bold whitespace-nowrap">
                    {summary.totalWeftConsumed}kg
                  </td>
                  {/* Final Weft Stock */}
                  <td className="py-4 px-4.5 text-right text-sky-900 font-mono tabular-nums font-bold whitespace-nowrap">
                    {summary.weftStock}kg
                  </td>
                  {/* Total Babin */}
                  <td className="py-4 px-4.5 text-center text-purple-900 font-mono font-bold whitespace-nowrap">
                    {`${summary.remainingBabin ?? summary.totalBabin ?? 0} Sets`}
                  </td>
                  {/* Wage Rate Col */}
                  <td className="py-4 px-4.5 text-right text-slate-400 font-mono whitespace-nowrap">
                    -
                  </td>
                  {/* Total Wage Earned */}
                  <td className="py-4 px-4.5 text-right text-emerald-800 font-mono tabular-nums font-bold whitespace-nowrap">
                    {formatINR(summary.totalWageEarned)}
                  </td>
                  {/* Total Cash Paid */}
                  <td className="py-4 px-4.5 text-right text-rose-800 font-mono tabular-nums font-bold whitespace-nowrap">
                    {formatINR(summary.totalCashPaid)}
                  </td>
                  {/* Final Net Balance (+ or -) */}
                  <td
                    className={`py-4 px-4.5 text-right font-black font-mono tabular-nums whitespace-nowrap ${
                      summary.isPayable
                        ? "text-emerald-900 bg-emerald-100/80"
                        : summary.isExcessAdvance
                        ? "text-rose-900 bg-rose-100/80"
                        : "text-slate-900"
                    }`}
                  >
                    <span className="whitespace-nowrap">
                      {summary.isPayable ? "+ " : summary.isExcessAdvance ? "- " : ""}
                      {formatINR(Math.abs(summary.netBalance))}
                    </span>
                  </td>
                  {/* Actions Column Summary */}
                  <td className="py-4 px-4.5 sticky right-0 z-30 bg-slate-100 border-l border-slate-300 text-center text-slate-400 font-mono shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] no-print min-w-[130px] w-36 whitespace-nowrap">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Print Signature Footer Block */}
      <div className="print-only mt-12 pt-6 border-t border-slate-400 text-xs">
        <div className="grid grid-cols-3 gap-8 text-center pt-8">
          <div>
            <div className="border-t border-slate-700 w-48 mx-auto mb-1"></div>
            <p className="font-bold">Prepared by (Accounts Clerk)</p>
          </div>
          <div>
            <div className="border-t border-slate-700 w-48 mx-auto mb-1"></div>
            <p className="font-bold">Verified by (Society Secretary)</p>
          </div>
          <div>
            <div className="border-t border-slate-700 w-48 mx-auto mb-1"></div>
            <p className="font-bold">Powerloom Weaver Signature</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
       * SECTION 5: MODAL FOR ADD / EDIT REGISTER ENTRY
       * ========================================================================= */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in no-print">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                    <span>
                      {editingEntry ? "Edit Register Entry" : "New Register Entry"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Powerloom: <strong className="text-slate-800">{selectedUnit?.weaverName}</strong> (
                    {selectedUnit?.clothType === "VEATTI" ? "Veatti" : "Saree"})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEntry} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* 1. Date & Entry Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={entryForm.date}
                      onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                    Entry Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={entryForm.entryType}
                    onChange={(e: any) => {
                      const t = e.target.value;
                      setEntryForm({
                        ...entryForm,
                        entryType: t,
                        description:
                          t === "PAAVU"
                            ? "Warp Issued / Paavu Given"
                            : t === "PRODUCED"
                            ? (clothType === "SAREE" ? "Saree Production" : "Veatti Production")
                            : t === "WEFT_BAG"
                            ? "Weft Yarn Issued"
                            : t === "CASH"
                            ? "Wage Cash Paid"
                            : "Babin Issued",
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="PRODUCED">
                      {clothType === "SAREE"
                        ? "Saree Production (Produced Meters)"
                        : "Veatti Production (Produced Meters)"}
                    </option>
                    <option value="PAAVU">Warp Issued (Paavu Given Meters)</option>
                    <option value="WEFT_BAG">Weft Yarn / Bags (Weft in KG)</option>
                    <option value="CASH">Wage Cash / Advance Paid (₹)</option>
                    <option value="BABIN">Babin Issued (Babin Count)</option>
                  </select>
                </div>
              </div>

              {/* 2. Description */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    clothType === "SAREE"
                      ? "e.g. 2 Paavu 9 Beams, 240 bag, Saree 10m, cash, needle adjustment"
                      : "e.g. 2 Paavu 9 Beams, 240 bag, Veatti 10m, cash, needle adjustment"
                  }
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* 3. Conditional Dynamic Input Fields Based on Entry Type */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                {/* PRODUCED: Paavu Meter Produced & Wage Rate */}
                {entryForm.entryType === "PRODUCED" && (
                  <div className="space-y-3">
                    {clothType === "SAREE" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-purple-700 mb-1">
                            Saree Count (Pieces)
                          </label>
                          <input
                            type="number"
                            step="1"
                            placeholder="e.g. 200"
                            value={entryForm.sareeCount}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = parseFloat(val) || 0;
                              setEntryForm({
                                ...entryForm,
                                sareeCount: val,
                                paavuProducedMeters: num > 0 ? calculateMetersFromSarees(num) : "",
                              });
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 bg-purple-50/30 text-sm font-black font-mono text-purple-900 focus:outline-none focus:border-purple-600"
                          />
                          <p className="text-[10px] text-purple-600 mt-1">1 Babin set per 200 sarees</p>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                            Loom Produced Meters <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            placeholder="e.g. 1100"
                            value={entryForm.paavuProducedMeters}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = parseFloat(val) || 0;
                              setEntryForm({
                                ...entryForm,
                                paavuProducedMeters: val,
                                sareeCount: num > 0 ? calculateSareesFromMeters(num) : "",
                              });
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono text-emerald-700 focus:outline-none focus:border-emerald-600"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">5.50m per saree</p>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                            Wage Rate per Meter (₹/m) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.25"
                            required
                            value={entryForm.wageRate}
                            onChange={(e) => setEntryForm({ ...entryForm, wageRate: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-emerald-800 mb-1">
                            Veattis (Pieces)
                          </label>
                          <input
                            type="number"
                            step="1"
                            placeholder="e.g. 500"
                            value={entryForm.veattiCount}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = parseFloat(val) || 0;
                              setEntryForm({
                                ...entryForm,
                                veattiCount: val,
                                paavuProducedMeters: num > 0 ? calculateMetersFromVeattis(num) : "",
                              });
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/30 text-sm font-black font-mono text-emerald-950 focus:outline-none focus:border-emerald-600"
                          />
                          <p className="text-[10px] text-emerald-700 mt-1">1 Babin set per 500 veattis</p>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                            Loom Produced Meters <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            placeholder="e.g. 1000"
                            value={entryForm.paavuProducedMeters}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = parseFloat(val) || 0;
                              setEntryForm({
                                ...entryForm,
                                paavuProducedMeters: val,
                                veattiCount: num > 0 ? calculateVeattisFromMeters(num) : "",
                              });
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono text-emerald-700 focus:outline-none focus:border-emerald-600"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">2.00m per veatti</p>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                            Wage Rate per Meter (₹/m) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.25"
                            required
                            value={entryForm.wageRate}
                            onChange={(e) => setEntryForm({ ...entryForm, wageRate: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>
                    )}

                    {/* Instant Auto-Calculation Card */}
                    <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                      <div>
                        <div className="text-[11px] text-emerald-800 font-bold">
                          Auto Weft Consumed
                        </div>
                        <div className="text-base font-black font-mono tabular-nums text-emerald-950 mt-0.5">
                          {previewWeftConsumed} <span className="text-xs font-semibold">KG</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-mono">
                          {previewProduced}m × {activeWeftMultiplier} kg/m
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] text-purple-800 font-bold">
                          Auto Babin Consumed
                        </div>
                        <div className="text-base font-black font-mono tabular-nums text-purple-950 mt-0.5">
                          {previewBabinConsumed} <span className="text-xs font-semibold">Sets</span>
                        </div>
                        <div className="text-[10px] text-purple-700 font-mono">
                          {clothType === "SAREE" ? "1 set / 200 sarees (1,100m)" : "1 set / 500 veattis (1,000m)"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] text-emerald-800 font-bold">
                          Auto Wage Earned
                        </div>
                        <div className="text-base font-black font-mono tabular-nums text-emerald-950 mt-0.5">
                          {formatINR(previewWageEarned)}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-mono">
                          {previewProduced}m × ₹{previewRate}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PAAVU: Paavu Given Meters & Beam Count */}
                {entryForm.entryType === "PAAVU" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        Paavu Meters Given <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        required
                        placeholder="e.g. 3170 or 8430"
                        value={entryForm.paavuGivenMeters}
                        onChange={(e) =>
                          setEntryForm({ ...entryForm, paavuGivenMeters: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono text-amber-700 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        Beam Count (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 9"
                        value={entryForm.beamCount}
                        onChange={(e) => setEntryForm({ ...entryForm, beamCount: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                )}

                {/* WEFT_BAG: Weft Bag & KG */}
                {entryForm.entryType === "WEFT_BAG" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        Weft Bags Count ({activeKgPerBag} kg/bag)
                      </label>
                      <input
                        type="number"
                        placeholder={`e.g. 20 bags (× ${activeKgPerBag} = ${20 * activeKgPerBag} kg)`}
                        value={entryForm.weftBagsGiven}
                        onChange={(e) => {
                          const bags = parseFloat(e.target.value) || 0;
                          setEntryForm({
                            ...entryForm,
                            weftBagsGiven: e.target.value,
                            weftGivenKg: bags > 0 ? calculateBagsToKg(bags, activeKgPerBag) : "",
                          });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                        Weft Given (KG) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        placeholder={`e.g. ${20 * activeKgPerBag}`}
                        value={entryForm.weftGivenKg}
                        onChange={(e) => setEntryForm({ ...entryForm, weftGivenKg: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono text-sky-700 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                )}

                {/* CASH: Wage / Cash Amount Given */}
                {entryForm.entryType === "CASH" && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                      Wage Cash Paid to Powerloom (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      placeholder="e.g. 100000 or 45000"
                      value={entryForm.cashPaid}
                      onChange={(e) => setEntryForm({ ...entryForm, cashPaid: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono text-rose-700 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                )}

                {/* BABIN: Babin Count */}
                {entryForm.entryType === "BABIN" && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                      Babin Sets Issued <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 5 (Sets)"
                      value={entryForm.babinCount}
                      onChange={(e) => setEntryForm({ ...entryForm, babinCount: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                )}
              </div>

              {/* 4. Live Running Tally Preview Box (+ or - Amount Society Has to Pay) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Real-Time Register Tally Preview</span>
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {/* Remaining Paavu */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-medium">Remaining Paavu</div>
                    <div className="font-black font-mono tabular-nums text-amber-800">
                      {projectedRemainingPaavu.toLocaleString()}m
                    </div>
                  </div>

                  {/* Weft Stock */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-medium">Weft Stock</div>
                    <div className="font-black font-mono tabular-nums text-sky-800">
                      {projectedWeftStock}kg
                    </div>
                  </div>

                  {/* Babin Count */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-medium">
                      Available Babin Sets
                    </div>
                    <div className="font-black font-mono tabular-nums text-purple-800">
                      {projectedBabinCount} Sets
                    </div>
                  </div>

                  {/* Net Balance */}
                  <div
                    className={`p-2 rounded-xl font-black font-mono tabular-nums border shadow-2xs ${
                      projectedNetBalance > 0
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : projectedNetBalance < 0
                        ? "bg-rose-50 border-rose-200 text-rose-950"
                        : "bg-white border-slate-200 text-slate-900"
                    }`}
                  >
                    <div className="text-[10px] opacity-80">
                      {projectedNetBalance > 0
                        ? "+ Payable"
                        : projectedNetBalance < 0
                        ? "- Excess"
                        : "Settled"}
                    </div>
                    <div>
                      {projectedNetBalance > 0 ? "+" : projectedNetBalance < 0 ? "-" : ""}
                      {formatINR(Math.abs(projectedNetBalance))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Notes */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Notes & Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer reference, quality inspection notes..."
                  value={entryForm.notes}
                  onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{saving ? "Saving..." : "Save Register Entry"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
