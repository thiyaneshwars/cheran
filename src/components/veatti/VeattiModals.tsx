"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Factory,
  PackageCheck,
  TrendingUp,
  CreditCard,
  Scale,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Printer,
  DollarSign,
} from "lucide-react";
import {
  calculateVaravuAmount,
  calculateNetProduction,
  calculatePaavuMetersFromKg,
  calculatePaavuKgFromMeters,
} from "@/lib/veatti-calculations";
import { formatINR, round2 } from "@/lib/decimal";

const TRADITIONAL_DEFAULT_WAGE_RATE = 19.0;

/* =========================================================================
 * MODAL 1: DIRECT ENTRY / EDIT VEATTI UNIT (Image 3 Style)
 * ========================================================================= */
interface DirectEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  clothType?: "VEATTI" | "SAREE";
}

export const DirectEntryModal: React.FC<DirectEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  clothType = "VEATTI",
}) => {
  const isEditing = Boolean(initialData?.id);
  const activeClothType = initialData?.clothType || clothType;

  const defaultWeft = activeClothType === "SAREE" ? 0.182 : 0.119;

  const [form, setForm] = useState({
    weaverName: "",
    location: "",
    entryDate: new Date().toISOString().split("T")[0],
    machineCount: 1,
    paavuCount: 0,
    paavuMeters: 0,
    paavuWeightKg: 0,
    individualRate: activeClothType === "SAREE" ? 45 : TRADITIONAL_DEFAULT_WAGE_RATE,
    rateUnit: "PER_METER" as "PER_KG" | "PER_METER",
    conversionRatio: 12.0,
    weftMultiplier: defaultWeft,
    initialWeftKg: 0,
    initialAdvance: 0,
    babinCount: 0,
    targetMeters: 0,
    targetDate: "",
    notes: "",
    autoCreatePaavus: false,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fallbackWeft = activeClothType === "SAREE" ? 0.182 : 0.119;
    const defaultRate = activeClothType === "SAREE" ? 45 : TRADITIONAL_DEFAULT_WAGE_RATE;
    if (initialData) {
      setForm({
        weaverName: initialData.weaverName || "",
        location: initialData.location || "",
        entryDate: initialData.entryDate
          ? new Date(initialData.entryDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        machineCount: initialData.machineCount || 1,
        paavuCount: initialData.paavuCount ?? 0,
        paavuMeters: initialData.paavuMeters ?? 0,
        paavuWeightKg: initialData.paavuWeightKg || 0,
        individualRate: initialData.individualRate ?? defaultRate,
        rateUnit: initialData.rateUnit || "PER_METER",
        conversionRatio: initialData.conversionRatio || 12.0,
        weftMultiplier: initialData.weftMultiplier ?? fallbackWeft,
        initialWeftKg: initialData.initialWeftKg ?? 0,
        initialAdvance: initialData.initialAdvance || 0,
        babinCount: initialData.babinCount || 0,
        targetMeters: initialData.targetMeters ?? 0,
        targetDate: initialData.targetDate
          ? new Date(initialData.targetDate).toISOString().split("T")[0]
          : "",
        notes: initialData.notes || "",
        autoCreatePaavus: false,
      });
    } else {
      setForm({
        weaverName: "",
        location: "",
        entryDate: new Date().toISOString().split("T")[0],
        machineCount: 1,
        paavuCount: 0,
        paavuMeters: 0,
        paavuWeightKg: 0,
        individualRate: defaultRate,
        rateUnit: "PER_METER",
        conversionRatio: 12.0,
        weftMultiplier: fallbackWeft,
        initialWeftKg: 0,
        initialAdvance: 0,
        babinCount: 0,
        targetMeters: 0,
        targetDate: "",
        notes: "",
        autoCreatePaavus: false,
      });
    }
  }, [initialData, isOpen, activeClothType]);

  if (!isOpen) return null;

  // Live Calculations Preview
  const previewVaravu =
    form.rateUnit === "PER_METER"
      ? calculateVaravuAmount(form.paavuMeters, form.individualRate)
      : calculateVaravuAmount(form.paavuWeightKg || round2(Number(form.paavuMeters) / 12), form.individualRate);
  const previewOutstanding = round2(previewVaravu - Number(form.initialAdvance || 0));

  const handlePaavuCountChange = (countVal: number) => {
    const count = Number(countVal);
    const computedMeters = count * 1200;
    setForm({
      ...form,
      paavuCount: count,
      paavuMeters: computedMeters,
      targetMeters: Math.round(computedMeters * 0.96),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEditing ? `/api/production/units/${initialData.id}` : "/api/production/units";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clothType: activeClothType,
          weaverName: form.weaverName,
          location: form.location,
          entryDate: form.entryDate,
          machineCount: Number(form.machineCount),
          paavuCount: Number(form.paavuCount),
          paavuMeters: Number(form.paavuMeters),
          paavuWeightKg: Number(form.paavuWeightKg),
          individualRate: Number(form.individualRate),
          rateUnit: form.rateUnit,
          conversionRatio: Number(form.conversionRatio),
          weftMultiplier: Number(form.weftMultiplier || (activeClothType === "SAREE" ? 0.182 : 0.119)),
          initialWeftKg: Number(form.initialWeftKg || 0),
          initialAdvance: Number(form.initialAdvance),
          babinCount: Number(form.babinCount),
          targetMeters: Number(form.targetMeters),
          targetDate: form.targetDate || null,
          notes: form.notes,
          autoCreatePaavus: isEditing ? false : form.autoCreatePaavus,
          paavuPrefix: activeClothType === "SAREE" ? "PV-S" : "PV-V",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save unit");

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Factory
                className={`h-5 w-5 ${
                  activeClothType === "SAREE" ? "text-purple-600" : "text-emerald-600"
                }`}
              />
              <span>
                {isEditing
                  ? `Edit ${activeClothType === "SAREE" ? "Saree" : "Dhothi"} Contract & Info`
                  : `Direct Entry: Individual ${
                      activeClothType === "SAREE" ? "Saree" : "Dhothi"
                    } Contract`}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter individual parameters, Paavu allocation, rates, and initial advance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Weaver Name & Entry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">
                Powerloom / Weaver Name *
              </label>
              <input
                type="text"
                required
                value={form.weaverName}
                onChange={(e) => setForm({ ...form, weaverName: e.target.value })}
                placeholder="e.g. K. R. Sengottaiyan Powerlooms"
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Entry Date *</label>
              <input
                type="date"
                required
                value={form.entryDate}
                onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {/* Row 2: Location & Machine Looms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Shed Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Komarapalayam Loom Unit #3"
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-medium outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Number of Machines / Looms *
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.machineCount}
                onChange={(e) => setForm({ ...form, machineCount: Number(e.target.value) })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {/* Row 3: Paavu Allocation Parameters */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4 text-emerald-600" />
                <span>Paavu Allocation Parameters</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Number of Paavu Given *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.paavuCount}
                  onChange={(e) => handlePaavuCountChange(Number(e.target.value))}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Total Paavu Pieces Given *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.paavuMeters}
                  onChange={(e) => setForm({ ...form, paavuMeters: Number(e.target.value) })}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Individual Veatti Rate & Pricing Unit */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              <span>Individual Rate Configuration & Initial Advance</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Individual Rate (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.5"
                  value={form.individualRate}
                  onChange={(e) => setForm({ ...form, individualRate: Number(e.target.value) })}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-black text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rate Unit</label>
                <select
                  value={form.rateUnit}
                  onChange={(e) => setForm({ ...form, rateUnit: e.target.value as any })}
                  className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-bold outline-none"
                >
                  <option value="PER_METER">₹ per Piece</option>
                  <option value="PER_KG">₹ per KG (Paavu Weight)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 4.5: Weft Yarn Stock & Multiplier Configuration */}
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="font-extrabold text-sky-950 flex items-center gap-1.5 text-xs">
                <Scale className="h-4 w-4 text-sky-700" />
                <span>Weft Yarn Stock &amp; Multiplier Configuration *</span>
              </span>
              <span className="text-[11px] text-sky-700 font-semibold">
                Auto-calculates remaining weft balance based on opening stock
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Left: Weft KG Left (Opening Stock) */}
              <div className="bg-white p-3 rounded-xl border border-sky-200/90 shadow-2xs space-y-1.5">
                <label className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sky-950 font-black">
                    <Layers className="h-3.5 w-3.5 text-sky-600" />
                    <span>Weft KG Left (Opening Stock) *</span>
                  </span>
                  <span className="text-[10px] text-sky-700 font-bold bg-sky-100/70 px-2 py-0.5 rounded-md">
                    Base for Tallying
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    required
                    value={form.initialWeftKg}
                    onChange={(e) => setForm({ ...form, initialWeftKg: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 8784"
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2 text-slate-900 font-mono font-black text-xs outline-none focus:border-sky-500 focus:bg-white pr-14"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400 font-sans pointer-events-none">
                    KG
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Initial weft yarn in the loom shed. Future production deducts from this value to tally remaining weft.
                </p>
              </div>

              {/* Right: Weft Multiplier (kg/m) */}
              <div className="bg-white p-3 rounded-xl border border-sky-200/90 shadow-2xs space-y-2">
                <label className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span className="text-sky-950 font-black">Weft Multiplier (KG/pc) *</span>
                  <span className="text-[10px] text-sky-700 font-mono font-bold bg-sky-100/70 px-2 py-0.5 rounded-md">
                    {form.weftMultiplier} kg/pc
                  </span>
                </label>

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                  {activeClothType === "SAREE" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, weftMultiplier: 0.182 })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          Number(form.weftMultiplier) === 0.182
                            ? "bg-purple-700 text-white border-purple-800 shadow-2xs ring-2 ring-purple-300"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-purple-50"
                        }`}
                      >
                        0.182 (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, weftMultiplier: 0.175 })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          Number(form.weftMultiplier) === 0.175
                            ? "bg-purple-700 text-white border-purple-800 shadow-2xs ring-2 ring-purple-300"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-purple-50"
                        }`}
                      >
                        0.175 (Alternate)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, weftMultiplier: 0.119 })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          Number(form.weftMultiplier) === 0.119
                            ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs ring-2 ring-emerald-300"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50"
                        }`}
                      >
                        0.119 (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, weftMultiplier: 0.110 })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          Number(form.weftMultiplier) === 0.110
                            ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs ring-2 ring-emerald-300"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50"
                        }`}
                      >
                        0.110 (Alternate)
                      </button>
                    </>
                  )}
                </div>

                {/* Exact Value Input */}
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={form.weftMultiplier}
                    onChange={(e) => setForm({ ...form, weftMultiplier: Number(e.target.value) })}
                    placeholder="e.g. 0.119"
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2 text-slate-900 font-mono font-black text-xs outline-none focus:border-sky-500 focus:bg-white pr-14"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400 font-sans pointer-events-none">
                    kg / m
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 font-medium">
              <span>
                💡 1,000 m production consumes{" "}
                <span className="font-black text-sky-900 font-mono">
                  {(1000 * (Number(form.weftMultiplier) || 0)).toFixed(3)} KG
                </span>{" "}
                weft yarn.
              </span>
              {Number(form.initialWeftKg) > 0 && (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Opening Weft Stock: {Number(form.initialWeftKg).toFixed(3)} KG
                </span>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="autoCreate"
                checked={form.autoCreatePaavus}
                onChange={(e) => setForm({ ...form, autoCreatePaavus: e.target.checked })}
                className="rounded accent-emerald-600 h-4 w-4"
              />
              <label htmlFor="autoCreate" className="text-slate-700 font-semibold cursor-pointer">
                Automatically generate {form.paavuCount} individual paavu beams in Unloaded Pool
              </label>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Additional Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. 80s cotton warp, contract agreement signed"
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-medium outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-extrabold shadow-md flex items-center gap-2"
            >
              <span>{loading ? "Saving..." : isEditing ? "Save Changes" : "Save & Initialize Contract"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
 * MODAL 2: RECORD DAILY LOOM PRODUCTION (Section 3)
 * ========================================================================= */
interface DailyProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  units: any[];
  defaultUnit?: any;
  editingEntry?: any;
}

export const DailyProductionModal: React.FC<DailyProductionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  units,
  defaultUnit,
  editingEntry,
}) => {
  const isEditing = Boolean(editingEntry?.id);

  const [form, setForm] = useState({
    unitId: "",
    paavuId: "",
    paavuRef: "",
    productionDate: new Date().toISOString().split("T")[0],
    dailyMeters: 50,
    wastageMeters: 0,
    remarks: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setForm({
        unitId: editingEntry.unitId || defaultUnit?.id || "",
        paavuId: editingEntry.paavuId || "",
        paavuRef: editingEntry.paavuRef || "",
        productionDate: editingEntry.productionDate
          ? new Date(editingEntry.productionDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        dailyMeters: editingEntry.dailyMeters || 0,
        wastageMeters: editingEntry.wastageMeters || 0,
        remarks: editingEntry.remarks || "",
      });
    } else {
      setForm({
        unitId: defaultUnit?.id || (units[0]?.id ?? ""),
        paavuId: "",
        paavuRef: "",
        productionDate: new Date().toISOString().split("T")[0],
        dailyMeters: 50,
        wastageMeters: 0,
        remarks: "",
      });
    }
  }, [editingEntry, defaultUnit, units, isOpen]);

  if (!isOpen) return null;

  const netPreview = calculateNetProduction(form.dailyMeters, form.wastageMeters);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEditing
        ? `/api/production/daily/${editingEntry.id}`
        : "/api/production/daily";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: form.unitId,
          paavuId: form.paavuId || null,
          paavuRef: form.paavuRef || null,
          productionDate: form.productionDate,
          dailyMeters: Number(form.dailyMeters),
          wastageMeters: Number(form.wastageMeters),
          remarks: form.remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save daily production");

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Factory className="h-5 w-5 text-emerald-600" />
            <span>{isEditing ? "Edit Daily Loom Production" : "Record Daily Loom Production"}</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Powerloom Unit *</label>
            <select
              required
              value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.weaverName} (Produced: {u.totalProducedMeters}m)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Production Date *</label>
              <input
                type="date"
                required
                value={form.productionDate}
                onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Paavu / Loom Ref</label>
              <input
                type="text"
                value={form.paavuRef}
                onChange={(e) => setForm({ ...form, paavuRef: e.target.value })}
                placeholder="e.g. PV-V-01 or Loom 2"
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Daily Loom Production (Pieces) *
              </label>
              <input
                type="number"
                required
                min={0}
                step="1"
                value={form.dailyMeters}
                onChange={(e) => setForm({ ...form, dailyMeters: Number(e.target.value) })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 text-base font-black outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Wastage / Adjustment (Pieces)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={form.wastageMeters}
                onChange={(e) => setForm({ ...form, wastageMeters: Number(e.target.value) })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-bold outline-none"
              />
            </div>
          </div>

          {/* Real-time Calculation Preview */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
            <span className="font-bold text-emerald-800">Net Production Added:</span>
            <span className="font-black text-emerald-700 text-sm">{netPreview} Pieces</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Remarks</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Smooth running, 2 cut pieces"
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-medium outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-extrabold shadow-md"
            >
              {loading ? "Recording..." : isEditing ? "Save Changes" : "Record Production & Tally"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
 * MODAL 3: ADD / EDIT VARAVU TRANSACTION (Section 4.B)
 * ========================================================================= */
interface VaravuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  units: any[];
  defaultUnit?: any;
  editingEntry?: any;
}

export const VaravuModal: React.FC<VaravuModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  units,
  defaultUnit,
  editingEntry,
}) => {
  const isEditing = Boolean(editingEntry?.id);

  const [form, setForm] = useState({
    unitId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    varavuType: "PAAVU_PRODUCTION",
    paavuKg: 100,
    rate: 50,
    rateUnit: "PER_KG" as "PER_KG" | "PER_METER",
    paymentMode: "CASH",
    referenceNo: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setForm({
        unitId: editingEntry.unitId || defaultUnit?.id || "",
        transactionDate: editingEntry.transactionDate
          ? new Date(editingEntry.transactionDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        varavuType: editingEntry.varavuType || "PAAVU_PRODUCTION",
        paavuKg: editingEntry.paavuKg || 100,
        rate: editingEntry.rate || 50,
        rateUnit: editingEntry.rateUnit || "PER_KG",
        paymentMode: editingEntry.paymentMode || "CASH",
        referenceNo: editingEntry.referenceNo || "",
        remarks: editingEntry.remarks || "",
      });
    } else {
      const u = defaultUnit || units[0];
      setForm({
        unitId: u?.id || "",
        transactionDate: new Date().toISOString().split("T")[0],
        varavuType: "PAAVU_PRODUCTION",
        paavuKg: 100,
        rate: u?.individualRate || 50,
        rateUnit: u?.rateUnit || "PER_KG",
        paymentMode: "CASH",
        referenceNo: "",
        remarks: "",
      });
    }
  }, [editingEntry, defaultUnit, units, isOpen]);

  if (!isOpen) return null;

  // Real-time calculation: Varavu Amount = Paavu KG × Applicable Rate
  const calculatedAmount = calculateVaravuAmount(form.paavuKg, form.rate);

  const handleUnitSelect = (unitId: string) => {
    const selected = units.find((u) => u.id === unitId);
    setForm({
      ...form,
      unitId,
      rate: selected?.individualRate ?? form.rate,
      rateUnit: selected?.rateUnit ?? form.rateUnit,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEditing
        ? `/api/production/varavu/${editingEntry.id}`
        : "/api/production/varavu";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: form.unitId,
          transactionDate: form.transactionDate,
          varavuType: form.varavuType,
          paavuKg: Number(form.paavuKg),
          rate: Number(form.rate),
          rateUnit: form.rateUnit,
          paymentMode: form.paymentMode,
          referenceNo: form.referenceNo,
          remarks: form.remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save varavu transaction");

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span>{isEditing ? "Edit Varavu Transaction" : "Record Varavu Transaction"}</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Powerloom / Weaver *</label>
            <select
              required
              value={form.unitId}
              onChange={(e) => handleUnitSelect(e.target.value)}
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-bold outline-none"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.weaverName} (Rate: ₹{u.individualRate}/{u.rateUnit || "KG"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Transaction Date *</label>
              <input
                type="date"
                required
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Varavu Type</label>
              <select
                value={form.varavuType}
                onChange={(e) => setForm({ ...form, varavuType: e.target.value })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none"
              >
                <option value="PAAVU_PRODUCTION">Paavu Production</option>
                <option value="WEAVING_WAGE">Weaving Wage</option>
                <option value="INCENTIVE">Incentive</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="BONUS">Bonus</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Paavu KG / Quantity *
              </label>
              <input
                type="number"
                required
                min={0}
                step="0.5"
                value={form.paavuKg}
                onChange={(e) => setForm({ ...form, paavuKg: Number(e.target.value) })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 text-sm font-black outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Applicable Rate (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                step="0.5"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 text-sm font-black outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Automatic Calculation Preview (Section 4.B) */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                Calculated Varavu Amount
              </span>
              <span className="text-[10px] text-emerald-700">
                Formula: {form.paavuKg} KG × ₹{form.rate}
              </span>
            </div>
            <span className="text-xl font-black text-emerald-700">
              {formatINR(calculatedAmount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CREDIT">Ledger Credit</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Reference No</label>
              <input
                type="text"
                value={form.referenceNo}
                onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                placeholder="e.g. VRV-102"
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Remarks</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Regular Paavu wage tally"
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md"
            >
              {loading ? "Saving..." : isEditing ? "Save Changes" : "Save Varavu & Recalculate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
 * MODAL 4: ADD / EDIT ADVANCE PAYMENT (Section 4.C)
 * ========================================================================= */
interface AdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  units: any[];
  defaultUnit?: any;
  editingEntry?: any;
}

export const AdvanceModal: React.FC<AdvanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  units,
  defaultUnit,
  editingEntry,
}) => {
  const isEditing = Boolean(editingEntry?.id);

  const [form, setForm] = useState({
    unitId: "",
    advanceDate: new Date().toISOString().split("T")[0],
    amount: 1000,
    paymentMode: "CASH",
    referenceNo: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setForm({
        unitId: editingEntry.unitId || defaultUnit?.id || "",
        advanceDate: editingEntry.advanceDate
          ? new Date(editingEntry.advanceDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        amount: editingEntry.amount || 0,
        paymentMode: editingEntry.paymentMode || "CASH",
        referenceNo: editingEntry.referenceNo || "",
        description: editingEntry.description || "",
      });
    } else {
      const u = defaultUnit || units[0];
      setForm({
        unitId: u?.id || "",
        advanceDate: new Date().toISOString().split("T")[0],
        amount: 1000,
        paymentMode: "CASH",
        referenceNo: "",
        description: "",
      });
    }
  }, [editingEntry, defaultUnit, units, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEditing
        ? `/api/production/advance/${editingEntry.id}`
        : "/api/production/advance";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: form.unitId,
          advanceDate: form.advanceDate,
          amount: Number(form.amount),
          paymentMode: form.paymentMode,
          referenceNo: form.referenceNo,
          description: form.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record advance");

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            <span>{isEditing ? "Edit Advance Payment" : "Record Advance Payment"}</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Powerloom / Weaver *</label>
            <select
              required
              value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-bold outline-none"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.weaverName} (Total Adv: {formatINR(u.totalAdvancePaid)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Advance Date *</label>
              <input
                type="date"
                required
                value={form.advanceDate}
                onChange={(e) => setForm({ ...form, advanceDate: e.target.value })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Advance Amount (₹) *</label>
              <input
                type="number"
                required
                min={1}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 text-base font-black outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Voucher / Ref No</label>
              <input
                type="text"
                value={form.referenceNo}
                onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                placeholder="e.g. ADV-301"
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Description / Purpose</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Festival advance, beam setup advance"
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-md"
            >
              {loading ? "Saving..." : isEditing ? "Save Changes" : "Disburse Advance & Tally"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
 * MODAL 5: CONFIGURE INDIVIDUAL VEATTI RATE (Section 4.A)
 * ========================================================================= */
interface ConfigureRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unit: any;
}

export const ConfigureRateModal: React.FC<ConfigureRateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  unit,
}) => {
  const [rate, setRate] = useState(unit?.individualRate || 50);
  const [rateUnit, setRateUnit] = useState(unit?.rateUnit || "PER_KG");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [applyToExistingVaravu, setApplyToExistingVaravu] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unit) {
      setRate(unit.individualRate || 50);
      setRateUnit(unit.rateUnit || "PER_KG");
      setEffectiveDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setApplyToExistingVaravu(false);
    }
  }, [unit, isOpen]);

  if (!isOpen || !unit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/production/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: unit.id,
          rate: Number(rate),
          rateUnit,
          effectiveDate,
          notes,
          applyToExistingVaravu,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to configure rate");

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span>Configure Individual Dhothi Rate</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 text-[11px] block">Powerloom Weaver:</span>
            <span className="text-sm font-extrabold text-slate-900">{unit.weaverName}</span>
            <span className="text-slate-500 text-[11px] block mt-0.5">
              Current Rate: ₹{unit.individualRate} per {unit.rateUnit || "KG"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">New Rate (₹) *</label>
              <input
                type="number"
                required
                min={0}
                step="0.5"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 text-base font-black outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Rate Unit</label>
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value)}
                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-semibold outline-none"
              >
                <option value="PER_KG">₹ per KG</option>
                <option value="PER_METER">₹ per Piece</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Effective Date *</label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 font-medium outline-none"
            />
          </div>

          {/* Historical Preservation Checkbox (Section 4.B) */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="applyExisting"
                checked={applyToExistingVaravu}
                onChange={(e) => setApplyToExistingVaravu(e.target.checked)}
                className="rounded accent-amber-600 h-4 w-4 mt-0.5"
              />
              <label htmlFor="applyExisting" className="text-slate-800 font-bold cursor-pointer">
                Re-apply this new rate to existing historical Varavu transactions
              </label>
            </div>
            <p className="text-[10px] text-slate-500 ml-6">
              Important: By default, historical transaction rates are strictly preserved. Only check this box if you explicitly want to re-price past entries to ₹{rate}.
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Notes / Reason for revision</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Society wage revision meeting dated 15-Oct"
              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-slate-900 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#1E2229] hover:bg-slate-800 text-white font-extrabold shadow-md"
            >
              {loading ? "Updating..." : "Save Rate Revision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
 * MODAL 6: PRINT-FRIENDLY A4 LANDSCAPE STATEMENT (Section 11)
 * ========================================================================= */
interface PrintStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUnit: any;
  ledgerRows: any[];
}

export const PrintStatementModal: React.FC<PrintStatementModalProps> = ({
  isOpen,
  onClose,
  selectedUnit,
  ledgerRows,
}) => {
  if (!isOpen) return null;

  const totalVaravu = ledgerRows.reduce((sum, r) => sum + (r.varavuAmount || 0), 0);
  const totalAdvance = ledgerRows.reduce((sum, r) => sum + (r.advanceAmount || 0), 0);
  const totalProduction = ledgerRows.reduce((sum, r) => sum + (r.productionMeters || 0), 0);
  const totalHandover = ledgerRows.reduce((sum, r) => sum + (r.handoverMeters || 0), 0);
  const closingBalance = ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].runningBalance : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl bg-white border border-slate-300 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto my-auto print:p-0 print:border-none print:shadow-none print:max-h-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-slate-800" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              Print-Friendly Accounting Statement (A4 Landscape Preview)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print Document</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div className="space-y-5 text-slate-900 font-sans">
          {/* Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-3">
            <h1 className="text-xl font-black uppercase tracking-wide">
              Cheran Handloom & Powerloom Weavers Co-operative Production Society
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Registered Under Tamil Nadu Co-operative Societies Act • Society Sizing & Powerloom Division
            </p>
            <h2 className="text-sm font-extrabold uppercase mt-1 tracking-wider bg-slate-100 py-1 inline-block px-4 rounded-md">
              Dhothi Production, Paavu Accounting & Financial Balance Register
            </h2>
          </div>

          {/* Unit & Metadata Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Weaver / Unit:</span>
              <span className="font-black text-slate-900 text-sm">
                {selectedUnit ? selectedUnit.weaverName : "Consolidated - All Dhothi Units"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Configured Rate:</span>
              <span className="font-extrabold text-slate-900">
                {selectedUnit ? `₹${selectedUnit.individualRate} per ${selectedUnit.rateUnit || "KG"}` : "Per Unit Rates"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Statement Date:</span>
              <span className="font-bold text-slate-900">{new Date().toLocaleDateString("en-IN")}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Closing Balance:</span>
              <span className="font-black text-sm text-emerald-700">
                {formatINR(closingBalance)} ({closingBalance >= 0 ? "Payable" : "Excess Adv"})
              </span>
            </div>
          </div>

          {/* Table Styled like Image 2 Handwritten Register */}
          <table className="w-full text-left text-xs border border-slate-400">
            <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
              <tr>
                <th className="py-2 px-2 border-r border-slate-300">Date</th>
                <th className="py-2 px-2 border-r border-slate-300">Powerloom / Weaver</th>
                <th className="py-2 px-2 text-right border-r border-slate-300">Paavu KG</th>
                <th className="py-2 px-2 text-right border-r border-slate-300">Rate</th>
                <th className="py-2 px-2 text-right border-r border-slate-300 font-black">Varavu (₹)</th>
                <th className="py-2 px-2 text-right border-r border-slate-300">Production</th>
                <th className="py-2 px-2 text-right border-r border-slate-300">Handover</th>
                <th className="py-2 px-2 text-right border-r border-slate-300 font-black">Advance (₹)</th>
                <th className="py-2 px-2 text-right font-black">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {ledgerRows.map((row, idx) => (
                <tr key={idx} className="font-mono text-[11px]">
                  <td className="py-1.5 px-2 font-sans border-r border-slate-300 whitespace-nowrap">
                    {new Date(row.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-1.5 px-2 font-sans font-bold border-r border-slate-300">
                    {row.weaverName}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-300">
                    {row.paavuKg ? `${row.paavuKg}kg` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-300">
                    {row.rate ? `₹${row.rate}` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold border-r border-slate-300">
                    {row.varavuAmount ? formatINR(row.varavuAmount) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-300">
                    {row.productionMeters ? `${row.productionMeters} pcs` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-300">
                    {row.handoverMeters ? `${row.handoverMeters} pcs` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold border-r border-slate-300">
                    {row.advanceAmount ? formatINR(row.advanceAmount) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right font-black">
                    {formatINR(row.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-500 text-xs">
              <tr>
                <td colSpan={4} className="py-2 px-2 text-right uppercase border-r border-slate-300">
                  Total Summary:
                </td>
                <td className="py-2 px-2 text-right font-black border-r border-slate-300">
                  {formatINR(totalVaravu)}
                </td>
                <td className="py-2 px-2 text-right border-r border-slate-300">
                  {totalProduction.toLocaleString("en-IN")}m
                </td>
                <td className="py-2 px-2 text-right border-r border-slate-300">
                  {totalHandover.toLocaleString("en-IN")}m
                </td>
                <td className="py-2 px-2 text-right font-black border-r border-slate-300">
                  {formatINR(totalAdvance)}
                </td>
                <td className="py-2 px-2 text-right font-black text-emerald-800">
                  {formatINR(closingBalance)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures Footer */}
          <div className="pt-10 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-800">
            <div>
              <div className="border-t border-slate-400 pt-2 w-36 mx-auto" />
              <span>Weaver Signature / LTI</span>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 w-36 mx-auto" />
              <span>Production In-Charge</span>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 w-36 mx-auto" />
              <span>Secretary / President</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

