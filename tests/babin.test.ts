import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  calculateBabinAllocation,
  calculateBabinSetFinancials,
  reconcilePowerloomBabinSets,
  BABIN_DEFAULT_JARIGAI_PER_SAREE,
  BABIN_DEFAULT_SAREES_PER_SET,
  BABIN_DEFAULT_RATE_PER_SET,
  BABIN_DEFAULT_WAGE_PER_SET,
  BABIN_DEFAULT_PROFIT_PER_SET,
} from "@/lib/babin-calculations";
import { calculateProfitAnalysis } from "@/lib/sections";

describe("Babin & Jarigai Raw Thread Allocation Calculation & Ledger", () => {
  beforeEach(async () => {
    // Clean up babin entries and deliveries before each test
    await prisma.babinSetDelivery.deleteMany({});
    await prisma.babinEntry.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test to leave database clean for other test suites
    await prisma.babinSetDelivery.deleteMany({});
    await prisma.babinEntry.deleteMany({});
  });

  describe("Core Business Formula: KG / 0.024 -> Sarees / 200 -> Sets & Remainder", () => {
    it("Calculates exact sets with 0 remainder when jarigaiKg produces exact multiples of 200 sarees", () => {
      // 4.8 KG: 4.8 / 0.024 = 200 Sarees = 1 set, 0 remaining
      const alloc1 = calculateBabinAllocation(4.8);
      expect(alloc1.totalSarees).toBe(200);
      expect(alloc1.setsProduced).toBe(1);
      expect(alloc1.remainingSarees).toBe(0);
      expect(alloc1.remainingKg).toBe(0);

      // 9.6 KG: 9.6 / 0.024 = 400 Sarees = 2 sets, 0 remaining
      const alloc2 = calculateBabinAllocation(9.6);
      expect(alloc2.totalSarees).toBe(400);
      expect(alloc2.setsProduced).toBe(2);
      expect(alloc2.remainingSarees).toBe(0);
      expect(alloc2.remainingKg).toBe(0);
    });

    it("Calculates sets and isolates remainder sarees (<200) and equivalent remaining weight in KG", () => {
      const alloc = calculateBabinAllocation(5.0);
      expect(alloc.jarigaiKg).toBe(5.0);
      expect(alloc.totalSarees).toBe(208);
      expect(alloc.setsProduced).toBe(1);
      expect(alloc.remainingSarees).toBe(8);
      expect(alloc.remainingKg).toBeCloseTo(0.192, 3);
    });

    it("Handles quantities below 200 sarees where sets produced is 0 and all sarees are remaining", () => {
      const alloc = calculateBabinAllocation(2.4);
      expect(alloc.totalSarees).toBe(100);
      expect(alloc.setsProduced).toBe(0);
      expect(alloc.remainingSarees).toBe(100);
      expect(alloc.remainingKg).toBeCloseTo(2.4, 3);
    });

    it("Handles single saree thread allocation (0.024 KG)", () => {
      const alloc = calculateBabinAllocation(0.024);
      expect(alloc.totalSarees).toBe(1);
      expect(alloc.setsProduced).toBe(0);
      expect(alloc.remainingSarees).toBe(1);
      expect(alloc.remainingKg).toBeCloseTo(0.024, 3);
    });

    it("Safely handles 0 and negative KG values", () => {
      const allocZero = calculateBabinAllocation(0);
      expect(allocZero.totalSarees).toBe(0);
      expect(allocZero.setsProduced).toBe(0);
      expect(allocZero.remainingSarees).toBe(0);
      expect(allocZero.remainingKg).toBe(0);

      const allocNeg = calculateBabinAllocation(-5);
      expect(allocNeg.totalSarees).toBe(0);
      expect(allocNeg.setsProduced).toBe(0);
      expect(allocNeg.remainingSarees).toBe(0);
      expect(allocNeg.remainingKg).toBe(0);
    });
  });

  describe("Society Set Handover & Profit Settlement Formula: ₹450 Rate = ₹250 Wage + ₹200 Society Profit", () => {
    it("Calculates financials for 1 Babin set correctly", () => {
      const fin = calculateBabinSetFinancials(1, 0);
      expect(fin.setsGiven).toBe(1);
      expect(fin.ratePerSet).toBe(450);
      expect(fin.wagePerSet).toBe(250);
      expect(fin.profitPerSet).toBe(200);
      expect(fin.totalAmount).toBe(450);
      expect(fin.totalWage).toBe(250);
      expect(fin.totalProfit).toBe(200);
      expect(fin.settledAmount).toBe(0);
      expect(fin.yetToSettle).toBe(450);
      expect(fin.paymentStatus).toBe("PENDING");
    });

    it("Calculates financials for multiple sets (e.g. 4 sets = ₹1,800 Total, ₹1,000 Wage, ₹800 Profit)", () => {
      const fin = calculateBabinSetFinancials(4, 1000);
      expect(fin.setsGiven).toBe(4);
      expect(fin.totalAmount).toBe(1800);
      expect(fin.totalWage).toBe(1000);
      expect(fin.totalProfit).toBe(800);
      expect(fin.settledAmount).toBe(1000);
      expect(fin.yetToSettle).toBe(800);
      expect(fin.paymentStatus).toBe("PARTIAL");
    });

    it("Marks fully settled when settledAmount >= totalAmount", () => {
      const fin = calculateBabinSetFinancials(2, 900);
      expect(fin.totalAmount).toBe(900);
      expect(fin.settledAmount).toBe(900);
      expect(fin.yetToSettle).toBe(0);
      expect(fin.paymentStatus).toBe("SETTLED");
    });
  });

  describe("Powerloom Reconciliation: Delivered, Yet to Give & Extra Given", () => {
    it("Calculates Yet to Give when delivered is less than allocated", () => {
      // Allocated: 5 sets, Delivered: 2 sets -> Yet to Give: 3 sets, Extra: 0
      const recon = reconcilePowerloomBabinSets("Kumar Tex", 5, 2, 450);
      expect(recon.allocatedSets).toBe(5);
      expect(recon.deliveredSets).toBe(2);
      expect(recon.yetToGive).toBe(3);
      expect(recon.extraGiven).toBe(0);
      expect(recon.totalAmount).toBe(900); // 2 * 450
      expect(recon.totalWage).toBe(500);   // 2 * 250
      expect(recon.totalProfit).toBe(400); // 2 * 200
      expect(recon.yetToSettle).toBe(450);  // 900 - 450
    });

    it("Calculates 0 Yet to Give and 0 Extra Given when exact allocated sets delivered", () => {
      const recon = reconcilePowerloomBabinSets("Kumar Tex", 5, 5, 2250);
      expect(recon.allocatedSets).toBe(5);
      expect(recon.deliveredSets).toBe(5);
      expect(recon.yetToGive).toBe(0);
      expect(recon.extraGiven).toBe(0);
      expect(recon.yetToSettle).toBe(0);
    });

    it("Calculates Extra Given when powerloom delivers extra Babin sets beyond thread allocation", () => {
      // Allocated: 5 sets, Delivered: 8 sets -> Yet to Give: 0, Extra: 3 sets
      const recon = reconcilePowerloomBabinSets("Kumar Tex", 5, 8, 0);
      expect(recon.allocatedSets).toBe(5);
      expect(recon.deliveredSets).toBe(8);
      expect(recon.yetToGive).toBe(0);
      expect(recon.extraGiven).toBe(3);
      expect(recon.totalAmount).toBe(3600); // 8 * 450
      expect(recon.totalWage).toBe(2000);   // 8 * 250
      expect(recon.totalProfit).toBe(1600); // 8 * 200
      expect(recon.yetToSettle).toBe(3600);
    });
  });

  describe("Database Persistence & Integration with Society Profit Analysis", () => {
    it("Creates and saves BabinSetDelivery in SQLite", async () => {
      const fin = calculateBabinSetFinancials(2, 450);
      const delivery = await prisma.babinSetDelivery.create({
        data: {
          date: new Date("2026-11-04"),
          powerloomName: "Kumar Tex",
          setsGiven: fin.setsGiven,
          ratePerSet: fin.ratePerSet,
          wagePerSet: fin.wagePerSet,
          profitPerSet: fin.profitPerSet,
          totalAmount: fin.totalAmount,
          totalWage: fin.totalWage,
          totalProfit: fin.totalProfit,
          settledAmount: fin.settledAmount,
          yetToSettle: fin.yetToSettle,
          paymentStatus: fin.paymentStatus,
          notes: "Challan #104",
        },
      });

      expect(delivery.id).toBeDefined();
      expect(delivery.setsGiven).toBe(2);
      expect(delivery.totalAmount).toBe(900);
      expect(delivery.totalWage).toBe(500);
      expect(delivery.totalProfit).toBe(400);
      expect(delivery.settledAmount).toBe(450);
      expect(delivery.yetToSettle).toBe(450);
    });

    it("Integrates Babin set revenue, wage expense, and ₹200/set profit into calculateProfitAnalysis", async () => {
      // Deliver 3 sets: ₹1,350 revenue, ₹750 wage, ₹600 society profit
      const fin = calculateBabinSetFinancials(3, 0);
      await prisma.babinSetDelivery.create({
        data: {
          date: new Date("2026-11-04"),
          powerloomName: "Sengottaiyan Powerlooms",
          setsGiven: fin.setsGiven,
          ratePerSet: fin.ratePerSet,
          wagePerSet: fin.wagePerSet,
          profitPerSet: fin.profitPerSet,
          totalAmount: fin.totalAmount,
          totalWage: fin.totalWage,
          totalProfit: fin.totalProfit,
          settledAmount: fin.settledAmount,
          yetToSettle: fin.yetToSettle,
          paymentStatus: fin.paymentStatus,
        },
      });

      const profit = await calculateProfitAnalysis();
      expect(profit.babinRevenue).toBe(1350);
      expect(profit.babinWageExpense).toBe(750);
      expect(profit.babinProfit).toBe(600);
      expect(profit.sectionContributions.babin.profitContribution).toBe(600);
    });
  });
});
