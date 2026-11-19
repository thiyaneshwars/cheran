"use client";

import React, { useState } from "react";
import { X, Factory, MapPin, Gauge, DollarSign, CheckCircle2, Scale, Layers } from "lucide-react";
import { TRADITIONAL_DEFAULT_WAGE_RATE } from "@/lib/veatti-calculations";

interface RegisterPowerloomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUnit: any) => void;
  defaultClothType?: "VEATTI" | "SAREE";
  lockClothType?: boolean;
}

export const RegisterPowerloomModal: React.FC<RegisterPowerloomModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultClothType = "VEATTI",
  lockClothType = false,
}) => {
  const defaultWeft = defaultClothType === "SAREE" ? 0.182 : 0.119;
  const [form, setForm] = useState({
    weaverName: "",
    clothType: defaultClothType,
    location: "",
    machineCount: 2,
    individualRate: TRADITIONAL_DEFAULT_WAGE_RATE,
    weftMultiplier: defaultWeft,
    initialWeftKg: 0,
    notes: "",
  });

  // Keep clothType in sync when defaultClothType changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      const fallbackWeft = defaultClothType === "SAREE" ? 0.182 : 0.119;
      setForm((prev) => ({
        ...prev,
        clothType: defaultClothType,
        weftMultiplier: prev.weftMultiplier || fallbackWeft,
      }));
      setError(null);
    }
  }, [isOpen, defaultClothType]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.weaverName.trim()) {
      setError("Please enter the powerloom weaver/unit name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Unit
      const effectiveWeft =
        Number(form.weftMultiplier) || (form.clothType === "SAREE" ? 0.182 : 0.119);
      const res = await fetch("/api/production/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clothType: form.clothType,
          weaverName: form.weaverName.trim(),
          location: form.location.trim() || null,
          machineCount: Number(form.machineCount) || 1,
          paavuCount: 0,
          paavuMeters: 0,
          individualRate: Number(form.individualRate) || TRADITIONAL_DEFAULT_WAGE_RATE,
          rateUnit: "PER_METER",
          weftMultiplier: effectiveWeft,
          initialWeftKg: Number(form.initialWeftKg) || 0,
          initialAdvance: 0,
          targetMeters: 0,
          notes: form.notes.trim() || null,
          autoCreatePaavus: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register powerloom");

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to register powerloom");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>
                  {lockClothType
                    ? `Register ${form.clothType === "SAREE" ? "Saree" : "Veatti"} Powerloom Unit`
                    : "Register Powerloom Unit"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Step 1: Register powerloom (Category, Location, Looms, Rate)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          {/* 1. Cloth Type: Veatti vs Saree */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Product Category <span className="text-rose-500">*</span>
            </label>
            {lockClothType ? (
              <div
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 font-bold text-xs ${
                  form.clothType === "SAREE"
                    ? "border-purple-600 bg-purple-50 text-purple-900"
                    : "border-emerald-600 bg-emerald-50 text-emerald-900"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    form.clothType === "SAREE" ? "bg-purple-600" : "bg-emerald-600"
                  }`}
                />
                <span className="font-extrabold text-sm">
                  {form.clothType === "SAREE" ? "Saree Production Unit" : "Veatti Production Unit"}
                </span>
                <span className="ml-auto text-[11px] font-semibold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                  {form.clothType === "SAREE" ? "Saree Only" : "Veatti Only"}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition font-bold text-xs ${
                    form.clothType === "VEATTI"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="clothType"
                    value="VEATTI"
                    checked={form.clothType === "VEATTI"}
                    onChange={() => setForm({ ...form, clothType: "VEATTI" })}
                    className="sr-only"
                  />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                  <span>Veatti Production</span>
                </label>

                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition font-bold text-xs ${
                    form.clothType === "SAREE"
                      ? "border-purple-600 bg-purple-50 text-purple-800 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="clothType"
                    value="SAREE"
                    checked={form.clothType === "SAREE"}
                    onChange={() => setForm({ ...form, clothType: "SAREE" })}
                    className="sr-only"
                  />
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600"></span>
                  <span>Saree Production</span>
                </label>
              </div>
            )}
          </div>

          {/* 2. Weaver / Powerloom Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
              Powerloom Weaver / Unit Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sakthivel Powerlooms / Unit 1"
              value={form.weaverName}
              onChange={(e) => setForm({ ...form, weaverName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* 3. Location & Number of Looms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Komarapalayam / Pallipalayam"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                Number of Looms / Machines <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Gauge className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  required
                  value={form.machineCount}
                  onChange={(e) => setForm({ ...form, machineCount: parseInt(e.target.value) || 1 })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* 4. Default Wage Rate (₹ / Meter) */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
              Wage Rate per Meter (₹ / Meter) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="number"
                step="0.25"
                min="0"
                required
                value={form.individualRate}
                onChange={(e) => setForm({ ...form, individualRate: parseFloat(e.target.value) || 0 })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Default rate from traditional register is <strong>₹19.00 / meter</strong>. Configurable per powerloom.
            </p>
          </div>

          {/* Weft Multiplier & Opening Stock */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-extrabold text-sky-950 flex items-center gap-1.5 text-xs">
                <Scale className="h-4 w-4 text-sky-700" />
                <span>Weft Multiplier &amp; Opening Stock *</span>
              </span>
              <span className="text-[10px] text-sky-700 font-bold">
                Tally base for remaining weft
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Weft KG Left (Opening Stock) */}
              <div className="bg-white p-2.5 rounded-xl border border-sky-200 shadow-2xs space-y-1">
                <label className="block text-[11px] font-black text-slate-700">
                  Weft KG Left (Opening Stock) *
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-black focus:outline-none focus:border-sky-600 pr-10"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400 font-sans pointer-events-none">
                    KG
                  </span>
                </div>
              </div>

              {/* Weft Multiplier */}
              <div className="bg-white p-2.5 rounded-xl border border-sky-200 shadow-2xs space-y-1.5">
                <label className="block text-[11px] font-black text-slate-700">
                  Weft Factor (kg/m) *
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {form.clothType === "SAREE" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, weftMultiplier: 0.182 })}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition border cursor-pointer ${
                          Number(form.weftMultiplier) === 0.182
                            ? "bg-purple-700 text-white border-purple-800"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-purple-50"
                        }`}
                      >
                        0.182
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, weftMultiplier: 0.175 })}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition border cursor-pointer ${
                          Number(form.weftMultiplier) === 0.175
                            ? "bg-purple-700 text-white border-purple-800"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-purple-50"
                        }`}
                      >
                        0.175
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, weftMultiplier: 0.119 })}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition border cursor-pointer ${
                          Number(form.weftMultiplier) === 0.119
                            ? "bg-emerald-700 text-white border-emerald-800"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50"
                        }`}
                      >
                        0.119
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, weftMultiplier: 0.110 })}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition border cursor-pointer ${
                          Number(form.weftMultiplier) === 0.110
                            ? "bg-emerald-700 text-white border-emerald-800"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50"
                        }`}
                      >
                        0.110
                      </button>
                    </>
                  )}
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.weftMultiplier}
                    onChange={(e) => setForm({ ...form, weftMultiplier: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-0.5 rounded border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
              Notes & Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Master weaver contact, machine specifications..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? "Registering..." : "Save Powerloom"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

