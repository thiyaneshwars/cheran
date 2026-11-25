"use client";

import React from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  FileText,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  ArrowRight,
  Layers,
  Send,
  Disc,
  HardDrive,
  Package,
} from "lucide-react";
import { CheranSealBadge } from "./ui/CheranSealBadge";

export type NavItemKey =
  | "dashboard"
  | "banks"
  | "transactions"
  | "profit"
  | "reports"
  | "users"
  | "audit"
  | "settings"
  | "veatti"
  | "saree"
  | "babin"
  | "govt-yarn"
  | "govt-handover"
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
      key: "veatti" as NavItemKey,
      label: "Dhothi Production",
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
      key: "govt-yarn" as NavItemKey,
      label: "Govt Yarn Allotment",
      icon: Package,
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
        <div className="px-3 pt-4 pb-1 text-[10.5px] font-bold text-[#8295B5] tracking-[0.12em] uppercase">
          {groupLabel}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.key;
        return (
          <button
            key={item.key + item.label}
            type="button"
            onClick={() => {
              setCurrentTab(item.key);
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] transition-all cursor-pointer ${
              isActive
                ? "bg-[#1E3254] text-[#FFF8EB] font-semibold border-l-[3px] border-[#D49A42]"
                : "text-[#CBD5E1] hover:text-white hover:bg-white/6 border-l-[3px] border-transparent font-medium"
            }`}
          >
            <Icon
              className={`h-4 w-4 flex-shrink-0 ${
                isActive ? "text-[#E7C37B]" : "text-[#8FA0BA]"
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
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#14233C]/45 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-[#14233C] text-[#FAF7F0] border-r-2 border-[#B47B2B]/70 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Society Crest & Title */}
        <div className="flex items-center gap-3 px-5 h-20 border-b border-white/10 flex-shrink-0">
          <CheranSealBadge size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold tracking-[0.1em] text-white uppercase leading-none">
              CHERAN
            </span>
            <span className="text-[10px] font-medium text-[#A8B6CE] tracking-wider mt-1 truncate">
              Co-operative Society · SL-204
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1.5">
          {renderNavGroup(topMenuItems)}
          {renderNavGroup(operationsMenuItems, "Production & Godown")}
          {renderNavGroup(reportsMenuItems, "Statements & Audit")}
          {renderNavGroup(settingsMenuItems, "Administration")}
        </div>

        {/* Bottom Handloom Weaving Unit Card (Real Society Loom Photo) */}
        <div className="px-4 pb-4 pt-2 border-t border-white/10">
          <div className="relative rounded-xl overflow-hidden min-h-[138px] p-4 text-white flex flex-col justify-between border border-[#B47B2B]/40 bg-[#0A101B]">
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/textile_loom_banner.jpg"
                alt="Cheran Powerloom Weaving Operations"
                fill
                sizes="260px"
                className="object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A101B] via-[#0A101B]/75 to-[#0A101B]/45" />
            </div>

            <div className="relative z-10">
              <span className="font-financial text-[10px] font-semibold tracking-widest text-[#E7C37B] uppercase">
                Weavers Guild
              </span>
              <h3 className="font-display text-base font-bold text-white leading-snug mt-1">
                Loom-to-Co-optex Piece Ledger
              </h3>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setCurrentTab("veatti")}
                title="Open Dhothi Loom Operations"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF7F0] hover:bg-white text-[#14233C] px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer"
              >
                <span>Looms</span>
                <ArrowRight className="h-3 w-3 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="text-xs text-[#CBD5E1] hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
