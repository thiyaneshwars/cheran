"use client";

import React, { useEffect, useRef, useState } from "react";

interface RevealBlockProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  id?: string;
}

/**
 * Progressive-enhancement scroll reveal block.
 * Keeps content visible by default and transitions below-the-fold sections smoothly into view.
 */
export const RevealBlock: React.FC<RevealBlockProps> = ({
  children,
  className = "",
  delayMs = 0,
  id,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"default" | "pending" | "visible">("default");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setState("visible");
      return;
    }

    const rect = el.getBoundingClientRect();
    // Already in or above the viewport on mount -> reveal immediately without hiding.
    if (rect.top <= window.innerHeight * 0.94) {
      setState("visible");
      return;
    }

    setState("pending");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("visible");
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.06,
        rootMargin: "0px 0px -28px 0px",
      }
    );

    observer.observe(el);

    // Safety fallback so content never remains hidden on non-standard scroll containers
    const safetyTimer = window.setTimeout(() => {
      setState("visible");
    }, 1400);

    return () => {
      observer.disconnect();
      window.clearTimeout(safetyTimer);
    };
  }, []);

  return (
    <div
      id={id}
      ref={ref}
      data-scroll-state={state}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`sr-block ${className}`}
    >
      {children}
    </div>
  );
};

interface WeaveRuleProps {
  className?: string;
  label?: string;
}

/**
 * Woven thread horizon separator that stitches across the layout on scroll.
 */
export const WeaveRule: React.FC<WeaveRuleProps> = ({ className = "", label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "pending">("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("visible");
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.94) {
      setState("visible");
      return;
    }

    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div ref={ref} data-scroll-state={state} className="weave-horizon flex-1">
        <div className="weave-horizon-stitch" />
      </div>
      {label && (
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#5B6B84] flex-shrink-0">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * Sticky scroll-progress zari-and-indigo weft indicator pinned across the viewport top.
 */
export const ScrollThreadBar: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 left-0 right-0 h-[3px] z-50 bg-[#E5DEC9]/60 pointer-events-none no-print ${className}`}
    >
      <div
        className="h-full transition-[width] duration-100 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #14233C 0%, #B47B2B 82%, #D49A42 100%)",
        }}
      />
    </div>
  );
};

interface DispatchTickRailProps {
  produced: number;
  godown: number;
  handedOver: number;
  target: number;
  unitLabel?: string;
}

/**
 * Raised Timetable-derived stage tick-rail mapping Loom Output, Godown Custody, and Co-optex Dispatch.
 */
export const DispatchTickRail: React.FC<DispatchTickRailProps> = ({
  produced,
  godown,
  handedOver,
  target,
  unitLabel = "pcs",
}) => {
  const safeTarget = Math.max(1, target, produced, handedOver);
  const handoverPct = Math.min(100, Math.max(0, (handedOver / safeTarget) * 100));
  const producedTotalPct = Math.min(100, Math.max(handoverPct, (produced / safeTarget) * 100));

  return (
    <div className="bg-[#FAF7F0] border border-[#E5DEC9] rounded-xl p-4 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold text-[#14233C]">
        <span>Co-optex Fulfillment Extent</span>
        <span className="font-financial text-[#14233C]">
          {handoverPct.toFixed(1)}% ({handedOver.toLocaleString("en-IN")} /{" "}
          {target.toLocaleString("en-IN")} {unitLabel})
        </span>
      </div>

      {/* Multi-band Track */}
      <div className="relative h-2.5 w-full rounded-full bg-[#E5DEC9] overflow-hidden">
        {/* Produced share (includes godown waiting) */}
        <div
          className="absolute inset-y-0 left-0 bg-[#D49A42]/45 rail-fill-animated"
          style={{ width: `${producedTotalPct}%` }}
        />
        {/* Handed Over verified share */}
        <div
          className="absolute inset-y-0 left-0 bg-[#14233C] border-r-2 border-[#B47B2B] rail-fill-animated"
          style={{ width: `${handoverPct}%` }}
        />
      </div>

      {/* Tick Milestones */}
      <div className="grid grid-cols-3 gap-2 pt-0.5 text-[11px] font-financial text-[#5B6B84]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-[#14233C] flex-shrink-0" />
          <span className="truncate">Govt: {handedOver.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-[#D49A42] flex-shrink-0" />
          <span className="truncate">Godown: {godown.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <span className="w-2 h-2 rounded-xs border border-[#9E937B] bg-white flex-shrink-0" />
          <span className="truncate">Target: {target.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
};
