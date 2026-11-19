"use client";

import React from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Landmark,
  ArrowLeftRight,
  FileSpreadsheet,
  Cpu,
  Truck,
  TrendingUp,
  FileText,
  BarChart3,
  UserCheck,
  Database,
  Settings,
  LogOut,
  ArrowRight,
  Layers,
  Send,
  Disc,
  HardDrive,
} from "lucide-react";

export type NavItemKey =
  | "dashboard"
  | "banks"
  | "transactions"
  | "sizing"
  | "transport"
  | "profit"
  | "reports"
  | "users"
  | "audit"
  | "settings"
  | "veatti"
  | "saree"
  | "govt-handover"
  | "babin"
  | "backup";

interface SidebarProps {
  currentTab: NavItemKey;
  setCurrentTab: (tab: NavItemKey) => void;
  user: any;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onLogout,
  isOpen,
  setIsOpen,
}) => {
  // Navigation Items matching the exact screenshot layout (Members section removed)
  const topMenuItems = [
    {
      key: "dashboard" as NavItemKey,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      key: "banks" as NavItemKey,
      label: "Bank Accounts",
      icon: Landmark,
    },
    {
      key: "transactions" as NavItemKey,
      label: "Transactions",
      icon: ArrowLeftRight,
    },
  ];

  const operationsMenuItems = [
    {
      key: "sizing" as NavItemKey,
      label: "Sizing Bills",
      icon: FileSpreadsheet,
    },
    {
      key: "transport" as NavItemKey,
      label: "Transport",
      icon: Truck,
    },
    {
      key: "veatti" as NavItemKey,
      label: "Veatti Production",
      icon: Layers,
    },
    {
      key: "saree" as NavItemKey,
      label: "Saree Production",
      icon: Layers,
    },
    {
      key: "babin" as NavItemKey,
      label: "Babin Allocation",
      icon: Disc,
    },
    {
      key: "govt-handover" as NavItemKey,
      label: "Govt Handover Stocks",
      icon: Send,
    },
  ];

  const reportsMenuItems = [
    {
      key: "profit" as NavItemKey,
      label: "Profit & Loss",
      icon: TrendingUp,
    },
    {
      key: "reports" as NavItemKey,
      label: "Reports",
      icon: FileText,
    },
    {
      key: "audit" as NavItemKey,
      label: "MIS Reports",
      icon: BarChart3,
    },
  ];

  const settingsMenuItems = [
    {
      key: "users" as NavItemKey,
      label: "Users & Roles",
      icon: UserCheck,
    },
    {
      key: "settings" as NavItemKey,
      label: "System Settings",
      icon: Settings,
    },
    {
      key: "backup" as NavItemKey,
      label: "Backup & Restore",
      icon: HardDrive,
    },
  ];

  const renderNavGroup = (items: typeof topMenuItems, groupLabel?: string) => (
    <div className="space-y-1">
      {groupLabel && (
        <div className="px-3 pt-4 pb-1 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          {groupLabel}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.key;
        return (
          <button
            key={item.key + item.label}
            onClick={() => {
              setCurrentTab(item.key);
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? "bg-[#1E2229] text-white shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
          >
            <Icon
              className={`h-4 w-4 flex-shrink-0 ${
                isActive ? "text-white" : "text-slate-500"
              }`}
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-white text-slate-800 shadow-sm border-r border-slate-200/80 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Cheran Brand Header matching reference image */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-100 flex-shrink-0">
          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-xs border border-slate-100 bg-white">
            <Image
              src="/images/cheran_logo.png"
              alt="Cheran Logo"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-black tracking-wider text-slate-900 uppercase leading-none">
              CHERAN
            </h1>
            <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-widest mt-1 truncate">
              CO-OPERATIVE SOCIETY LTD.
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {renderNavGroup(topMenuItems)}
          {renderNavGroup(operationsMenuItems, "OPERATIONS")}
          {renderNavGroup(reportsMenuItems, "REPORTS & FINANCIALS")}
          {renderNavGroup(settingsMenuItems, "SETTINGS")}
        </div>

        {/* Bottom Promoted Skyscraper Card from Reference Screenshot */}
        <div className="px-4 pb-4 pt-2">
          <div className="relative rounded-2xl overflow-hidden min-h-[155px] p-4 text-white flex flex-col justify-between shadow-md">
            {/* Background Image with Dark Tint */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/cheran_building_card.jpg"
                alt="Cheran Building"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />
            </div>

            {/* Card Content */}
            <div className="relative z-10">
              <span className="text-[11px] font-bold tracking-widest text-slate-300 uppercase">
                CHERAN
              </span>
              <h3 className="text-sm font-bold text-white leading-tight mt-1">
                Building <br />
                Our Members&apos; <br />
                Tomorrow
              </h3>
            </div>

            {/* White Circular Action Button */}
            <div className="relative z-10 flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentTab("veatti")}
                title="Explore Production & Operations"
                className="w-7 h-7 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-md hover:scale-105 transition cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
              >
                <LogOut className="h-3 w-3" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
