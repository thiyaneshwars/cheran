"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, NavItemKey } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { DashboardView } from "@/components/DashboardView";
import { BankAccountsView } from "@/components/BankAccountsView";
import { TransactionsView } from "@/components/TransactionsView";
import { SizingBillView } from "@/components/SizingBillView";
import { TransportView } from "@/components/TransportView";
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

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<NavItemKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize font size preference on mount
  useEffect(() => {
    try {
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
      <div className="flex h-screen w-screen items-center justify-center bg-[#181311]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#382E2A] border-t-[#E1E5EB]" />
          <span className="text-sm font-bold text-white">
            Loading Cheran Co-operative Accounting & Production System...
          </span>
          <span className="text-xs text-[#D8C3AE]">
            Please wait while application state is verified
          </span>
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
      case "sizing":
        return "Sizing Bill Accounting";
      case "transport":
        return "Transport Freight Ledger";
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

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={currentUser}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-col lg:pl-72 transition-all">
        <Header
          title={getPageTitle(currentTab)}
          onOpenMobileMenu={() => setSidebarOpen(true)}
          onOpenNewTransaction={() => setCurrentTab("transactions")}
          onRefreshData={loadMasterData}
          currentRole={currentUser.role}
          user={currentUser}
        />

        <main className="flex-1 pb-16">
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

          {currentTab === "sizing" && (
            <SizingBillView
              banks={banks}
              parties={parties}
              userRole={currentUser.role}
              onRefresh={loadMasterData}
            />
          )}

          {currentTab === "transport" && (
            <TransportView banks={banks} userRole={currentUser.role} />
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
