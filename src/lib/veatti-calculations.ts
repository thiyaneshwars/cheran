import { Decimal } from "decimal.js";
import { round2, toDecimal, add, sub, mul, div, sum } from "./decimal";

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface UnitCalculations {
  totalProducedMeters: number;
  totalHandoveredMeters: number;
  godownMeters: number;
  balanceToHandover: number;
  totalVaravuAmount: number;
  totalAdvancePaid: number;
  outstandingBalance: number;
  isExcessAdvance: boolean;
  excessAdvanceAmount: number;
  amountPayable: number;
}

export interface VaravuCalculationInput {
  quantityOrKg: number;
  rate: number;
}

/**
 * Calculate Varavu Amount = Paavu KG (or quantity) × Applicable Rate
 */
export function calculateVaravuAmount(quantityOrKg: number | string, rate: number | string): number {
  const q = toDecimal(quantityOrKg);
  const r = toDecimal(rate);
  if (q.isNegative() || r.isNegative()) {
    // Prevent negative calculations unless explicitly allowed
    return 0;
  }
  return round2(q.times(r));
}

/**
 * Calculate Net Production = Daily Loom Production - Wastage / Adjustment
 */
export function calculateNetProduction(
  dailyMeters: number | string,
  wastageMeters: number | string = 0
): number {
  const daily = toDecimal(dailyMeters);
  const waste = toDecimal(wastageMeters);
  const net = daily.minus(waste);
  return round2(net.isNegative() ? 0 : net);
}

/**
 * Calculate Paavu Meters from Paavu KG using conversion ratio
 * Default ratio: 12.0 meters per KG (configurable)
 */
export function calculatePaavuMetersFromKg(
  kg: number | string,
  conversionRatio: number | string = 12.0
): number {
  const k = toDecimal(kg);
  const ratio = toDecimal(conversionRatio);
  return round2(k.times(ratio));
}

/**
 * Calculate Paavu KG from Paavu Meters using conversion ratio
 */
export function calculatePaavuKgFromMeters(
  meters: number | string,
  conversionRatio: number | string = 12.0
): number {
  const m = toDecimal(meters);
  const ratio = toDecimal(conversionRatio);
  if (ratio.isZero()) return 0;
  return round2(m.dividedBy(ratio));
}

/**
 * Calculate Remaining Paavu Meters = Allocated Meters - Produced Meters
 */
export function calculateRemainingMeters(
  allocatedMeters: number | string,
  producedMeters: number | string = 0
): number {
  const allocated = toDecimal(allocatedMeters);
  const produced = toDecimal(producedMeters);
  const remaining = allocated.minus(produced);
  return round2(remaining.isNegative() ? 0 : remaining);
}

/**
 * Calculate Complete Unit Financial & Production Summary
 */
export function calculateUnitFinancials(params: {
  targetMeters: number;
  totalProducedMeters: number;
  handoveredMeters: number;
  varavuAmounts: number[];
  advanceAmounts: number[];
  initialAdvance?: number;
}): UnitCalculations {
  const target = toDecimal(params.targetMeters || 0);
  const produced = toDecimal(params.totalProducedMeters || 0);
  const handovered = toDecimal(params.handoveredMeters || 0);

  // Godown Balance = Total Production - Total Government Handover
  const godown = produced.minus(handovered);
  const godownMeters = round2(godown.isNegative() ? 0 : godown);

  // Balance to Handover = Target Meters - Total Government Handover
  const balanceToHand = target.minus(handovered);
  const balanceToHandover = round2(balanceToHand.isNegative() ? 0 : balanceToHand);

  // Varavu total
  let totalVaravu = new Decimal(0);
  for (const v of params.varavuAmounts || []) {
    totalVaravu = totalVaravu.plus(toDecimal(v || 0));
  }

  // Advance total (including initialAdvance if provided)
  let totalAdvance = new Decimal(params.initialAdvance || 0);
  for (const a of params.advanceAmounts || []) {
    totalAdvance = totalAdvance.plus(toDecimal(a || 0));
  }

  // Outstanding Balance = Total Varavu Amount - Total Advance Paid
  const outstanding = totalVaravu.minus(totalAdvance);
  const outstandingBalance = round2(outstanding);
  const isExcess = outstanding.isNegative();
  const excessAdvanceAmount = isExcess ? round2(outstanding.abs()) : 0;
  const amountPayable = isExcess ? 0 : outstandingBalance;

  return {
    totalProducedMeters: round2(produced),
    totalHandoveredMeters: round2(handovered),
    godownMeters,
    balanceToHandover,
    totalVaravuAmount: round2(totalVaravu),
    totalAdvancePaid: round2(totalAdvance),
    outstandingBalance,
    isExcessAdvance: isExcess,
    excessAdvanceAmount,
    amountPayable,
  };
}

