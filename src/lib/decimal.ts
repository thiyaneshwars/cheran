import { Decimal } from "decimal.js";

// Configure Decimal.js for financial arithmetic: 20 digits precision, ROUND_HALF_UP
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(val: number | string | Decimal | null | undefined): Decimal {
  if (val === null || val === undefined || val === "") {
    return new Decimal(0);
  }
  return new Decimal(val);
}

export function round2(val: number | string | Decimal): number {
  return toDecimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function round3(val: number | string | Decimal): number {
  return toDecimal(val).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toNumber();
}

export function add(a: number | string | Decimal, b: number | string | Decimal): number {
  return toDecimal(a).plus(toDecimal(b)).toDecimalPlaces(2).toNumber();
}

export function sub(a: number | string | Decimal, b: number | string | Decimal): number {
  return toDecimal(a).minus(toDecimal(b)).toDecimalPlaces(2).toNumber();
}

export function mul(a: number | string | Decimal, b: number | string | Decimal): number {
  return toDecimal(a).times(toDecimal(b)).toDecimalPlaces(2).toNumber();
}

export function div(a: number | string | Decimal, b: number | string | Decimal): number {
  const d = toDecimal(b);
  if (d.isZero()) return 0;
  return toDecimal(a).dividedBy(d).toDecimalPlaces(2).toNumber();
}

export function sum(values: (number | string | Decimal)[]): number {
  let total = new Decimal(0);
  for (const v of values) {
    total = total.plus(toDecimal(v));
  }
  return total.toDecimalPlaces(2).toNumber();
}

export function formatINR(val: number | string | Decimal | null | undefined): string {
  const num = round2(val ?? 0);
  // Indian currency formatting: ₹X,XX,XXX.XX
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumberINR(val: number | string | Decimal | null | undefined): string {
  const num = round2(val ?? 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function maskAccountNumber(accNo: string): string {
  if (!accNo || accNo.length < 4) return "••••";
  const last4 = accNo.slice(-4);
  return `•••• •••• ${last4}`;
}
