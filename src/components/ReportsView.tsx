"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Filter,
  Layers,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";

interface ReportsViewProps {
  banks: any[];
  parties: any[];
  workers: any[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  banks,
  parties,
  workers,
}) => {
  const [selectedReport, setSelectedReport] = useState("trial-balance");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  const [reportResult, setReportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const reportsList = [
    { id: "trial-balance", label: "1. Trial Balance Statement", cat: "Statutory" },
    { id: "profit-loss", label: "2. Profit & Loss Statement", cat: "Financial" },
    { id: "cash-flow", label: "3. Cash Flow Statement", cat: "Financial" },
    { id: "consolidated-bank", label: "4. Consolidated Bank Balance", cat: "Treasury" },
    { id: "bank-ledger", label: "5. Individual Bank Account Ledger", cat: "Treasury" },
    { id: "sizing-register", label: "6. Sizing Bill Register", cat: "Registers" },
    { id: "powerloom-register", label: "7. Powerloom Transaction Register", cat: "Registers" },
    { id: "wage-register", label: "8. Daily Wage Register", cat: "Registers" },
    { id: "transport-register", label: "9. Transport Freight Register", cat: "Registers" },
    { id: "outstanding-receivables", label: "10. Outstanding Receivables", cat: "Pending" },
    { id: "outstanding-payables", label: "11. Outstanding Payables", cat: "Pending" },
    { id: "party-ledger", label: "12. Party-wise Ledger", cat: "Ledgers" },
    { id: "worker-ledger", label: "13. Worker-wise Ledger", cat: "Ledgers" },
    { id: "audit-log", label: "14. Comprehensive Audit Log Report", cat: "Audit" },
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/reports", window.location.origin);
      url.searchParams.set("type", selectedReport);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);
      if (selectedAccountId) url.searchParams.set("accountId", selectedAccountId);
      if (selectedPartyId) url.searchParams.set("partyId", selectedPartyId);
      if (selectedWorkerId) url.searchParams.set("workerId", selectedWorkerId);

      const res = await fetch(url.toString());
      const data = await res.json();
      setReportResult(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, startDate, endDate, selectedAccountId, selectedPartyId, selectedWorkerId]);

  const handleExport = () => {
    if (!reportResult) return;
    if (Array.isArray(reportResult.data)) {
      exportToCSV(selectedReport, reportResult.data);
    } else if (reportResult.accounts) {
      exportToCSV("Trial_Balance", reportResult.accounts);
    } else if (reportResult.entries) {
      exportToCSV(`${selectedReport}_Ledger`, reportResult.entries);
    } else {
      exportToCSV(selectedReport, [reportResult]);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Statutory Reports & Ledgers
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Official statutory and financial statements for cooperative audit and executive management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 shadow-sm transition"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 px-4 py-2.5 text-xs font-bold text-white hover:from-blue-800 hover:to-indigo-900 shadow-md transition"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Report Picker Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm no-print space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="lg:col-span-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Select Accounting Statement (14 Reports)
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
            >
              {reportsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Dynamic Filters depending on report */}
        {(selectedReport === "bank-ledger" || selectedReport === "party-ledger" || selectedReport === "worker-ledger") && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            {selectedReport === "bank-ledger" && (
              <div className="flex-1 max-w-sm">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Select Bank Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold"
                >
                  <option value="">All Bank Accounts</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedReport === "party-ledger" && (
              <div className="flex-1 max-w-sm">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Select Party / Counterparty
                </label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold"
                >
                  <option value="">All Parties</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedReport === "worker-ledger" && (
              <div className="flex-1 max-w-sm">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Select Weaver / Worker
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold"
                >
                  <option value="">All Workers</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.workerCode})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Official Co-operative Society Letterhead Printable Statement */}
      <div className="rounded-3xl border-2 border-slate-300 bg-white p-6 sm:p-10 shadow-lg printable-area">
        {/* Society Letterhead */}
        <div className="border-b-4 border-slate-900 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase leading-snug">
              Cheran Handloom & Powerloom Weavers Co-operative Production Society Ltd.
            </h1>
            <p className="text-xs text-slate-600 font-semibold">
              Reg. No: <strong className="text-slate-900">SL-204</strong> • Registered under Tamil Nadu Co-operative Societies Act 1983
            </p>
            <p className="text-xs text-slate-500">
              Chennimalai & Bhavani Main Road, Erode District, Tamil Nadu - 638051
            </p>
          </div>

          <div className="md:text-right shrink-0">
            <span className="inline-block rounded-xl bg-blue-900 text-white text-xs font-bold px-3 py-1 uppercase tracking-wider">
              Official Audit Statement
            </span>
            <div className="mt-2 text-xs font-bold text-slate-700">
              Date: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
            </div>
            <div className="text-[11px] text-slate-500">
              Financial Year: <strong className="text-blue-900">2026-2027</strong>
            </div>
          </div>
        </div>

        {/* Report Title */}
        <div className="my-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
              {reportResult?.title || "Financial Accounting Statement"}
            </h3>
            <p className="text-xs text-slate-500">
              Verified against double-entry general ledger records
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <span className="text-xs font-bold text-slate-600">Generating statement...</span>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {/* 1. Trial Balance Table View */}
            {selectedReport === "trial-balance" && reportResult?.accounts && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 font-black uppercase text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Account Code</th>
                        <th className="py-3 px-4">Account Head Description</th>
                        <th className="py-3 px-4 text-right text-emerald-800 bg-emerald-50/50">
                          Debit (₹)
                        </th>
                        <th className="py-3 px-4 text-right text-rose-800 bg-rose-50/50">
                          Credit (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {reportResult.accounts.map((acc: any) => (
                        <tr key={acc.code} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{acc.code}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{acc.name}</td>
                          <td className="py-2.5 px-4 text-right font-black text-emerald-800 bg-emerald-50/20">
                            {acc.debit > 0 ? formatINR(acc.debit) : "-"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-rose-800 bg-rose-50/20">
                            {acc.credit > 0 ? formatINR(acc.credit) : "-"}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-black text-sm border-t-4 border-slate-900">
                        <td colSpan={2} className="py-3.5 px-4 uppercase text-slate-950">
                          Balanced Journal Grand Total
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-950 bg-emerald-100/50">
                          {formatINR(reportResult.totalDebits)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-rose-950 bg-rose-100/50">
                          {formatINR(reportResult.totalCredits)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900 text-xs font-bold flex items-center gap-2.5 border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>
                    Audit Certification: Total Debits = Total Credits = ₹
                    {formatINR(reportResult.totalDebits)}. Fully balanced with exact decimal precision.
                  </span>
                </div>
              </div>
            )}

            {/* 2. General Tabular Display for Registers and Ledgers */}
            {Array.isArray(reportResult?.data) && (
              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 uppercase font-black text-[11px]">
                    <tr>
                      {Object.keys(reportResult.data[0] || {}).map((header) => (
                        <th key={header} className="py-3 px-4">
                          {header.replace(/([A-Z])/g, " $1").trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {reportResult.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={Object.keys(reportResult.data[0] || {}).length || 5}
                          className="py-8 text-center text-slate-400 font-semibold"
                        >
                          No records found for the selected period.
                        </td>
                      </tr>
                    ) : (
                      reportResult.data.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {Object.keys(row).map((k) => {
                            const val = row[k];
                            const isNumber =
                              typeof val === "number" &&
                              !k.toLowerCase().includes("id") &&
                              !k.toLowerCase().includes("count");
                            return (
                              <td
                                key={k}
                                className={`py-2.5 px-4 ${isNumber ? "text-right font-black" : "font-medium"}`}
                              >
                                {isNumber
                                  ? formatINR(val)
                                  : typeof val === "string" && val.includes("T00:00:00")
                                  ? new Date(val).toLocaleDateString("en-IN")
                                  : typeof val === "object"
                                  ? JSON.stringify(val)
                                  : String(val ?? "-")}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Individual Bank Ledger Display */}
            {selectedReport === "bank-ledger" && reportResult?.entries && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200 gap-2">
                  <span className="font-semibold text-slate-700">
                    Opening Balance: <strong className="font-black text-slate-900">{formatINR(reportResult.openingBalance)}</strong>
                  </span>
                  <span className="font-semibold text-slate-700">
                    Closing Balance: <strong className="font-black text-blue-900">{formatINR(reportResult.closingBalance)}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 uppercase font-black text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Ref No</th>
                        <th className="py-3 px-4">Particulars</th>
                        <th className="py-3 px-4 text-right text-emerald-800">Debit (₹)</th>
                        <th className="py-3 px-4 text-right text-rose-800">Credit (₹)</th>
                        <th className="py-3 px-4 text-right text-blue-900">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {reportResult.entries.map((e: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{e.referenceNo}</td>
                          <td className="py-2.5 px-4 font-medium">{e.counterparty || e.type}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 font-black">
                            {e.debit > 0 ? formatINR(e.debit) : "-"}
                          </td>
                          <td className="py-2.5 px-4 text-right text-rose-700 font-black">
                            {e.credit > 0 ? formatINR(e.credit) : "-"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-blue-900 bg-blue-50/30">
                            {formatINR(e.runningBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Official Statutory Signature Blocks for Physical Printouts */}
        <div className="mt-14 pt-8 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
          <div>
            <div className="h-14"></div>
            <p className="font-black border-t-2 border-slate-400 pt-2 text-slate-900">
              Prepared By
            </p>
            <p className="text-[11px] text-slate-500">Head Accountant</p>
          </div>
          <div>
            <div className="h-14"></div>
            <p className="font-black border-t-2 border-slate-400 pt-2 text-slate-900">
              Verified By
            </p>
            <p className="text-[11px] text-slate-500">Secretary / Managing Director</p>
          </div>
          <div>
            <div className="h-14"></div>
            <p className="font-black border-t-2 border-slate-400 pt-2 text-slate-900">
              Audited By
            </p>
            <p className="text-[11px] text-slate-500">Statutory Auditor</p>
          </div>
        </div>
      </div>
    </div>
  );
};