/**
 * Build Running Ledger Lines with chronological running balance
 */
export interface LedgerTransaction {
  id: string;
  date: string;
  type: "VARAVU" | "ADVANCE" | "PRODUCTION" | "HANDOVER";
  weaverName: string;
  unitId: string;
  paavuKg?: number;
  rate?: number;
  varavuAmount?: number;
  productionMeters?: number;
  handoverMeters?: number;
  advanceAmount?: number;
  paymentMode?: string;
  referenceNo?: string;
  notes?: string;
}

export interface RunningLedgerRow extends LedgerTransaction {
  debit: number; // Advance paid out (money given to weaver)
  credit: number; // Varavu earned (wages/credit for paavu)
  runningBalance: number; // Net amount payable (credit - debit running sum)
}

export function computeRunningLedger(
  transactions: LedgerTransaction[],
  openingBalance: number = 0
): { rows: RunningLedgerRow[]; closingBalance: number; totalCredit: number; totalDebit: number } {
  // Sort chronologically
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentBalance = toDecimal(openingBalance);
  let totalCredit = new Decimal(0);
  let totalDebit = new Decimal(0);

  const rows: RunningLedgerRow[] = sorted.map((tx) => {
    const credit = toDecimal(tx.varavuAmount || 0);
    const debit = toDecimal(tx.advanceAmount || 0);

    totalCredit = totalCredit.plus(credit);
    totalDebit = totalDebit.plus(debit);

    // Running balance increases with Varavu (credit), decreases with Advance (debit)
    currentBalance = currentBalance.plus(credit).minus(debit);

    return {
      ...tx,
      credit: round2(credit),
      debit: round2(debit),
      runningBalance: round2(currentBalance),
    };
  });

  return {
    rows,
    closingBalance: round2(currentBalance),
    totalCredit: round2(totalCredit),
    totalDebit: round2(totalDebit),
  };
}

/**
 * Traditional Veatti Register Constants & Helpers
 * Based on handwritten register reference:
 * - Weft multiplier: 0.119 KG per meter of produced cloth
 * - Default wage rate: ₹19.00 per meter
 * - Weft bag conversion: 8.4 KG per bag
 */
export const TRADITIONAL_WEFT_FACTOR = 0.119;
export const TRADITIONAL_DEFAULT_WAGE_RATE = 19.0;
export const VEATTI_KG_PER_BAG = 60.0;
export const SAREE_KG_PER_BAG = 50.0;
export const TRADITIONAL_KG_PER_BAG = 60.0;

/**
 * Get Weft KG per Bag based on cloth type:
 * - Veatti: 60 KG per bag
 * - Saree: 50 KG per bag
 */
export function getKgPerBag(clothType?: string): number {
  return clothType === "SAREE" ? SAREE_KG_PER_BAG : VEATTI_KG_PER_BAG;
}

/**
 * Traditional Veatti & Babin Constants & Helpers (Co-optex Tamil Nadu Standard)
 * - Standard Single Dhoti Length: 2.00 Meters (4-Muzham)
 * - 1 Babin Set = 500 Veattis = 1,000 Meters
 * - Babin Consumption Rate: 1 Set per 500 Veattis (or 1,000 meters)
 */
export const VEATTI_DEFAULT_LENGTH_METERS = 2.00;
export const VEATTI_VEATTIS_PER_BABIN_SET = 500;
export const VEATTI_METERS_PER_BABIN_SET = 1000; // 500 Veattis * 2.00m

