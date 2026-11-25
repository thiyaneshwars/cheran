"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, NavItemKey } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { DashboardView } from "@/components/DashboardView";
import { BankAccountsView } from "@/components/BankAccountsView";
import { TransactionsView } from "@/components/TransactionsView";
import { ProfitView } from "@/components/ProfitView";
import { ReportsView } from "@/components/ReportsView";
import { UsersView } from "@/components/UsersView";
import { AuditLogsView } from "@/components/AuditLogsView";
import { SettingsView } from "@/components/SettingsView";
import { BackupRestoreView } from "@/components/BackupRestoreView";
import { LoginView } from "@/components/LoginView";
import { VeattiProductionView } from "@/components/VeattiProductionView";
import { SareeProductionView } from "@/components/SareeProductionView";
import { GovtHandoverView } from "@/components/GovtHandoverView";
import { BabinView } from "@/components/BabinView";
import { GovtYarnAllotmentView } from "@/components/GovtYarnAllotmentView";
import { ExecutiveOfficialView } from "@/components/executive/ExecutiveOfficialView";
import { CheranSealBadge } from "@/components/ui/CheranSealBadge";
import { ScrollThreadBar } from "@/components/ui/ScrollReveal";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<NavItemKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(232);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Restore saved sidebar layout preference and font size on mount
  useEffect(() => {
    try {
      const savedWidth = Number(localStorage.getItem("cheran_sidebar_width"));
      if (Number.isFinite(savedWidth) && savedWidth >= 180 && savedWidth <= 360) {
        setSidebarWidth(savedWidth);
      }
      if (localStorage.getItem("cheran_sidebar_collapsed") === "true") {
        setSidebarCollapsed(true);
      }
      const savedFontSize = localStorage.getItem("cheran_font_size");
      if (savedFontSize === "large") {
        document.documentElement.setAttribute("data-font-size", "large");
      } else {
        document.documentElement.removeAttribute("data-font-size");
      }
    } catch (e) {
      // localStorage may not be available in SSR or strict privacy mode
    }
  }, []);

  const handleResizeSidebarWidth = (nextWidth: number) => {
    const clamped = Math.max(180, Math.min(360, Math.round(nextWidth)));
    setSidebarWidth(clamped);
    setSidebarCollapsed(false);
    try {
      localStorage.setItem("cheran_sidebar_width", String(clamped));
      localStorage.setItem("cheran_sidebar_collapsed", "false");
    } catch {
      // ignore storage errors
    }
  };

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cheran_sidebar_collapsed", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Check auth session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
            if (data.user.role === "PRODUCTION") {
              setCurrentTab("veatti");
            }
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch Master Data & Dashboard Data
  const loadMasterData = async () => {
    try {
      const [dashRes, banksRes, partiesRes, workersRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/banks"),
        fetch("/api/parties"),
        fetch("/api/workers"),
      ]);

      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (banksRes.ok) setBanks(await banksRes.json());
      if (partiesRes.ok) setParties(await partiesRes.json());
      if (workersRes.ok) setWorkers(await workersRes.json());
    } catch (err) {
      console.error("Master data load error:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadMasterData();
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
  };



  if (loading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-[#FAF7F0] px-6 text-[#14233C]">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D4CAB0] bg-white shadow-xs">
          <div className="h-1 w-full bg-[#14233C]" />
          <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <CheranSealBadge size="lg" />
            <h1 className="font-display mt-5 text-2xl font-bold tracking-tight text-[#14233C]">
              Cheran Co-operative Society
            </h1>
            <p className="mt-1.5 text-xs font-medium text-[#5B6B84]">
              Statutory Accounting &amp; Powerloom Dispatch System · Reg. No. SL-204
            </p>
          </div>

          {/* Woven Shuttle Weft Track */}
          <div className="mt-7 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#5B6B84]">
              <span>Verifying application session &amp; ledger state</span>
              <span className="font-financial text-[#B47B2B]">LIVE SYNC</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#EFE9DA] border border-[#E5DEC9]">
              <div className="shuttle-thread-runner h-full w-1/3 rounded-full bg-gradient-to-r from-[#14233C] via-[#B47B2B] to-[#D49A42]" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-[10.5px] font-financial text-[#5B6B84]">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#14233C]" />
                <span>01 Session</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B47B2B]" />
                <span>02 Godown</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#166534]" />
                <span>03 Co-optex</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user?.role === "PRODUCTION") {
            setCurrentTab("veatti");
          } else {
            setCurrentTab("dashboard");
          }
        }}
      />
    );
  }

  // Higher officials portal: higher officials can only view godown stocks, govt handover & completion %
  const isOfficial =
    currentUser.role === "MANAGEMENT" ||
    currentUser.role === "OFFICIAL" ||
    currentUser.email === "official@cheran" ||
    currentUser.email === "officer@cheran" ||
    currentUser.email === "higherauthority@cheran" ||
    currentUser.email === "collector@cheran";

  if (isOfficial) {
    return (
      <ExecutiveOfficialView
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  const getPageTitle = (tab: NavItemKey) => {
    switch (tab) {
      case "veatti":
        return "Dhothi Production & Machine Register";
      case "saree":
        return "Saree Production & Machine Register";
      case "babin":
        return "Babin & Jarigai Raw Thread Allocation Register";
      case "govt-handover":
        return "Government Stock Handover & Dispatch Register";
      case "dashboard":
        return "Financial Dashboard & Core Metrics";
      case "banks":
        return "Bank Accounts & Treasury Management";
      case "transactions":
        return "General Transactions & Daybook";
      case "profit":
        return "Operational Profit & Loss Statement";
      case "reports":
        return "14 Statutory Audit Reports";
      case "users":
        return "Official Credentials & Access Management";
      case "audit":
        return "Statutory Immutable Audit Trail";
      case "settings":
        return "System Settings & Display Preferences";
      case "backup":
        return "Database Vault & D: Drive Disaster Recovery";
      case "govt-yarn":
        return "Government Yarn Inward Allotment & Quotas";
      default:
        return "Cheran Co-operative Society Accounting System";
    }
  };

  const activeSidebarWidth = sidebarCollapsed ? 76 : sidebarWidth;

  return (
    <div
      className="min-h-screen bg-[#FAF7F0] text-[#14233C] font-sans"
      style={{ "--sidebar-w": `${activeSidebarWidth}px` } as React.CSSProperties}
    >
      <ScrollThreadBar />
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={currentUser}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        widthPx={sidebarWidth}
        collapsed={sidebarCollapsed}
        onResizeWidth={handleResizeSidebarWidth}
        onToggleCollapse={handleToggleSidebarCollapse}
        onResizingChange={setIsResizingSidebar}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-col min-w-0 sidebar-offset ${
          isResizingSidebar ? "" : "transition-[padding] duration-150 ease-out"
        }`}
      >
        <Header
          title={getPageTitle(currentTab)}
          onOpenMobileMenu={() => setSidebarOpen(true)}
          onOpenNewTransaction={() => setCurrentTab("transactions")}
          onRefreshData={loadMasterData}
          currentRole={currentUser.role}
          user={currentUser}
        />

        <main
          key={currentTab}
          className="flex-1 pb-16 workspace-ledger ledger-tab-enter"
        >
          {currentTab === "veatti" && <VeattiProductionView />}

          {currentTab === "saree" && <SareeProductionView />}

          {currentTab === "babin" && <BabinView />}

          {currentTab === "govt-yarn" && (
            <GovtYarnAllotmentView onNavigate={(tab) => setCurrentTab(tab as NavItemKey)} />
          )}

          {currentTab === "govt-handover" && (
            <GovtHandoverView onNavigate={(tab) => setCurrentTab(tab as NavItemKey)} />
          )}

          {currentTab === "dashboard" && (
            <DashboardView
              data={dashboardData}
              onNavigate={(tab) => setCurrentTab(tab)}
              onSelectBankAccount={(bankId) => setCurrentTab("banks")}
              onOpenNewTransaction={() => setCurrentTab("transactions")}
              onFilterChange={async (filters) => {
                const url = new URL("/api/dashboard", window.location.origin);
                if (filters.section) url.searchParams.set("section", filters.section);
                const res = await fetch(url.toString());
                if (res.ok) setDashboardData(await res.json());
              }}
              onRefresh={loadMasterData}
            />
          )}

          {currentTab === "banks" && (
            <BankAccountsView
              banks={banks}
              onRefresh={loadMasterData}
              userRole={currentUser.role}
            />
          )}

          {currentTab === "transactions" && (
            <TransactionsView banks={banks} userRole={currentUser.role} />
          )}

          {currentTab === "profit" && <ProfitView />}

          {currentTab === "reports" && (
            <ReportsView banks={banks} parties={parties} workers={workers} />
          )}

          {currentTab === "users" && <UsersView />}

          {currentTab === "audit" && <AuditLogsView />}

          {currentTab === "settings" && <SettingsView />}

          {currentTab === "backup" && <BackupRestoreView />}
        </main>
      </div>
    </div>
  );
}
