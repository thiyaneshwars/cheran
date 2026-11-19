"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  onOpenNewTransaction: () => void;
  onRefreshData: () => void;
  currentRole: string;
  user?: any;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  currentRole,
  user,
}) => {
  const [searchValue, setSearchValue] = useState("");

  const displayName = user?.fullName || "Society Official";
  const displayRole = user?.role || currentRole || "Administrator";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between px-6 sm:px-8 bg-[#F4F6F8]/95 backdrop-blur-md no-print border-b border-slate-200/80">
      {/* Mobile hamburger menu */}
      <button
        onClick={onOpenMobileMenu}
        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50 lg:hidden transition mr-3 shadow-xs"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search anything... (Bills, Transactions, Accounts, etc.)"
            className="w-full bg-white border border-slate-200/90 rounded-xl pl-10 pr-16 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
          />
          <div className="absolute right-3 hidden sm:flex items-center">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200 rounded-md bg-slate-50 shadow-2xs font-mono">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0 ml-4">
        {/* Notification Bell with red badge */}
        <div className="relative">
          <button
            title="Notifications"
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#F4F6F8]" />
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200/80 cursor-pointer group">
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-200/80 shadow-2xs flex-shrink-0 bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
            {initial}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[13px] font-bold text-slate-800 leading-tight group-hover:text-slate-950 transition">
              {displayName}
            </span>
            <span className="text-[11px] font-medium text-slate-400 leading-tight">
              {displayRole}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition" />
        </div>
      </div>
    </header>
  );
};
