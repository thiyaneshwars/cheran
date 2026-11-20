"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Warehouse,
  Factory,
  Clock,
  Search,
  Filter,
  RotateCw,
  Download,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Truck,
  User,
  Calendar,
  Building2,
  FileText,
  PackageCheck,
} from "lucide-react";
import { exportToCSV } from "@/lib/export";

interface GovtHandoverViewProps {
  onNavigate?: (tab: string) => void;
}

export const GovtHandoverView: React.FC<GovtHandoverViewProps> = ({ onNavigate }) => {
  // Main section filter: "ALL" | "VEATTI" | "SAREE"
  const [activeSection, setActiveSection] = useState<"ALL" | "VEATTI" | "SAREE">("ALL");

  // Data states
  const [handovers, setHandovers] = useState<any[]>([]);
  const [veattiUnits, setVeattiUnits] = useState<any[]>([]);
  const [sareeUnits, setSareeUnits] = useState<any[]>([]);
  const [yarnSummary, setYarnSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Create Handover Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalClothType, setModalClothType] = useState<"VEATTI" | "SAREE">("VEATTI");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Handover Form
  const [form, setForm] = useState({
    clothType: "VEATTI" as "VEATTI" | "SAREE",
    unitId: "",
    challanNo: "",
    handoverDate: new Date().toISOString().split("T")[0],
    meters: "" as number | string,
    pieces: "" as number | string,
    recipientDept: "Tamil Nadu Handlooms & Textiles / Co-optex",
    vehicleNo: "",
    officerName: "",
    notes: "",
  });

  // Print Challan Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPrintHandover, setSelectedPrintHandover] = useState<any | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch all handovers, units, and government yarn allotment summary
  const fetchData = async () => {
    setLoading(true);
    try {
      const [handoverRes, vUnitsRes, sUnitsRes, yarnRes] = await Promise.all([
        fetch("/api/production/handover"),
        fetch("/api/production/units?clothType=VEATTI"),
        fetch("/api/production/units?clothType=SAREE"),
        fetch("/api/production/yarn-allotment"),
      ]);

      if (handoverRes.ok) {
        setHandovers(await handoverRes.json());
      }
      if (vUnitsRes.ok) {
        setVeattiUnits(await vUnitsRes.json());
      }
      if (sUnitsRes.ok) {
        setSareeUnits(await sUnitsRes.json());
      }
      if (yarnRes.ok) {
        const yData = await yarnRes.json();
        setYarnSummary(yData.summary || null);
      }
    } catch (err) {
      console.error("Failed to load handover data:", err);
      showToast("Error loading government handover records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Veatti Statistics
  const veattiProduced = veattiUnits.reduce((acc, u) => acc + (u.totalProducedMeters || 0), 0);
  const veattiTarget = veattiUnits.reduce((acc, u) => acc + (u.targetMeters || 0), 0);
  const veattiHandovers = handovers.filter((h) => h.clothType === "VEATTI");
  const veattiHandovered = veattiHandovers.reduce((acc, h) => acc + (h.meters || 0), 0);
  const veattiGodownStock = Math.max(0, veattiProduced - veattiHandovered);
  const veattiBalanceToHandover = Math.max(0, veattiTarget - veattiHandovered);

  // Compute Saree Statistics
  const sareeProduced = sareeUnits.reduce((acc, u) => acc + (u.totalProducedMeters || 0), 0);
  const sareeTarget = sareeUnits.reduce((acc, u) => acc + (u.targetMeters || 0), 0);
  const sareeHandovers = handovers.filter((h) => h.clothType === "SAREE");
  const sareeHandovered = sareeHandovers.reduce((acc, h) => acc + (h.meters || 0), 0);
  const sareeGodownStock = Math.max(0, sareeProduced - sareeHandovered);
  const sareeBalanceToHandover = Math.max(0, sareeTarget - sareeHandovered);

  // Dhothi Piece Tallies (Govt Quota vs Handovered)
  const govtDhothiProvidedPieces =
    yarnSummary?.dhothi?.targetTotalPieces ||
    yarnSummary?.dhothi?.piecesFromWarp ||
    Math.round(veattiTarget / 3.65) ||
    0;
  const dhothiHandoveredPieces = veattiHandovers.reduce(
    (acc, h) => acc + (h.pieces && h.pieces > 0 ? h.pieces : Math.round(h.meters / 3.65)),
    0
  );
  const dhothiBalancePieces = Math.max(0, govtDhothiProvidedPieces - dhothiHandoveredPieces);
  const dhothiPercent =
    govtDhothiProvidedPieces > 0
      ? Math.min(100, Math.round((dhothiHandoveredPieces / govtDhothiProvidedPieces) * 100))
      : 0;

  // Saree Piece Tallies (Govt Quota vs Handovered)
  const govtSareeProvidedPieces =
    yarnSummary?.saree?.targetTotalPieces ||
    yarnSummary?.saree?.piecesFromWarp ||
    Math.round(sareeTarget / 5.5) ||
    0;
  const sareeHandoveredPieces = sareeHandovers.reduce(
    (acc, h) => acc + (h.pieces && h.pieces > 0 ? h.pieces : Math.round(h.meters / 5.5)),
    0
  );
  const sareeBalancePieces = Math.max(0, govtSareeProvidedPieces - sareeHandoveredPieces);
  const sareePercent =
    govtSareeProvidedPieces > 0
      ? Math.min(100, Math.round((sareeHandoveredPieces / govtSareeProvidedPieces) * 100))
      : 0;

  // Consolidated
  const totalCombinedHandovered = veattiHandovered + sareeHandovered;
  const totalCombinedPiecesHandovered = dhothiHandoveredPieces + sareeHandoveredPieces;

  // Filtered List
  const filteredHandovers = handovers.filter((h) => {
    // 1. Section match
    if (activeSection !== "ALL" && h.clothType !== activeSection) return false;

    // 2. Unit filter
    if (selectedUnitFilter !== "ALL" && h.unitId !== selectedUnitFilter) return false;

    // 3. Date range filter
    if (startDate && new Date(h.handoverDate) < new Date(startDate)) return false;
    if (endDate && new Date(h.handoverDate) > new Date(endDate)) return false;

    // 4. Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchChallan = h.challanNo?.toLowerCase().includes(q);
      const matchWeaver = h.unit?.weaverName?.toLowerCase().includes(q);
      const matchDept = h.recipientDept?.toLowerCase().includes(q);
      const matchVehicle = h.vehicleNo?.toLowerCase().includes(q);
      const matchOfficer = h.officerName?.toLowerCase().includes(q);
      const matchNotes = h.notes?.toLowerCase().includes(q);
      if (
        !matchChallan &&
        !matchWeaver &&
        !matchDept &&
        !matchVehicle &&
        !matchOfficer &&
        !matchNotes
      ) {
        return false;
      }
    }

    return true;
  });

  // Separated filtered subsets for dedicated ledgers
  const veattiHandoversFiltered = filteredHandovers.filter((h) => h.clothType === "VEATTI");
  const sareeHandoversFiltered = filteredHandovers.filter((h) => h.clothType === "SAREE");

  const veattiHandoversMeters = veattiHandoversFiltered.reduce((s, h) => s + (h.meters || 0), 0);
  const veattiHandoversPieces = veattiHandoversFiltered.reduce(
    (s, h) => s + (h.pieces && h.pieces > 0 ? h.pieces : Math.round(h.meters / 3.65)),
    0
  );

  const sareeHandoversMeters = sareeHandoversFiltered.reduce((s, h) => s + (h.meters || 0), 0);
  const sareeHandoversPieces = sareeHandoversFiltered.reduce(
    (s, h) => s + (h.pieces && h.pieces > 0 ? h.pieces : Math.round(h.meters / 5.5)),
    0
  );

  // Open Handover Entry Modal specifically for a cloth type
  const handleOpenCreateModal = (type: "VEATTI" | "SAREE") => {
    setModalClothType(type);
    setForm({
      clothType: type,
      unitId: "",
      challanNo: "",
      handoverDate: new Date().toISOString().split("T")[0],
      meters: "",
      pieces: "",
      recipientDept: "Tamil Nadu Handlooms & Textiles / Co-optex",
      vehicleNo: "",
      officerName: "",
      notes: "",
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  // Switch type inside modal
  const handleModalTypeChange = (type: "VEATTI" | "SAREE") => {
    setModalClothType(type);
    setForm((prev) => ({
      ...prev,
      clothType: type,
      unitId: "", // reset unit since list changes
    }));
  };

  // Submit Handover Entry
  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.challanNo.trim()) {
      setFormError("Please enter a Challan / Order number.");
      return;
    }
    const numMeters = Number(form.meters);
    if (!numMeters || numMeters <= 0) {
      setFormError("Please enter a valid meter quantity greater than 0.");
      return;
    }

    const standardPieceLen = form.clothType === "SAREE" ? 5.5 : 3.65;
    const numPieces = form.pieces ? parseInt(form.pieces.toString()) : Math.round(numMeters / standardPieceLen);

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/production/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clothType: form.clothType,
          unitId: form.unitId || null,
          challanNo: form.challanNo.trim(),
          handoverDate: form.handoverDate,
          meters: numMeters,
          pieces: numPieces,
          recipientDept: form.recipientDept.trim(),
          vehicleNo: form.vehicleNo.trim() || null,
          officerName: form.officerName.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record government handover");
      }

      showToast(
        `✓ ${form.clothType === "VEATTI" ? "Veatti" : "Saree"} Handover of ${numMeters.toLocaleString("en-IN")}m saved under Challan #${form.challanNo}!`
      );
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to record handover.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handover Entry
  const handleDeleteHandover = async (h: any) => {
    const isVeatti = h.clothType === "VEATTI";
    const label = isVeatti ? "Veatti" : "Saree";
    if (
      !confirm(
        `Are you sure you want to delete ${label} Handover Challan #${h.challanNo} (${h.meters} Meters)?\n\nThis will restore the godown stock and recalculate loom tallies.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/production/handover/${h.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete handover entry");

      showToast(`✓ Challan #${h.challanNo} deleted and stock balances restored.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete handover");
    }
  };

  // Export filtered rows to CSV
  const handleExportCSV = () => {
    if (filteredHandovers.length === 0) {
      alert("No handover records to export with current filters.");
      return;
    }

    const exportRows = filteredHandovers.map((h) => ({
      "Challan / Order No": h.challanNo,
      "Cloth Section": h.clothType === "VEATTI" ? "Veatti" : "Saree",
      "Handover Date": new Date(h.handoverDate).toLocaleDateString("en-IN"),
      "Handover Quantity (Meters)": h.meters,
      "Source Loom / Weaver": h.unit?.weaverName || "Society Stock Pool",
      "Recipient Department": h.recipientDept,
      "Vehicle Number": h.vehicleNo || "—",
      "Inspection Officer": h.officerName || "—",
      Notes: h.notes || "—",
    }));

    const filename = `Govt_Handover_Stocks_${activeSection}_${new Date().toISOString().split("T")[0]}`;
    exportToCSV(filename, exportRows);
  };

  // Print Handover Voucher
  const handleOpenPrintModal = (h: any) => {
    setSelectedPrintHandover(h);
    setShowPrintModal(true);
  };

  // Active units list for modal dropdown based on selected modal cloth type
  const activeModalUnits = modalClothType === "VEATTI" ? veattiUnits : sareeUnits;

  // Units list for search filter dropdown based on active section
  const filterUnitsList =
    activeSection === "VEATTI"
      ? veattiUnits
      : activeSection === "SAREE"
      ? sareeUnits
      : [...veattiUnits, ...sareeUnits];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-white text-slate-900 px-5 py-3.5 font-bold text-xs shadow-xl flex items-center gap-2.5 border border-slate-200/90 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =========================================================================
       * 1. HEADER BANNER & SECTION RECORD ACTIONS
       * ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/80 font-black text-2xl shadow-xs">
            <Send className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Stocks Handover to Government
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Dedicated tracking for Veatti & Saree cloth dispatches, challans, godown stock deduction, and statutory tallies
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Record Veatti Handover Button */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal("VEATTI")}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Record Veatti Handover</span>
          </button>

          {/* Record Saree Handover Button */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal("SAREE")}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Record Saree Handover</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchData}
            title="Refresh All Handover Data"
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* =========================================================================
       * 2. SECTION SELECTOR TABS (All | Veatti Section | Saree Section)
       * ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl w-fit">
          {/* All Sections */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("ALL");
              setSelectedUnitFilter("ALL");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeSection === "ALL"
                ? "bg-white text-slate-900 border-slate-200/90 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-transparent"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span>All Handovers</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeSection === "ALL" ? "bg-blue-50 text-blue-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {handovers.length}
            </span>
          </button>

          {/* Veatti Section */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("VEATTI");
              setSelectedUnitFilter("ALL");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeSection === "VEATTI"
                ? "bg-white text-emerald-950 border-emerald-200/90 shadow-xs ring-1 ring-emerald-500/20"
                : "text-slate-600 hover:text-emerald-800 hover:bg-white/60 border-transparent"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Veatti Section</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeSection === "VEATTI"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {veattiHandovers.length} Challans • {veattiHandovered.toLocaleString("en-IN")}m
            </span>
          </button>

          {/* Saree Section */}
          <button
            type="button"
            onClick={() => {
              setActiveSection("SAREE");
              setSelectedUnitFilter("ALL");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeSection === "SAREE"
                ? "bg-white text-purple-950 border-purple-200/90 shadow-xs ring-1 ring-purple-500/20"
                : "text-slate-600 hover:text-purple-800 hover:bg-white/60 border-transparent"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <span>Saree Section</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeSection === "SAREE"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-purple-50 text-purple-700"
              }`}
            >
              {sareeHandovers.length} Challans • {sareeHandovered.toLocaleString("en-IN")}m
            </span>
          </button>
        </div>

        {/* Quick jump to production register */}
        {onNavigate && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Production Ledgers:</span>
            <button
              type="button"
              onClick={() => onNavigate("veatti")}
              className="text-emerald-700 hover:underline"
            >
              Veatti Production &rarr;
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigate("saree")}
              className="text-purple-700 hover:underline"
            >
              Saree Production &rarr;
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
       * 2.5 GOVERNMENT ALLOTMENT VS HANDOVER BALANCE TALLY
       * ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-5 border border-indigo-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow-xs">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Government Scheme Target vs Handover Tally</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 uppercase font-mono tracking-wider">
                  அரசு ஒதுக்கீடு & ஒப்படைப்பு
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Target quotas derived from govt thread (Warp, Weft, Border KG) vs actual dispatch challans
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("govt-yarn")}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/10"
            >
              <span>+ Record Govt Yarn Allotment</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Dhothi / Veatti Scheme Tally */}
          <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-black text-sm text-white">DHOTHI (வேட்டி) ALLOTMENT TALLY</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {dhothiPercent}% Handovered
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-slate-300 uppercase block">Govt Provided</span>
                <span className="text-xl font-black text-white font-mono block mt-0.5">
                  {govtDhothiProvidedPieces.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-slate-400 block">Dhothis</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <span className="text-[10px] font-bold text-emerald-300 uppercase block">Handovered</span>
                <span className="text-xl font-black text-emerald-300 font-mono block mt-0.5">
                  {dhothiHandoveredPieces.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-emerald-200 block">Dhothis</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <span className="text-[10px] font-bold text-rose-300 uppercase block">Balance Due</span>
                <span className="text-xl font-black text-rose-300 font-mono block mt-0.5">
                  {dhothiBalancePieces.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-rose-200 block">Dhothis</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${dhothiPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 font-mono pt-1 border-t border-white/10">
              <span>Govt Rule: Warp KG / 0.122 | Weft / 0.119</span>
              <span className="text-emerald-300 font-bold">Weaving wage: ₹19 / pc</span>
            </div>
          </div>

          {/* Saree Scheme Tally */}
          <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-400 animate-pulse" />
                <span className="font-black text-sm text-white">SAREE (சேலை) ALLOTMENT TALLY</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {sareePercent}% Handovered
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-slate-300 uppercase block">Govt Provided</span>
                <span className="text-xl font-black text-white font-mono block mt-0.5">
                  {govtSareeProvidedPieces.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-slate-400 block">Sarees</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
                <span className="text-[10px] font-bold text-purple-300 uppercase block">Handovered</span>
                <span className="text-xl font-black text-purple-300 font-mono block mt-0.5">
                  {sareeHandoveredPieces.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-purple-200 block">Sarees</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <span className="text-[10px] font-bold text-rose-300 uppercase block">Balance Due</span>
                <span className="text-xl font-black text-rose-300 font-mono block mt-0.5">
                  {sareeBalancePieces.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-rose-200 block">Sarees</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-purple-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${sareePercent}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 font-mono pt-1 border-t border-white/10">
              <span>Govt Rule: Warp KG / 0.188 | Weft / 0.182</span>
              <span className="text-purple-300 font-bold">Weaving wage: ₹42 / pc</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
       * 3. KPI CARDS FOR SELECTED SECTION
       * ========================================================================= */}
      {activeSection === "ALL" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Combined Handovered */}
          <div className="rounded-2xl border border-blue-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Total Dispatched to Govt</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Send className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
                {totalCombinedHandovered.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-blue-700 font-sans">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Combined Veatti + Saree delivered to Co-optex
            </p>
          </div>

          {/* Card 2: Veatti Handovered */}
          <div className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Veatti Handovered</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
                {veattiHandovered.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-emerald-700 font-sans">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {veattiHandovers.length} Challans • Godown: {veattiGodownStock.toLocaleString("en-IN")}m
            </p>
          </div>

          {/* Card 3: Saree Handovered */}
          <div className="rounded-2xl border border-purple-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Saree Handovered</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
                {sareeHandovered.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-purple-700 font-sans">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {sareeHandovers.length} Challans • Godown: {sareeGodownStock.toLocaleString("en-IN")}m
            </p>
          </div>

          {/* Card 4: Total Challans */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Total Delivery Challans</span>
              <span className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
                {handovers.length}{" "}
                <span className="text-sm font-bold text-slate-500 font-sans">Dispatches</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Official gate pass & dispatch records
            </p>
          </div>
        </div>
      )}

      {/* VEATTI SECTION SPECIFIC KPIS */}
      {activeSection === "VEATTI" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Veatti Metric 1: Produced */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Veatti Loom Produced</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Factory className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {veattiProduced.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-emerald-600">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">
              Produced across {veattiUnits.length} Veatti Powerlooms
            </p>
          </div>

          {/* Veatti Metric 2: Godown Stock */}
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Veatti Godown Stock</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Warehouse className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">
                {veattiGodownStock.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-amber-600">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Available in society godown ready to dispatch
            </p>
          </div>

          {/* Veatti Metric 3: Handovered */}
          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Handovered to Govt</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Send className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-blue-600">
                {veattiHandovered.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-blue-600">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Total {veattiHandovers.length} delivery challans issued
            </p>
          </div>

          {/* Veatti Metric 4: Balance to Handover */}
          <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-rose-600">
              <span className="uppercase tracking-wider">Balance Yet to Handover</span>
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600">
                {veattiBalanceToHandover.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-rose-600">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-rose-600">
              Remaining quota against target ({veattiTarget.toLocaleString("en-IN")}m)
            </p>
          </div>
        </div>
      )}

      {/* SAREE SECTION SPECIFIC KPIS */}
      {activeSection === "SAREE" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Saree Metric 1: Produced */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Saree Loom Produced</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Factory className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {sareeProduced.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-purple-600">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-purple-700">
              Produced across {sareeUnits.length} Saree Powerlooms
            </p>
          </div>

          {/* Saree Metric 2: Godown Stock */}
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Saree Godown Stock</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Warehouse className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">
                {sareeGodownStock.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-amber-600">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Available in society godown ready to dispatch
            </p>
          </div>

          {/* Saree Metric 3: Handovered */}
          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Handovered to Govt</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Send className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-blue-600">
                {sareeHandovered.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-blue-600">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Total {sareeHandovers.length} delivery challans issued
            </p>
          </div>

          {/* Saree Metric 4: Balance to Handover */}
          <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-rose-600">
              <span className="uppercase tracking-wider">Balance Yet to Handover</span>
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600">
                {sareeBalanceToHandover.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-rose-600">Mtr</span>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-rose-600">
              Remaining quota against target ({sareeTarget.toLocaleString("en-IN")}m)
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
       * 4. FILTER & SEARCH TOOLBAR
       * ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Challan #, Weaver, Officer, Vehicle, Department..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Unit / Weaver Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Loom:</span>
              <select
                value={selectedUnitFilter}
                onChange={(e) => setSelectedUnitFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="ALL">All Powerlooms</option>
                {filterUnitsList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.weaverName} ({u.clothType === "VEATTI" ? "Veatti" : "Saree"})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
              />
              <span className="font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
              />
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || selectedUnitFilter !== "ALL" || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedUnitFilter("ALL");
                  setStartDate("");
                  setEndDate("");
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Section status strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Showing <span className="font-extrabold text-slate-800">{filteredHandovers.length}</span>{" "}
            dispatch records
            {activeSection !== "ALL" && (
              <span>
                {" "}
                in <strong className="text-slate-800">{activeSection === "VEATTI" ? "Veatti" : "Saree"}</strong> section
              </span>
            )}
          </div>
          <div>
            Total Filtered Quantity:{" "}
            <span className="font-extrabold text-blue-600">
              {filteredHandovers.reduce((acc, h) => acc + (h.meters || 0), 0).toLocaleString("en-IN")} Meters
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
       * 5. SEPARATE HANDOVER DISPATCH LEDGERS (DHOTHI/VEATTI & SAREE)
       * ========================================================================= */}
      <div className="space-y-8">
        {/* =====================================================================
         * 1. DHOTHI / VEATTI (வேட்டி) GOVERNMENT HANDOVER LEDGER
         * ===================================================================== */}
        {(activeSection === "ALL" || activeSection === "VEATTI") && (
          <div className="rounded-3xl border border-emerald-200/90 bg-white shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Dhothi / Veatti (வேட்டி) Handover Ledger</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {veattiHandoversFiltered.length} Challans
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official Veatti dispatches to Co-optex • {veattiHandoversMeters.toLocaleString("en-IN")} Meters ({veattiHandoversPieces.toLocaleString("en-IN")} pcs)
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreateModal("VEATTI")}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Record Veatti Handover</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-50/30 text-slate-500 font-bold border-b border-emerald-100 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Challan / Gate Pass #</th>
                    <th className="py-3 px-4">Handover Date</th>
                    <th className="py-3 px-4 text-right">Quantity (Mtr)</th>
                    <th className="py-3 px-4 text-right">Pieces (வேட்டி)</th>
                    <th className="py-3 px-4">Source Powerloom</th>
                    <th className="py-3 px-4">Recipient Dept</th>
                    <th className="py-3 px-4">Vehicle No</th>
                    <th className="py-3 px-4">Inspection Officer</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {veattiHandoversFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <PackageCheck className="h-8 w-8 text-emerald-300" />
                          <span className="font-bold text-sm text-slate-600">
                            No Veatti government handover records found.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal("VEATTI")}
                            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            + Record First Veatti Handover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    veattiHandoversFiltered.map((h) => {
                      const pcs =
                        h.pieces && h.pieces > 0
                          ? h.pieces
                          : Math.round(h.meters / 3.65);

                      return (
                        <tr key={h.id} className="hover:bg-emerald-50/20 transition group">
                          {/* Challan No */}
                          <td className="py-3 px-4 font-black font-mono text-slate-900 text-sm">
                            {h.challanNo}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(h.handoverDate).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>

                          {/* Quantity Meters */}
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                            {h.meters.toLocaleString("en-IN")}{" "}
                            <span className="text-[10px] font-semibold text-slate-400">m</span>
                          </td>

                          {/* Pieces */}
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                            <span className="font-black text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-lg text-xs">
                              {pcs.toLocaleString("en-IN")} pcs
                            </span>
                          </td>

                          {/* Powerloom Unit */}
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {h.unit?.weaverName ? (
                              <div className="flex items-center gap-1">
                                <Factory className="h-3.5 w-3.5 text-slate-400" />
                                <span>{h.unit.weaverName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Society General Stock</span>
                            )}
                          </td>

                          {/* Recipient Dept */}
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {h.recipientDept}
                          </td>

                          {/* Vehicle No */}
                          <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                            {h.vehicleNo || "—"}
                          </td>

                          {/* Officer */}
                          <td className="py-3 px-4 text-slate-600">
                            {h.officerName || "—"}
                          </td>

                          {/* Notes */}
                          <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                            {h.notes || "—"}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPrintModal(h)}
                                title="Print Official Handover Voucher / Gate Pass"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHandover(h)}
                                title="Delete Handover & Restore Stock"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {veattiHandoversFiltered.length > 0 && (
                  <tfoot className="bg-emerald-50/60 font-mono font-bold text-slate-800 border-t-2 border-emerald-200 text-xs">
                    <tr>
                      <td className="py-3 px-4">
                        <span className="font-sans font-black text-emerald-950 uppercase text-[10px]">
                          Veatti Totals ({veattiHandoversFiltered.length})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">—</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {veattiHandoversMeters.toLocaleString("en-IN")} m
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-md text-xs">
                          {veattiHandoversPieces.toLocaleString("en-IN")} pcs
                        </span>
                      </td>
                      <td colSpan={6} className="py-3 px-4 text-slate-400">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
         * 2. SAREE (சேலை) GOVERNMENT HANDOVER LEDGER
         * ===================================================================== */}
        {(activeSection === "ALL" || activeSection === "SAREE") && (
          <div className="rounded-3xl border border-purple-200/90 bg-white shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500 animate-pulse" />
                  <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Saree (சேலை) Handover Ledger</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      {sareeHandoversFiltered.length} Challans
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official Saree dispatches to Co-optex • {sareeHandoversMeters.toLocaleString("en-IN")} Meters ({sareeHandoversPieces.toLocaleString("en-IN")} pcs)
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreateModal("SAREE")}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Record Saree Handover</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-purple-50/30 text-slate-500 font-bold border-b border-purple-100 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Challan / Gate Pass #</th>
                    <th className="py-3 px-4">Handover Date</th>
                    <th className="py-3 px-4 text-right">Quantity (Mtr)</th>
                    <th className="py-3 px-4 text-right">Pieces (சேலை)</th>
                    <th className="py-3 px-4">Source Powerloom</th>
                    <th className="py-3 px-4">Recipient Dept</th>
                    <th className="py-3 px-4">Vehicle No</th>
                    <th className="py-3 px-4">Inspection Officer</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sareeHandoversFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <PackageCheck className="h-8 w-8 text-purple-300" />
                          <span className="font-bold text-sm text-slate-600">
                            No Saree government handover records found.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal("SAREE")}
                            className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                          >
                            + Record First Saree Handover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sareeHandoversFiltered.map((h) => {
                      const pcs =
                        h.pieces && h.pieces > 0
                          ? h.pieces
                          : Math.round(h.meters / 5.5);

                      return (
                        <tr key={h.id} className="hover:bg-purple-50/20 transition group">
                          {/* Challan No */}
                          <td className="py-3 px-4 font-black font-mono text-slate-900 text-sm">
                            {h.challanNo}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(h.handoverDate).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>

                          {/* Quantity Meters */}
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                            {h.meters.toLocaleString("en-IN")}{" "}
                            <span className="text-[10px] font-semibold text-slate-400">m</span>
                          </td>

                          {/* Pieces */}
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                            <span className="font-black text-purple-800 bg-purple-100/80 border border-purple-300 px-2 py-0.5 rounded-lg text-xs">
                              {pcs.toLocaleString("en-IN")} pcs
                            </span>
                          </td>

                          {/* Powerloom Unit */}
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {h.unit?.weaverName ? (
                              <div className="flex items-center gap-1">
                                <Factory className="h-3.5 w-3.5 text-slate-400" />
                                <span>{h.unit.weaverName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Society General Stock</span>
                            )}
                          </td>

                          {/* Recipient Dept */}
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {h.recipientDept}
                          </td>

                          {/* Vehicle No */}
                          <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                            {h.vehicleNo || "—"}
                          </td>

                          {/* Officer */}
                          <td className="py-3 px-4 text-slate-600">
                            {h.officerName || "—"}
                          </td>

                          {/* Notes */}
                          <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                            {h.notes || "—"}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPrintModal(h)}
                                title="Print Official Handover Voucher / Gate Pass"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHandover(h)}
                                title="Delete Handover & Restore Stock"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {sareeHandoversFiltered.length > 0 && (
                  <tfoot className="bg-purple-50/60 font-mono font-bold text-slate-800 border-t-2 border-purple-200 text-xs">
                    <tr>
                      <td className="py-3 px-4">
                        <span className="font-sans font-black text-purple-950 uppercase text-[10px]">
                          Saree Totals ({sareeHandoversFiltered.length})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">—</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {sareeHandoversMeters.toLocaleString("en-IN")} m
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-purple-900 bg-purple-200/80 px-2 py-0.5 rounded-md text-xs">
                          {sareeHandoversPieces.toLocaleString("en-IN")} pcs
                        </span>
                      </td>
                      <td colSpan={6} className="py-3 px-4 text-slate-400">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
       * 6. MODAL: RECORD GOVERNMENT HANDOVER (VEATTI OR SAREE)
       * ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      modalClothType === "VEATTI"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {modalClothType === "VEATTI" ? "Veatti Section" : "Saree Section"}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Official Dispatch</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Record Government Handover
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitHandover} className="space-y-4">
              {/* SECTION TOGGLE PILL: Switch between Veatti & Saree */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5 uppercase tracking-wider">
                  Target Cloth Section <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => handleModalTypeChange("VEATTI")}
                    className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                      form.clothType === "VEATTI"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-emerald-700"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Veatti Production</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModalTypeChange("SAREE")}
                    className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                      form.clothType === "SAREE"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-purple-700"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-400" />
                    <span>Saree Production</span>
                  </button>
                </div>
              </div>

              {/* Stock Availability Context Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <span>Current {form.clothType === "VEATTI" ? "Veatti" : "Saree"} Stock Status</span>
                  <Warehouse className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-medium block">Loom Produced</span>
                    <span className="font-black font-mono text-slate-900">
                      {(form.clothType === "VEATTI" ? veattiProduced : sareeProduced).toLocaleString("en-IN")}m
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-medium block">In Godown Stock</span>
                    <span className="font-black font-mono text-amber-700">
                      {(form.clothType === "VEATTI" ? veattiGodownStock : sareeGodownStock).toLocaleString("en-IN")}m
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-medium block">Balance Target</span>
                    <span className="font-black font-mono text-rose-700">
                      {(form.clothType === "VEATTI" ? veattiBalanceToHandover : sareeBalanceToHandover).toLocaleString("en-IN")}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 1: Challan No & Handover Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Challan / Order / Gate Pass # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.challanNo}
                    onChange={(e) => setForm({ ...form, challanNo: e.target.value })}
                    placeholder="e.g. TN-COOP-2026-101"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Handover Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.handoverDate}
                    onChange={(e) => setForm({ ...form, handoverDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Row 2: Meters, Pieces Handovered & Source Powerloom */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Quantity (Meters) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    value={form.meters}
                    onChange={(e) => {
                      const val = e.target.value;
                      const m = parseFloat(val) || 0;
                      const p = m > 0 ? Math.round(m / (form.clothType === "SAREE" ? 5.5 : 3.65)) : "";
                      setForm({ ...form, meters: val, pieces: p });
                    }}
                    placeholder="e.g. 1100"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-black text-blue-600 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {form.clothType === "SAREE" ? "Standard ~5.5m/pc" : "Standard ~3.65m/pc"}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pieces ({form.clothType === "SAREE" ? "Sarees" : "Dhothis"})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={form.pieces}
                    onChange={(e) => {
                      const val = e.target.value;
                      const p = parseInt(val) || 0;
                      const m = p > 0 ? +(p * (form.clothType === "SAREE" ? 5.5 : 3.65)).toFixed(2) : "";
                      setForm({ ...form, pieces: val, meters: m });
                    }}
                    placeholder="e.g. 200"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    Weaver wage: ₹{form.clothType === "SAREE" ? "42" : "19"}/pc
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Source Powerloom / Weaver
                  </label>
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                  >
                    <option value="">Society Common Stock Pool</option>
                    {activeModalUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.weaverName} (Produced: {u.totalProducedMeters || 0}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Recipient Department */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Recipient Department / Agency
                </label>
                <input
                  type="text"
                  value={form.recipientDept}
                  onChange={(e) => setForm({ ...form, recipientDept: e.target.value })}
                  placeholder="Tamil Nadu Handlooms & Textiles / Co-optex"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Row 4: Vehicle No & Officer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Dispatch Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={form.vehicleNo}
                    onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
                    placeholder="e.g. TN 34 AB 5678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Inspecting / Receiving Officer
                  </label>
                  <input
                    type="text"
                    value={form.officerName}
                    onChange={(e) => setForm({ ...form, officerName: e.target.value })}
                    placeholder="e.g. Thiru. S. Rajendran, AE"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Row 5: Notes / Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional order specifications, bundle counts, quality seal..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md transition flex items-center gap-1.5 ${
                    form.clothType === "VEATTI"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-purple-600 hover:bg-purple-500"
                  } ${submitting ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {submitting
                      ? "Recording..."
                      : `Record ${form.clothType === "VEATTI" ? "Veatti" : "Saree"} Handover`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
       * 7. MODAL: PRINTABLE DELIVERY CHALLAN / GATE PASS VOUCHER
       * ========================================================================= */}
      {showPrintModal && selectedPrintHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between no-print border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400">
                Official Government Dispatch Voucher Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable A4 Voucher Content */}
            <div className="border border-slate-900 p-6 rounded-2xl space-y-5 text-slate-900 font-sans">
              {/* Society Letterhead */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <h2 className="text-xl font-black uppercase tracking-wide">
                  Cheran Co-operative Weavers Production Society Ltd.
                </h2>
                <p className="text-xs font-semibold text-slate-600">
                  Registered No. CH-1049 • Sankari, Salem District, Tamil Nadu - 637301
                </p>
                <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-md mt-1">
                  Government Cloth Delivery Challan / Gate Pass
                </div>
              </div>

              {/* Challan Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block">Challan / Order No:</span>
                  <span className="text-base font-black font-mono text-slate-900">
                    #{selectedPrintHandover.challanNo}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-bold block">Dispatch Date:</span>
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {new Date(selectedPrintHandover.handoverDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Cloth Production Section:</span>
                  <span className="text-sm font-black text-slate-900">
                    {selectedPrintHandover.clothType === "VEATTI" ? "Veatti Production" : "Saree Production"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-bold block">Source Powerloom:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {selectedPrintHandover.unit?.weaverName || "Society Common Pool"}
                  </span>
                </div>
              </div>

              {/* Dispatch Details Table */}
              <table className="w-full text-xs border border-slate-900">
                <thead className="bg-slate-100 font-bold border-b border-slate-900">
                  <tr>
                    <th className="p-2.5 text-left border-r border-slate-900">Description of Goods</th>
                    <th className="p-2.5 text-left border-r border-slate-900">Recipient Department / Depot</th>
                    <th className="p-2.5 text-center border-r border-slate-900">Vehicle No</th>
                    <th className="p-2.5 text-right">Quantity (Meters)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-900 font-medium">
                    <td className="p-3 border-r border-slate-900">
                      <span className="font-bold">
                        {selectedPrintHandover.clothType === "VEATTI" ? "Standard Veatti Cloth" : "Standard Saree Cloth"}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Inspected and approved for government supply
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-900">
                      {selectedPrintHandover.recipientDept}
                    </td>
                    <td className="p-3 text-center border-r border-slate-900 font-mono">
                      {selectedPrintHandover.vehicleNo || "—"}
                    </td>
                    <td className="p-3 text-right font-black font-mono text-sm">
                      {selectedPrintHandover.meters.toLocaleString("en-IN")} m
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-black">
                    <td colSpan={3} className="p-2.5 text-right border-r border-slate-900">
                      Total Handover Quantity:
                    </td>
                    <td className="p-2.5 text-right font-mono text-sm">
                      {selectedPrintHandover.meters.toLocaleString("en-IN")} Meters
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Officer / Remarks */}
              <div className="text-xs space-y-1">
                <div>
                  <span className="font-bold text-slate-600">Inspecting / Dispatching Officer: </span>
                  <span className="font-medium text-slate-900">
                    {selectedPrintHandover.officerName || "Thiru. Society Depot Manager"}
                  </span>
                </div>
                {selectedPrintHandover.notes && (
                  <div>
                    <span className="font-bold text-slate-600">Remarks: </span>
                    <span className="text-slate-700">{selectedPrintHandover.notes}</span>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-3 gap-4 text-center text-xs font-bold border-t border-slate-300">
                <div className="space-y-1">
                  <div className="border-t border-slate-400 w-32 mx-auto pt-1" />
                  <span>Prepared By</span>
                  <span className="block text-[10px] text-slate-400">Society Clerk</span>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-400 w-32 mx-auto pt-1" />
                  <span>Verified & Dispatched</span>
                  <span className="block text-[10px] text-slate-400">Production Officer</span>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-400 w-32 mx-auto pt-1" />
                  <span>Received By</span>
                  <span className="block text-[10px] text-slate-400">Government Inspector / Co-optex</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