/**
 * Calculate Veatti Babin Sets Consumed:
 * 1 Babin set consumed per 500 Veattis (1,000 meters)
 */
export function calculateVeattiBabinConsumed(producedMeters: number | string): number {
  const m = toDecimal(producedMeters || 0);
  if (m.isNegative() || m.isZero()) return 0;
  return Number(m.dividedBy(toDecimal(VEATTI_METERS_PER_BABIN_SET)).toFixed(2));
}

/**
 * Convert Veatti count to Meters (1 Veatti = 2.00m)
 */
export function calculateMetersFromVeattis(veattiCount: number | string): number {
  const v = toDecimal(veattiCount || 0);
  if (v.isNegative() || v.isZero()) return 0;
  return Number(v.times(toDecimal(VEATTI_DEFAULT_LENGTH_METERS)).toFixed(2));
}

/**
 * Convert Meters to Veatti count (1 Veatti = 2.00m)
 */
export function calculateVeattisFromMeters(meters: number | string): number {
  const m = toDecimal(meters || 0);
  if (m.isNegative() || m.isZero()) return 0;
  return Number(m.dividedBy(toDecimal(VEATTI_DEFAULT_LENGTH_METERS)).toFixed(2));
}

/**
 * Unified helper for Babin consumption based on cloth type
 */
export function calculateClothBabinConsumed(producedMeters: number | string, clothType: string = "VEATTI"): number {
  return clothType === "SAREE"
    ? calculateSareeBabinConsumed(producedMeters)
    : calculateVeattiBabinConsumed(producedMeters);
}
export const SAREE_DEFAULT_LENGTH_METERS = 5.50;
export const SAREE_SAREES_PER_BABIN_SET = 200;
export const SAREE_METERS_PER_BABIN_SET = 1100; // 200 Sarees * 5.50m

/**
 * Calculate Saree Babin Sets Consumed:
 * 1 Babin set consumed per 200 Sarees (1,100 meters)
 */
export function calculateSareeBabinConsumed(producedMeters: number | string): number {
  const m = toDecimal(producedMeters || 0);
  if (m.isNegative() || m.isZero()) return 0;
  return Number(m.dividedBy(toDecimal(SAREE_METERS_PER_BABIN_SET)).toFixed(2));
}

/**
 * Convert Saree count to Meters (1 Saree = 5.50m)
 */
export function calculateMetersFromSarees(sareeCount: number | string): number {
  const s = toDecimal(sareeCount || 0);
  if (s.isNegative() || s.isZero()) return 0;
  return Number(s.times(toDecimal(SAREE_DEFAULT_LENGTH_METERS)).toFixed(2));
}

/**
 * Convert Meters to Saree count (1 Saree = 5.50m)
 */
export function calculateSareesFromMeters(meters: number | string): number {
  const m = toDecimal(meters || 0);
  if (m.isNegative() || m.isZero()) return 0;
  return Number(m.dividedBy(toDecimal(SAREE_DEFAULT_LENGTH_METERS)).toFixed(2));
}

/**
 * Calculate Weft Consumed (KG) = Produced Meters × 0.119
 * e.g., 2556m × 0.119 = 304.164 KG
 * e.g., 2560m × 0.119 = 304.640 KG
 * e.g., 2535m × 0.119 = 301.665 KG
 */
export function calculateWeftConsumed(
  producedMeters: number | string,
  weftFactor: number = TRADITIONAL_WEFT_FACTOR
): number {
  const m = toDecimal(producedMeters);
  if (m.isNegative() || m.isZero()) return 0;
  const factor = toDecimal(weftFactor);
  return Number(m.times(factor).toFixed(3));
}

/**
 * Calculate Traditional Wage (₹) = Produced Meters × Wage Rate
 * e.g., 2556m × ₹19 = ₹48,564
 * e.g., 2560m × ₹19 = ₹48,640
 * e.g., 2535m × ₹19 = ₹48,165
 */
export function calculateTraditionalWage(
  producedMeters: number | string,
  rate: number | string = TRADITIONAL_DEFAULT_WAGE_RATE
): number {
  const m = toDecimal(producedMeters);
  const r = toDecimal(rate);
  if (m.isNegative() || r.isNegative()) return 0;
  return round2(m.times(r));
}

