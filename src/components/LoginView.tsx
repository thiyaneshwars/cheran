"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Layers,
  Landmark,
  ArrowRight,
  Scale,
  Warehouse,
  FileCheck2,
} from "lucide-react";
import { CheranSealBadge } from "./ui/CheranSealBadge";
import { RevealBlock, ScrollThreadBar, WeaveRule } from "./ui/ScrollReveal";

interface LoginViewProps {
  onSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid society credentials");
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#14233C] font-sans flex flex-col">
      <ScrollThreadBar />

      {/* Top Institutional Hairline Strip */}
      <div className="w-full border-b border-[#E5DEC9] bg-white/80 backdrop-blur-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs text-[#5B6B84]">
          <span className="font-semibold text-[#14233C]">
            Cheran Co-operative Weavers Society Ltd.
          </span>
          <span className="font-financial">Reg. No. SL-204 · Statutory Portal</span>
        </div>
      </div>

      {/* Main Centered Archival Entry */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-5xl bg-white rounded-2xl border border-[#D4CAB0] overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-xs">
          {/* Left Panel: Temple Indigo Statutory Seal & Industrial Heritage */}
          <div className="md:col-span-5 bg-[#14233C] text-[#FAF7F0] p-7 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r-2 border-[#B47B2B]/65">
            <div className="space-y-6">
              <div className="flex items-center gap-3.5">
                <CheranSealBadge size="md" />
                <div>
                  <h2 className="text-base font-bold tracking-wider uppercase text-white leading-tight">
                    CHERAN
                  </h2>
                  <p className="text-[11px] font-medium text-[#A8B6CE] mt-0.5">
                    Co-operative Society Ltd.
                  </p>
                </div>
              </div>

              <div>
                <h1 className="font-display text-2xl sm:text-[28px] font-bold leading-[1.16] text-[#FAF7F0]">
                  Accounting &amp; Powerloom Piece Registry
                </h1>
                <p className="text-xs sm:text-[13px] text-[#CBD5E1] leading-relaxed mt-3">
                  Unified double-entry financial ledger, warp-beam weaving logs, central godown custody, and verified Co-optex handover challans.
                </p>
              </div>

              {/* Authentic Industrial Loom Craft Frame */}
              <div className="relative h-32 w-full rounded-xl overflow-hidden border border-[#B47B2B]/45 bg-[#0A101B]">
                <Image
                  src="/images/textile_loom_banner.jpg"
                  alt="Powerloom Cotton Weaving Assembly"
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover opacity-85"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A101B]/90 via-[#0A101B]/25 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-financial text-[#E7C37B]">
                  <span>Dhothi &amp; Saree Units</span>
                  <span>Piece-Accurate Audit</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5 text-xs text-[#CBD5E1]">
              <div className="flex items-center gap-2.5">
                <Scale className="h-4 w-4 text-[#D49A42] flex-shrink-0" />
                <span>Verified Dhothi &amp; Saree counts across looms</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Warehouse className="h-4 w-4 text-[#D49A42] flex-shrink-0" />
                <span>Real-time godown stock &amp; weft reconciliation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="h-4 w-4 text-[#D49A42] flex-shrink-0" />
                <span>Statutory CSV exports for Co-optex inspection</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Ivory Sign-In Form & Role Quick-Access */}
          <div className="md:col-span-7 p-7 sm:p-9 lg:p-10 flex flex-col justify-between bg-white">
            <div>
              <h2 className="font-display text-2xl sm:text-[26px] font-bold text-[#14233C] tracking-tight">
                Sign In to Portal
              </h2>
              <p className="text-xs sm:text-sm text-[#5B6B84] mt-1">
                Authenticate with your assigned Society email ID and security passcode.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-medium flex items-center gap-2.5"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[#14233C] mb-1.5"
                  >
                    User Email / Society ID
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5B6B84] pointer-events-none" />
                    <input
                      id="login-email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="e.g. aduit@cheran or official@cheran"
                      className="w-full rounded-xl border border-[#D4CAB0] bg-[#FAF7F0]/55 pl-10 pr-4 py-2.5 text-sm font-medium text-[#14233C] placeholder-[#8A94A6] focus:bg-white focus:border-[#14233C] focus:ring-2 focus:ring-[#14233C]/12 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-[#14233C] mb-1.5"
                  >
                    Passcode
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5B6B84] pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your Society password"
                      className="w-full rounded-xl border border-[#D4CAB0] bg-[#FAF7F0]/55 pl-10 pr-11 py-2.5 text-sm font-medium text-[#14233C] placeholder-[#8A94A6] focus:bg-white focus:border-[#14233C] focus:ring-2 focus:ring-[#14233C]/12 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6B84] hover:text-[#14233C] p-1 cursor-pointer transition"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#14233C] hover:bg-[#1D3254] text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Society Session...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 text-[#E7C37B]" />
                      <span>Sign In to Workspace</span>
                    </>
                  )}
                </button>
              </form>

              {/* Authorized Quick-Fill Credentials (Clean Lucide Icons, Zero Emojis) */}
              <div className="mt-7 pt-5 border-t border-[#E5DEC9]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#5B6B84] mb-3">
                  Authorized Quick Access Credentials
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("production@cheran");
                      setPassword("Society@2026");
                    }}
                    className="p-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F3EEE3] border border-[#E5DEC9] text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#ECFDF5] border border-[#BBF7D0] text-[#166534] flex items-center justify-center flex-shrink-0">
                        <Layers className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#14233C] truncate">
                          Production Floor
                        </div>
                        <div className="text-[11px] font-financial text-[#5B6B84] truncate">
                          production@cheran
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail("aduit@cheran");
                      setPassword("Society@2026");
                    }}
                    className="p-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F3EEE3] border border-[#E5DEC9] text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] flex items-center justify-center flex-shrink-0">
                        <Landmark className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#14233C] truncate">
                          Accounting &amp; Audit
                        </div>
                        <div className="text-[11px] font-financial text-[#5B6B84] truncate">
                          aduit@cheran
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#8A94A6] group-hover:text-[#14233C] group-hover:translate-x-0.5 transition flex-shrink-0" />
                  </button>
                </div>

                {/* Higher Officials Portal Role Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEmail("official@cheran");
                    setPassword("Society@2026");
                  }}
                  className="w-full mt-2.5 p-3 rounded-xl bg-[#FEF9EE] hover:bg-[#FDF1D6] border border-[#D49A42] text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-[#14233C] text-[#E7C37B] flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#14233C]">
                        Higher Officials Inspection Portal
                      </div>
                      <div className="text-[11px] text-[#78531E]">
                        Govt Co-optex Piece Progress, Godown Stock &amp; Challan Audit
                      </div>
                    </div>
                  </div>
                  <span className="font-financial text-[11px] font-semibold text-[#92611D] pl-3 flex-shrink-0">
                    official@cheran
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E5DEC9] text-center text-[11px] text-[#5B6B84]">
              All journal entries, yarn allotments, and dispatches are timestamped for statutory inspection.
            </div>
          </div>
        </div>

        {/* Below-the-fold Scroll-Reveal Statutory Architecture Summary */}
        <div className="w-full max-w-5xl mt-10 space-y-5">
          <WeaveRule label="Co-operative Supply & Audit Workflow" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RevealBlock delayMs={0}>
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-5 h-full">
                <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B84]">
                  <span>Stage 01 · Loom Floor</span>
                  <Layers className="h-4 w-4 text-[#14233C]" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#14233C] mt-2">
                  Paavu &amp; Weft Control
                </h3>
                <p className="text-xs text-[#5B6B84] leading-relaxed mt-1.5">
                  Daily Dhothi and Saree piece tallies recorded per loom unit alongside warp beam balances and weaver wage calculations.
                </p>
              </div>
            </RevealBlock>

            <RevealBlock delayMs={80}>
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-5 h-full">
                <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B84]">
                  <span>Stage 02 · Society Godown</span>
                  <Warehouse className="h-4 w-4 text-[#B47B2B]" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#14233C] mt-2">
                  Physical Stock Balance
                </h3>
                <p className="text-xs text-[#5B6B84] leading-relaxed mt-1.5">
                  Ready inventory computed directly as Verified Loom Output minus Signed Co-optex Dispatch Receipts with zero estimation.
                </p>
              </div>
            </RevealBlock>

            <RevealBlock delayMs={160}>
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-5 h-full">
                <div className="flex items-center justify-between text-xs font-semibold text-[#5B6B84]">
                  <span>Stage 03 · Directorate</span>
                  <ShieldCheck className="h-4 w-4 text-[#166534]" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#14233C] mt-2">
                  Co-optex Handover Audit
                </h3>
                <p className="text-xs text-[#5B6B84] leading-relaxed mt-1.5">
                  Inspecting officials access searchable challan registers, piece targets, and CSV statutory statements in one calm ledger.
                </p>
              </div>
            </RevealBlock>
          </div>
        </div>
      </div>
    </div>
  );
};
