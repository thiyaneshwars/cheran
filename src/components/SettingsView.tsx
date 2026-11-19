"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  Database,
  CheckCircle2,
  Building2,
  Type,
  Eye,
  Check,
  HardDrive,
  RotateCcw,
  ArrowRight,
  HardDriveDownload,
  Terminal,
  Info,
} from "lucide-react";

interface SettingsViewProps {
  onNavigate?: (tab: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const [fontSize, setFontSize] = useState<"normal" | "large">("normal");
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    // Check saved font size preference on mount
    const saved = localStorage.getItem("cheran_font_size") as "normal" | "large" | null;
    if (saved === "large") {
      setFontSize("large");
      document.documentElement.setAttribute("data-font-size", "large");
    } else {
      setFontSize("normal");
      document.documentElement.removeAttribute("data-font-size");
    }
  }, []);

  const handleFontSizeChange = (size: "normal" | "large") => {
    setFontSize(size);
    if (size === "large") {
      document.documentElement.setAttribute("data-font-size", "large");
      localStorage.setItem("cheran_font_size", "large");
    } else {
      document.documentElement.removeAttribute("data-font-size");
      localStorage.setItem("cheran_font_size", "normal");
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#26332F] tracking-tight">
          Society Settings & Policies
        </h2>
        <p className="text-sm text-[#68756F] mt-0.5">
          Society configurations, display preferences, and statutory accounting integrity
        </p>
      </div>

      {saveToast && (
        <div className="rounded-xl bg-[#EBF5F0] border border-[#C8E5D5] p-3 text-sm font-semibold text-[#246944] flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#246944]" />
          <span>Preference saved! Text scale updated instantly across all screens.</span>
        </div>
      )}

      {/* 1. Display & Readability Preferences (Father-Friendly Font Size) */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#E5E9E3] pb-3.5">
          <div className="h-8 w-8 rounded-lg bg-[#F0F6F3] text-[#245B52] flex items-center justify-center">
            <Type className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#26332F]">
              Display & Readability Preferences
            </h3>
            <p className="text-xs text-[#68756F]">
              Application font scaling and reading controls
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-[#26332F] block">
              Application Text Scale
            </label>
            <p className="text-xs text-[#68756F] mt-0.5">
              Choose comfortable reading size for daily office accounting:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Normal Option */}
            <button
              type="button"
              onClick={() => handleFontSizeChange("normal")}
              className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                fontSize === "normal"
                  ? "border-[#245B52] bg-[#F0F6F3] ring-2 ring-[#245B52]/20 shadow-xs"
                  : "border-[#E5E9E3] bg-[#F7F8F5] hover:bg-white hover:border-[#C6DDD1]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-[#26332F] text-base block">
                    Normal (Standard)
                  </span>
                  <span className="text-xs text-[#68756F] block mt-0.5">
                    Standard interface scale • 16px base font
                  </span>
                </div>
                {fontSize === "normal" && (
                  <span className="h-5 w-5 rounded-full bg-[#245B52] text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="text-xs text-[#68756F] mt-3 bg-white/70 p-2.5 rounded-lg border border-[#E5E9E3]">
                Standard desktop view recommended for high-resolution monitors.
              </p>
            </button>

            {/* Large Option */}
            <button
              type="button"
              onClick={() => handleFontSizeChange("large")}
              className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                fontSize === "large"
                  ? "border-[#245B52] bg-[#F0F6F3] ring-2 ring-[#245B52]/20 shadow-xs"
                  : "border-[#E5E9E3] bg-[#F7F8F5] hover:bg-white hover:border-[#C6DDD1]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#26332F] text-lg block">
                      Large (Comfortable)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#DCEAE2] text-[#245B52] font-bold text-[10px]">
                      Recommended
                    </span>
                  </div>
                  <span className="text-xs text-[#68756F] block mt-0.5">
                    Comfortable large scale • 18px base font (+12.5% scale)
                  </span>
                </div>
                {fontSize === "large" && (
                  <span className="h-5 w-5 rounded-full bg-[#245B52] text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="text-xs text-[#68756F] mt-3 bg-white/70 p-2.5 rounded-lg border border-[#E5E9E3]">
                Comfortable, relaxed font sizes for easy reading without straining eyes.
              </p>
            </button>
          </div>

          <div className="rounded-xl bg-[#F7F8F5] border border-[#E5E9E3] p-4 flex items-center gap-3">
            <Eye className="h-5 w-5 text-[#245B52] shrink-0" />
            <div className="text-xs text-[#68756F]">
              <span className="font-bold text-[#26332F]">Instant Live Preview: </span>
              Financial totals like <span className="font-financial font-extrabold text-[#245B52]">₹10,00,000</span> and labels will automatically scale according to this setting.
            </div>
          </div>
        </div>
      </div>

      {/* 2. Society Details Card */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#E5E9E3] pb-3.5">
          <div className="h-8 w-8 rounded-lg bg-[#F0F6F3] text-[#245B52] flex items-center justify-center">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#26332F]">
              Society Legal Registration
            </h3>
            <p className="text-xs text-[#68756F]">
              Official co-operative registration and territorial details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div>
            <span className="text-[#68756F] block text-xs font-semibold">Society Full Name:</span>
            <span className="font-extrabold text-[#26332F] text-base mt-0.5 block leading-snug">
              Cheran Handloom & Powerloom Weavers Co-operative Production Society Ltd.
            </span>
          </div>

          <div>
            <span className="text-[#68756F] block text-xs font-semibold">Registration Number:</span>
            <span className="font-bold text-[#26332F] text-base mt-0.5 block">
              SL-204 (Reg. No. SL-204)
            </span>
            <span className="text-[#68756F] font-medium text-xs block mt-0.5">
              Under Tamil Nadu Co-operative Societies Act 1983
            </span>
          </div>

          <div>
            <span className="text-[#68756F] block text-xs font-semibold">Registered Office Address:</span>
            <span className="text-[#26332F] font-bold block mt-0.5">
              Chennimalai & Bhavani Main Road, Erode District - 638051
            </span>
          </div>

          <div>
            <span className="text-[#68756F] block text-xs font-semibold">Active Financial Period:</span>
            <span className="font-bold text-[#245B52] text-base block mt-0.5">
              FY 2026-2027 (01-Apr-2026 to 31-Mar-2027)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Accounting Policies & Integrity Guarantees */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#E5E9E3] pb-3.5">
          <div className="h-8 w-8 rounded-lg bg-[#F0F6F3] text-[#245B52] flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#26332F]">
              Accounting Policies & Integrity Guarantees
            </h3>
            <p className="text-xs text-[#68756F]">
              Regulatory compliance, double-entry rules, and precision standards
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl bg-[#F7F8F5] p-4 border border-[#E5E9E3] space-y-1.5">
            <span className="font-bold text-[#26332F] flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#246944]" />
              <span>Exact Decimal Precision (Decimal.js)</span>
            </span>
            <p className="text-[#68756F] leading-relaxed">
              All financial calculations are performed with fixed decimal precision. No paise rounding errors or floating-point anomalies.
            </p>
          </div>

          <div className="rounded-xl bg-[#F7F8F5] p-4 border border-[#E5E9E3] space-y-1.5">
            <span className="font-bold text-[#26332F] flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#246944]" />
              <span>Balanced Double-Entry Enforcement</span>
            </span>
            <p className="text-[#68756F] leading-relaxed">
              Every accounting voucher mandates Debits = Credits balance. Unbalanced transactions cannot be committed to the database.
            </p>
          </div>

          <div className="rounded-xl bg-[#F7F8F5] p-4 border border-[#E5E9E3] space-y-1.5">
            <span className="font-bold text-[#26332F] flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#246944]" />
              <span>Single-Recognition Expense Integrity</span>
            </span>
            <p className="text-[#68756F] leading-relaxed">
              Wages and freight are recognized as expenses once on credit. Bank settlements strictly reduce payables without double counting.
            </p>
          </div>

          <div className="rounded-xl bg-[#F7F8F5] p-4 border border-[#E5E9E3] space-y-1.5">
            <span className="font-bold text-[#26332F] flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#246944]" />
              <span>Traceable Audit Reversals</span>
            </span>
            <p className="text-[#68756F] leading-relaxed">
              Vouchers cannot be silently deleted. Voided transactions generate counter-entries, preserving a permanent audit trail for statutory inspection.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Dedicated Backup & Restore Portal Link */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#F0F6F3] text-[#245B52] flex items-center justify-center">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#26332F]">
                D: Drive Database Vault &amp; Disaster Recovery
              </h3>
              <p className="text-xs text-[#68756F]">
                Physical storage snapshots in <span className="font-mono font-bold text-slate-800">D:\Backup DB</span> with real-time 3D telemetry
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <Check className="h-3 w-3" /> D: Drive Active
          </span>
        </div>

        <p className="text-sm text-[#68756F] leading-relaxed">
          Database backup and restoration now operate in their own dedicated portal with live 3D visual monitoring, full snapshot history, and automated safety rollback safeguards.
        </p>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("backup")}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <HardDrive className="h-4 w-4 text-emerald-400" />
            <span>Open Dedicated Backup &amp; Restore Hub</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
};