/**
 * Convert Weft Bags to KG:
 * - Veatti default: 60 KG per bag
 * - Saree default: 50 KG per bag
 * Or configurable / custom kgPerBag
 */
export function calculateBagsToKg(
  bags: number | string,
  kgPerBagOrClothType: number | string = TRADITIONAL_KG_PER_BAG
): number {
  const b = toDecimal(bags);
  if (b.isNegative() || b.isZero()) return 0;
  let factor: number;
  if (typeof kgPerBagOrClothType === "string") {
    factor = getKgPerBag(kgPerBagOrClothType);
  } else if (typeof kgPerBagOrClothType === "number" && kgPerBagOrClothType > 0) {
    factor = kgPerBagOrClothType;
  } else {
    factor = TRADITIONAL_KG_PER_BAG;
  }
  return round2(b.times(toDecimal(factor)));
}

/**
 * Traditional Register Entry Structure
 */
export interface TraditionalRegisterRow {
  id: string;
  date: string;
  entryType: "PAAVU" | "PRODUCED" | "WEFT_BAG" | "CASH" | "BABIN" | string;
  description: string;
  paavuGivenMeters: number;
  paavuProducedMeters: number;
  remainingPaavuMeters?: number;
  weftGivenKg: number;
  weftBagsGiven?: number;
  weftConsumedKg: number;
  weftBalanceKg?: number;
  babinCount: number;
  babinConsumed?: number;
  babinBalance?: number;
  beamCount?: number;
  wageRate: number;
  wageEarned: number;
  cashPaid: number;
  netBalance?: number;
  notes?: string;
}

/**
 * Computes running Paavu remaining, Weft balance, and financial balance (+ or -)
 * for the traditional handwritten register.
 * For SAREE clothType: consumes 1 set of Babin per 200 Sarees produced (1,100 meters).
 */
