"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

interface LoginViewProps {
  onSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans text-slate-900">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left: Official Society Branding & Core Objectives */}
        <div className="md:col-span-5 bg-slate-900 text-white p-7 sm:p-9 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            {/* Society Logo */}
            <div className="relative h-16 w-16 rounded-2xl bg-white p-2 shadow-sm border border-slate-700/60 overflow-hidden mb-5">
              <Image
                src="/images/cheran_logo.png"
                alt="Cheran Co-operative Society Logo"
                fill
                sizes="64px"
                className="object-contain p-1"
                priority
              />
            </div>

            {/* Society Credentials */}
            <div className="space-y-2">
              <div className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                Reg. No. SL-204
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                Cheran Co-operative Society
              </h1>
              <p className="text-xs text-slate-300 font-medium">
                Handloom & Powerloom Weavers Production Society Ltd.
              </p>
            </div>

            {/* Core Modules List */}
            <div className="mt-7 pt-6 border-t border-slate-800 space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-white block">Powerloom Production Registers</span>
                  <span className="text-[11px] text-slate-400">Authentic handwritten tally for Veatti & Saree</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-white block">Government Handover Dispatch</span>
                  <span className="text-[11px] text-slate-400">Co-optex delivery challans & balance tracking</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-white block">Statutory Audit Ledger</span>
                  <span className="text-[11px] text-slate-400">14 registrar compliance reports & double-entry</span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Verification Seal */}
          <div className="pt-6 border-t border-slate-800 mt-6 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>Authorized Official Access Portal</span>
          </div>
        </div>

        {/* Right: Clean, Fast Authentication Form */}
        <div className="md:col-span-7 p-7 sm:p-9 flex flex-col justify-between bg-white">
          <div>
            <div className="border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Official Sign In
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Enter your authorized credentials to access society ledgers
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold uppercase tracking-wider text-slate-600 block mb-1 text-[11px]">
                  Official Username / Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-semibold bg-slate-50/50 focus:bg-white text-xs sm:text-sm transition placeholder-slate-400"
                    placeholder="production@cheran or aduit@cheran"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold uppercase tracking-wider text-slate-600 block mb-1 text-[11px]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-semibold bg-slate-50/50 focus:bg-white text-xs sm:text-sm transition placeholder-slate-400"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* Quick Login by Role */}
              <div className="pt-1">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-1.5">
                  Quick Access by Role:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("production@cheran");
                      setPassword("Society@2026");
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition group"
                  >
                    <span className="font-black text-slate-900 group-hover:text-emerald-700 block text-xs">
                      🏭 Production
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      production@cheran
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail("aduit@cheran");
                      setPassword("Society@2026");
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-left transition group"
                  >
                    <span className="font-black text-slate-900 group-hover:text-blue-700 block text-xs">
                      📋 Auditing
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      aduit@cheran
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1E2229] hover:bg-slate-800 py-3 font-bold text-white text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-3 disabled:opacity-70 active:scale-98"
              >
                {loading ? (
                  "Authenticating..."
                ) : (
                  <>
                    <span>Sign In to Society Portal</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Audit Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-slate-400 text-[10px]">
            All journal entries, warp dispatches, and disbursements are cryptographically timestamped for statutory registrar inspection.
          </div>
        </div>
      </div>
    </div>
  );
};
