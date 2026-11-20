"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Layers,
  Scale,
  Calendar,
  Search,
  RotateCw,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  X,
  DollarSign,
  Info,
  Building2,
  Check,
} from "lucide-react";
import { exportToCSV } from "@/lib/export";

interface GovtYarnAllotmentViewProps {
  onNavigate?: (tab: string) => void;
}

export const GovtYarnAllotmentView: React.FC<GovtYarnAllotmentViewProps> = ({ onNavigate }) => {
  const [allotments, setAllotments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [conversions, setConversions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Active Section Filter: "ALL" | "DHOTHI" | "SAREE"
  const [activeSection, setActiveSection] = useState<"ALL" | "DHOTHI" | "SAREE">("ALL");

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalSection, setModalSection] = useState<"DHOTHI" | "SAREE" | "BOTH">("DHOTHI");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    allotmentNo: "",
    allotmentDate: new Date().toISOString().split("T")[0],
    schemeName: "Tamil Nadu Free Dhothi & Saree Scheme",
    supplierDept: "Co-optex / Dept of Handlooms & Textiles",

    // Dhothi Thread (KG)
    dhothiWarpKg: "" as number | string,
    dhothiWeftKg: "" as number | string,
    dhothiBorderKg: "" as number | string,

    // Saree Thread (KG)
    sareeWarpKg: "" as number | string,
    sareeWeftKg: "" as number | string,
    sareeBorderKg: "" as number | string,

    // Pricing & Wages
    yarnRatePerKg: "" as number | string,
    bagPrice: "" as number | string,
    dhothiGovtRate: "" as number | string,
    sareeGovtRate: "" as number | string,
    dhothiWeaverRate: "19",
    sareeWeaverRate: "42",

    notes: "",
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchAllotments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production/yarn-allotment");
      if (res.ok) {
        const data = await res.json();
        setAllotments(data.allotments || []);
        setSummary(data.summary || null);
        setConversions(data.conversions || null);
      } else {
        showToast("Failed to load yarn allotment records");
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading yarn allotments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllotments();
  }, []);

  // Form Live Calculations
  const numDWarp = parseFloat(form.dhothiWarpKg.toString()) || 0;
  const numDWeft = parseFloat(form.dhothiWeftKg.toString()) || 0;
  const numDBorder = parseFloat(form.dhothiBorderKg.toString()) || 0;

  const liveDhothiWarpPcs = numDWarp > 0 ? Math.round(numDWarp / 0.122) : 0;
  const liveDhothiWeftPcs = numDWeft > 0 ? Math.round(numDWeft / 0.119) : 0;
  const liveDhothiBorderPcs = numDBorder > 0 ? Math.round(numDBorder / 0.006) : 0;

  const numSWarp = parseFloat(form.sareeWarpKg.toString()) || 0;
  const numSWeft = parseFloat(form.sareeWeftKg.toString()) || 0;
  const numSBorder = parseFloat(form.sareeBorderKg.toString()) || 0;

  const liveSareeWarpPcs = numSWarp > 0 ? Math.round(numSWarp / 0.188) : 0;
  const liveSareeWeftPcs = numSWeft > 0 ? Math.round(numSWeft / 0.182) : 0;
  const liveSareeBorderPcs = numSBorder > 0 ? Math.round(numSBorder / 0.024) : 0;

  const handleOpenNew = (section: "DHOTHI" | "SAREE" | "BOTH") => {
    setEditingId(null);
    setModalSection(section);
    setForm({
      allotmentNo: `TN-GOVT-${Date.now().toString().slice(-6)}`,
      allotmentDate: new Date().toISOString().split("T")[0],
      schemeName: "Tamil Nadu Free Dhothi & Saree Scheme",
      supplierDept: "Co-optex / Dept of Handlooms & Textiles",
      dhothiWarpKg: "",
      dhothiWeftKg: "",
      dhothiBorderKg: "",
      sareeWarpKg: "",
      sareeWeftKg: "",
      sareeBorderKg: "",
      yarnRatePerKg: "",
      bagPrice: "",
      dhothiGovtRate: "",
      sareeGovtRate: "",
      dhothiWeaverRate: "19",
      sareeWeaverRate: "42",
      notes: "",
    });
    setShowModal(true);
  };

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    const hasDhothi = a.dhothiWarpKg > 0 || a.dhothiWeftKg > 0;
    const hasSaree = a.sareeWarpKg > 0 || a.sareeWeftKg > 0;
    setModalSection(hasDhothi && hasSaree ? "BOTH" : hasSaree ? "SAREE" : "DHOTHI");
    setForm({
      allotmentNo: a.allotmentNo,
      allotmentDate: a.allotmentDate ? new Date(a.allotmentDate).toISOString().split("T")[0] : "",
      schemeName: a.schemeName || "Tamil Nadu Free Dhothi & Saree Scheme",
      supplierDept: a.supplierDept || "Co-optex / Dept of Handlooms & Textiles",
      dhothiWarpKg: a.dhothiWarpKg || "",
      dhothiWeftKg: a.dhothiWeftKg || "",
      dhothiBorderKg: a.dhothiBorderKg || "",
      sareeWarpKg: a.sareeWarpKg || "",
      sareeWeftKg: a.sareeWeftKg || "",
      sareeBorderKg: a.sareeBorderKg || "",
      yarnRatePerKg: a.yarnRatePerKg || "",
      bagPrice: a.bagPrice || "",
      dhothiGovtRate: a.dhothiGovtRate || "",
      sareeGovtRate: a.sareeGovtRate || "",
      dhothiWeaverRate: a.dhothiWeaverRate?.toString() || "19",
      sareeWeaverRate: a.sareeWeaverRate?.toString() || "42",
      notes: a.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, no: string) => {
    if (!window.confirm(`Are you sure you want to delete Yarn Inward Allotment "${no}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/production/yarn-allotment/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Allotment deleted successfully.");
        fetchAllotments();
      } else {
        showToast("Failed to delete allotment.");
      }
    } catch (e) {
      console.error(e);
      showToast("Error executing delete.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/production/yarn-allotment/${editingId}`
        : "/api/production/yarn-allotment";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(editingId ? "Allotment updated successfully!" : "Yarn Inward recorded successfully!");
        setShowModal(false);
        fetchAllotments();
      } else {
        showToast(data.error || "Failed to save yarn allotment.");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error saving record");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter allotments by Active Section
  const filtered = allotments.filter((a) => {
    if (activeSection === "DHOTHI") {
      const hasDhothi = a.dhothiWarpKg > 0 || a.dhothiWeftKg > 0 || a.dhothiBorderKg > 0;
      if (!hasDhothi) return false;
    } else if (activeSection === "SAREE") {
      const hasSaree = a.sareeWarpKg > 0 || a.sareeWeftKg > 0 || a.sareeBorderKg > 0;
      if (!hasSaree) return false;
    }

    if (startDate && new Date(a.allotmentDate) < new Date(startDate)) return false;
    if (endDate && new Date(a.allotmentDate) > new Date(endDate)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.allotmentNo?.toLowerCase().includes(q) ||
        a.schemeName?.toLowerCase().includes(q) ||
        a.notes?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const rows = filtered.map((a) => ({
      "Allotment No": a.allotmentNo,
      Date: new Date(a.allotmentDate).toLocaleDateString("en-IN"),
      "Dhothi Warp (KG)": a.dhothiWarpKg,
      "Dhothi Weft (KG)": a.dhothiWeftKg,
      "Dhothi Border (KG)": a.dhothiBorderKg,
      "Dhothi Total (KG)": a.derived?.dhothi?.totalKg,
      "Dhothi Pieces (Warp)": a.derived?.dhothi?.piecesFromWarp,
      "Saree Warp (KG)": a.sareeWarpKg,
      "Saree Weft (KG)": a.sareeWeftKg,
      "Saree Border (KG)": a.sareeBorderKg,
      "Saree Total (KG)": a.derived?.saree?.totalKg,
      "Saree Pieces (Warp)": a.derived?.saree?.piecesFromWarp,
      "Bag / Yarn Price": a.bagPrice || a.yarnRatePerKg,
      "Dhothi Govt Rate": a.dhothiGovtRate,
      "Saree Govt Rate": a.sareeGovtRate,
      "Dhothi Weaver Wage": a.dhothiWeaverRate,
      "Saree Weaver Wage": a.sareeWeaverRate,
      Notes: a.notes || "",
    }));
    exportToCSV(`Govt_Yarn_Allotments_${activeSection}`, rows);
  };

  const countDhothiAllotments = allotments.filter(
    (a) => a.dhothiWarpKg > 0 || a.dhothiWeftKg > 0 || a.dhothiBorderKg > 0
  ).length;

  const countSareeAllotments = allotments.filter(
    (a) => a.sareeWarpKg > 0 || a.sareeWeftKg > 0 || a.sareeBorderKg > 0
  ).length;

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slide-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Package className="h-4 w-4" />
            <span>Co-optex / Tamil Nadu Govt Free Dhothi & Saree Scheme</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Govt Yarn Inward & Allocation</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
              அரசு நூல் வரவு
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Record government-supplied yarn (Warp, Weft, Border KG). Separate sections for Dhothi and Saree with automated piece quotas and wage tallies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportCSV}
            className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={fetchAllotments}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition cursor-pointer"
            title="Refresh Records"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {/* Section-Specific Action Buttons */}
          {activeSection === "DHOTHI" ? (
            <button
              type="button"
              onClick={() => handleOpenNew("DHOTHI")}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Record Dhothi Yarn Inward</span>
            </button>
          ) : activeSection === "SAREE" ? (
            <button
              type="button"
              onClick={() => handleOpenNew("SAREE")}
              className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Record Saree Yarn Inward</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenNew("DHOTHI")}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Dhothi Yarn</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenNew("SAREE")}
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Saree Yarn</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
       * SECTION TABS: ALL | DHOTHI SECTION | SAREE SECTION
       * ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl w-fit">
          {/* All Sections Tab */}
          <button
            type="button"
            onClick={() => setActiveSection("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeSection === "ALL"
                ? "bg-white text-slate-900 border-slate-200/90 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-transparent"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>All Allotments</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeSection === "ALL" ? "bg-indigo-50 text-indigo-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {allotments.length}
            </span>
          </button>

          {/* Dhothi Section Tab */}
          <button
            type="button"
            onClick={() => setActiveSection("DHOTHI")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeSection === "DHOTHI"
                ? "bg-white text-emerald-950 border-emerald-200/90 shadow-xs ring-1 ring-emerald-500/20"
                : "text-slate-600 hover:text-emerald-800 hover:bg-white/60 border-transparent"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Dhothi (வேட்டி) Section</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeSection === "DHOTHI"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {countDhothiAllotments} Entries • {summary?.dhothi?.piecesFromWarp || 0} Pcs
            </span>
          </button>

          {/* Saree Section Tab */}
          <button
            type="button"
            onClick={() => setActiveSection("SAREE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeSection === "SAREE"
                ? "bg-white text-purple-950 border-purple-200/90 shadow-xs ring-1 ring-purple-500/20"
                : "text-slate-600 hover:text-purple-800 hover:bg-white/60 border-transparent"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <span>Saree (சேலை) Section</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeSection === "SAREE"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-purple-50 text-purple-700"
              }`}
            >
              {countSareeAllotments} Entries • {summary?.saree?.piecesFromWarp || 0} Pcs
            </span>
          </button>
        </div>

        {/* Quick Jump to Handover Page */}
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("govt-handover")}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>View Handover Stocks & Tally</span>
            <span>&rarr;</span>
          </button>
        )}
      </div>

      {/* =========================================================================
       * CONVERSION FORMULA BANNER (ADAPTS TO ACTIVE SECTION)
       * ========================================================================= */}
      {(activeSection === "ALL" || activeSection === "DHOTHI") && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>DHOTHI (வேட்டி) GOVT THREAD CONSUMPTION & WAGE FORMULAS:</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 font-mono">
              Weaving Wage: ₹19 / Piece
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 text-xs text-slate-700">
            <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center font-mono">
              <span className="block text-[10px] text-slate-400 font-sans font-bold">WARP CONSUMPTION</span>
              <span className="font-black text-emerald-900 text-sm">KG / 0.122</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">0.122 kg per dhothi</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center font-mono">
              <span className="block text-[10px] text-slate-400 font-sans font-bold">WEFT CONSUMPTION</span>
              <span className="font-black text-emerald-900 text-sm">KG / 0.119</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">0.119 kg per dhothi</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center font-mono">
              <span className="block text-[10px] text-slate-400 font-sans font-bold">BORDER CONSUMPTION</span>
              <span className="font-black text-emerald-900 text-sm">KG / 0.006</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">0.006 kg per dhothi</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center font-mono">
              <span className="block text-[10px] text-slate-400 font-sans font-bold">TOTAL THREAD</span>
              <span className="font-black text-emerald-900 text-sm">0.247 KG / pc</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Warp + Weft + Border</span>
            </div>
          </div>
        </div>
      )}

      {(activeSection === "ALL" || activeSection === "SAREE") && (
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-purple-950 font-black text-xs uppercase tracking-wider">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              <span>SAREE (சேலை) GOVT THREAD CONSUMPTION & WAGE FORMULAS:</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-purple-200/80 text-purple-900 font-mono">
              Weaving Wage: ₹42 / Piece
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 text-xs text-slate-700">
            <div className="p-2.5 rounded-xl bg-white border border-purple-100 text-center font-mono">
              <span className="block text-[10px] text-slate-400 font-sans font-bold">WARP CONSUMPTION</span>
              <span className="font-black text-purple-900 text-sm">KG / 0.188</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">0.188 kg per saree</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-purple-100 text-center font-mono">
              <span className="block text-[10px] text-slate-400 font-sans font-bold">WEFT CONSUMPTION</span>
              <span className="font-black text-purple-900 text-sm">KG / 0.182</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">0.182 kg per saree</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-purple-100 text-center font-mono">
              <span className="block text-[10px] text-slate-400 font-sans font-bold">BORDER CONSUMPTION</span>
              <span className="font-black text-purple-900 text-sm">KG / 0.024</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">0.024 kg per saree</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-purple-100 text-center font-mono">
              <span className="block text-[10px] text-slate-400 font-sans font-bold">TOTAL THREAD</span>
              <span className="font-black text-purple-900 text-sm">0.394 KG / pc</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Warp + Weft + Border</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * METRIC CARDS (SECTION SPECIFIC)
       * ========================================================================= */}
      {activeSection === "DHOTHI" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Dhothi Metric 1: Target Pieces */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Dhothi Target Quota</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {summary?.dhothi?.piecesFromWarp?.toLocaleString() || 0}
              </span>
              <span className="text-xs font-bold text-emerald-700">Pieces</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Derived from {summary?.dhothi?.totalWarpKg || 0} KG Warp (/ 0.122)
            </p>
          </div>

          {/* Dhothi Metric 2: Warp KG */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Dhothi Warp Supplied</span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Scale className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {summary?.dhothi?.totalWarpKg?.toLocaleString() || 0}
              </span>
              <span className="text-xs font-bold text-slate-600">KG</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Yield: ~{summary?.dhothi?.piecesFromWarp || 0} Dhothis
            </p>
          </div>

          {/* Dhothi Metric 3: Weft & Border KG */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Dhothi Weft & Border</span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Scale className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {((summary?.dhothi?.totalWeftKg || 0) + (summary?.dhothi?.totalBorderKg || 0)).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-600">KG</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Weft: {summary?.dhothi?.totalWeftKg || 0}kg | Border: {summary?.dhothi?.totalBorderKg || 0}kg
            </p>
          </div>

          {/* Dhothi Metric 4: Weaving Wage Budget */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <span>Weaving Wages Budget</span>
              <div className="p-2 rounded-xl bg-emerald-200/60 text-emerald-800">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 text-2xl sm:text-3xl font-black text-emerald-900 font-mono tracking-tight">
              <span>₹</span>
              <span>{((summary?.dhothi?.piecesFromWarp || 0) * 19).toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              {summary?.dhothi?.piecesFromWarp || 0} pcs × ₹19 / Dhothi
            </p>
          </div>
        </div>
      ) : activeSection === "SAREE" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Saree Metric 1: Target Pieces */}
          <div className="p-5 rounded-2xl bg-white border border-purple-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Saree Target Quota</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {summary?.saree?.piecesFromWarp?.toLocaleString() || 0}
              </span>
              <span className="text-xs font-bold text-purple-700">Pieces</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Derived from {summary?.saree?.totalWarpKg || 0} KG Warp (/ 0.188)
            </p>
          </div>

          {/* Saree Metric 2: Warp KG */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Saree Warp Supplied</span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Scale className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {summary?.saree?.totalWarpKg?.toLocaleString() || 0}
              </span>
              <span className="text-xs font-bold text-slate-600">KG</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Yield: ~{summary?.saree?.piecesFromWarp || 0} Sarees
            </p>
          </div>

          {/* Saree Metric 3: Weft & Border KG */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Saree Weft & Border</span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Scale className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {((summary?.saree?.totalWeftKg || 0) + (summary?.saree?.totalBorderKg || 0)).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-600">KG</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Weft: {summary?.saree?.totalWeftKg || 0}kg | Border: {summary?.saree?.totalBorderKg || 0}kg
            </p>
          </div>

          {/* Saree Metric 4: Weaving Wage Budget */}
          <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-purple-800 uppercase tracking-wider">
              <span>Weaving Wages Budget</span>
              <div className="p-2 rounded-xl bg-purple-200/60 text-purple-800">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 text-2xl sm:text-3xl font-black text-purple-900 font-mono tracking-tight">
              <span>₹</span>
              <span>{((summary?.saree?.piecesFromWarp || 0) * 42).toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-purple-700">
              {summary?.saree?.piecesFromWarp || 0} pcs × ₹42 / Saree
            </p>
          </div>
        </div>
      ) : (
        /* Consolidated View for All Sections */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Dhothi Quota</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {summary?.dhothi?.piecesFromWarp?.toLocaleString() || 0}
              </span>
              <span className="text-xs font-bold text-emerald-700">Pieces</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {summary?.dhothi?.totalWarpKg || 0} KG Warp (/ 0.122)
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-purple-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Saree Quota</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {summary?.saree?.piecesFromWarp?.toLocaleString() || 0}
              </span>
              <span className="text-xs font-bold text-purple-700">Pieces</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {summary?.saree?.totalWarpKg || 0} KG Warp (/ 0.188)
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Total Yarn Inward</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Scale className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {((summary?.dhothi?.totalYarnKg || 0) + (summary?.saree?.totalYarnKg || 0)).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-700">KG</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Dhothi: {summary?.dhothi?.totalYarnKg || 0}kg | Saree: {summary?.saree?.totalYarnKg || 0}kg
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Weaving Wages Budget</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              <span>₹</span>
              <span>
                {(
                  (summary?.dhothi?.piecesFromWarp || 0) * 19 +
                  (summary?.saree?.piecesFromWarp || 0) * 42
                ).toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ₹19 / Dhothi + ₹42 / Saree
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeSection === "ALL" ? "all" : activeSection.toLowerCase()} allotments...`}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none"
            />
            <span className="text-slate-300">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
       * ALLOTMENTS HISTORY TABLE (ADAPTIVE TO ACTIVE SECTION)
       * ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>
                {activeSection === "DHOTHI"
                  ? "Dhothi (வேட்டி) Yarn Inward Ledger"
                  : activeSection === "SAREE"
                  ? "Saree (சேலை) Yarn Inward Ledger"
                  : "Consolidated Government Yarn Inward Ledger"}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                {filtered.length} Records
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {activeSection === "DHOTHI"
                ? "Thread allocation and piece conversions for Dhothi scheme"
                : activeSection === "SAREE"
                ? "Thread allocation and piece conversions for Saree scheme"
                : "Combined Dhothi & Saree yarn receipts from Tamil Nadu Government"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Allotment No & Date</th>
                {activeSection !== "SAREE" && (
                  <>
                    <th className="py-3 px-4">Dhothi Yarn (KG)</th>
                    <th className="py-3 px-4">Dhothi Pcs</th>
                  </>
                )}
                {activeSection !== "DHOTHI" && (
                  <>
                    <th className="py-3 px-4">Saree Yarn (KG)</th>
                    <th className="py-3 px-4">Saree Pcs</th>
                  </>
                )}
                <th className="py-3 px-4">Govt Piece Rate</th>
                <th className="py-3 px-4">Weaver Wage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={activeSection === "ALL" ? 8 : 6} className="py-12 text-center text-slate-400">
                    No {activeSection !== "ALL" ? activeSection.toLowerCase() : ""} yarn allotment records found.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{a.allotmentNo}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(a.allotmentDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Dhothi Columns */}
                    {activeSection !== "SAREE" && (
                      <>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {a.dhothiWarpKg > 0 || a.dhothiWeftKg > 0 ? (
                            <>
                              <div>Warp: <span className="font-bold text-slate-900">{a.dhothiWarpKg} kg</span></div>
                              <div className="text-slate-400">Weft: {a.dhothiWeftKg}kg | Bdr: {a.dhothiBorderKg}kg</div>
                            </>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {a.derived?.dhothi?.piecesFromWarp > 0 ? (
                            <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-mono text-xs">
                              {a.derived.dhothi.piecesFromWarp} pcs
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Saree Columns */}
                    {activeSection !== "DHOTHI" && (
                      <>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {a.sareeWarpKg > 0 || a.sareeWeftKg > 0 ? (
                            <>
                              <div>Warp: <span className="font-bold text-slate-900">{a.sareeWarpKg} kg</span></div>
                              <div className="text-slate-400">Weft: {a.sareeWeftKg}kg | Bdr: {a.sareeBorderKg}kg</div>
                            </>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {a.derived?.saree?.piecesFromWarp > 0 ? (
                            <span className="font-black text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg font-mono text-xs">
                              {a.derived.saree.piecesFromWarp} pcs
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Govt Piece Rate */}
                    <td className="py-3.5 px-4 text-[11px] font-mono">
                      {activeSection === "DHOTHI" ? (
                        <div className="font-bold text-slate-900">₹{a.dhothiGovtRate || 0}</div>
                      ) : activeSection === "SAREE" ? (
                        <div className="font-bold text-slate-900">₹{a.sareeGovtRate || 0}</div>
                      ) : (
                        <>
                          <div>Dhothi: <span className="font-bold text-slate-800">₹{a.dhothiGovtRate || 0}</span></div>
                          <div>Saree: <span className="font-bold text-slate-800">₹{a.sareeGovtRate || 0}</span></div>
                        </>
                      )}
                    </td>

                    {/* Weaver Wage */}
                    <td className="py-3.5 px-4 text-[11px] font-mono text-emerald-800">
                      {activeSection === "DHOTHI" ? (
                        <div className="font-bold">₹{a.dhothiWeaverRate || 19} / pc</div>
                      ) : activeSection === "SAREE" ? (
                        <div className="font-bold">₹{a.sareeWeaverRate || 42} / pc</div>
                      ) : (
                        <>
                          <div>Dhothi: <span className="font-bold">₹{a.dhothiWeaverRate || 19}</span></div>
                          <div>Saree: <span className="font-bold">₹{a.sareeWeaverRate || 42}</span></div>
                        </>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(a)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id, a.allotmentNo)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Allotment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
       * MODAL: NEW / EDIT YARN ALLOTMENT (WITH SECTION SELECTOR)
       * ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    modalSection === "DHOTHI"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : modalSection === "SAREE"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-indigo-500/20 text-indigo-400"
                  }`}
                >
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {editingId
                      ? "Edit Yarn Inward Allotment"
                      : modalSection === "DHOTHI"
                      ? "Record Dhothi (வேட்டி) Yarn Inward"
                      : modalSection === "SAREE"
                      ? "Record Saree (சேலை) Yarn Inward"
                      : "Record Government Yarn Inward Entry"}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Official Govt Thread Supply & Pieces Formulations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Section Switcher */}
            <div className="px-6 pt-4 pb-0 flex items-center gap-2 border-b border-slate-100 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setModalSection("DHOTHI")}
                className={`py-2 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer border-t border-l border-r ${
                  modalSection === "DHOTHI"
                    ? "bg-white text-emerald-900 border-slate-200 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-800 border-transparent"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Dhothi Section (வேட்டி)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalSection("SAREE")}
                className={`py-2 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer border-t border-l border-r ${
                  modalSection === "SAREE"
                    ? "bg-white text-purple-900 border-slate-200 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-800 border-transparent"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <span>Saree Section (சேலை)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalSection("BOTH")}
                className={`py-2 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer border-t border-l border-r ${
                  modalSection === "BOTH"
                    ? "bg-white text-indigo-900 border-slate-200 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-800 border-transparent"
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>Both Together</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Allotment / Challan No *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.allotmentNo}
                    onChange={(e) => setForm({ ...form, allotmentNo: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Inward Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.allotmentDate}
                    onChange={(e) => setForm({ ...form, allotmentDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* DHOTHI SECTION INPUTS */}
              {(modalSection === "DHOTHI" || modalSection === "BOTH") && (
                <div className="p-4.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>DHOTHI (வேட்டி) THREAD SUPPLIED (KG):</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md font-mono">
                      Dhothi Quota: {liveDhothiWarpPcs} Pieces
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Warp KG (/ 0.122)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={form.dhothiWarpKg}
                        onChange={(e) => setForm({ ...form, dhothiWarpKg: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
                      />
                      <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                        = {liveDhothiWarpPcs} pcs
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Weft KG (/ 0.119)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={form.dhothiWeftKg}
                        onChange={(e) => setForm({ ...form, dhothiWeftKg: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        = {liveDhothiWeftPcs} pcs
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Border KG (/ 0.006)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={form.dhothiBorderKg}
                        onChange={(e) => setForm({ ...form, dhothiBorderKg: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        = {liveDhothiBorderPcs} pcs
                      </span>
                    </div>
                  </div>

                  {/* Dhothi Specific Pricing & Wage */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Co-optex Dhothi Piece Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 85"
                        value={form.dhothiGovtRate}
                        onChange={(e) => setForm({ ...form, dhothiGovtRate: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Dhothi Weaver Wage (₹/pc)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={form.dhothiWeaverRate}
                        onChange={(e) => setForm({ ...form, dhothiWeaverRate: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-emerald-800 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">Govt standard: ₹19 / pc</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SAREE SECTION INPUTS */}
              {(modalSection === "SAREE" || modalSection === "BOTH") && (
                <div className="p-4.5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-purple-950 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span>SAREE (சேலை) THREAD SUPPLIED (KG):</span>
                    </span>
                    <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md font-mono">
                      Saree Quota: {liveSareeWarpPcs} Pieces
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Warp KG (/ 0.188)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={form.sareeWarpKg}
                        onChange={(e) => setForm({ ...form, sareeWarpKg: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-purple-500 font-bold"
                      />
                      <span className="text-[10px] text-purple-700 font-bold mt-1 block">
                        = {liveSareeWarpPcs} pcs
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Weft KG (/ 0.182)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={form.sareeWeftKg}
                        onChange={(e) => setForm({ ...form, sareeWeftKg: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-purple-500 font-bold"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        = {liveSareeWeftPcs} pcs
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Border KG (/ 0.024)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={form.sareeBorderKg}
                        onChange={(e) => setForm({ ...form, sareeBorderKg: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-purple-500 font-bold"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        = {liveSareeBorderPcs} pcs
                      </span>
                    </div>
                  </div>

                  {/* Saree Specific Pricing & Wage */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-200/60">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Co-optex Saree Piece Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 180"
                        value={form.sareeGovtRate}
                        onChange={(e) => setForm({ ...form, sareeGovtRate: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Saree Weaver Wage (₹/pc)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={form.sareeWeaverRate}
                        onChange={(e) => setForm({ ...form, sareeWeaverRate: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-purple-800 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">Govt standard: ₹42 / pc</span>
                    </div>
                  </div>
                </div>
              )}

              {/* General Bag Price & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Bag Price / Rate per Bag (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={form.bagPrice}
                    onChange={(e) => setForm({ ...form, bagPrice: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Order ref, supplier remarks..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer ${
                    modalSection === "DHOTHI"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : modalSection === "SAREE"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                    ? "Update Allotment"
                    : modalSection === "DHOTHI"
                    ? "Save Dhothi Yarn Inward"
                    : modalSection === "SAREE"
                    ? "Save Saree Yarn Inward"
                    : "Save Allotment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovtYarnAllotmentView;
