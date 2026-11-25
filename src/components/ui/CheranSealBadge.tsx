"use client";

import React from "react";
import Image from "next/image";

interface CheranSealBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CheranSealBadgeProps["size"]>, string> = {
  sm: "w-10 h-10 p-1 rounded-xl",
  md: "w-12 h-12 p-1.5 rounded-xl",
  lg: "w-20 h-20 p-2 rounded-2xl",
};

const IMG_SIZES: Record<NonNullable<CheranSealBadgeProps["size"]>, string> = {
  sm: "40px",
  md: "48px",
  lg: "80px",
};

/**
 * Frames the dark-background metallic Cheran Society crest inside a deep obsidian medallion
 * with antique zari gold trim so it integrates cleanly onto warm ivory and indigo surfaces.
 */
export const CheranSealBadge: React.FC<CheranSealBadgeProps> = ({
  size = "md",
  className = "",
}) => {
  return (
    <div
      className={`relative flex-shrink-0 bg-[#0A101B] border border-[#B47B2B]/65 ring-1 ring-[#D49A42]/25 overflow-hidden shadow-xs ${SIZE_CLASSES[size]} ${className}`}
    >
      <Image
        src="/images/cheran_logo.png"
        alt="Cheran Co-operative Society Emblem"
        fill
        sizes={IMG_SIZES[size]}
        className="object-contain p-0.5"
        priority
      />
    </div>
  );
};
