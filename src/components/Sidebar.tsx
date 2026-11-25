"use client";

import React, { useEffect, useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
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
  widthPx?: number;
  collapsed?: boolean;
  onResizeWidth?: (nextWidth: number) => void;
  onToggleCollapse?: () => void;
  onResizingChange?: (resizing: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onLogout,
  isOpen,
  setIsOpen,
  widthPx = 232,
  collapsed = false,
  onResizeWidth,
  onToggleCollapse,
  onResizingChange,
}) => {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      onResizeWidth?.(e.clientX);
    };

    const stopDragging = () => {
      setDragging(false);
      onResizingChange?.(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [dragging, onResizeWidth, onResizingChange]);

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

  const isCompact = collapsed;

  const renderNavGroup = (items: typeof topMenuItems, groupLabel?: string) => (
    <div className="space-y-1">
      {groupLabel && !isCompact && (
        <div className="px-3 pt-3.5 pb-1 text-[10.5px] font-bold text-[#8295B5] tracking-[0.12em] uppercase truncate">
          {groupLabel}
        </div>
      )}
      {groupLabel && isCompact && (
        <div className="mx-2 my-2 border-t border-white/10" />
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.key;
        return (
          <button
            key={item.key + item.label}
            type="button"
            title={item.label}
            onClick={() => {
              setCurrentTab(item.key);
              setIsOpen(false);
            }}
            className={`w-full flex items-center ${
              isCompact ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
            } rounded-lg text-[13px] transition-colors cursor-pointer ${
              isActive
                ? "bg-[#1E3254] text-[#FFF8EB] font-semibold ring-1 ring-inset ring-[#D49A42]/60"
                : "text-[#CBD5E1] hover:text-white hover:bg-white/6 font-medium"
            }`}
          >
            <Icon
              className={`h-4 w-4 flex-shrink-0 ${
                isActive ? "text-[#E7C37B]" : "text-[#8FA0BA]"
              }`}
            />
            {!isCompact && <span className="truncate">{item.label}</span>}
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex max-lg:w-72 sidebar-shell flex-col bg-[#14233C] text-[#FAF7F0] border-r-2 border-[#B47B2B]/70 ${
          dragging ? "" : "transition-[width,transform] duration-150 ease-out"
        } lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Society Crest, Title & Desktop Collapse Toggle */}
        <div
          className={`flex items-center border-b border-white/10 flex-shrink-0 ${
            isCompact
              ? "flex-col justify-center gap-2 py-3 px-2"
              : "justify-between gap-2 h-20 px-4"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheranSealBadge size="sm" />
            {!isCompact && (
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold tracking-[0.08em] text-white uppercase leading-none truncate">
                  CHERAN
                </span>
                <span className="text-[10px] font-medium text-[#A8B6CE] tracking-wide mt-1 truncate">
                  Society · SL-204
                </span>
              </div>
            )}
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={
                isCompact
                  ? "Expand Navigation Rail"
                  : `Collapse Navigation Rail (${widthPx}px)`
              }
              aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:inline-flex items-center justify-center p-1.5 rounded-lg text-[#A8B6CE] hover:text-white hover:bg-white/10 transition cursor-pointer flex-shrink-0"
            >
              {isCompact ? (
                <PanelLeftOpen className="h-4 w-4 text-[#E7C37B]" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {renderNavGroup(topMenuItems)}
          {renderNavGroup(operationsMenuItems, "Production & Godown")}
          {renderNavGroup(reportsMenuItems, "Statements & Audit")}
          {renderNavGroup(settingsMenuItems, "Administration")}
        </div>

        {/* Bottom Loom Card (Expanded) or Compact Action Strip (Collapsed) */}
        <div className="px-3 pb-3 pt-2 border-t border-white/10">
          {isCompact ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentTab("veatti")}
                title="Dhothi & Saree Looms"
                className="w-10 h-10 rounded-lg bg-[#FAF7F0] hover:bg-white text-[#14233C] flex items-center justify-center transition cursor-pointer"
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="w-10 h-9 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden min-h-[124px] p-3.5 text-white flex flex-col justify-between border border-[#B47B2B]/40 bg-[#0A101B]">
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
                <h3 className="font-display text-sm font-bold text-white leading-snug mt-0.5">
                  Loom-to-Co-optex Piece Ledger
                </h3>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-2.5 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab("veatti")}
                  title="Open Dhothi Loom Operations"
                  className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F0] hover:bg-white text-[#14233C] px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                >
                  <span>Looms</span>
                  <ArrowRight className="h-3 w-3 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out"
                  className="text-[11px] text-[#CBD5E1] hover:text-white flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Horizontal Drag-to-Resize Handle (Desktop lg+) */}
        {onResizeWidth && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag horizontally to resize navigation sidebar (double-click to reset)"
            title="Drag to resize sidebar horizontally • Double-click to reset"
            onPointerDown={(e) => {
              e.preventDefault();
              onResizingChange?.(true);
              setDragging(true);
            }}
            onDoubleClick={() => onResizeWidth(232)}
            className={`hidden lg:flex absolute top-0 bottom-0 -right-1.5 w-3 cursor-col-resize items-center justify-center group z-50 ${
              dragging ? "bg-[#D49A42]/20" : ""
            }`}
          >
            <div
              className={`h-14 w-1 rounded-full transition-colors ${
                dragging
                  ? "bg-[#E7C37B]"
                  : "bg-transparent group-hover:bg-[#D49A42]"
              }`}
            />
          </div>
        )}
      </aside>
    </>
  );
};
