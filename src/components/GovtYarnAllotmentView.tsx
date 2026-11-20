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
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  Tag,
  Info,
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

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
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

  const handleOpenNew = () => {
    setEditingId(null);
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

  const filtered = allotments.filter((a) => {
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
    exportToCSV("Govt_Yarn_Allotments_Register", rows);
  };

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
            Record government-supplied yarn (Warp, Weft, Border KG) for Dhothi & Saree schemes. Automatically derives expected piece quotas and tallies weaving charges.
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
          <button
            type="button"
            onClick={handleOpenNew}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Yarn Inward Entry</span>
          </button>
        </div>
      </div>

      {/* Govt Standard Conversion Formula Reference Banner */}
      <div className="p-5 rounded-2xl bg-linear-to-r from-indigo-50/80 via-blue-50/40 to-slate-50 border border-indigo-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-indigo-900 font-black text-xs uppercase tracking-wider mb-3">
          <Info className="h-4 w-4 text-indigo-600" />
          <span>Official Tamil Nadu Govt Standard Thread Consumption & Wage Rates:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dhothi Rule */}
          <div className="p-3.5 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-slate-900">DHOTHI (வேட்டி) FORMULAS:</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                Weaving Wage: ₹19 / Piece
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 font-mono mt-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                <span className="block text-slate-400 text-[10px]">WARP</span>
                <span className="font-bold text-slate-800">KG / 0.122</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                <span className="block text-slate-400 text-[10px]">WEFT</span>
                <span className="font-bold text-slate-800">KG / 0.119</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                <span className="block text-slate-400 text-[10px]">BORDER</span>
                <span className="font-bold text-slate-800">KG / 0.006</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 block italic">Total standard thread: 0.247 KG / Dhothi</span>
          </div>

          {/* Saree Rule */}
          <div className="p-3.5 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-slate-900">SAREE (சேலை) FORMULAS:</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                Weaving Wage: ₹42 / Piece
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 font-mono mt-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                <span className="block text-slate-400 text-[10px]">WARP</span>
                <span className="font-bold text-slate-800">KG / 0.188</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                <span className="block text-slate-400 text-[10px]">WEFT</span>
                <span className="font-bold text-slate-800">KG / 0.182</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                <span className="block text-slate-400 text-[10px]">BORDER</span>
                <span className="font-bold text-slate-800">KG / 0.024</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 block italic">Total standard thread: 0.394 KG / Saree</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Dhothi Target Pieces */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Dhothi Target Quota
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary?.dhothi?.piecesFromWarp?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-bold text-blue-700">Pieces</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Derived from {summary?.dhothi?.totalWarpKg || 0} KG Warp (/ 0.122)
          </p>
        </div>

        {/* Card 2: Saree Target Pieces */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saree Target Quota
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary?.saree?.piecesFromWarp?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-bold text-purple-700">Pieces</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Derived from {summary?.saree?.totalWarpKg || 0} KG Warp (/ 0.188)
          </p>
        </div>

        {/* Card 3: Total Yarn Inward (KG) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Yarn Inward (Govt)
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {((summary?.dhothi?.totalYarnKg || 0) + (summary?.saree?.totalYarnKg || 0)).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-700">KG</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Dhothi: {summary?.dhothi?.totalYarnKg || 0}kg | Saree: {summary?.saree?.totalYarnKg || 0}kg
          </p>
        </div>

        {/* Card 4: Expected Weaving Wages */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Weaving Wages Budget
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
              ₹
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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Allotment No, Scheme..."
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

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Yarn Inward Allotment Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filtered.length} government allotment records
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Allotment No & Date</th>
                <th className="py-3 px-4">Dhothi Yarn (KG)</th>
                <th className="py-3 px-4">Dhothi Pcs</th>
                <th className="py-3 px-4">Saree Yarn (KG)</th>
                <th className="py-3 px-4">Saree Pcs</th>
                <th className="py-3 px-4">Govt Piece Rate</th>
                <th className="py-3 px-4">Weaver Rate</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No yarn allotment records found. Click "+ New Yarn Inward Entry" above to add one.
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
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div>Warp: <span className="font-bold text-slate-900">{a.dhothiWarpKg} kg</span></div>
                      <div className="text-slate-400">Weft: {a.dhothiWeftKg} kg | Bdr: {a.dhothiBorderKg} kg</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-mono text-xs">
                        {a.derived?.dhothi?.piecesFromWarp || 0} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div>Warp: <span className="font-bold text-slate-900">{a.sareeWarpKg} kg</span></div>
                      <div className="text-slate-400">Weft: {a.sareeWeftKg} kg | Bdr: {a.sareeBorderKg} kg</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-mono text-xs">
                        {a.derived?.saree?.piecesFromWarp || 0} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] font-mono">
                      <div>Dhothi: <span className="font-bold text-slate-800">₹{a.dhothiGovtRate || 0}</span></div>
                      <div>Saree: <span className="font-bold text-slate-800">₹{a.sareeGovtRate || 0}</span></div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] font-mono text-emerald-800">
                      <div>Dhothi: <span className="font-bold">₹{a.dhothiWeaverRate || 19}</span></div>
                      <div>Saree: <span className="font-bold">₹{a.sareeWeaverRate || 42}</span></div>
                    </td>
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

      {/* Modal: New / Edit Allotment */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {editingId ? "Edit Yarn Inward Allotment" : "New Government Yarn Inward Entry"}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Allotment & Co-optex Piece Quota Formulation
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

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
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

              {/* Section 1: Dhothi Thread (KG) */}
              <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-blue-950 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>DHOTHI (வேட்டி) THREAD SUPPLIED (KG):</span>
                  </span>
                  <span className="text-[11px] font-bold text-blue-800 font-mono">
                    Quota: {liveDhothiWarpPcs} Dhothis
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-[10px] text-blue-600 font-bold mt-1 block">
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-blue-500"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      = {liveDhothiBorderPcs} pcs
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Saree Thread (KG) */}
              <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-purple-950 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-purple-600" />
                    <span>SAREE (சேலை) THREAD SUPPLIED (KG):</span>
                  </span>
                  <span className="text-[11px] font-bold text-purple-800 font-mono">
                    Quota: {liveSareeWarpPcs} Sarees
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-[10px] text-purple-600 font-bold mt-1 block">
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-purple-500"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      = {liveSareeBorderPcs} pcs
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Pricing & Wages */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-black text-xs text-slate-900 block">
                  PRICING & WEAVING CHARGES:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Bag Price / Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.0"
                      value={form.bagPrice}
                      onChange={(e) => setForm({ ...form, bagPrice: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Govt Saree Rate (₹)
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
                      Dhothi Weaver Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.dhothiWeaverRate}
                      onChange={(e) => setForm({ ...form, dhothiWeaverRate: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono text-emerald-800 font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Govt standard: ₹19</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Saree Weaver Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.sareeWeaverRate}
                      onChange={(e) => setForm({ ...form, sareeWeaverRate: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono text-emerald-800 font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Govt standard: ₹42</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Notes / Batch Details
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Enter any order references, supplier remarks, or challan details..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                />
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
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving Allotment..." : editingId ? "Update Allotment" : "Save Yarn Inward"}
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
