import { round2, round3 } from "./decimal";

export const BABIN_DEFAULT_JARIGAI_PER_SAREE = 0.024; // 0.024 KG per Saree
export const BABIN_DEFAULT_SAREES_PER_SET = 200; // 200 Sarees per Set
export const BABIN_DEFAULT_RATE_PER_SET = 450; // ₹450 total rate per set given to society
export const BABIN_DEFAULT_WAGE_PER_SET = 250; // ₹250 wage per set
export const BABIN_DEFAULT_PROFIT_PER_SET = 200; // ₹200 society profit per set

/**
 * Units that belong strictly to Veatti or Saree master production
 * and must NEVER appear on the Babin / Jarigai thread allocation and delivery page.
 */
export const EXCLUDED_FROM_BABIN_PAGE = [
  "amman tex",
  "parimala tex",
  "parimal tex",
  "kumar tex",
  "thanrasu tex",
  "thanarasu tex",
];

export function isExcludedFromBabin(name?: string | null): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return EXCLUDED_FROM_BABIN_PAGE.some((ex) => normalized.includes(ex));
}

export interface BabinCalculationResult {
  jarigaiKg: number;
  totalSarees: number;
  setsProduced: number;
  remainingSarees: number;
  remainingKg: number;
  conversionFactor: number;
  sareePerSet: number;
}

export interface BabinSetFinancialResult {
  setsGiven: number;
  ratePerSet: number;
  wagePerSet: number;
  profitPerSet: number;
  totalAmount: number;
  totalWage: number;
  totalProfit: number;
  settledAmount: number;
  yetToSettle: number;
  paymentStatus: "PENDING" | "PARTIAL" | "SETTLED";
}

export interface PowerloomBabinReconciliation {
  powerloomName: string;
  allocatedSets: number; // Sets will produce from raw thread given
  deliveredSets: number; // Babin sets given to society
  yetToGive: number;     // Pending sets to deliver: max(0, allocatedSets - deliveredSets)
  extraGiven: number;    // Extra sets delivered beyond thread allocation: max(0, deliveredSets - allocatedSets)
  totalAmount: number;   // deliveredSets * 450
  totalWage: number;     // deliveredSets * 250
  totalProfit: number;   // deliveredSets * 200
  settledAmount: number; // Total settled so far
  yetToSettle: number;   // totalAmount - settledAmount
}

/**
 * Calculate Babin / Jarigai thread allocation:
 * 1. totalSarees = Math.floor(jarigaiKg / 0.024)
 * 2. setsProduced = Math.floor(totalSarees / 200)
 * 3. remainingSarees = totalSarees % 200
 * 4. remainingKg = remainingSarees * 0.024
 */
export function calculateBabinAllocation(
  jarigaiKg: number,
  conversionFactor = BABIN_DEFAULT_JARIGAI_PER_SAREE,
  sareePerSet = BABIN_DEFAULT_SAREES_PER_SET
): BabinCalculationResult {
  const safeKg = Math.max(0, Number(jarigaiKg) || 0);
  const factor = Number(conversionFactor) > 0 ? Number(conversionFactor) : BABIN_DEFAULT_JARIGAI_PER_SAREE;
  const perSet = Number(sareePerSet) > 0 ? Number(sareePerSet) : BABIN_DEFAULT_SAREES_PER_SET;

  // Handle floating point imprecision (e.g. 2.4 / 0.024 -> 99.99999999999999)
  const rawSareeCount = Math.round((safeKg / factor) * 1000) / 1000;
  const totalSarees = Math.floor(rawSareeCount);

  const setsProduced = Math.floor(totalSarees / perSet);
  const remainingSarees = totalSarees % perSet;
  const remainingKg = Math.round(remainingSarees * factor * 1000) / 1000;

  return {
    jarigaiKg: round3(safeKg),
    totalSarees,
    setsProduced,
    remainingSarees,
    remainingKg,
    conversionFactor: factor,
    sareePerSet: perSet,
  };
}

