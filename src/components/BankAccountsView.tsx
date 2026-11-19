"use client";

import React, { useState } from "react";
import {
  Landmark,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Download,
  Calendar,
  FileText,
  CreditCard,
  Building,
  Trash2,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import { exportToCSV } from "@/lib/export";
import { LiquidCashSection } from "./LiquidCashSection";

interface BankAccountsViewProps {
  banks: any[];
  onRefresh: () => void;
  userRole: string;
}

export const BankAccountsView: React.FC<BankAccountsViewProps> = ({
  banks,
  onRefresh,
  userRole,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [liquidCashBalance, setLiquidCashBalance] = useState<number>(0);

  const fetchLiquidBalance = async () => {
    try {
      const res = await fetch("/api/liquid-cash");
      if (res.ok) {
        const data = await res.json();
        setLiquidCashBalance(data.stats?.currentBalance || 0);
      }
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    fetchLiquidBalance();
  }, []);

  // Form states
  const [newBank, setNewBank] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    branchName: "",
    ifscCode: "",
    accountType: "CURRENT",
    openingBalance: 0,
  });

  const [depositForm, setDepositForm] = useState({
    bankAccountId: "",
    amount: 0,
    notes: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });

  const [transfer, setTransfer] = useState({
    fromBankAccountId: "",
    toBankAccountId: "",
    amount: 0,
    notes: "",
  });

  const [reconcile, setReconcile] = useState({
    bankAccountId: "",
    statementDate: new Date().toISOString().split("T")[0],
    statementBalance: 0,
    notes: "",
  });

  // Banks sorted in INCREASING ORDER of current balance
  const sortedBanks = [...banks].sort((a, b) => (a.currentBalance || 0) - (b.currentBalance || 0));
  const consolidatedTotal = banks.reduce((acc, b) => acc + (b.currentBalance || 0), 0);

  const selectedDepositBank =
    sortedBanks.find((b) => b.id === depositForm.bankAccountId) || sortedBanks[0];
  const depositAmt = parseFloat(depositForm.amount.toString()) || 0;
  const previewNewBalance = (selectedDepositBank?.currentBalance || 0) + depositAmt;

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositAmt <= 0) {
      alert("Please enter a valid amount greater than zero.");
      return;
    }
    if (!depositForm.bankAccountId) {
      alert("Please select a bank account.");
      return;
    }
    try {
      const res = await fetch("/api/banks/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: depositForm.bankAccountId,
          amount: depositAmt,
          transactionDate: depositForm.transactionDate,
          notes: depositForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add funds");
      alert(
        data.message ||
          `₹${depositAmt.toLocaleString("en-IN")} added successfully! New balance updated.`
      );
      setShowDepositModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBank),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create bank");
      alert("Bank account created successfully!");
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBank = async (bankId: string, bankName: string) => {
    if (!confirm(`Are you sure you want to remove the bank account '${bankName}'?`)) return;
    try {
      const res = await fetch(`/api/banks/${bankId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove bank account");
      alert(data.message || "Bank account removed successfully.");
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfer.fromBankAccountId || !transfer.toBankAccountId) {
      alert("Please select both source and destination accounts.");
      return;
    }
    if (transfer.fromBankAccountId === transfer.toBankAccountId) {
      alert("Source and destination accounts cannot be the same.");
      return;
    }
    const transferAmt = parseFloat(transfer.amount.toString()) || 0;
    if (transferAmt <= 0) {
      alert("Please enter a transfer amount greater than zero.");
      return;
    }
    try {
      const res = await fetch("/api/banks/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBankAccountId: transfer.fromBankAccountId,
          toBankAccountId: transfer.toBankAccountId,
          amount: transferAmt,
          notes: transfer.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      alert(data.message || "Internal transfer completed successfully!");
      setShowTransferModal(false);
      setTransfer({
        fromBankAccountId: "",
        toBankAccountId: "",
        amount: 0,
        notes: "",
      });
      fetchLiquidBalance();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/banks/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: reconcile.bankAccountId,
          statementDate: reconcile.statementDate,
          statementBalance: parseFloat(reconcile.statementBalance.toString()),
          notes: reconcile.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reconciliation failed");
      alert(`Bank statement reconciled! Status: ${data.reconciliation.status}`);
      setShowReconcileModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loadLedger = async (bank: any) => {
    setSelectedBank(bank);
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/reports?type=bank-ledger&accountId=${bank.id}`);
      const data = await res.json();
      setLedgerData(data);
    } catch (err: any) {
      alert("Failed to load bank ledger");
    } finally {
      setLoadingLedger(false);
    }
  };

  return (
    <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Top Consolidated Banner */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-7 sm:p-9 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#DCEAE2] text-[#245B52] flex items-center justify-center">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#26332F] tracking-tight">
                Consolidated Treasury & Bank Balance
              </h2>
              <p className="text-[14px] text-[#68756F]">
                Total Society Treasury ({banks.length} Bank Accounts + Liquid Cash)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline gap-4 pt-1">
            <div className="text-4xl sm:text-5xl font-bold text-[#26332F] font-financial tracking-tight">
              {formatINR(consolidatedTotal + liquidCashBalance)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-[#DCEAE2] bg-[#F0F6F3] px-3 py-1 text-xs font-semibold text-[#245B52] flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5" />
                Banks: {formatINR(consolidatedTotal)}
              </span>
              <span className="rounded-xl border border-[#C8E5D5] bg-[#EBF5F0] px-3 py-1 text-xs font-bold text-[#246944] flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                Liquid Cash: {formatINR(liquidCashBalance)}
              </span>
            </div>
          </div>
          <p className="text-[13px] text-[#68756F] max-w-2xl leading-relaxed">
            Consolidated treasury balance across all society accounts and liquid cash on hand. Transfers between society accounts leave this total unaffected.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (sortedBanks.length === 0) {
                alert("Please register at least one bank account to perform internal transfers.");
                return;
              }
              setShowTransferModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] hover:bg-[#DCEAE2] px-4 py-2.5 text-[14px] font-semibold text-[#26332F] transition"
          >
            <ArrowRightLeft className="h-4 w-4 text-[#245B52]" />
            <span>Internal Transfer</span>
          </button>
          <button
            onClick={() => {
              if (sortedBanks.length === 0) {
                alert("No bank accounts registered yet. Please add a bank account first.");
                return;
              }
              setShowReconcileModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] hover:bg-[#DCEAE2] px-4 py-2.5 text-[14px] font-semibold text-[#26332F] transition"
          >
            <CheckCircle2 className="h-4 w-4 text-[#246944]" />
            <span>Reconcile Statement</span>
          </button>
          {["ADMIN", "ACCOUNTANT"].includes(userRole) && (
            <button
              onClick={() => {
                if (sortedBanks.length === 0) {
                  alert("Please add at least one bank account first before depositing funds.");
                  setShowAddModal(true);
                  return;
                }
                setDepositForm({
                  bankAccountId: sortedBanks[0]?.id || "",
                  amount: 0,
                  notes: "Direct fund addition / Capital deposit",
                  transactionDate: new Date().toISOString().split("T")[0],
                });
                setShowDepositModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-4 py-2.5 text-[14px] font-semibold text-white shadow-xs transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Money / Deposit</span>
            </button>
          )}
          {["ADMIN", "ACCOUNTANT"].includes(userRole) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl border border-[#245B52] bg-[#F0F6F3] hover:bg-[#DCEAE2] px-4 py-2.5 text-[14px] font-semibold text-[#245B52] shadow-xs transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add New Bank</span>
            </button>
          )}
        </div>
      </div>

      {/* Bank Account Cards Grid or Empty State */}
      {sortedBanks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#D2D9D4] bg-white p-12 text-center space-y-4 shadow-xs">
          <div className="h-16 w-16 rounded-2xl bg-[#F0F6F3] text-[#245B52] flex items-center justify-center mx-auto shadow-2xs">
            <Landmark className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-[#26332F]">
              No Bank Accounts Registered
            </h3>
            <p className="text-[14px] text-[#68756F]">
              No active bank accounts found.
            </p>
            <p className="text-[13px] text-[#8E9B95]">
              Register your Society&apos;s official bank accounts (State Bank of India, Canara Bank, District Central Co-op Bank, etc.) with real opening balances.
            </p>
          </div>
          {["ADMIN", "ACCOUNTANT"].includes(userRole) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#245B52] hover:bg-[#1D4B43] px-5 py-3 text-[14px] font-semibold text-white shadow-xs transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add First Society Bank Account</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedBanks.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-[#E5E9E3] bg-white p-6 shadow-xs hover:border-[#245B52] transition flex flex-col justify-between space-y-5"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#F0F6F3] text-[#245B52] flex items-center justify-center font-bold text-sm">
                      {b.bankName.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#26332F] text-[16px] leading-snug">
                        {b.accountName}
                      </h3>
                      <p className="text-[13px] text-[#68756F]">{b.bankName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {b.isDefault && (
                      <span className="rounded-full bg-[#EBF5F0] border border-[#C8E5D5] text-[#246944] font-semibold text-[11px] px-2.5 py-0.5">
                        Primary
                      </span>
                    )}
                    {["ADMIN"].includes(userRole) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(b.id, b.accountName)}
                        title="Remove Bank Account"
                        className="p-1.5 rounded-lg text-[#8E9B95] hover:text-[#B93838] hover:bg-[#FDF2F2] transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="mt-4 rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] p-3.5 space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#68756F]">Account No:</span>
                    <span className="font-mono font-bold text-[#26332F]">
                      {b.maskedAccountNumber || b.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#68756F]">Branch:</span>
                    <span className="font-medium text-[#26332F]">{b.branchName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#68756F]">IFSC Code:</span>
                    <span className="font-mono text-[#26332F]">{b.ifscCode}</span>
                  </div>
                </div>

                {/* Current Book Balance */}
                <div className="mt-4 pt-3 border-t border-[#E5E9E3]">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px] font-semibold text-[#68756F]">Book Balance:</span>
                    <span className="text-2xl font-bold text-[#26332F] font-financial">
                      {formatINR(b.currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[12px] text-[#8E9B95] mt-1">
                    <span>Opening: {formatINR(b.openingBalance)}</span>
                    <span>Statement: {formatINR(b.statementBalance ?? b.currentBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-[#E5E9E3] flex items-center justify-between">
                <button
                  onClick={() => loadLedger(b)}
                  className="text-[13px] font-semibold text-[#245B52] hover:underline flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Statement</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDepositForm({
                        bankAccountId: b.id,
                        amount: 0,
                        notes: `Direct fund addition to ${b.accountName}`,
                        transactionDate: new Date().toISOString().split("T")[0],
                      });
                      setShowDepositModal(true);
                    }}
                    className="rounded-xl border border-[#245B52] bg-[#F0F6F3] hover:bg-[#245B52] hover:text-white px-2.5 py-1 text-xs font-bold text-[#245B52] transition flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                    <span>+ Add Money</span>
                  </button>
                  <button
                    onClick={() => {
                      setReconcile({ ...reconcile, bankAccountId: b.id });
                      setShowReconcileModal(true);
                    }}
                    className="rounded-xl border border-[#E5E9E3] bg-[#F7F8F5] hover:bg-[#DCEAE2] px-2.5 py-1 text-xs font-semibold text-[#26332F] transition"
                  >
                    Reconcile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liquid Cash Section: Update & Revoke by End User */}
      <LiquidCashSection
        banks={sortedBanks}
        userRole={userRole}
        onBalanceChange={() => {
          fetchLiquidBalance();
          onRefresh();
        }}
      />

      {/* Internal Transfer Modal (Bank to Bank, Bank to Liquid Cash, Liquid Cash to Bank) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3] animate-gentle-fade">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Internal Treasury & Cash Transfer
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Internal Transfer • Transfer between bank accounts or withdraw/deposit liquid cash
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            {/* Quick Mode Indicator Banner */}
            {transfer.fromBankAccountId && transfer.toBankAccountId && (
              <div className="mt-4">
                {transfer.fromBankAccountId !== "LIQUID_CASH" && transfer.toBankAccountId === "LIQUID_CASH" && (
                  <div className="rounded-xl bg-[#F0F6F3] border border-[#C8E5D5] p-3 text-xs text-[#246944] flex items-center gap-2">
                    <ArrowDownRight className="h-4 w-4 shrink-0 text-[#246944]" />
                    <span>
                      <strong>Bank Debit → Liquid Cash Vault:</strong> Debits the bank account and credits Society Liquid Cash in hand.
                    </span>
                  </div>
                )}
                {transfer.fromBankAccountId === "LIQUID_CASH" && transfer.toBankAccountId !== "LIQUID_CASH" && (
                  <div className="rounded-xl bg-[#FEF8EC] border border-[#F7E4BE] p-3 text-xs text-[#975A16] flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[#975A16]" />
                    <span>
                      <strong>Liquid Cash Vault → Bank Deposit:</strong> Deducts from Liquid Cash in hand and deposits into the bank account.
                    </span>
                  </div>
                )}
                {transfer.fromBankAccountId !== "LIQUID_CASH" && transfer.toBankAccountId !== "LIQUID_CASH" && (
                  <div className="rounded-xl bg-[#F0F6F3] border border-[#C8E5D5] p-3 text-xs text-[#245B52] flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 shrink-0 text-[#245B52]" />
                    <span>
                      <strong>Inter-Bank Transfer:</strong> Moves funds between society bank accounts. Total bank balance remains unchanged.
                    </span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleExecuteTransfer} className="mt-4 space-y-4 text-xs">
              {/* From Source Account */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  From Account (Source) *
                </label>
                <select
                  required
                  value={transfer.fromBankAccountId}
                  onChange={(e) => setTransfer({ ...transfer, fromBankAccountId: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                >
                  <option value="">Select source account</option>
                  <optgroup label="💵 Cash on Hand">
                    <option value="LIQUID_CASH">
                      💵 Society Liquid Cash (Available: {formatINR(liquidCashBalance)})
                    </option>
                  </optgroup>
                  <optgroup label="🏦 Society Bank Accounts">
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏦 {b.accountName} ({b.bankName}) • Available: {formatINR(b.currentBalance)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* To Destination Account */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  To Account (Destination) *
                </label>
                <select
                  required
                  value={transfer.toBankAccountId}
                  onChange={(e) => setTransfer({ ...transfer, toBankAccountId: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                >
                  <option value="">Select destination account</option>
                  {transfer.fromBankAccountId !== "LIQUID_CASH" && (
                    <optgroup label="💵 Cash on Hand">
                      <option value="LIQUID_CASH">
                        💵 Society Liquid Cash (Current: {formatINR(liquidCashBalance)})
                      </option>
                    </optgroup>
                  )}
                  <optgroup label="🏦 Society Bank Accounts">
                    {banks
                      .filter((b) => b.id !== transfer.fromBankAccountId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          🏦 {b.accountName} ({b.bankName}) • Current: {formatINR(b.currentBalance)}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Transfer Amount */}
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Transfer Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-base font-bold text-[#68756F]">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={transfer.amount || ""}
                    onChange={(e) => setTransfer({ ...transfer, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-[#E5E9E3] pl-9 pr-3.5 py-2.5 font-bold text-lg text-[#26332F] font-financial outline-none focus:border-[#245B52]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              {transfer.fromBankAccountId && transfer.toBankAccountId && (parseFloat(transfer.amount.toString()) || 0) > 0 && (() => {
                const trAmt = parseFloat(transfer.amount.toString()) || 0;
                const srcIsCash = transfer.fromBankAccountId === "LIQUID_CASH";
                const dstIsCash = transfer.toBankAccountId === "LIQUID_CASH";
                const srcBank = banks.find((b) => b.id === transfer.fromBankAccountId);
                const dstBank = banks.find((b) => b.id === transfer.toBankAccountId);

                const srcBefore = srcIsCash ? liquidCashBalance : (srcBank?.currentBalance || 0);
                const dstBefore = dstIsCash ? liquidCashBalance : (dstBank?.currentBalance || 0);
                const srcAfter = srcBefore - trAmt;
                const dstAfter = dstBefore + trAmt;

                return (
                  <div className="rounded-xl bg-[#F0F6F3] border border-[#C8E5D5] p-3 space-y-1.5 text-xs text-[#245B52]">
                    <div className="flex justify-between items-center">
                      <span>Source ({srcIsCash ? "Liquid Cash" : srcBank?.accountName}):</span>
                      <span>{formatINR(srcBefore)} → <strong className={srcAfter < 0 ? "text-[#B93838]" : "text-[#246944]"}>{formatINR(srcAfter)}</strong></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Destination ({dstIsCash ? "Liquid Cash" : dstBank?.accountName}):</span>
                      <span>{formatINR(dstBefore)} → <strong className="text-[#246944]">{formatINR(dstAfter)}</strong></span>
                    </div>
                    <div className="pt-1 border-t border-[#DCEAE2] flex justify-between items-center font-bold text-[#26332F]">
                      <span>Total Consolidated Treasury:</span>
                      <span className="text-[#245B52]">{formatINR(consolidatedTotal + liquidCashBalance)} (Unchanged)</span>
                    </div>
                  </div>
                );
              })()}

              {/* Narration */}
              <div>
                <label className="font-semibold text-[#26332F] block mb-1">
                  Narration / Notes
                </label>
                <input
                  type="text"
                  value={transfer.notes}
                  onChange={(e) => setTransfer({ ...transfer, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 text-[#26332F] outline-none focus:border-[#245B52]"
                  placeholder="e.g. Bank debit for office liquid cash"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] px-6 py-2.5 font-bold text-white hover:bg-[#1D4B43] shadow-xs transition active:scale-98"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Add Bank Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3]">
            <h3 className="text-xl font-bold text-[#26332F]">Add New Bank Account</h3>
            <p className="text-xs text-[#68756F] mt-1">Register an official society bank account</p>

            <form onSubmit={handleCreateBank} className="mt-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={newBank.bankName}
                    onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                    placeholder="Bank name"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Display Account Name</label>
                  <input
                    type="text"
                    required
                    value={newBank.accountName}
                    onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                    placeholder="Account name / nickname"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={newBank.accountNumber}
                    onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={newBank.ifscCode}
                    onChange={(e) => setNewBank({ ...newBank, ifscCode: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={newBank.branchName}
                    onChange={(e) => setNewBank({ ...newBank, branchName: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={newBank.openingBalance || ""}
                    onChange={(e) => setNewBank({ ...newBank, openingBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2 text-xs font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] px-5 py-2 text-xs font-bold text-white hover:bg-[#1D4B43] shadow-xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-lg border border-[#E5E9E3]">
            <h3 className="text-xl font-bold text-[#26332F]">Bank Reconciliation</h3>
            <p className="text-xs text-[#68756F] mt-1">
              Verify book balance against physical bank passbook statement
            </p>

            <form onSubmit={handleReconcile} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#26332F] block mb-1">Bank Account</label>
                <select
                  required
                  value={reconcile.bankAccountId}
                  onChange={(e) => setReconcile({ ...reconcile, bankAccountId: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                >
                  <option value="">Select bank account</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountName} (Book: {formatINR(b.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Statement Date</label>
                  <input
                    type="date"
                    required
                    value={reconcile.statementDate}
                    onChange={(e) => setReconcile({ ...reconcile, statementDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">Statement Balance (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={reconcile.statementBalance || ""}
                    onChange={(e) =>
                      setReconcile({ ...reconcile, statementBalance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-bold text-[#26332F] font-financial"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#26332F] block mb-1">Notes</label>
                <input
                  type="text"
                  value={reconcile.notes}
                  onChange={(e) => setReconcile({ ...reconcile, notes: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  placeholder="Reconciliation remarks"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2 text-xs font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] px-5 py-2 text-xs font-bold text-white hover:bg-[#1D4B43] shadow-xs"
                >
                  Submit Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Statement Ledger Modal */}
      {selectedBank && ledgerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-7 shadow-lg flex flex-col border border-[#E5E9E3]">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-4">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  {ledgerData.title}
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Opening: <strong>{formatINR(ledgerData.openingBalance)}</strong> • Closing:{" "}
                  <strong className="text-[#245B52]">{formatINR(ledgerData.closingBalance)}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    exportToCSV(`${selectedBank.accountName}_Statement`, ledgerData.entries)
                  }
                  className="flex items-center gap-1.5 rounded-xl border border-[#E5E9E3] px-3.5 py-1.5 text-xs font-semibold text-[#26332F] hover:bg-[#F7F8F5]"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
                <button
                  onClick={() => {
                    setSelectedBank(null);
                    setLedgerData(null);
                  }}
                  className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 rounded-xl border border-[#E5E9E3]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E5E9E3] bg-[#F7F8F5] text-[#26332F] font-semibold sticky top-0 text-[13px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Ref No</th>
                    <th className="py-3 px-4">Particulars</th>
                    <th className="py-3 px-4 text-right">Inflow (₹)</th>
                    <th className="py-3 px-4 text-right">Outflow (₹)</th>
                    <th className="py-3 px-4 text-right">Running Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E3] text-[#26332F]">
                  {ledgerData.entries?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#F7F8F5] transition">
                      <td className="py-3 px-4 whitespace-nowrap text-[#68756F]">
                        {new Date(row.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#245B52]">{row.referenceNo}</td>
                      <td className="py-3 px-4">{row.counterparty || row.type}</td>
                      <td className="py-3 px-4 text-right text-[#246944] font-bold font-financial text-[15px]">
                        {row.debit > 0 ? `+ ${formatINR(row.debit)}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-[#B93838] font-bold font-financial text-[15px]">
                        {row.credit > 0 ? `- ${formatINR(row.credit)}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#26332F] font-financial text-[15px]">
                        {formatINR(row.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Add Money / Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#26332F]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl border border-[#E5E9E3] animate-gentle-fade">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-[#26332F]">
                  Add Money to Bank Account
                </h3>
                <p className="text-xs text-[#68756F] mt-0.5">
                  Direct Bank Deposit • Increases bank balance and consolidated total
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="rounded-xl border border-[#E5E9E3] p-1.5 text-[#68756F] hover:bg-[#F7F8F5]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Select Bank Account *
                </label>
                <select
                  required
                  value={depositForm.bankAccountId}
                  onChange={(e) =>
                    setDepositForm({ ...depositForm, bankAccountId: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E5E9E3] p-2.5 font-semibold text-[#26332F] bg-white outline-none focus:border-[#245B52]"
                >
                  {sortedBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountName} ({b.bankName}) • Current Balance: {formatINR(b.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#26332F] block mb-1">
                  Amount to Add (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-base font-bold text-[#68756F]">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={depositForm.amount || ""}
                    onChange={(e) =>
                      setDepositForm({
                        ...depositForm,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-[#E5E9E3] pl-9 pr-3.5 py-2.5 font-bold text-lg text-[#26332F] font-financial"
                    placeholder="0.00"
                  />
                </div>
                <span className="text-[11px] text-[#68756F] mt-1 block">
                  Example: If you had ₹1,00,000 and add ₹50,000, new balance becomes ₹1,50,000
                </span>
              </div>

              {selectedDepositBank && (
                <div className="rounded-2xl bg-[#F0F6F3] border border-[#C8E5D5] p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-[#245B52]">
                    <span>Current Balance:</span>
                    <span className="font-bold font-financial text-sm">
                      {formatINR(selectedDepositBank.currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#246944] font-semibold">
                    <span>+ Amount to Add:</span>
                    <span className="font-bold font-financial text-sm">
                      + {formatINR(depositAmt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#DCEAE2] text-[#245B52] font-bold">
                    <span>New Account Balance:</span>
                    <span className="text-lg font-black font-financial">
                      {formatINR(previewNewBalance)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    Deposit Date
                  </label>
                  <input
                    type="date"
                    required
                    value={depositForm.transactionDate}
                    onChange={(e) =>
                      setDepositForm({ ...depositForm, transactionDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#26332F] block mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={depositForm.notes}
                    onChange={(e) =>
                      setDepositForm({ ...depositForm, notes: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E5E9E3] p-2.5"
                    placeholder="Deposit description"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9E3]">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="rounded-xl border border-[#E5E9E3] px-4 py-2.5 font-semibold text-[#68756F] hover:bg-[#F7F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#245B52] px-6 py-2.5 font-bold text-white hover:bg-[#1D4B43] shadow-xs transition active:scale-98"
                >
                  Add ₹{depositAmt.toLocaleString("en-IN")} to Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
