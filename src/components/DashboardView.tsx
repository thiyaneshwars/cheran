"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Landmark,
  Coins,
  UserCheck,
  TrendingUp,
  Calendar,
  ChevronDown,
  ArrowRight,
  ArrowUpRight,
  MoreVertical,
  BarChart2,
  PieChart as PieChartIcon,
  Layers,
  Send,
  Warehouse,
  Factory,
  PackageCheck,
  AlertTriangle,
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
import {
  RevealBlock,
  WeaveRule,
  DispatchTickRail,
} from "./ui/ScrollReveal";

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
  const [productionFilter, setProductionFilter] = useState<
    "ALL" | "VEATTI" | "SAREE"
  >("ALL");

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
    totalProducedMeters:
      veattiProd.totalProducedMeters + sareeProd.totalProducedMeters,
    godownAvailableMeters:
      veattiProd.godownAvailableMeters + sareeProd.godownAvailableMeters,
    totalHandoveredMeters:
      veattiProd.totalHandoveredMeters + sareeProd.totalHandoveredMeters,
    targetMeters: (veattiProd.targetMeters || 0) + (sareeProd.targetMeters || 0),
    balanceToHandoverMeters:
      veattiProd.balanceToHandoverMeters + sareeProd.balanceToHandoverMeters,
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

  const treasuryBalance =
    data?.metrics?.treasuryBalance ??
    data?.bankDetails?.consolidatedBalance ??
    0;
  const totalTransactionsAmount =
    (data?.metrics?.totalIncome || 0) + (data?.metrics?.totalExpenses || 0);
  const consolidatedBankBalance =
    data?.metrics?.consolidatedBankBalance ?? data?.bankBalance ?? 0;
  const totalWagesAmount =
    data?.sectionSummaries?.dailyWage?.grossWages ??
    data?.sectionSummaries?.dailyWage?.totalCredited ??
    0;

  const recentTransactions = data?.recentTransactions || [];
  const monthlyChartData = data?.charts?.monthlyChart || [];

  const plSum = data?.sectionSummaries?.powerloom?.totalCredited || 0;
  const wageSum = data?.sectionSummaries?.dailyWage?.totalCredited || 0;
  const totalCategorySum = plSum + wageSum;

  const transactionPieData =
    totalCategorySum > 0
      ? [
          {
            name: "Powerloom Production",
            value: Math.round((plSum / totalCategorySum) * 100),
            color: "#14233C",
            amount: plSum,
          },
          {
            name: "Weaver Wages",
            value: Math.round((wageSum / totalCategorySum) * 100),
            color: "#B47B2B",
            amount: wageSum,
          },
        ].filter((p) => p.amount > 0)
      : [];

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "long",
  });

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#14233C] text-white rounded-xl px-3.5 py-2 border border-[#B47B2B]/60 text-center">
          <p className="font-financial text-xs font-bold">
            {formatINR(payload[0]?.value || 0)}
          </p>
          <p className="text-[10px] text-[#E7C37B] mt-0.5">
            {label || payload[0]?.payload?.month || ""}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-6 sm:px-8 py-6 space-y-6 max-w-[1600px] mx-auto text-[#14233C]">
      {/* 1. Official Society Executive Masthead Banner */}
      <div className="relative rounded-2xl bg-white border border-[#D4CAB0] overflow-hidden p-6 sm:p-7 flex flex-col md:flex-row justify-between items-start md:items-center min-h-[144px]">
        <div className="absolute top-0 right-0 bottom-0 w-full md:w-[46%] z-0 pointer-events-none">
          <Image
            src="/images/textile_loom_banner.jpg"
            alt="Textile Loom Machinery"
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover object-right opacity-85"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent" />
        </div>

        <div className="relative z-10 max-w-xl space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#ECFDF5] text-[#166534] border border-[#BBF7D0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#166534]" />
              Live Operations Active
            </span>
            <span className="font-financial text-xs font-semibold text-[#5B6B84]">
              Reg. No. SL-204
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-[28px] font-bold text-[#14233C] tracking-tight leading-tight">
            Cheran Co-operative Society Ltd.
          </h2>
          <p className="text-xs sm:text-[13px] text-[#5B6B84] font-medium">
            Handloom &amp; Powerloom Weavers Accounting · Transparent Double-Entry &amp; Dispatch Ledger
          </p>
        </div>

        <div className="relative z-10 mt-4 md:mt-0 bg-[#FAF7F0] border border-[#DED5C0] rounded-xl px-4 py-2.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#14233C] text-[#E7C37B] flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-semibold text-[#5B6B84] uppercase tracking-wider">
              Ledger Date
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#14233C]">
              {todayFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E5DEC9] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F0] border border-[#E5DEC9] flex items-center justify-center text-[#14233C] flex-shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-[#5B6B84]">
              Society Treasury
            </span>
            <span className="font-financial text-2xl font-bold text-[#14233C] tracking-tight mt-0.5 truncate">
              {formatINR(treasuryBalance)}
            </span>
            <span className="text-xs font-semibold text-[#166534] flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>FY 2026-27 Active</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5DEC9] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#FEF5E4] border border-[#E7C37B] flex items-center justify-center text-[#92611D] flex-shrink-0">
            <Coins className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-[#5B6B84]">
              Total Transactions
            </span>
            <span className="font-financial text-2xl font-bold text-[#14233C] tracking-tight mt-0.5 truncate">
              {formatINR(totalTransactionsAmount)}
            </span>
            <span className="text-xs font-medium text-[#5B6B84] mt-1">
              {recentTransactions.length} recent vouchers
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("banks")}
          className="bg-white rounded-xl border border-[#E5DEC9] p-5 flex items-center gap-4 hover:bg-[#FAF7F0] transition text-left cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] border border-[#BBF7D0] flex items-center justify-center text-[#166534] flex-shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-[#5B6B84]">
              Consolidated Bank Books
            </span>
            <span className="font-financial text-2xl font-bold text-[#14233C] tracking-tight mt-0.5 truncate">
              {formatINR(consolidatedBankBalance)}
            </span>
            <span className="text-xs font-semibold text-[#166534] mt-1">
              {data?.bankAccounts?.length || 0} active accounts →
            </span>
          </div>
        </button>

        <div className="bg-white rounded-xl border border-[#E5DEC9] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F0] border border-[#E5DEC9] flex items-center justify-center text-[#14233C] flex-shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-[#5B6B84]">
              Daily Wages (This Month)
            </span>
            <span className="font-financial text-2xl font-bold text-[#14233C] tracking-tight mt-0.5 truncate">
              {formatINR(totalWagesAmount)}
            </span>
            <span className="text-xs font-medium text-[#5B6B84] mt-1">
              Settled: {formatINR(data?.sectionSummaries?.dailyWage?.amountSettled || 0)}
            </span>
          </div>
        </div>
      </div>

      <WeaveRule label="Production & Central Godown Piece Inventory" />

      {/* 2b. Govt Scheme Production & Godown Stock Inventory */}
      <RevealBlock>
        <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5DEC9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF5E4] border border-[#E7C37B] text-[#92611D] flex items-center justify-center">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-[#14233C] tracking-tight">
                    Govt Scheme Production &amp; Godown Stock
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#ECFDF5] text-[#166534] border border-[#BBF7D0]">
                    Live Sync
                  </span>
                </div>
                <p className="text-xs text-[#5B6B84] mt-0.5">
                  Physical piece stock woven on powerlooms, held in central godown, and handed over to Co-optex
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-[#FAF7F0] border border-[#E5DEC9] p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setProductionFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    productionFilter === "ALL"
                      ? "bg-[#14233C] text-white"
                      : "text-[#5B6B84] hover:text-[#14233C]"
                  }`}
                >
                  All Combined
                </button>
                <button
                  type="button"
                  onClick={() => setProductionFilter("VEATTI")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    productionFilter === "VEATTI"
                      ? "bg-[#166534] text-white"
                      : "text-[#5B6B84] hover:text-[#166534]"
                  }`}
                >
                  Dhothi Scheme
                </button>
                <button
                  type="button"
                  onClick={() => setProductionFilter("SAREE")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    productionFilter === "SAREE"
                      ? "bg-[#B47B2B] text-white"
                      : "text-[#5B6B84] hover:text-[#92611D]"
                  }`}
                >
                  Saree Scheme
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onNavigate("saree")}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E7C37B] bg-[#FEF5E4] hover:bg-[#FDF0D5] text-[#92611D] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Saree Looms</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("veatti")}
                  className="px-2.5 py-1.5 rounded-lg border border-[#BBF7D0] bg-[#ECFDF5] hover:bg-[#DCFCE7] text-[#166534] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Dhothi Looms</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("govt-handover")}
                  className="px-2.5 py-1.5 rounded-lg border border-[#D4CAB0] bg-[#FAF7F0] hover:bg-[#F3EEE3] text-[#14233C] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Govt Handover</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <DispatchTickRail
            produced={activeProd.totalProducedMeters || 0}
            godown={activeProd.godownAvailableMeters || 0}
            handedOver={activeProd.totalHandoveredMeters || 0}
            target={
              activeProd.targetMeters ||
              (productionFilter === "ALL"
                ? (veattiProd.targetMeters || 0) + (sareeProd.targetMeters || 0)
                : 0)
            }
            unitLabel={activeUnitLabel}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF7F0]/65">
              <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B84]">
                <span>Loom Produced</span>
                <Factory className="h-4 w-4 text-[#166534]" />
              </div>
              <div className="mt-2 font-financial text-2xl font-bold text-[#14233C]">
                {(activeProd.totalProducedMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="font-sans text-xs font-semibold text-[#166534]">
                  {activeUnitLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#5B6B84]">
                Active loom cumulative weave
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#D49A42] bg-[#FEF9EE]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#78531E]">
                <span>Godown Ready Stock</span>
                <Warehouse className="h-4 w-4 text-[#B47B2B]" />
              </div>
              <div className="mt-2 font-financial text-2xl font-bold text-[#14233C]">
                {(activeProd.godownAvailableMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="font-sans text-xs font-semibold text-[#B47B2B]">
                  {activeUnitLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#78531E]">
                {(activeProd.totalProducedMeters || 0).toLocaleString("en-IN")} −{" "}
                {(activeProd.totalHandoveredMeters || 0).toLocaleString("en-IN")} dispatched
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF7F0]/65">
              <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B84]">
                <span>Handed Over to Govt</span>
                <PackageCheck className="h-4 w-4 text-[#14233C]" />
              </div>
              <div className="mt-2 font-financial text-2xl font-bold text-[#14233C]">
                {(activeProd.totalHandoveredMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="font-sans text-xs font-semibold text-[#14233C]">
                  {activeUnitLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#5B6B84]">
                Signed Co-optex challan deliveries
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#FDBA74]/70 bg-[#FFF7ED]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#9A3412]">
                <span>Pending Quota Deficit</span>
                <AlertTriangle className="h-4 w-4 text-[#9A3412]" />
              </div>
              <div className="mt-2 font-financial text-2xl font-bold text-[#9A3412]">
                -{(activeProd.balanceToHandoverMeters || 0).toLocaleString("en-IN")}{" "}
                <span className="font-sans text-xs font-semibold">
                  {activeUnitLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#9A3412]/80">
                Remaining quota to be fulfilled
              </p>
            </div>
          </div>

          {/* Variety Breakdown Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-[#E5DEC9] text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F0] border border-[#E5DEC9]">
              <span className="font-semibold text-[#14233C]">
                Dhothi Godown ({veattiProd.unitCount || 3} Looms)
              </span>
              <span className="font-financial font-bold text-[#14233C]">
                {(veattiProd.godownAvailableMeters || 0).toLocaleString("en-IN")} Dhothis
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F0] border border-[#E5DEC9]">
              <span className="font-semibold text-[#14233C]">
                Saree Godown ({sareeProd.unitCount || 6} Looms)
              </span>
              <span className="font-financial font-bold text-[#14233C]">
                {(sareeProd.godownAvailableMeters || 0).toLocaleString("en-IN")} Sarees
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FEF9EE] border border-[#D49A42]/60 sm:col-span-2 lg:col-span-1">
              <span className="font-bold text-[#78531E]">
                Consolidated Godown Stock
              </span>
              <span className="font-financial font-bold text-[#14233C] text-sm">
                {(consolidatedProd.godownAvailableMeters || 0).toLocaleString("en-IN")} Pieces
              </span>
            </div>
          </div>
        </div>
      </RevealBlock>

      <WeaveRule label="Financial Cashflow & Category Analytics" />

      {/* 3. Financial Overview & Transaction Summary Charts */}
      <RevealBlock>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5DEC9] p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h3 className="font-display text-lg font-bold text-[#14233C]">
                Financial Overview
              </h3>

              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-4 text-xs font-medium text-[#5B6B84]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#14233C]" />
                    <span>Income</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B47B2B]" />
                    <span>Expense</span>
                  </div>
                </div>

                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5DEC9] bg-[#FAF7F0] text-xs font-semibold text-[#14233C]">
                  <span>{selectedYear}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#5B6B84]" />
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full flex items-center justify-center">
              {monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyChartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14233C" stopOpacity={0.14} />
                        <stop offset="95%" stopColor="#14233C" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B47B2B" stopOpacity={0.14} />
                        <stop offset="95%" stopColor="#B47B2B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#5B6B84", fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#5B6B84", fontSize: 11 }}
                      tickFormatter={(val) => (val === 0 ? "0" : `${val}`)}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#14233C"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      dot={{ r: 3, fill: "#14233C", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#14233C" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#B47B2B"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorExpense)"
                      dot={{ r: 3, fill: "#B47B2B", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#B47B2B" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#FAF7F0] rounded-xl border border-dashed border-[#D4CAB0]">
                  <TrendingUp className="h-6 w-6 text-[#8A94A6] mb-2" />
                  <p className="text-sm font-bold text-[#14233C]">
                    No Financial Data Recorded Yet
                  </p>
                  <p className="text-xs text-[#5B6B84] max-w-sm mt-1">
                    Income and expense trajectories populate automatically as Society bills and vouchers are posted.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5DEC9] p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#14233C]">
                Transaction Summary
              </h3>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5DEC9] bg-[#FAF7F0] text-xs font-semibold text-[#14233C]">
                <span>{selectedMonth}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#5B6B84]" />
              </span>
            </div>

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
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-financial text-xs font-bold text-[#14233C] leading-none">
                      {formatINR(totalCategorySum)}
                    </span>
                    <span className="text-[10px] font-medium text-[#5B6B84] mt-1">
                      Total Volume
                    </span>
                  </div>
                </div>

                <div className="flex flex-col space-y-2.5 w-full max-w-[190px]">
                  {transactionPieData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs font-medium text-[#475569]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="font-financial font-bold text-[#14233C] ml-2">
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 w-full text-center p-4 bg-[#FAF7F0] rounded-xl border border-dashed border-[#D4CAB0]">
                <PieChartIcon className="h-6 w-6 text-[#8A94A6] mb-2" />
                <p className="text-xs font-bold text-[#14233C]">
                  No Operational Volume
                </p>
                <p className="text-[11px] text-[#5B6B84] mt-0.5 max-w-[200px]">
                  Section breakdown updates once loom bills and wages settle.
                </p>
              </div>
            )}
          </div>
        </div>
      </RevealBlock>

      {/* 4. Quick Navigation Shortcuts */}
      <RevealBlock>
        <div>
          <h3 className="font-display text-lg font-bold text-[#14233C] mb-3">
            Quick Workspace Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <button
              type="button"
              onClick={() => onNavigate("saree")}
              className="bg-white border border-[#E5DEC9] rounded-xl p-4 flex items-center justify-between hover:border-[#B47B2B] hover:bg-[#FEF9EE]/50 transition cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#FEF5E4] text-[#92611D] flex items-center justify-center flex-shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#14233C] truncate">
                  Saree Production
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("veatti")}
              className="bg-white border border-[#E5DEC9] rounded-xl p-4 flex items-center justify-between hover:border-[#166534] hover:bg-[#ECFDF5]/40 transition cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#ECFDF5] text-[#166534] flex items-center justify-center flex-shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#14233C] truncate">
                  Dhothi Production
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
            </button>

            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="bg-white border border-[#E5DEC9] rounded-xl p-4 flex items-center justify-between hover:border-[#14233C] hover:bg-[#FAF7F0] transition cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#FAF7F0] border border-[#E5DEC9] text-[#14233C] flex items-center justify-center flex-shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#14233C] truncate">
                  New Transaction
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("govt-handover")}
              className="bg-white border border-[#E5DEC9] rounded-xl p-4 flex items-center justify-between hover:border-[#14233C] hover:bg-[#FAF7F0] transition cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#14233C] text-[#E7C37B] flex items-center justify-center flex-shrink-0">
                  <Send className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#14233C] truncate">
                  Govt Handover
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="bg-white border border-[#E5DEC9] rounded-xl p-4 flex items-center justify-between hover:border-[#14233C] hover:bg-[#FAF7F0] transition cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#FAF7F0] border border-[#E5DEC9] text-[#14233C] flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#14233C] truncate">
                  Generate Report
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
            </button>
          </div>
        </div>
      </RevealBlock>

      <WeaveRule label="Recent Ledger Vouchers & Active Loom Modules" />

      {/* 5. Bottom Section: Recent Transactions & Active Operations */}
      <RevealBlock>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5DEC9] p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-[#14233C]">
                Recent Transactions
              </h3>
              <button
                type="button"
                onClick={() => onNavigate("transactions")}
                className="text-xs font-semibold text-[#5B6B84] hover:text-[#14233C] transition cursor-pointer"
              >
                View All →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                    <th className="py-2.5 px-3 font-semibold">Amount</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EADC] text-[#25344D]">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((txn: any) => {
                      const d = new Date(txn.transactionDate || txn.createdAt);
                      const formattedDate = d.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <tr key={txn.id} className="hover:bg-[#FAF7F0] transition">
                          <td className="py-3 px-3 text-[#5B6B84]">
                            {formattedDate}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => onNavigate("transactions")}
                              className="font-semibold text-[#14233C] underline underline-offset-2 hover:text-[#B47B2B] cursor-pointer"
                            >
                              {txn.section || "General"}
                            </button>
                          </td>
                          <td className="py-3 px-3 font-medium text-[#25344D]">
                            {txn.notes || txn.counterparty || txn.referenceNo}
                          </td>
                          <td className="py-3 px-3 font-financial font-bold text-[#14233C]">
                            {formatINR(txn.amount)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                                txn.status === "POSTED"
                                  ? "bg-[#ECFDF5] text-[#166534] border-[#BBF7D0]"
                                  : txn.status === "REVERSED"
                                  ? "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
                                  : "bg-[#FEF5E4] text-[#92611D] border-[#E7C37B]"
                              }`}
                            >
                              {txn.status || "POSTED"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onNavigate("transactions")}
                              aria-label="Inspect transaction"
                              className="text-[#8A94A6] hover:text-[#14233C] cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#5B6B84]">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Coins className="h-6 w-6 text-[#C7BFA9]" />
                          <span className="text-sm font-bold text-[#14233C]">
                            No Recent Transactions
                          </span>
                          <span className="text-xs text-[#5B6B84]">
                            Transactions and bank settlements appear here in real time
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5DEC9] p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#14233C]">
                Active Operations
              </h3>
              <button
                type="button"
                onClick={() => onNavigate("veatti")}
                className="text-xs font-semibold text-[#5B6B84] hover:text-[#14233C] transition cursor-pointer"
              >
                Open Looms →
              </button>
            </div>

            <div className="space-y-3 my-auto">
              <button
                type="button"
                onClick={() => onNavigate("veatti")}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF7F0] border border-transparent hover:border-[#E5DEC9] transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#166534] flex-shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#14233C]">
                      Dhothi Production
                    </span>
                    <span className="text-xs text-[#5B6B84]">
                      Powerloom register &amp; wage accounting
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("saree")}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF7F0] border border-transparent hover:border-[#E5DEC9] transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#FEF5E4] flex items-center justify-center text-[#92611D] flex-shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#14233C]">
                      Saree Production
                    </span>
                    <span className="text-xs text-[#5B6B84]">
                      Saree loom contracts &amp; registers
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("govt-handover")}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF7F0] border border-transparent hover:border-[#E5DEC9] transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#14233C] flex items-center justify-center text-[#E7C37B] flex-shrink-0">
                    <Send className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#14233C]">
                      Govt Handover Stocks
                    </span>
                    <span className="text-xs text-[#5B6B84]">
                      Co-optex delivery challans &amp; dispatch
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("govt-yarn")}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF7F0] border border-transparent hover:border-[#E5DEC9] transition cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#FAF7F0] border border-[#E5DEC9] flex items-center justify-center text-[#14233C] flex-shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#14233C]">
                      Govt Yarn Inward Allotment
                    </span>
                    <span className="text-xs text-[#5B6B84]">
                      Raw yarn bales &amp; quota balances
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        </div>
      </RevealBlock>
    </div>
  );
};
