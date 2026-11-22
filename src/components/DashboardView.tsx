"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Landmark,
  Coins,
  FileSpreadsheet,
  FileText,
  UserCheck,
  TrendingUp,
  Calendar,
  ChevronDown,
  ArrowRight,
  ArrowUpRight,
  MoreVertical,
  Cpu,
  Truck,
  BarChart2,
  PieChart as PieChartIcon,
  Layers,
  Send,
  Warehouse,
  Factory,
  PackageCheck,
  Clock,
  CheckCircle2,
  Package,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { NavItemKey } from "./Sidebar";
import { formatINR } from "@/lib/decimal";

interface DashboardViewProps {
  data?: any;
  onNavigate: (tab: NavItemKey) => void;
  onSelectBankAccount?: (bankId: string) => void;
  onOpenNewTransaction: () => void;
  onFilterChange?: (filters: any) => void;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigate,
  onOpenNewTransaction,
}) => {
  const [selectedYear] = useState("This Year");
  const [selectedMonth] = useState("This Month");
  const [productionFilter, setProductionFilter] = useState<"ALL" | "VEATTI" | "SAREE">("ALL");

  // Dynamic live production & godown overview
  const prodOverview = data?.productionOverview;
  const veattiProd = prodOverview?.veatti || {
    totalProducedMeters: 16900,
    godownAvailableMeters: 1420,
    totalHandoveredMeters: 15480,
    targetMeters: 50967,
    balanceToHandoverMeters: 35487,
    totalPaavuGiven: 28640,
    remainingPaavu: 18020,
    unitCount: 3,
  };
  const sareeProd = prodOverview?.saree || {
    totalProducedMeters: 3258,
    godownAvailableMeters: 1295,
    totalHandoveredMeters: 1963,
    targetMeters: 22656,
    balanceToHandoverMeters: 20693,
    totalPaavuGiven: 22656,
    remainingPaavu: 19398,
    unitCount: 6,
  };
  const consolidatedProd = prodOverview?.totalConsolidated || {
    totalProducedMeters: veattiProd.totalProducedMeters + sareeProd.totalProducedMeters,
    godownAvailableMeters: veattiProd.godownAvailableMeters + sareeProd.godownAvailableMeters,
    totalHandoveredMeters: veattiProd.totalHandoveredMeters + sareeProd.totalHandoveredMeters,
    balanceToHandoverMeters: veattiProd.balanceToHandoverMeters + sareeProd.balanceToHandoverMeters,
  };

  const activeProd =
    productionFilter === "VEATTI"
      ? veattiProd
      : productionFilter === "SAREE"
      ? sareeProd
      : consolidatedProd;

  const activeUnitLabel =
    productionFilter === "VEATTI"
      ? "Dhothis"
      : productionFilter === "SAREE"
      ? "Sarees"
      : "Pieces";

  // Dynamic metrics from database API
  const treasuryBalance =
    data?.metrics?.treasuryBalance ??
    data?.bankDetails?.consolidatedBalance ??
    0;
  const totalTransactionsAmount =
    (data?.metrics?.totalIncome || 0) + (data?.metrics?.totalExpenses || 0);
  const totalSizingAmount =
    data?.sectionSummaries?.sizing?.totalCredited || 0;
  const totalWagesAmount =
    data?.sectionSummaries?.dailyWage?.grossWages ??
    data?.sectionSummaries?.dailyWage?.totalCredited ??
    0;

  // Real recent transactions
  const recentTransactions = data?.recentTransactions || [];

  // Real financial monthly chart data
  const monthlyChartData = data?.charts?.monthlyChart || [];

  // Dynamic Transaction Breakdown Pie Data
  const sizingSum = data?.sectionSummaries?.sizing?.totalCredited || 0;
  const plSum = data?.sectionSummaries?.powerloom?.totalCredited || 0;
  const wageSum = data?.sectionSummaries?.dailyWage?.totalCredited || 0;
  const transportSum = data?.sectionSummaries?.transport?.totalCredited || 0;
  const totalCategorySum = sizingSum + plSum + wageSum + transportSum;

  const transactionPieData =
    totalCategorySum > 0
      ? [
          {
            name: "Sizing Bills",
            value: Math.round((sizingSum / totalCategorySum) * 100),
            color: "#22252a",
            amount: sizingSum,
          },
          {
            name: "Powerloom",
            value: Math.round((plSum / totalCategorySum) * 100),
            color: "#475569",
            amount: plSum,
          },
          {
            name: "Wages",
            value: Math.round((wageSum / totalCategorySum) * 100),
            color: "#64748b",
            amount: wageSum,
          },
          {
            name: "Transport",
            value: Math.round((transportSum / totalCategorySum) * 100),
            color: "#94a3b8",
            amount: transportSum,
          },
        ].filter((p) => p.amount > 0)
      : [];

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "long",
  });

  const pendingSizingCount = data?.pendingItems?.sizing?.length || 0;
  const pendingTransportCount = data?.pendingItems?.transport?.length || 0;

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2 shadow-xl border border-slate-800 text-center">
          <p className="text-xs font-bold tracking-tight">
            {formatINR(payload[0]?.value || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {label || payload[0]?.payload?.month || ""}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-6 sm:px-8 py-6 space-y-6 max-w-[1600px] mx-auto text-slate-900">
      {/* 1. Official Society Executive Banner */}
      <div className="relative rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center min-h-[140px]">
        {/* Right textile powerloom machinery photo */}
        <div className="absolute top-0 right-0 bottom-0 w-full md:w-1/2 z-0 pointer-events-none">
          <Image
            src="/images/textile_loom_banner.jpg"
            alt="Textile Loom Machinery"
            fill
            className="object-cover object-right opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent" />
        </div>

        {/* Left Welcome Text */}
        <div className="relative z-10 max-w-xl space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live Operations Online
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Reg. No. SL-204
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight">
            CHERAN CO-OPERATIVE SOCIETY LTD.
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
            Handloom & Powerloom Weavers Production Society • Transparent Accounting & Audit Ready
          </p>
        </div>

        {/* Dynamic Date Badge */}
        <div className="relative z-10 mt-4 md:mt-0 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Today
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              {todayFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Society Treasury / Bank Balance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
            <Landmark className="h-6 w-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-500">
              Society Treasury
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {formatINR(treasuryBalance)}
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>FY 2026-27 Active</span>
            </span>
          </div>
        </div>

        {/* Card 2: Total Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-500">
              Total Transactions
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {formatINR(totalTransactionsAmount)}
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
              <span>{recentTransactions.length} recorded</span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Sizing Bills */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-500">
              Total Sizing Bills
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {formatINR(totalSizingAmount)}
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
              <span>Outstanding: {formatINR(data?.sectionSummaries?.sizing?.amountOutstanding || 0)}</span>
            </span>
          </div>
        </div>

        {/* Card 4: Daily Wages (This Month) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-500">
              Daily Wages (This Month)
            </span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {formatINR(totalWagesAmount)}
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
              <span>Disbursed: {formatINR(data?.sectionSummaries?.dailyWage?.amountSettled || 0)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2b. Govt Scheme Production & Godown Stock Inventory (Live Sync with Powerlooms & Handover) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        {/* Header with Title, Mode Switcher & Quick Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Govt Scheme Production & Godown Stock
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical inventory produced from powerlooms, held in society godown, and dispatched to Co-optex / Govt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setProductionFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  productionFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Combined
              </button>
              <button
                type="button"
                onClick={() => setProductionFilter("VEATTI")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  productionFilter === "VEATTI"
                    ? "bg-emerald-600 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                Dhothi Scheme
              </button>
              <button
                type="button"
                onClick={() => setProductionFilter("SAREE")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  productionFilter === "SAREE"
                    ? "bg-purple-600 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-purple-700"
                }`}
              >
                Saree Scheme
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNavigate("saree")}
                className="px-2.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition flex items-center gap-1"
                title="Open Saree Production Register"
              >
                <span>Saree Looms</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("veatti")}
                className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1"
                title="Open Dhothi Production Register"
              >
                <span>Dhothi Looms</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("govt-handover")}
                className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1"
                title="Open Govt Handover Ledger"
              >
                <span>Govt Handover</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Loom Produced */}
          <div className="p-4.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Loom Produced As of Now</span>
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <Factory className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
                {activeProd.totalProducedMeters.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-emerald-600 font-sans">{activeUnitLabel}</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Total {activeUnitLabel.toLowerCase()} produced across active powerloom units
            </p>
          </div>

          {/* 2. In Godown Stock */}
          <div className="p-4.5 rounded-xl border-2 border-amber-400/80 bg-amber-50/40 hover:bg-amber-50/70 hover:shadow-xs transition">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <span>In Godown Stock</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-200/80 text-amber-900 font-bold uppercase">
                  Available
                </span>
              </span>
              <span className="p-1.5 rounded-lg bg-amber-200 text-amber-800">
                <Warehouse className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-800">
                {activeProd.godownAvailableMeters.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-amber-700 font-sans">{activeUnitLabel}</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-amber-900/80 font-medium leading-relaxed">
              Produced ({activeProd.totalProducedMeters.toLocaleString("en-IN")}) − Handovered ({activeProd.totalHandoveredMeters.toLocaleString("en-IN")})
            </p>
          </div>

          {/* 3. Handovered in Govt */}
          <div className="p-4.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Handovered in Govt</span>
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <PackageCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-blue-700">
                {activeProd.totalHandoveredMeters.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-blue-600 font-sans">{activeUnitLabel}</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Total {activeUnitLabel.toLowerCase()} dispatched to Co-optex / Govt
            </p>
          </div>

          {/* 4. Automatic Tally (Balance) */}
          <div className="p-4.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
              <span>Automatic Tally (Balance)</span>
              <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-rose-600">
                {activeProd.balanceToHandoverMeters.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-bold text-rose-600 font-sans">{activeUnitLabel}</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-rose-600/80">
              Target quota balance yet to be dispatched
            </p>
          </div>
        </div>

        {/* Breakdown bar: Individual Scheme Godown Stocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">Dhothi Godown Stock:</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              {veattiProd.godownAvailableMeters.toLocaleString("en-IN")}{" "}
              <span className="font-sans text-[11px] text-slate-500 font-normal">Dhothis ({veattiProd.unitCount || 3} Looms)</span>
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="font-semibold text-slate-700">Saree Godown Stock:</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              {sareeProd.godownAvailableMeters.toLocaleString("en-IN")}{" "}
              <span className="font-sans text-[11px] text-slate-500 font-normal">Sarees ({sareeProd.unitCount || 6} Looms)</span>
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-bold text-amber-900">Total Godown Inventory:</span>
            </div>
            <span className="font-mono font-black text-amber-800 text-sm">
              {consolidatedProd.godownAvailableMeters.toLocaleString("en-IN")}{" "}
              <span className="font-sans text-xs text-amber-700 font-bold">Pieces</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Financial Overview & Transaction Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: Financial Overview (col-span-8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="text-base font-bold text-slate-900">
              Financial Overview
            </h3>

            <div className="flex items-center gap-4 sm:gap-6">
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  <span>Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span>Expense</span>
                </div>
              </div>

              {/* Timeframe */}
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <span>{selectedYear}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Area Chart / Zero State */}
          <div className="h-[280px] w-full flex items-center justify-center">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyChartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e2229" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#1e2229" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(val) => (val === 0 ? "0" : `${val}`)}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#1e2229"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    dot={{ r: 3, fill: "#1e2229", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#1e2229" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#cbd5e1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                    dot={{ r: 3, fill: "#cbd5e1", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#94a3b8" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
                  <TrendingUp className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-700">
                  No Financial Data Recorded Yet
                </p>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Income and expense movements will be charted automatically as live bills, vouchers, and transactions are entered.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Transaction Summary (col-span-4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Transaction Summary
            </h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
              <span>{selectedMonth}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          {/* Donut Chart with Centered Total Text & Legend or Zero State */}
          {transactionPieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row lg:flex-row items-center justify-between gap-4 my-auto">
              <div className="relative w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {transactionPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Centered Total Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-extrabold text-slate-900 tracking-tight leading-none">
                    {formatINR(totalCategorySum)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 mt-1">
                    Total Volume
                  </span>
                </div>
              </div>

              {/* Legend Breakdown List */}
              <div className="flex flex-col space-y-2.5 w-full max-w-[190px]">
                {transactionPieData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs font-medium text-slate-600"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 ml-2">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 w-full text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
                <PieChartIcon className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-700">
                No Operational Volume
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
                Section breakdown will populate as live entries are posted
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Quick Actions Bar */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Action 1 */}
          <div
            onClick={() => onNavigate("sizing")}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/50 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                Add Sizing Bill
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
          </div>

          {/* Action 2 */}
          <div
            onClick={() => onNavigate("veatti")}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/50 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                Dhothi Production
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
          </div>

          {/* Action 3 */}
          <div
            onClick={onOpenNewTransaction}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/50 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                <Coins className="h-4 w-4" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                New Transaction
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
          </div>

          {/* Action 4: Log Transport Freight */}
          <div
            onClick={() => onNavigate("transport")}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/50 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                <Truck className="h-4 w-4" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                Log Transport
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
          </div>

          {/* Action 5 */}
          <div
            onClick={() => onNavigate("reports")}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/50 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                <BarChart2 className="h-4 w-4" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                Generate Report
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Recent Transactions & Active Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Transactions (col-span-8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900">
              Recent Transactions
            </h3>
            <button
              onClick={() => onNavigate("transactions")}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              View All
            </button>
          </div>

          {/* Clean Real Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                  <th className="pb-3 font-medium flex items-center gap-1 cursor-pointer">
                    <span>Date</span>
                    <ChevronDown className="h-3 w-3" />
                  </th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-normal">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((txn: any) => {
                    const d = new Date(txn.transactionDate || txn.createdAt);
                    const formattedDate = d.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    return (
                      <tr key={txn.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 text-slate-600">{formattedDate}</td>
                        <td className="py-3">
                          <button
                            onClick={() => onNavigate("transactions")}
                            className="font-medium text-slate-900 underline underline-offset-2 hover:text-blue-600"
                          >
                            {txn.section || "General"}
                          </button>
                        </td>
                        <td className="py-3 text-slate-600 font-medium">
                          {txn.notes || txn.counterparty || txn.referenceNo}
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          {formatINR(txn.amount)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              txn.status === "POSTED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : txn.status === "REVERSED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                                : "bg-amber-50 text-amber-700 border border-amber-200/60"
                            }`}
                          >
                            {txn.status || "POSTED"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => onNavigate("transactions")}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                          <Coins className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                          No Recent Transactions
                        </span>
                        <span className="text-xs text-slate-400">
                          Transactions and bank settlements will appear here in real-time
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Active Operations */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Active Operations
            </h3>
            <button
              onClick={() => onNavigate("veatti")}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              View All
            </button>
          </div>

          <div className="space-y-3.5 my-auto">
            {/* Sizing Bills */}
            <div
              onClick={() => onNavigate("sizing")}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">
                    Sizing Bills
                  </span>
                  <span className="text-xs text-slate-400">
                    {pendingSizingCount === 0
                      ? "Zero pending bills"
                      : `${pendingSizingCount} bills pending payment`}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition" />
            </div>

            {/* Veatti Production */}
            <div
              onClick={() => onNavigate("veatti")}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">
                    Dhothi Production
                  </span>
                  <span className="text-xs text-slate-400">
                    Powerloom register & wage accounting
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition" />
            </div>

            {/* Saree Production */}
            <div
              onClick={() => onNavigate("saree")}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">
                    Saree Production
                  </span>
                  <span className="text-xs text-slate-400">
                    Saree loom contracts & registers
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition" />
            </div>

            {/* Govt Handover Stocks */}
            <div
              onClick={() => onNavigate("govt-handover")}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Send className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">
                    Govt Handover Stocks
                  </span>
                  <span className="text-xs text-slate-400">
                    Co-optex delivery challans & dispatch
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition" />
            </div>

            {/* Transport */}
            <div
              onClick={() => onNavigate("transport")}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">
                    Transport
                  </span>
                  <span className="text-xs text-slate-400">
                    {pendingTransportCount === 0
                      ? "Zero pending freight bills"
                      : `${pendingTransportCount} freight bills pending`}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
