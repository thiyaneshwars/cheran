"use client";

import React, { useState } from "react";
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
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between px-6 sm:px-8 bg-[#FAF7F0]/95 backdrop-blur-sm no-print border-b border-[#E5DEC9]">
      {/* Mobile menu trigger */}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="rounded-xl border border-[#D4CAB0] bg-white p-2.5 text-[#14233C] hover:bg-[#F3EEE3] lg:hidden transition mr-3 cursor-pointer"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3.5 h-4 w-4 text-[#5B6B84] pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search challans, vouchers, loom units, or accounts..."
            className="w-full bg-white border border-[#D4CAB0] rounded-xl pl-10 pr-16 py-2.5 text-xs sm:text-sm text-[#14233C] placeholder-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#14233C]/12 focus:border-[#14233C] transition"
          />
          <div className="absolute right-3 hidden sm:flex items-center">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-[#5B6B84] border border-[#E5DEC9] rounded-md bg-[#FAF7F0] font-financial">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Identity Controls */}
      <div className="flex items-center gap-4 sm:gap-5 flex-shrink-0 ml-4">
        <button
          type="button"
          title="Notifications"
          aria-label="Notifications"
          className="relative p-2 rounded-xl text-[#5B6B84] hover:text-[#14233C] hover:bg-white border border-transparent hover:border-[#E5DEC9] transition cursor-pointer"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#B47B2B] ring-2 ring-[#FAF7F0]" />
        </button>

        <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-[#E5DEC9]">
          <div className="w-9 h-9 rounded-full border border-[#B47B2B]/60 bg-[#14233C] text-[#E7C37B] flex items-center justify-center font-bold text-xs flex-shrink-0">
            {initial}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[13px] font-bold text-[#14233C] leading-tight">
              {displayName}
            </span>
            <span className="text-[11px] font-medium text-[#5B6B84] leading-tight">
              {displayRole}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-[#5B6B84] hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