/**
 * Calculate financials for Babin sets given/delivered to the society:
 * - Rate: ₹450 per set
 * - Wage: ₹250 per set
 * - Society Profit: ₹200 per set
 * - Settled: amount paid
 * - Yet to Settle: totalAmount - settledAmount
 */
export function calculateBabinSetFinancials(
  setsGiven: number,
  settledAmount: number = 0,
  ratePerSet: number = BABIN_DEFAULT_RATE_PER_SET,
  wagePerSet: number = BABIN_DEFAULT_WAGE_PER_SET,
  profitPerSet: number = BABIN_DEFAULT_PROFIT_PER_SET
): BabinSetFinancialResult {
  const safeSets = Math.max(0, Math.floor(Number(setsGiven) || 0));
  const safeRate = Number(ratePerSet) >= 0 ? Number(ratePerSet) : BABIN_DEFAULT_RATE_PER_SET;
  const safeWage = Number(wagePerSet) >= 0 ? Number(wagePerSet) : BABIN_DEFAULT_WAGE_PER_SET;
  const safeProfit = Number(profitPerSet) >= 0 ? Number(profitPerSet) : BABIN_DEFAULT_PROFIT_PER_SET;
  const safeSettled = Math.max(0, Number(settledAmount) || 0);

  const totalAmount = round2(safeSets * safeRate);
  const totalWage = round2(safeSets * safeWage);
  const totalProfit = round2(safeSets * safeProfit);
  const yetToSettle = round2(Math.max(0, totalAmount - safeSettled));

  let paymentStatus: "PENDING" | "PARTIAL" | "SETTLED" = "PENDING";
  if (safeSettled >= totalAmount && totalAmount > 0) {
    paymentStatus = "SETTLED";
  } else if (safeSettled > 0) {
    paymentStatus = "PARTIAL";
  }

  return {
    setsGiven: safeSets,
    ratePerSet: safeRate,
    wagePerSet: safeWage,
    profitPerSet: safeProfit,
    totalAmount,
    totalWage,
    totalProfit,
    settledAmount: round2(safeSettled),
    yetToSettle,
    paymentStatus,
  };
}

/**
 * Reconcile powerloom Babin sets:
 * - Allocated: Sets will produce from thread allocation (BabinEntry)
 * - Delivered: Babin sets given to society (BabinSetDelivery)
 * - Yet to Give: pending sets to deliver = max(0, allocated - delivered)
 * - Extra Given: extra sets delivered beyond thread allocation = max(0, delivered - allocated)
 */
export function reconcilePowerloomBabinSets(
  powerloomName: string,
  allocatedSets: number,
  deliveredSets: number,
  settledAmount: number = 0,
  ratePerSet: number = BABIN_DEFAULT_RATE_PER_SET,
  wagePerSet: number = BABIN_DEFAULT_WAGE_PER_SET,
  profitPerSet: number = BABIN_DEFAULT_PROFIT_PER_SET
): PowerloomBabinReconciliation {
  const safeAllocated = Math.max(0, Math.floor(Number(allocatedSets) || 0));
  const safeDelivered = Math.max(0, Math.floor(Number(deliveredSets) || 0));
  const safeSettled = Math.max(0, Number(settledAmount) || 0);

  const yetToGive = Math.max(0, safeAllocated - safeDelivered);
  const extraGiven = Math.max(0, safeDelivered - safeAllocated);

  const totalAmount = round2(safeDelivered * ratePerSet);
  const totalWage = round2(safeDelivered * wagePerSet);
  const totalProfit = round2(safeDelivered * profitPerSet);
  const yetToSettle = round2(Math.max(0, totalAmount - safeSettled));

  return {
    powerloomName,
    allocatedSets: safeAllocated,
    deliveredSets: safeDelivered,
    yetToGive,
    extraGiven,
    totalAmount,
    totalWage,
    totalProfit,
    settledAmount: round2(safeSettled),
    yetToSettle,
  };
}