export function computeTraditionalRegisterLedger(
  entries: TraditionalRegisterRow[],
  openingBalances?: {
    remainingPaavu?: number;
    weftStock?: number;
    netBalance?: number;
    babinStock?: number;
  },
  clothType: string = "VEATTI"
) {
  const isSaree = clothType === "SAREE";

  // Chronological sort
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const rawOpeningPaavu = toDecimal(openingBalances?.remainingPaavu || 0);

  // Check if opening paavu was already entered as one of the register entries
  const hasOpeningInEntries = sorted.some(
    (e) => !rawOpeningPaavu.isZero() && toDecimal(e.paavuGivenMeters || 0).equals(rawOpeningPaavu)
  );

  const effectiveOpeningPaavu = hasOpeningInEntries
    ? new Decimal(0)
    : rawOpeningPaavu;

  const hasBabinInEntries = sorted.some((e) => (e.babinCount || 0) > 0);
  const effectiveOpeningBabin = hasBabinInEntries ? 0 : (openingBalances?.babinStock || 0);

  let currentRemainingPaavu = effectiveOpeningPaavu;
  let currentWeftStock = toDecimal(openingBalances?.weftStock || 0);
  let currentNetBalance = toDecimal(openingBalances?.netBalance || 0);
  let currentBabinStock = effectiveOpeningBabin;

  let totalPaavuGiven = effectiveOpeningPaavu;
  let totalProduced = new Decimal(0);
  let totalWeftGiven = toDecimal(openingBalances?.weftStock || 0);
  let totalWeftConsumed = new Decimal(0);
  let totalBabinIssued = effectiveOpeningBabin;
  let totalBabinConsumed = 0;
  let totalWageEarned = new Decimal(0);
  let totalCashPaid = new Decimal(0);

  const rows = sorted.map((entry) => {
    const givenPaavu = toDecimal(entry.paavuGivenMeters || 0);
    const producedPaavu = toDecimal(entry.paavuProducedMeters || 0);
    const givenWeft = toDecimal(entry.weftGivenKg || 0);
    const consumedWeft = toDecimal(entry.weftConsumedKg || 0);
    const earnedWage = toDecimal(entry.wageEarned || 0);
    const paidCash = toDecimal(entry.cashPaid || 0);
    const entryBabin = entry.babinCount || 0;

    totalPaavuGiven = totalPaavuGiven.plus(givenPaavu);
    totalProduced = totalProduced.plus(producedPaavu);
    totalWeftGiven = totalWeftGiven.plus(givenWeft);
    totalWeftConsumed = totalWeftConsumed.plus(consumedWeft);
    totalWageEarned = totalWageEarned.plus(earnedWage);
    totalCashPaid = totalCashPaid.plus(paidCash);

    if (entry.entryType === "BABIN" || entryBabin > 0) {
      currentBabinStock = round2(currentBabinStock + entryBabin);
      totalBabinIssued = round2(totalBabinIssued + entryBabin);
    }

    // Babin Consumption:
    // - SAREE: 1 set consumed per 200 Sarees (1,100 meters)
    // - VEATTI: 1 set consumed per 500 Veattis (1,000 meters - Co-optex standard)
    let rowBabinConsumed = 0;
    if (entry.entryType === "PRODUCED" && !producedPaavu.isZero()) {
      rowBabinConsumed = isSaree
        ? calculateSareeBabinConsumed(round2(producedPaavu))
        : calculateVeattiBabinConsumed(round2(producedPaavu));
      totalBabinConsumed = round2(totalBabinConsumed + rowBabinConsumed);
      currentBabinStock = Math.max(0, round2(currentBabinStock - rowBabinConsumed));
    }

    // Remaining Paavu: + Given - Produced
    currentRemainingPaavu = currentRemainingPaavu.plus(givenPaavu).minus(producedPaavu);

    // Weft Stock: + Given - Consumed
    currentWeftStock = currentWeftStock.plus(givenWeft).minus(consumedWeft);

    // Net Balance: + Wage Earned - Cash Paid
    // If Positive: Society owes powerloom (+ Payable)
    // If Negative: Powerloom owes society / excess advance (- Advance)
    currentNetBalance = currentNetBalance.plus(earnedWage).minus(paidCash);

    return {
      ...entry,
      remainingPaavuMeters: round2(currentRemainingPaavu),
      weftBalanceKg: Number(currentWeftStock.toFixed(3)),
      netBalance: round2(currentNetBalance),
      babinConsumed: rowBabinConsumed,
      babinBalance: round2(currentBabinStock),
    };
  });

  const remainingBabin = Math.max(0, round2(currentBabinStock));

  return {
    rows,
    summary: {
      totalPaavuGiven: round2(totalPaavuGiven),
      totalProduced: round2(totalProduced),
      remainingPaavu: round2(currentRemainingPaavu),
      totalWeftGiven: Number(totalWeftGiven.toFixed(3)),
      totalWeftConsumed: Number(totalWeftConsumed.toFixed(3)),
      weftStock: Number(currentWeftStock.toFixed(3)),
      totalBabin: remainingBabin, // Remains available babin sets
      totalBabinIssued: round2(totalBabinIssued),
      totalBabinConsumed: round2(totalBabinConsumed),
      remainingBabin,
      totalWageEarned: round2(totalWageEarned),
      totalCashPaid: round2(totalCashPaid),
      netBalance: round2(currentNetBalance),
      isPayable: currentNetBalance.isPositive() && !currentNetBalance.isZero(),
      isExcessAdvance: currentNetBalance.isNegative(),
    },
  };
}

/**
 * Calculate dynamic effective totals and metrics for a unit with its relations
 */
