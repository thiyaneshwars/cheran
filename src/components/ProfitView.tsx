"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  Download,
  Printer,
  Layers,
  Cpu,
  Users,
  Truck,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

export const ProfitView: React.FC = () => {
  const [profitData, setProfitData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchProfit = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/profit", window.location.origin);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);

      const res = await fetch(url.toString());
      const data = await res.json();
      setProfitData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfit();
  }, [startDate, endDate]);

  if (loading || !profitData) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#245B52] border-t-transparent" />
        <span className="text-sm font-medium text-[#68756F]">
          Calculating profit and loss statement...
        </span>
      </div>
    );
  }

  const exportReport = () => {
    const rows = [
      { Metric: "Sizing Mill Revenue", Amount: profitData.sizingRevenue },
      { Metric: "Powerloom Revenue", Amount: profitData.powerloomRevenue },
      { Metric: "Total Operational Revenue", Amount: profitData.totalRevenue },
      { Metric: "Direct Operating Costs", Amount: profitData.directCosts },
      { Metric: "Gross Profit", Amount: profitData.grossProfit },
      { Metric: "Daily Wages Expense", Amount: profitData.wageExpense },
      { Metric: "Transport Expense", Amount: profitData.transportExpense },
      { Metric: "Other Operating Expenses", Amount: profitData.otherExpenses },
      { Metric: "Total All Expenses", Amount: profitData.totalExpenses },
      { Metric: "Net Profit", Amount: profitData.netProfit },
      {
        Metric: "Profit Margin (%)",
        Amount: profitData.profitMarginPercent !== null ? `${profitData.profitMarginPercent}%` : "N/A",
      },
    ];
    exportToCSV("Profit_and_Loss_Statement", rows);
  };

  const isProfit = profitData.netProfit >= 0;

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Top Filter & Print bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E9E3] no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#26332F] tracking-tight">
            Profit & Loss Statement
          </h1>
          <p className="text-[14px] text-[#68756F] mt-0.5">
            Operating profit and loss statement • Single-expense recognition operational statement
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-white px-3 py-1.5 text-xs text-[#26332F]">
            <Calendar className="h-4 w-4 text-[#68756F]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent outline-none"
            />
            <span className="text-[#8E9B95]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent outline-none"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-white hover:bg-[#F7F8F5] px-4 py-2.5 text-[14px] font-semibold text-[#26332F] shadow-xs transition"
          >
            <Printer className="h-4 w-4 text-[#68756F]" />
            <span>Print Statement</span>
          </button>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-[14px] font-semibold text-white shadow-xs transition"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Two Primary Columns: Revenue and Net Profit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Total Revenue */}
        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-7 sm:p-8 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[15px] font-bold text-[#26332F] block">
                Total Operational Turnover
              </span>
              <span className="text-[13px] text-[#68756F]">
                Recognized operational revenue
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#F0F6F3] text-[#245B52] flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="text-4xl sm:text-5xl font-bold text-[#26332F] font-financial pt-1">
            {formatINR(profitData.totalRevenue)}
          </div>
          <p className="text-[13px] text-[#68756F] leading-relaxed">
            Combined billing turnover from Sizing ({formatINR(profitData.sizingRevenue)}) and Powerloom fabric production ({formatINR(profitData.powerloomRevenue)}).
          </p>
        </div>

        {/* Column 2: Net Profit */}
        <div
          className={`rounded-2xl border p-7 sm:p-8 shadow-xs space-y-3 ${
            isProfit
              ? "border-[#C8E5D5] bg-[#EBF5F0]/60"
              : "border-[#F7D2D2] bg-[#FDF2F2]/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[15px] font-bold text-[#26332F] block">
                Net Society Profit
              </span>
              <span className="text-[13px] text-[#68756F]">
                Net operating surplus
              </span>
            </div>
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isProfit ? "bg-[#C8E5D5] text-[#246944]" : "bg-[#F7D2D2] text-[#B93838]"
              }`}
            >
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div
            className={`text-4xl sm:text-5xl font-bold font-financial pt-1 ${
              isProfit ? "text-[#246944]" : "text-[#B93838]"
            }`}
          >
            {formatINR(profitData.netProfit)}
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#68756F]">Net = Total Revenue − Total Expenses</span>
            <span className="font-bold text-[#246944] bg-white px-2.5 py-1 rounded-lg border border-[#C8E5D5]">
              Operating Margin: {profitData.profitMarginPercent !== null ? `${profitData.profitMarginPercent}%` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Supporting Financial Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-4 shadow-xs space-y-1">
          <span className="text-[12px] font-semibold text-[#68756F]">Gross Profit</span>
          <div className="text-xl font-bold text-[#26332F] font-financial">
            {formatINR(profitData.grossProfit)}
          </div>
          <p className="text-[11px] text-[#8E9B95]">Revenue − Direct</p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-4 shadow-xs space-y-1">
          <span className="text-[12px] font-semibold text-[#68756F]">Direct Costs</span>
          <div className="text-xl font-bold text-[#26332F] font-financial">
            {formatINR(profitData.directCosts)}
          </div>
          <p className="text-[11px] text-[#8E9B95]">Sizing chemicals & power</p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-4 shadow-xs space-y-1">
          <span className="text-[12px] font-semibold text-[#68756F]">Daily Wages</span>
          <div className="text-xl font-bold text-[#26332F] font-financial">
            {formatINR(profitData.wageExpense)}
          </div>
          <p className="text-[11px] text-[#8E9B95]">Weaver labor wages</p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-4 shadow-xs space-y-1">
          <span className="text-[12px] font-semibold text-[#68756F]">Transport</span>
          <div className="text-xl font-bold text-[#26332F] font-financial">
            {formatINR(profitData.transportExpense)}
          </div>
          <p className="text-[11px] text-[#8E9B95]">Lorry freight charges</p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E3] bg-white p-4 shadow-xs space-y-1">
          <span className="text-[12px] font-semibold text-[#68756F]">Total Expenses</span>
          <div className="text-xl font-bold text-[#B93838] font-financial">
            {formatINR(profitData.totalExpenses)}
          </div>
          <p className="text-[11px] text-[#8E9B95]">All operating costs</p>
        </div>

        <div className="rounded-2xl border border-[#C8E5D5] bg-[#EBF5F0]/60 p-4 shadow-xs space-y-1">
          <span className="text-[12px] font-semibold text-[#246944]">Margin (%)</span>
          <div className="text-xl font-bold text-[#246944] font-financial">
            {profitData.profitMarginPercent !== null ? `${profitData.profitMarginPercent}%` : "N/A"}
          </div>
          <p className="text-[11px] text-[#246944]/80">Net Profit / Revenue</p>
        </div>
      </div>

      {/* =========================================================================
       * GOVT FREE DHOTHI & SAREE SCHEME PROFIT TALLY
       * ========================================================================= */}
      {profitData.govtSchemeProfit && (
        <div className="rounded-3xl border border-indigo-200/90 bg-linear-to-br from-indigo-50/70 via-white to-blue-50/50 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1">
                <Layers className="h-4 w-4" />
                <span>Tamil Nadu Free Dhothi & Saree Scheme</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>Co-optex Govt Scheme Profit Tally</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-mono">
                  அரசு திட்ட லாப கணக்கு
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Profit Formula: <strong>Co-optex Piece Rate − Weaver Wages (₹19 Dhothi / ₹42 Saree) = Society Net Profit</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-mono shadow-2xs">
                Dhothi Wage: ₹19 / pc
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-mono shadow-2xs">
                Saree Wage: ₹42 / pc
              </span>
            </div>
          </div>

          {/* Scheme Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Co-optex Revenue
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatINR(profitData.govtSchemeProfit.totalSchemeRevenue)}
              </div>
              <p className="text-[11px] text-slate-400">
                {(profitData.govtSchemeProfit.dhothi.handoverPieces + profitData.govtSchemeProfit.saree.handoverPieces).toLocaleString()} pcs delivered
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Total Weaver Wages
              </span>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {formatINR(profitData.govtSchemeProfit.totalSchemeWeaverWages)}
              </div>
              <p className="text-[11px] text-slate-400">
                ₹19/Dhothi & ₹42/Saree to powerloom weavers
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Society Scheme Profit
              </span>
              <div className="text-2xl font-black text-emerald-800 font-mono">
                {formatINR(profitData.govtSchemeProfit.totalSchemeProfit)}
              </div>
              <p className="text-[11px] text-emerald-700">
                Net society margin after weaver disbursements
              </p>
            </div>
          </div>

          {/* Detailed Tally Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Scheme Product</th>
                  <th className="py-3 px-4 text-center">Handovered (Pcs)</th>
                  <th className="py-3 px-4 text-right">Govt Piece Rate</th>
                  <th className="py-3 px-4 text-right">Weaver Wage / Pc</th>
                  <th className="py-3 px-4 text-right">Society Margin / Pc</th>
                  <th className="py-3 px-4 text-right">Total Govt Revenue</th>
                  <th className="py-3 px-4 text-right">Total Weaver Wages</th>
                  <th className="py-3 px-4 text-right font-black">Net Society Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {/* Dhothi Row */}
                <tr className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Dhothi (வேட்டி) Scheme</span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                    {profitData.govtSchemeProfit.dhothi.handoverPieces.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ₹{profitData.govtSchemeProfit.dhothi.govtRate}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600 font-bold">
                    ₹{profitData.govtSchemeProfit.dhothi.weaverRate}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                    ₹{profitData.govtSchemeProfit.dhothi.profitPerPiece}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 font-bold">
                    {formatINR(profitData.govtSchemeProfit.dhothi.totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600">
                    {formatINR(profitData.govtSchemeProfit.dhothi.totalWeaverExpense)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {formatINR(profitData.govtSchemeProfit.dhothi.netProfit)}
                  </td>
                </tr>

                {/* Saree Row */}
                <tr className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>Saree (சேலை) Scheme</span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                    {profitData.govtSchemeProfit.saree.handoverPieces.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ₹{profitData.govtSchemeProfit.saree.govtRate}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600 font-bold">
                    ₹{profitData.govtSchemeProfit.saree.weaverRate}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                    ₹{profitData.govtSchemeProfit.saree.profitPerPiece}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 font-bold">
                    {formatINR(profitData.govtSchemeProfit.saree.totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600">
                    {formatINR(profitData.govtSchemeProfit.saree.totalWeaverExpense)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {formatINR(profitData.govtSchemeProfit.saree.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formal Statement of Profit & Loss Table */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white shadow-xs overflow-hidden printable-area">
        <div className="border-b border-[#E5E9E3] bg-[#F7F8F5] px-7 py-5 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-[#26332F]">
              Formal Statement of Profit and Loss
            </h3>
            <p className="text-[13px] text-[#68756F]">
              Verified double-entry ledger accounts • Single-expense recognition audit standard
            </p>
          </div>
          <span className="rounded-xl border border-[#DCEAE2] bg-white px-3 py-1 text-xs font-semibold text-[#245B52]">
            Cheran Society SL-204
          </span>
        </div>

        <div className="p-7">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E9E3] text-[#26332F] font-semibold text-[13px]">
                <th className="py-3.5 text-left">Account Description / Particulars</th>
                <th className="py-3.5 text-left">Code</th>
                <th className="py-3.5 text-right">Debit / Cost (₹)</th>
                <th className="py-3.5 text-right">Credit / Income (₹)</th>
                <th className="py-3.5 text-right font-bold">Net Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
              {/* Revenue */}
              <tr className="bg-[#F7F8F5]">
                <td colSpan={5} className="py-3 font-bold text-xs uppercase tracking-wider text-[#245B52]">
                  I. Operational Revenue
                </td>
              </tr>
              <tr>
                <td className="py-3 pl-4 font-medium">Sizing Mill Billing Turnover</td>
                <td className="py-3 font-mono text-[#68756F]">4000</td>
                <td className="py-3 text-right text-[#8E9B95]">-</td>
                <td className="py-3 text-right font-medium">{formatINR(profitData.sizingRevenue)}</td>
                <td className="py-3 text-right font-bold text-[#246944] font-financial">
                  {formatINR(profitData.sizingRevenue)}
                </td>
              </tr>
              <tr>
                <td className="py-3 pl-4 font-medium">Powerloom Weaving Contracts</td>
                <td className="py-3 font-mono text-[#68756F]">4100</td>
                <td className="py-3 text-right text-[#8E9B95]">-</td>
                <td className="py-3 text-right font-medium">{formatINR(profitData.powerloomRevenue)}</td>
                <td className="py-3 text-right font-bold text-[#246944] font-financial">
                  {formatINR(profitData.powerloomRevenue)}
                </td>
              </tr>
              {profitData.babinRevenue > 0 && (
                <tr>
                  <td className="py-3 pl-4 font-medium">Babin / Zari Set Production Turnover (@ ₹450)</td>
                  <td className="py-3 font-mono text-[#68756F]">4200</td>
                  <td className="py-3 text-right text-[#8E9B95]">-</td>
                  <td className="py-3 text-right font-medium">{formatINR(profitData.babinRevenue)}</td>
                  <td className="py-3 text-right font-bold text-[#246944] font-financial">
                    {formatINR(profitData.babinRevenue)}
                  </td>
                </tr>
              )}
              <tr className="bg-[#F0F6F3] font-semibold">
                <td className="py-3 pl-4 text-[#245B52]">Total Turnover (Revenue - A)</td>
                <td></td>
                <td className="text-right text-[#8E9B95]">-</td>
                <td className="text-right font-bold">{formatINR(profitData.totalRevenue)}</td>
                <td className="py-3 text-right font-bold text-[#245B52] font-financial text-[15px]">
                  {formatINR(profitData.totalRevenue)}
                </td>
              </tr>

              {/* Direct Costs */}
              <tr className="bg-[#F7F8F5]">
                <td colSpan={5} className="py-3 font-bold text-xs uppercase tracking-wider text-[#26332F]">
                  II. Direct Operational Costs
                </td>
              </tr>
              <tr>
                <td className="py-3 pl-4 font-medium">Sizing Chemicals, Starch & Maintenance</td>
                <td className="py-3 font-mono text-[#68756F]">5000</td>
                <td className="py-3 text-right font-medium">{formatINR(profitData.directCosts)}</td>
                <td className="py-3 text-right text-[#8E9B95]">-</td>
                <td className="py-3 text-right font-bold text-[#B93838] font-financial">
                  {formatINR(profitData.directCosts)}
                </td>
              </tr>
              <tr className="bg-[#F7F8F5] font-semibold">
                <td className="py-3 pl-4">Gross Operating Profit (Turnover − Direct Costs)</td>
                <td></td>
                <td></td>
                <td></td>
                <td className="py-3 text-right font-bold text-[#26332F] font-financial text-[15px]">
                  {formatINR(profitData.grossProfit)}
                </td>
              </tr>

              {/* Operating Expenses */}
              <tr className="bg-[#F7F8F5]">
                <td colSpan={5} className="py-3 font-bold text-xs uppercase tracking-wider text-[#26332F]">
                  III. Operating Expenses
                </td>
              </tr>
              <tr>
                <td className="py-3 pl-4 font-medium">Weaver & Labor Daily Wages</td>
                <td className="py-3 font-mono text-[#68756F]">5100</td>
                <td className="py-3 text-right font-medium">{formatINR(profitData.wageExpense)}</td>
                <td className="py-3 text-right text-[#8E9B95]">-</td>
                <td className="py-3 text-right font-bold text-[#B93838] font-financial">
                  {formatINR(profitData.wageExpense)}
                </td>
              </tr>
              {profitData.babinWageExpense > 0 && (
                <tr>
                  <td className="py-3 pl-4 font-medium">Babin Set Weaver Wages (@ ₹250/Set)</td>
                  <td className="py-3 font-mono text-[#68756F]">5150</td>
                  <td className="py-3 text-right font-medium">{formatINR(profitData.babinWageExpense)}</td>
                  <td className="py-3 text-right text-[#8E9B95]">-</td>
                  <td className="py-3 text-right font-bold text-[#B93838] font-financial">
                    {formatINR(profitData.babinWageExpense)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-3 pl-4 font-medium">Transportation & Lorry Freight</td>
                <td className="py-3 font-mono text-[#68756F]">5200</td>
                <td className="py-3 text-right font-medium">{formatINR(profitData.transportExpense)}</td>
                <td className="py-3 text-right text-[#8E9B95]">-</td>
                <td className="py-3 text-right font-bold text-[#B93838] font-financial">
                  {formatINR(profitData.transportExpense)}
                </td>
              </tr>
              <tr>
                <td className="py-3 pl-4 font-medium">General Operating Expenses</td>
                <td className="py-3 font-mono text-[#68756F]">5300</td>
                <td className="py-3 text-right font-medium">{formatINR(profitData.otherExpenses)}</td>
                <td className="py-3 text-right text-[#8E9B95]">-</td>
                <td className="py-3 text-right font-bold text-[#B93838] font-financial">
                  {formatINR(profitData.otherExpenses)}
                </td>
              </tr>
              <tr className="bg-[#FDF2F2] font-semibold">
                <td className="py-3 pl-4 text-[#B93838]">Total Operating Expenses (B = II + III)</td>
                <td></td>
                <td className="text-right font-bold text-[#B93838]">{formatINR(profitData.totalExpenses)}</td>
                <td className="text-right text-[#8E9B95]">-</td>
                <td className="py-3 text-right font-bold text-[#B93838] font-financial text-[15px]">
                  {formatINR(profitData.totalExpenses)}
                </td>
              </tr>

              {/* Net Profit */}
              <tr className="bg-[#EBF5F0] font-bold">
                <td className="py-4 pl-4 text-[#246944] text-[15px]">
                  NET OPERATING PROFIT (A − B)
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td className="py-4 text-right font-bold text-[#246944] text-lg font-financial">
                  {formatINR(profitData.netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
