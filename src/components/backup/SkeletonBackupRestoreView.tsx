"use client";

import React from "react";

export const SkeletonBackupRestoreView: React.FC = () => {
  return (
    <div className="space-y-7 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* 1. Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-72 rounded-xl skeleton-shimmer" />
        <div className="h-4 w-96 rounded-lg skeleton-shimmer" />
      </div>

      {/* 2. Telemetry KPI Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded skeleton-shimmer" />
              <div className="h-8 w-8 rounded-xl skeleton-shimmer" />
            </div>
            <div className="h-7 w-32 rounded-lg skeleton-shimmer" />
            <div className="h-3 w-40 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* 3. 3D Vault Stage + Action Center Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: 3D Canvas Box Skeleton */}
        <div className="lg:col-span-7 h-[300px] sm:h-[320px] rounded-3xl skeleton-shimmer border border-slate-200/80" />

        {/* Right: Dual Action Cards Skeleton */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 flex-1">
            <div className="h-5 w-48 rounded skeleton-shimmer" />
            <div className="h-4 w-full rounded skeleton-shimmer" />
            <div className="h-4 w-3/4 rounded skeleton-shimmer" />
            <div className="h-11 w-full rounded-xl skeleton-shimmer mt-4" />
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 flex-1">
            <div className="h-5 w-48 rounded skeleton-shimmer" />
            <div className="h-4 w-full rounded skeleton-shimmer" />
            <div className="h-4 w-3/4 rounded skeleton-shimmer" />
            <div className="h-11 w-full rounded-xl skeleton-shimmer mt-4" />
          </div>
        </div>
      </div>

      {/* 4. Snapshot Ledger Table Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-5 w-40 rounded skeleton-shimmer" />
            <div className="h-3 w-64 rounded skeleton-shimmer" />
          </div>
          <div className="h-9 w-48 rounded-xl skeleton-shimmer" />
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-14 w-full rounded-xl skeleton-shimmer"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