export function calculateUnitEffectiveTotals(unit: any) {
  // 1. Total Production = Sum of netProduction from daily productions or register entries
  const dailyProduction = (unit.dailyProductions || []).reduce(
    (acc: number, p: any) => add(acc, p.netProduction || p.dailyMeters || 0),
    0
  );
  const registerProduction = (unit.registerEntries || []).reduce(
    (acc: number, r: any) => add(acc, r.paavuProducedMeters || 0),
    0
  );
  const totalProduction = registerProduction > 0
    ? registerProduction
    : (dailyProduction > 0 ? dailyProduction : (unit.totalProducedMeters || 0));

  // 2. Total Handover
  const totalHandover = (unit.handovers || []).reduce(
    (acc: number, h: any) => add(acc, h.meters || 0),
    0
  );

  // 3. Godown stock = Total Production - Total Handover
  const godownStock = Math.max(0, sub(totalProduction, totalHandover));

  // 4. Target & Balance to Handover
  const targetMeters = unit.targetMeters || 0;
  const balanceToHandover = Math.max(0, sub(targetMeters, totalHandover));

  // 5. Total Paavu Given
  const registerPaavuGiven = (unit.registerEntries || []).reduce(
    (acc: number, r: any) => add(acc, r.paavuGivenMeters || 0),
    0
  );
  const basePaavuMeters = unit.paavuMeters || 0;
  // If opening paavu is already recorded in one of the register entries, do not double-count it
  const hasInitialInRegister = (unit.registerEntries || []).some(
    (r: any) => Math.abs((r.paavuGivenMeters || 0) - basePaavuMeters) < 0.01 && (r.paavuGivenMeters || 0) > 0
  );

  const hasAnyActivity =
    (unit.registerEntries || []).length > 0 ||
    (unit.dailyProductions || []).length > 0 ||
    (unit.paavus || []).length > 0 ||
    (unit.handovers || []).length > 0 ||
    (unit.varavuEntries || []).length > 0 ||
    (unit.advanceEntries || []).length > 0 ||
    (unit.totalProducedMeters || 0) > 0;

  let effectivePaavuTotal = 0;
  if (registerPaavuGiven > 0) {
    if (hasInitialInRegister) {
      effectivePaavuTotal = registerPaavuGiven;
    } else if (basePaavuMeters >= registerPaavuGiven) {
      effectivePaavuTotal = basePaavuMeters;
    } else {
      effectivePaavuTotal = add(basePaavuMeters, registerPaavuGiven);
    }
  } else if (!hasAnyActivity && (unit.paavuCount || 0) === 0) {
    // Fresh unit with zero activity & zero paavu count has NO dummy paavu
    effectivePaavuTotal = 0;
  } else {
    effectivePaavuTotal = basePaavuMeters;
  }

  // 6. Remaining Paavu = Total Paavu Given - Total Production
  const remainingPaavu = Math.max(0, sub(effectivePaavuTotal, totalProduction));

  // 7. Paavu Weight (KG)
  const conversionRatio = unit.conversionRatio || 12;
  const paavuWeightKg = effectivePaavuTotal > 0
    ? round2(effectivePaavuTotal / conversionRatio)
    : 0;

  // 8. Babin Count & Saree Consumption
  const isSaree = unit.clothType === "SAREE";
  const registerBabinsIssued = (unit.registerEntries || [])
    .filter((r: any) => r.entryType === "BABIN" || (r.babinCount || 0) > 0)
    .reduce((acc: number, r: any) => add(acc, r.babinCount || 0), 0);

  const hasBabinInEntries = (unit.registerEntries || []).some(
    (r: any) => (r.babinCount || 0) > 0
  );

  const baseBabinIssued = hasBabinInEntries
    ? registerBabinsIssued
    : (effectivePaavuTotal > 0 || (unit.babinCount || 0) > 0 ? (unit.babinCount || 0) : 0);

  // Babin consumption:
  // - SAREE: 1 set / 200 Sarees (1,100m)
  // - VEATTI: 1 set / 500 Veattis (1,000m - Co-optex standard)
  const registerBabinConsumed = (unit.registerEntries || [])
    .filter((r: any) => r.entryType === "PRODUCED")
    .reduce((acc: number, r: any) => {
      const consumed = isSaree
        ? calculateSareeBabinConsumed(r.paavuProducedMeters || 0)
        : calculateVeattiBabinConsumed(r.paavuProducedMeters || 0);
      return round2(acc + consumed);
    }, 0);

  const babinConsumed = registerBabinConsumed > 0
    ? registerBabinConsumed
    : (isSaree ? calculateSareeBabinConsumed(totalProduction) : calculateVeattiBabinConsumed(totalProduction));
  const remainingBabin = Math.max(0, round2(baseBabinIssued - babinConsumed));
  const babinCount = remainingBabin;

  // 9. Weft Stock: initialWeftKg + registerWeftGiven - registerWeftConsumed
  const initialWeft = toDecimal(unit.initialWeftKg || 0);
  const registerWeftGiven = (unit.registerEntries || []).reduce(
    (acc: Decimal, r: any) => acc.plus(toDecimal(r.weftGivenKg || 0)),
    new Decimal(0)
  );
  const totalWeftGiven = initialWeft.plus(registerWeftGiven);
  const totalWeftConsumed = (unit.registerEntries || []).reduce(
    (acc: Decimal, r: any) => acc.plus(toDecimal(r.weftConsumedKg || 0)),
    new Decimal(0)
  );
  const weftStockKg = Math.max(0, Number(totalWeftGiven.minus(totalWeftConsumed).toFixed(3)));

  // 10. Varavu / Wages: from register entries if present, else direct entries
  const directVaravu = (unit.varavuEntries || []).reduce(
    (acc: number, v: any) => add(acc, v.amount || 0),
    0
  );
  const registerWages = (unit.registerEntries || []).reduce(
    (acc: number, r: any) => add(acc, r.wageEarned || 0),
    0
  );
  const totalVaravu = registerWages > 0
    ? registerWages
    : (directVaravu > 0 ? directVaravu : (unit.totalVaravuAmount || 0));

  // 11. Advance / Cash paid: from register cashPaid + initialAdvance, or advanceEntries
  const advanceFromEntries = (unit.advanceEntries || []).reduce(
    (acc: number, a: any) => add(acc, a.amount || 0),
    0
  );
  const registerCashPaid = (unit.registerEntries || []).reduce(
    (acc: number, r: any) => add(acc, r.cashPaid || 0),
    0
  );
  const totalAdvance = registerCashPaid > 0
    ? add(registerCashPaid, unit.initialAdvance || 0)
    : (advanceFromEntries > 0 ? add(advanceFromEntries, unit.initialAdvance || 0) : (unit.totalAdvancePaid || 0));

  // 12. Current Balance = totalVaravu - totalAdvance
  const currentBalance = sub(totalVaravu, totalAdvance);

  return {
    totalProduction,
    totalHandover,
    godownStock,
    targetMeters,
    balanceToHandover,
    effectivePaavuTotal,
    remainingPaavu,
    paavuWeightKg,
    babinCount,
    remainingBabin,
    babinConsumed,
    baseBabinIssued,
    weftStockKg,
    totalVaravu,
    totalAdvance,
    currentBalance,
  };
}

