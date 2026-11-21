"use client";

import React from "react";
import {
  Factory,
  Warehouse,
  Send,
  Clock,
  Scale,
  TrendingUp,
  CreditCard,
  Wallet,
  Users,
  Layers,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface VeattiFinancialCardsProps {
  clothType?: "VEATTI" | "SAREE";
  totalProduced: number;
  godownStock: number;
  totalHandovered: number;
  balanceToHandover: number;
  totalPaavuKg: number;
  totalPaavuMeters?: number;
  totalVaravu?: number;
  totalAdvance: number;
  netBalance: number;
  amountPayable: number;
  excessAdvance: number;
  unitCount: number;
  totalBabinCount?: number;
  remainingPaavuMeters?: number;
}

export const VeattiFinancialCards: React.FC<VeattiFinancialCardsProps> = ({
  clothType = "VEATTI",
  totalProduced,
  godownStock,
  totalHandovered,
  balanceToHandover,
  totalPaavuKg,
  totalPaavuMeters = 0,
  totalVaravu = 0,
  totalAdvance,
  netBalance,
  amountPayable,
  excessAdvance,
  unitCount,
  totalBabinCount = 0,
  remainingPaavuMeters,
}) => {
  const isSaree = clothType === "SAREE";
  const pieceUnit = isSaree ? "Sarees" : "Dhothis";
  const effectiveRemainingPaavu =
    remainingPaavuMeters !== undefined
      ? remainingPaavuMeters
      : Math.max(0, (totalPaavuMeters || 0) - totalProduced);
  return (
    <div className="space-y-4.5">
      {/* Row 1: Physical Production & Handover KPIs (Preserved from existing dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Produced from Powerloom */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-5.5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="tracking-normal">Loom Produced As of Now</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Factory className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
              {totalProduced.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-bold text-emerald-600 font-sans">{pieceUnit}</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5 leading-relaxed">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Total {pieceUnit.toLowerCase()} produced from powerloom units</span>
          </p>
        </div>

        {/* Metric 2: Available in Godown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-5.5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="tracking-normal">In Godown Stock</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Warehouse className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-700">
              {godownStock.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-bold text-amber-600 font-sans">{pieceUnit}</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Produced ({totalProduced.toLocaleString("en-IN")} pcs) − Handovered ({totalHandovered.toLocaleString("en-IN")} pcs)
          </p>
        </div>

        {/* Metric 3: Handovered in Government */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-5.5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="tracking-normal">Handovered in Govt</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Send className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-blue-700">
              {totalHandovered.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-bold text-blue-600 font-sans">{pieceUnit}</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Total {totalHandovered.toLocaleString("en-IN")} pcs dispatched to Co-optex / Govt
          </p>
        </div>

        {/* Metric 4: Automatic Tally: Balance to Handover */}
        <div className="rounded-2xl border border-rose-200 bg-white p-5 sm:p-5.5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-rose-700">
            <span className="tracking-normal">Automatic Tally (Balance)</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
              {balanceToHandover.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-bold text-rose-600 font-sans">{pieceUnit}</span>
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-rose-600 leading-relaxed">
            Target quota balance yet to be dispatched
          </p>
        </div>
      </div>

      {/* Row 2: Financial Summary Cards (Section 6 Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 5: Total Paavu Given & Total Powerlooms */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-5.5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="tracking-normal">Total Paavu Given</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Scale className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
              {(totalPaavuMeters > 0 ? totalPaavuMeters : Math.round(totalPaavuKg)).toLocaleString("en-IN")}{" "}
              <span className="text-sm font-bold text-indigo-600 font-sans">{totalPaavuMeters > 0 ? pieceUnit : "KG"}</span>
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                {unitCount} {unitCount === 1 ? "Unit" : "Units"}
              </span>
              {totalBabinCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                  {totalBabinCount.toLocaleString("en-IN")} Babins
                </span>
              )}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {Math.round(totalPaavuKg).toLocaleString("en-IN")} KG warp allocated across {unitCount} units
          </p>
        </div>

        {/* Metric 6: Remaining Paavu Yet to Give (Replacement of Total Varavu) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-5.5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="tracking-normal">Remaining Paavu Yet to Give</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-purple-700">
              {effectiveRemainingPaavu.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-bold text-purple-600 font-sans">{pieceUnit}</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Total {effectiveRemainingPaavu.toLocaleString("en-IN")} {pieceUnit.toLowerCase()} remaining to be woven across {unitCount} units
          </p>
        </div>

        {/* Metric 7: Total Advance Paid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-5.5 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="tracking-normal">Total Advance Paid</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-700">
              {formatINR(totalAdvance)}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Total advances given via Cash, Bank &amp; UPI
          </p>
        </div>

        {/* Metric 8: Total Amount Payable / Net Balance */}
        <div
          className={`rounded-2xl border p-5 sm:p-5.5 shadow-xs transition hover:shadow-sm ${
            netBalance > 0
              ? "border-emerald-300 bg-emerald-50/30"
              : netBalance < 0
              ? "border-rose-300 bg-rose-50/30"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span
              className={`tracking-normal ${
                netBalance > 0
                  ? "text-emerald-700"
                  : netBalance < 0
                  ? "text-rose-700"
                  : "text-slate-600"
              }`}
            >
              {netBalance >= 0 ? "Total Amount Payable" : "Excess Advance Issued"}
            </span>
            <span
              className={`p-2 rounded-xl ${
                netBalance > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : netBalance < 0
                  ? "bg-rose-100 text-rose-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${
                netBalance > 0
                  ? "text-emerald-700"
                  : netBalance < 0
                  ? "text-rose-700"
                  : "text-slate-900"
              }`}
            >
              {formatINR(Math.abs(netBalance))}
            </span>
          </div>
          <p
            className={`mt-2 text-xs font-medium leading-relaxed ${
              netBalance > 0
                ? "text-emerald-700"
                : netBalance < 0
                ? "text-rose-700"
                : "text-slate-500"
            }`}
          >
            {netBalance > 0
              ? "Net wages payable to weavers (Varavu − Advance)"
              : netBalance < 0
              ? "Excess advance held by weavers (Advance > Varavu)"
              : "All accounts fully balanced (Varavu = Advance)"}
          </p>
        </div>
      </div>
    </div>
  );
};