/**
 * Backend Helper: Recalculate and synchronize all financials & production for a Unit
 * Runs inside a Prisma transaction (tx)
 */
export async function syncUnitFinancialsAndTotals(tx: any, unitId: string) {
  const unit = await tx.productionUnit.findUnique({
    where: { id: unitId },
    include: {
      dailyProductions: true,
      handovers: true,
      varavuEntries: true,
      advanceEntries: true,
      registerEntries: true,
    },
  });

  if (!unit) return null;

  const totals = calculateUnitEffectiveTotals(unit);
  const isSaree = unit.clothType === "SAREE";
  const hasBabinInEntries = (unit.registerEntries || []).some(
    (r: any) => (r.babinCount || 0) > 0
  );

  // Update ProductionUnit
  const updatedUnit = await tx.productionUnit.update({
    where: { id: unitId },
    data: {
      paavuMeters: totals.effectivePaavuTotal,
      paavuWeightKg: totals.paavuWeightKg,
      // For units without register babin entries, preserve base registered babins in DB to prevent compounding decrement
      babinCount: !hasBabinInEntries ? unit.babinCount : totals.babinCount,
      totalProducedMeters: totals.totalProduction,
      handoveredMeters: totals.totalHandover,
      godownMeters: totals.godownStock,
      balanceToHandover: totals.balanceToHandover,
      totalVaravuAmount: totals.totalVaravu,
      totalAdvancePaid: totals.totalAdvance,
      currentBalance: totals.currentBalance,
      remainingPaavuMeters: totals.remainingPaavu,
      weftStockKg: totals.weftStockKg,
    },
  });

  return updatedUnit;
}

