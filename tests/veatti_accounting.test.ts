import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  calculateVaravuAmount,
  calculateNetProduction,
  calculatePaavuMetersFromKg,
  calculateUnitFinancials,
  syncUnitFinancialsAndTotals,
  computeRunningLedger,
  calculateWeftConsumed,
  calculateTraditionalWage,
  calculateBagsToKg,
  computeTraditionalRegisterLedger,
  calculateUnitEffectiveTotals,
  calculateSareeBabinConsumed,
  calculateMetersFromSarees,
  calculateSareesFromMeters,
  SAREE_DEFAULT_LENGTH_METERS,
  SAREE_SAREES_PER_BABIN_SET,
  SAREE_METERS_PER_BABIN_SET,
  calculateVeattiBabinConsumed,
  calculateMetersFromVeattis,
  calculateVeattisFromMeters,
  VEATTI_DEFAULT_LENGTH_METERS,
  VEATTI_VEATTIS_PER_BABIN_SET,
  VEATTI_METERS_PER_BABIN_SET,
  VEATTI_KG_PER_BAG,
  SAREE_KG_PER_BAG,
  getKgPerBag,
} from "@/lib/veatti-calculations";

describe("Veatti Production, Paavu Accounting, Advance & Automatic Balance Management", () => {
  beforeEach(async () => {
    // Clean up test Veatti records
    await prisma.veattiAuditLog.deleteMany({});
    await prisma.veattiRegisterEntry.deleteMany({});
    await prisma.veattiVaravu.deleteMany({});
    await prisma.veattiAdvance.deleteMany({});
    await prisma.veattiRateHistory.deleteMany({});
    await prisma.veattiProductionEntry.deleteMany({});
    await prisma.governmentHandoverLog.deleteMany({});
    await prisma.paavuRecord.deleteMany({});
    await prisma.productionUnit.deleteMany({});
  });

  it("Test 1-3: Creates two different Veattis with different rates & independent Varavu calculations", async () => {
    // Veatti A: Rate ₹50/KG, 100 KG Paavu
    const unitA = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "K. R. Sengottaiyan Powerlooms",
        paavuCount: 1,
        paavuWeightKg: 100,
        paavuMeters: 1200,
        individualRate: 50,
        rateUnit: "PER_KG",
        targetMeters: 1160,
      },
    });

    // Veatti B: Rate ₹60/KG, 150 KG Paavu
    const unitB = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "M. P. Kandasamy Shed",
        paavuCount: 1,
        paavuWeightKg: 150,
        paavuMeters: 1800,
        individualRate: 60,
        rateUnit: "PER_KG",
        targetMeters: 1740,
      },
    });

    // Create Varavu for Veatti A: 100 KG @ ₹50 = ₹5,000
    const varavuA = await prisma.veattiVaravu.create({
      data: {
        unitId: unitA.id,
        varavuType: "PAAVU_PRODUCTION",
        paavuKg: 100,
        rate: 50,
        amount: calculateVaravuAmount(100, 50),
      },
    });

    // Create Varavu for Veatti B: 150 KG @ ₹60 = ₹9,000
    const varavuB = await prisma.veattiVaravu.create({
      data: {
        unitId: unitB.id,
        varavuType: "PAAVU_PRODUCTION",
        paavuKg: 150,
        rate: 60,
        amount: calculateVaravuAmount(150, 60),
      },
    });

    expect(varavuA.amount).toBe(5000);
    expect(varavuB.amount).toBe(9000);

    // Sync unit financials
    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unitA.id);
      await syncUnitFinancialsAndTotals(tx, unitB.id);
    });

    const refreshedA = await prisma.productionUnit.findUnique({ where: { id: unitA.id } });
    const refreshedB = await prisma.productionUnit.findUnique({ where: { id: unitB.id } });

    expect(refreshedA?.totalVaravuAmount).toBe(5000);
    expect(refreshedB?.totalVaravuAmount).toBe(9000);
  });

  it("Test 4-5: Adds advance payments & verifies individual outstanding balances", async () => {
    // Setup Unit A with ₹5,000 Varavu
    const unitA = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "Weaver A",
        individualRate: 50,
        paavuWeightKg: 100,
      },
    });
    await prisma.veattiVaravu.create({
      data: { unitId: unitA.id, paavuKg: 100, rate: 50, amount: 5000 },
    });

    // Add Advance ₹2,000 to Unit A
    await prisma.veattiAdvance.create({
      data: { unitId: unitA.id, amount: 2000, paymentMode: "CASH" },
    });

    // Setup Unit B with ₹9,000 Varavu and ₹4,000 Advance
    const unitB = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "Weaver B",
        individualRate: 60,
        paavuWeightKg: 150,
      },
    });
    await prisma.veattiVaravu.create({
      data: { unitId: unitB.id, paavuKg: 150, rate: 60, amount: 9000 },
    });
    await prisma.veattiAdvance.create({
      data: { unitId: unitB.id, amount: 4000, paymentMode: "BANK_TRANSFER" },
    });

    // Sync both
    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unitA.id);
      await syncUnitFinancialsAndTotals(tx, unitB.id);
    });

    const refreshedA = await prisma.productionUnit.findUnique({ where: { id: unitA.id } });
    const refreshedB = await prisma.productionUnit.findUnique({ where: { id: unitB.id } });

    // Outstanding = Varavu - Advance
    // Unit A: 5000 - 2000 = 3000
    expect(refreshedA?.currentBalance).toBe(3000);
    expect(refreshedA?.totalAdvancePaid).toBe(2000);

    // Unit B: 9000 - 4000 = 5000
    expect(refreshedB?.currentBalance).toBe(5000);
    expect(refreshedB?.totalAdvancePaid).toBe(4000);
  });

  it("Test 6: Edit Paavu KG from 100 to 120 and verify automatic recalculation", async () => {
    // Initial state: 100 KG @ ₹50 = ₹5,000, Advance = ₹2,000, Outstanding = ₹3,000
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "Weaver Sync Test",
        individualRate: 50,
        paavuWeightKg: 100,
      },
    });
    const varavu = await prisma.veattiVaravu.create({
      data: { unitId: unit.id, paavuKg: 100, rate: 50, amount: 5000 },
    });
    await prisma.veattiAdvance.create({
      data: { unitId: unit.id, amount: 2000 },
    });

    // Now edit Paavu KG to 120
    const newKg = 120;
    const newAmount = calculateVaravuAmount(newKg, 50); // should be 6000
    expect(newAmount).toBe(6000);

    await prisma.$transaction(async (tx) => {
      await tx.veattiVaravu.update({
        where: { id: varavu.id },
        data: { paavuKg: newKg, amount: newAmount },
      });
      await tx.productionUnit.update({
        where: { id: unit.id },
        data: { paavuWeightKg: newKg },
      });
      await syncUnitFinancialsAndTotals(tx, unit.id);
    });

    const updatedUnit = await prisma.productionUnit.findUnique({ where: { id: unit.id } });

    // Varavu must be ₹6,000, Advance ₹2,000, Outstanding ₹4,000
    expect(updatedUnit?.totalVaravuAmount).toBe(6000);
    expect(updatedUnit?.totalAdvancePaid).toBe(2000);
    expect(updatedUnit?.currentBalance).toBe(4000);
  });

  it("Test 7: Edit one Veatti's rate and ensure another Veatti is unaffected", async () => {
    const unitA = await prisma.productionUnit.create({
      data: { clothType: "VEATTI", weaverName: "Unit A", individualRate: 50, paavuWeightKg: 120 },
    });
    const varavuA = await prisma.veattiVaravu.create({
      data: { unitId: unitA.id, paavuKg: 120, rate: 50, amount: 6000 },
    });
    await prisma.veattiAdvance.create({
      data: { unitId: unitA.id, amount: 2000 },
    });

    const unitB = await prisma.productionUnit.create({
      data: { clothType: "VEATTI", weaverName: "Unit B", individualRate: 60, paavuWeightKg: 150 },
    });
    await prisma.veattiVaravu.create({
      data: { unitId: unitB.id, paavuKg: 150, rate: 60, amount: 9000 },
    });
    await prisma.veattiAdvance.create({
      data: { unitId: unitB.id, amount: 4000 },
    });

    // Update Unit A rate from ₹50 to ₹55 and re-apply
    const newRateA = 55;
    const recalculatedAmountA = calculateVaravuAmount(120, newRateA); // 120 * 55 = 6600
    expect(recalculatedAmountA).toBe(6600);

    await prisma.$transaction(async (tx) => {
      await tx.veattiRateHistory.create({
        data: { unitId: unitA.id, rate: newRateA, previousRate: 50 },
      });
      await tx.productionUnit.update({
        where: { id: unitA.id },
        data: { individualRate: newRateA },
      });
      await tx.veattiVaravu.update({
        where: { id: varavuA.id },
        data: { rate: newRateA, amount: recalculatedAmountA },
      });
      await syncUnitFinancialsAndTotals(tx, unitA.id);
      await syncUnitFinancialsAndTotals(tx, unitB.id);
    });

    const refreshedA = await prisma.productionUnit.findUnique({ where: { id: unitA.id } });
    const refreshedB = await prisma.productionUnit.findUnique({ where: { id: unitB.id } });

    // Unit A updated: Varavu ₹6,600 - Advance ₹2,000 = Outstanding ₹4,600
    expect(refreshedA?.totalVaravuAmount).toBe(6600);
    expect(refreshedA?.currentBalance).toBe(4600);

    // Unit B is completely unaffected: Varavu ₹9,000, Advance ₹4,000, Outstanding ₹5,000
    expect(refreshedB?.individualRate).toBe(60);
    expect(refreshedB?.totalVaravuAmount).toBe(9000);
    expect(refreshedB?.currentBalance).toBe(5000);
  });

  it("Test 8: Delete a transaction and verify the balance updates accurately", async () => {
    const unit = await prisma.productionUnit.create({
      data: { clothType: "VEATTI", weaverName: "Delete Test Unit", individualRate: 55 },
    });
    await prisma.veattiVaravu.create({
      data: { unitId: unit.id, paavuKg: 120, rate: 55, amount: 6600 },
    });
    const advance = await prisma.veattiAdvance.create({
      data: { unitId: unit.id, amount: 2000 },
    });

    // Delete Advance transaction
    await prisma.$transaction(async (tx) => {
      await tx.veattiAdvance.delete({ where: { id: advance.id } });
      await syncUnitFinancialsAndTotals(tx, unit.id);
    });

    const refreshed = await prisma.productionUnit.findUnique({ where: { id: unit.id } });

    // Advance should now be 0, Outstanding should be 6600
    expect(refreshed?.totalAdvancePaid).toBe(0);
    expect(refreshed?.currentBalance).toBe(6600);
  });

  it("Test 9-10: Verifies complete accounting ledger running balance & dashboard totals", async () => {
    const unitA = await prisma.productionUnit.create({
      data: { clothType: "VEATTI", weaverName: "Weaver Alpha", individualRate: 50 },
    });
    const unitB = await prisma.productionUnit.create({
      data: { clothType: "VEATTI", weaverName: "Weaver Beta", individualRate: 60 },
    });

    // Unit A: Varavu ₹5,000, Advance ₹1,000
    await prisma.veattiVaravu.create({
      data: { unitId: unitA.id, paavuKg: 100, rate: 50, amount: 5000 },
    });
    await prisma.veattiAdvance.create({
      data: { unitId: unitA.id, amount: 1000 },
    });

    // Unit B: Varavu ₹3,000, Advance ₹500
    await prisma.veattiVaravu.create({
      data: { unitId: unitB.id, paavuKg: 50, rate: 60, amount: 3000 },
    });
    await prisma.veattiAdvance.create({
      data: { unitId: unitB.id, amount: 500 },
    });

    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unitA.id);
      await syncUnitFinancialsAndTotals(tx, unitB.id);
    });

    const allUnits = await prisma.productionUnit.findMany({ where: { clothType: "VEATTI" } });
    const totalVaravu = allUnits.reduce((sum, u) => sum + u.totalVaravuAmount, 0);
    const totalAdvance = allUnits.reduce((sum, u) => sum + u.totalAdvancePaid, 0);
    const netBalance = totalVaravu - totalAdvance;

    expect(totalVaravu).toBe(8000);
    expect(totalAdvance).toBe(1500);
    expect(netBalance).toBe(6500);

    // Test Running Ledger algorithm
    const ledgerResult = computeRunningLedger([
      {
        id: "1",
        date: "2026-10-01",
        type: "VARAVU",
        weaverName: "Weaver Alpha",
        unitId: unitA.id,
        varavuAmount: 5000,
      },
      {
        id: "2",
        date: "2026-10-02",
        type: "ADVANCE",
        weaverName: "Weaver Alpha",
        unitId: unitA.id,
        advanceAmount: 1000,
      },
      {
        id: "3",
        date: "2026-10-03",
        type: "VARAVU",
        weaverName: "Weaver Beta",
        unitId: unitB.id,
        varavuAmount: 3000,
      },
      {
        id: "4",
        date: "2026-10-04",
        type: "ADVANCE",
        weaverName: "Weaver Beta",
        unitId: unitB.id,
        advanceAmount: 500,
      },
    ]);

    expect(ledgerResult.rows[0].runningBalance).toBe(5000);
    expect(ledgerResult.rows[1].runningBalance).toBe(4000);
    expect(ledgerResult.rows[2].runningBalance).toBe(7000);
    expect(ledgerResult.rows[3].runningBalance).toBe(6500);
    expect(ledgerResult.closingBalance).toBe(6500);
  });

  it("Test 11: Verifies that historical transaction rates remain unchanged unless explicitly updated", async () => {
    const unit = await prisma.productionUnit.create({
      data: { clothType: "VEATTI", weaverName: "Historical Rate Unit", individualRate: 50 },
    });

    const pastVaravu = await prisma.veattiVaravu.create({
      data: {
        unitId: unit.id,
        transactionDate: new Date("2026-09-01"),
        paavuKg: 100,
        rate: 50,
        amount: 5000,
      },
    });

    // Update rate for FUTURE work only (applyToExistingVaravu = false)
    const newRate = 60;
    await prisma.veattiRateHistory.create({
      data: {
        unitId: unit.id,
        rate: newRate,
        previousRate: 50,
        effectiveDate: new Date("2026-10-01"),
      },
    });
    await prisma.productionUnit.update({
      where: { id: unit.id },
      data: { individualRate: newRate },
    });

    // Check past transaction
    const fetchedPastVaravu = await prisma.veattiVaravu.findUnique({
      where: { id: pastVaravu.id },
    });

    // Must remain 50 and 5000!
    expect(fetchedPastVaravu?.rate).toBe(50);
    expect(fetchedPastVaravu?.amount).toBe(5000);

    // New transaction uses new rate 60
    const newVaravu = await prisma.veattiVaravu.create({
      data: {
        unitId: unit.id,
        transactionDate: new Date("2026-10-02"),
        paavuKg: 100,
        rate: newRate,
        amount: calculateVaravuAmount(100, newRate),
      },
    });

    expect(newVaravu.rate).toBe(60);
    expect(newVaravu.amount).toBe(6000);
  });

  it("Test 8: Traditional Register Formulas (0.119 Weft Factor & ₹19 Wage Rate)", () => {
    // Exact rows from the handwritten notebook image:
    // Row 5: 2556m produced
    expect(calculateWeftConsumed(2556)).toBe(304.164);
    expect(calculateTraditionalWage(2556, 19)).toBe(48564);

    // Row 7: 2560m produced
    expect(calculateWeftConsumed(2560)).toBe(304.64);
    expect(calculateTraditionalWage(2560, 19)).toBe(48640);

    // Row 8: 2535m produced
    expect(calculateWeftConsumed(2535)).toBe(301.665);
    expect(calculateTraditionalWage(2535, 19)).toBe(48165);

    // Bag conversions (explicit 8.4 kg per bag from historical notebook)
    expect(calculateBagsToKg(240, 8.4)).toBe(2016);
    expect(calculateBagsToKg(120, 8.4)).toBe(1008);
    expect(calculateBagsToKg(600, 8.4)).toBe(5040);

    // Standard Weft Bag Weights: Veatti = 60 KG, Saree = 50 KG
    expect(VEATTI_KG_PER_BAG).toBe(60);
    expect(SAREE_KG_PER_BAG).toBe(50);
    expect(getKgPerBag("VEATTI")).toBe(60);
    expect(getKgPerBag("SAREE")).toBe(50);

    expect(calculateBagsToKg(10, "VEATTI")).toBe(600);
    expect(calculateBagsToKg(10, "SAREE")).toBe(500);
    expect(calculateBagsToKg(20, VEATTI_KG_PER_BAG)).toBe(1200);
    expect(calculateBagsToKg(20, SAREE_KG_PER_BAG)).toBe(1000);
  });

  it("Test 9: Full Chronological Traditional Register Ledger Tally (13 Columns)", () => {
    const rawEntries = [
      // 25/9: Paavu given 3170, Weft 2016kg (240 bags), Babin 9
      {
        id: "r1",
        date: "2026-09-25",
        entryType: "PAAVU",
        description: "2 பாவு 9 [பீம்]",
        paavuGivenMeters: 3170,
        paavuProducedMeters: 0,
        weftGivenKg: 2016,
        weftConsumedKg: 0,
        babinCount: 9,
        wageRate: 19,
        wageEarned: 0,
        cashPaid: 0,
      },
      // 3/10: Paavu given 8430, Weft 1008kg
      {
        id: "r2",
        date: "2026-10-03",
        entryType: "PAAVU",
        description: "பாவு 14 500",
        paavuGivenMeters: 8430,
        paavuProducedMeters: 0,
        weftGivenKg: 1008,
        weftConsumedKg: 0,
        babinCount: 0,
        wageRate: 19,
        wageEarned: 0,
        cashPaid: 0,
      },
      // 6/10: Paavu given 8050, Weft 5040kg, Babin 18
      {
        id: "r3",
        date: "2026-10-06",
        entryType: "PAAVU",
        description: "பாவு 14",
        paavuGivenMeters: 8050,
        paavuProducedMeters: 0,
        weftGivenKg: 5040,
        weftConsumedKg: 0,
        babinCount: 18,
        wageRate: 19,
        wageEarned: 0,
        cashPaid: 0,
      },
      // 14/10: Produced 2556m, Weft given 720, Cash paid 100,000
      {
        id: "r4",
        date: "2026-10-14",
        entryType: "PRODUCED",
        description: "வேட்டி (10 m)",
        paavuGivenMeters: 0,
        paavuProducedMeters: 2556,
        weftGivenKg: 720,
        weftConsumedKg: calculateWeftConsumed(2556), // 304.164
        babinCount: 0,
        wageRate: 19,
        wageEarned: calculateTraditionalWage(2556, 19), // 48564
        cashPaid: 100000,
      },
      // 17/10: Produced 2560m
      {
        id: "r5",
        date: "2026-10-17",
        entryType: "PRODUCED",
        description: "வேட்டி உற்பத்தி",
        paavuGivenMeters: 0,
        paavuProducedMeters: 2560,
        weftGivenKg: 0,
        weftConsumedKg: calculateWeftConsumed(2560), // 304.640
        babinCount: 0,
        wageRate: 19,
        wageEarned: calculateTraditionalWage(2560, 19), // 48640
        cashPaid: 0,
      },
      // 23/10: Produced 2535m
      {
        id: "r6",
        date: "2026-10-23",
        entryType: "PRODUCED",
        description: "வேட்டி உற்பத்தி",
        paavuGivenMeters: 0,
        paavuProducedMeters: 2535,
        weftGivenKg: 0,
        weftConsumedKg: calculateWeftConsumed(2535), // 301.665
        babinCount: 0,
        wageRate: 19,
        wageEarned: calculateTraditionalWage(2535, 19), // 48165
        cashPaid: 0,
      },
    ];

    const result = computeTraditionalRegisterLedger(rawEntries);

    // Verify row 1 running totals
    expect(result.rows[0].remainingPaavuMeters).toBe(3170);
    expect(result.rows[0].weftBalanceKg).toBe(2016);

    // Verify row 2 running totals: 3170 + 8430 = 11600; weft: 2016 + 1008 = 3024
    expect(result.rows[1].remainingPaavuMeters).toBe(11600);
    expect(result.rows[1].weftBalanceKg).toBe(3024);

    // Verify row 3 running totals: 11600 + 8050 = 19650; weft: 3024 + 5040 = 8064
    expect(result.rows[2].remainingPaavuMeters).toBe(19650);
    expect(result.rows[2].weftBalanceKg).toBe(8064);

    // Verify row 4 running totals: 19650 - 2556 = 17094; weft: 8064 + 720 - 304.164 = 8479.836
    expect(result.rows[3].remainingPaavuMeters).toBe(17094);
    expect(result.rows[3].weftConsumedKg).toBe(304.164);
    expect(result.rows[3].wageEarned).toBe(48564);

    // Verify overall summary
    // Total Paavu Given = 3170 + 8430 + 8050 = 19650
    expect(result.summary.totalPaavuGiven).toBe(19650);
    // Total Produced = 2556 + 2560 + 2535 = 7651
    expect(result.summary.totalProduced).toBe(7651);
    // Remaining Paavu = 19650 - 7651 = 11999
    expect(result.summary.remainingPaavu).toBe(11999);
    // Total Wages Earned = 48564 + 48640 + 48165 = 145369
    expect(result.summary.totalWageEarned).toBe(145369);
    // Total Cash Paid = 100000
    expect(result.summary.totalCashPaid).toBe(100000);
    // Net Balance = 145369 - 100000 = +45369 (Society has to pay Powerloom!)
    expect(result.summary.netBalance).toBe(45369);
    expect(result.summary.isPayable).toBe(true);
    expect(result.summary.isExcessAdvance).toBe(false);
  });

  it("Test 10: Database creation of Powerloom Unit & Register Entries with Automatic Sync", async () => {
    // 1. Register Powerloom (Step 1)
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "சக்திவேல் விசைத்தறி (Komarapalayam)",
        location: "குமாரபாளையம்",
        machineCount: 4,
        individualRate: 19.0,
      },
    });

    expect(unit.clothType).toBe("VEATTI");
    expect(unit.individualRate).toBe(19.0);

    // 2. Add Register Entry: Paavu Given
    const reg1 = await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        entryType: "PAAVU",
        description: "2 பாவு 9 பீம்",
        paavuGivenMeters: 3170,
        weftGivenKg: 2016,
        weftBagsGiven: 240,
        babinCount: 9,
      },
    });
    expect(reg1.paavuGivenMeters).toBe(3170);

    // 3. Add Register Entry: Production (2556m)
    const reg2 = await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        entryType: "PRODUCED",
        description: "வேட்டி உற்பத்தி",
        paavuProducedMeters: 2556,
        weftConsumedKg: calculateWeftConsumed(2556),
        wageRate: 19.0,
        wageEarned: calculateTraditionalWage(2556, 19.0),
      },
    });

    expect(reg2.weftConsumedKg).toBe(304.164);
    expect(reg2.wageEarned).toBe(48564);

    // 4. Sync Unit Totals
    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unit.id);
    });

    const refreshedUnit = await prisma.productionUnit.findUnique({
      where: { id: unit.id },
    });

    expect(refreshedUnit?.totalProducedMeters).toBe(2556);
    expect(refreshedUnit?.totalVaravuAmount).toBe(48564);
    expect(refreshedUnit?.weftStockKg).toBe(Number((2016 - 304.164).toFixed(3)));
    expect(refreshedUnit?.remainingPaavuMeters).toBe(3170 - 2556); // 614m
  });

  it("Test 11: Powerloom registration with initialWeftKg tallies remaining weft exactly from user screenshot", async () => {
    // 1. Register Powerloom with initial weft left (8,784 kg) & paavu (19,650 m)
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "சக்திவேல் விசைத்தறி (Handwritten Register)",
        machineCount: 4,
        paavuMeters: 19650,
        initialWeftKg: 8784.0,
        weftStockKg: 8784.0,
        weftMultiplier: 0.119,
        individualRate: 19.0,
      },
    });

    expect(unit.initialWeftKg).toBe(8784.0);
    expect(unit.weftMultiplier).toBe(0.119);

    // 2. Production Entry 1: 14/10/2026 - 2,556m
    const reg1 = await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-10-14"),
        entryType: "PRODUCED",
        description: "வேட்டி (10 m)",
        paavuProducedMeters: 2556,
        weftConsumedKg: calculateWeftConsumed(2556, 0.119), // 304.164
        wageRate: 19.0,
        wageEarned: calculateTraditionalWage(2556, 19.0), // 48564
      },
    });

    // 3. Production Entry 2: 17/10/2026 - 2,560m
    const reg2 = await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-10-17"),
        entryType: "PRODUCED",
        description: "வேட்டி உற்பத்தி",
        paavuProducedMeters: 2560,
        weftConsumedKg: calculateWeftConsumed(2560, 0.119), // 304.640
        wageRate: 19.0,
        wageEarned: calculateTraditionalWage(2560, 19.0), // 48640
      },
    });

    // 4. Production Entry 3: 23/10/2026 - 2,535m
    const reg3 = await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-10-23"),
        entryType: "PRODUCED",
        description: "வேட்டி உற்பத்தி",
        paavuProducedMeters: 2535,
        weftConsumedKg: calculateWeftConsumed(2535, 0.119), // 301.665
        wageRate: 19.0,
        wageEarned: calculateTraditionalWage(2535, 19.0), // 48165
      },
    });

    // 5. Compute Traditional Register Ledger with Opening Balances
    const formatted = [reg1, reg2, reg3].map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      entryType: r.entryType,
      description: r.description,
      paavuGivenMeters: r.paavuGivenMeters,
      paavuProducedMeters: r.paavuProducedMeters,
      weftGivenKg: r.weftGivenKg,
      weftConsumedKg: r.weftConsumedKg,
      babinCount: r.babinCount,
      wageRate: r.wageRate,
      wageEarned: r.wageEarned,
      cashPaid: r.cashPaid,
    }));

    const ledger = computeTraditionalRegisterLedger(formatted as any, {
      weftStock: unit.initialWeftKg,
      remainingPaavu: unit.paavuMeters,
      netBalance: 0,
    });

    // Verify Row 1: Weft Balance = 8784 - 304.164 = 8479.836
    expect(ledger.rows[0].weftConsumedKg).toBe(304.164);
    expect(ledger.rows[0].weftBalanceKg).toBe(8479.836);
    expect(ledger.rows[0].remainingPaavuMeters).toBe(17094); // 19650 - 2556

    // Verify Row 2: Weft Balance = 8479.836 - 304.640 = 8175.196
    expect(ledger.rows[1].weftConsumedKg).toBe(304.64);
    expect(ledger.rows[1].weftBalanceKg).toBe(8175.196);
    expect(ledger.rows[1].remainingPaavuMeters).toBe(14534); // 17094 - 2560

    // Verify Row 3: Weft Balance = 8175.196 - 301.665 = 7873.531
    expect(ledger.rows[2].weftConsumedKg).toBe(301.665);
    expect(ledger.rows[2].weftBalanceKg).toBe(7873.531);
    expect(ledger.rows[2].remainingPaavuMeters).toBe(11999); // 14534 - 2535

    // Verify Summary Matches User Handwritten Register
    expect(ledger.summary.totalPaavuGiven).toBe(19650);
    expect(ledger.summary.totalProduced).toBe(7651);
    expect(ledger.summary.remainingPaavu).toBe(11999);
    expect(ledger.summary.totalWeftGiven).toBe(8784);
    expect(ledger.summary.totalWeftConsumed).toBe(910.469);
    expect(ledger.summary.weftStock).toBe(7873.531);
    expect(ledger.summary.totalWageEarned).toBe(145369);

    // 6. Sync Unit Totals and verify DB unit record
    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unit.id);
    });

    const synced = await prisma.productionUnit.findUnique({ where: { id: unit.id } });
    expect(synced?.weftStockKg).toBe(7873.531);
    expect(synced?.remainingPaavuMeters).toBe(11999);
    expect(synced?.totalProducedMeters).toBe(7651);
  });

  it("Test 12: A single Paavu Given entry (3,050m) must NOT be duplicated to 6,100m", async () => {
    // 1. Powerloom registered (Step 1)
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "விசைத்தறி (User Issue Reproduction)",
        machineCount: 2,
        individualRate: 19.0,
        initialWeftKg: 0,
      },
    });

    // 2. Add single Paavu Given entry: 3,050m (User screenshot)
    const reg1 = await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-11-13"),
        entryType: "PAAVU",
        description: "Warp Issued / Paavu Given",
        paavuGivenMeters: 3050,
      },
    });

    // 3. Sync unit financials
    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unit.id);
    });

    const refreshedUnit = await prisma.productionUnit.findUnique({ where: { id: unit.id } });

    // 4. Compute register ledger as in GET /api/production/register
    const formatted = [{
      id: reg1.id,
      date: reg1.date.toISOString(),
      entryType: reg1.entryType,
      description: reg1.description,
      paavuGivenMeters: reg1.paavuGivenMeters,
      paavuProducedMeters: reg1.paavuProducedMeters,
      weftGivenKg: reg1.weftGivenKg,
      weftConsumedKg: reg1.weftConsumedKg,
      babinCount: reg1.babinCount,
      wageRate: reg1.wageRate,
      wageEarned: reg1.wageEarned,
      cashPaid: reg1.cashPaid,
    }];

    const openingBalances = {
      weftStock: refreshedUnit?.initialWeftKg || 0,
      remainingPaavu: refreshedUnit?.paavuMeters || 0,
      netBalance: -(refreshedUnit?.initialAdvance || 0),
    };

    const ledger = computeTraditionalRegisterLedger(formatted as any, openingBalances);

    // Row 1 MUST be 3,050 (NOT 6,100!)
    expect(ledger.rows[0].paavuGivenMeters).toBe(3050);
    expect(ledger.rows[0].remainingPaavuMeters).toBe(3050);

    // Summary footer MUST be 3,050 (NOT 6,100!)
    expect(ledger.summary.totalPaavuGiven).toBe(3050);
    expect(ledger.summary.totalProduced).toBe(0);
    expect(ledger.summary.remainingPaavu).toBe(3050);
  });

  it("Test 13: Exact user scenario: Kumar Tex with initial 3170m paavu, register entries of 8430m & 8000m, and 12,711m production", async () => {
    // 1. Register Powerloom Unit with initial paavu 3,170m and 9 babins
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "Kumar Tex (E2E Test)",
        machineCount: 37,
        paavuMeters: 3170,
        paavuWeightKg: 264.17,
        babinCount: 9,
        individualRate: 19.0,
      },
    });

    // 2. Add Register Entries matching user's exact notebook:
    // Initial Paavu Given: 3,170m on 2026-09-25
    await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-09-25"),
        entryType: "PAAVU",
        description: "Initial Warp Issued / Paavu Given",
        paavuGivenMeters: 3170,
      },
    });

    // Paavu Given 1: 8,430m on 2026-10-03
    await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-10-03"),
        entryType: "PAAVU",
        description: "Warp Issued / Paavu Given",
        paavuGivenMeters: 8430,
      },
    });

    // Paavu Given 2: 8,000m on 2026-10-06
    await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-10-06"),
        entryType: "PAAVU",
        description: "Warp Issued / Paavu Given",
        paavuGivenMeters: 8000,
      },
    });

    // Babins: 9 on 25/09, 18 on 03/10, 10 on 06/10
    await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-09-25"),
        entryType: "BABIN",
        description: "Babin Issued",
        babinCount: 9,
      },
    });
    await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-10-03"),
        entryType: "BABIN",
        description: "Babin Issued",
        babinCount: 18,
      },
    });
    await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-10-06"),
        entryType: "BABIN",
        description: "Babin Issued",
        babinCount: 10,
      },
    });

    // 5 Production Entries summing to 12,711m (2556, 2560, 2535, 2549, 2511)
    const prods = [2556, 2560, 2535, 2549, 2511];
    for (const p of prods) {
      await prisma.veattiRegisterEntry.create({
        data: {
          unitId: unit.id,
          date: new Date("2026-10-14"),
          entryType: "PRODUCED",
          description: "Veatti Production",
          paavuProducedMeters: p,
          wageRate: 19.0,
          wageEarned: calculateTraditionalWage(p, 19.0),
        },
      });
    }

    // 3. Sync Unit Totals
    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unit.id);
    });

    // 4. Fetch unit with relations and calculate effective totals
    const loadedUnit = await prisma.productionUnit.findUnique({
      where: { id: unit.id },
      include: {
        registerEntries: true,
        dailyProductions: true,
        handovers: true,
        varavuEntries: true,
        advanceEntries: true,
      },
    });

    const totals = calculateUnitEffectiveTotals(loadedUnit);

    // Verified Total Paavu Given = 3170 + 8430 + 8000 = 19,600m (NOT stuck at 3,170!)
    expect(totals.effectivePaavuTotal).toBe(19600);
    // Verified Total Produced = 12,711m
    expect(totals.totalProduction).toBe(12711);
    // Verified Remaining Paavu = 19600 - 12711 = 6,889m
    expect(totals.remainingPaavu).toBe(6889);
    // Verified Babins: 37 issued - 12.72 consumed (from register entries sum) = 24.28 sets remaining
    expect(totals.baseBabinIssued).toBe(37);
    expect(totals.babinConsumed).toBe(12.72);
    expect(totals.babinCount).toBe(24.28);
    // Verified Warp Weight = 19600 / 12 = 1,633.33 kg (NOT stuck at 264 kg!)
    expect(totals.paavuWeightKg).toBe(1633.33);

    // 5. Traditional Register ledger tally
    const formatted = loadedUnit!.registerEntries.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      entryType: r.entryType,
      description: r.description,
      paavuGivenMeters: r.paavuGivenMeters,
      paavuProducedMeters: r.paavuProducedMeters,
      weftGivenKg: r.weftGivenKg,
      weftConsumedKg: r.weftConsumedKg,
      babinCount: r.babinCount,
      wageRate: r.wageRate,
      wageEarned: r.wageEarned,
      cashPaid: r.cashPaid,
    }));

    const ledger = computeTraditionalRegisterLedger(formatted as any, {
      remainingPaavu: unit.paavuMeters,
      weftStock: 0,
      netBalance: 0,
    });

    expect(ledger.summary.totalPaavuGiven).toBe(19600);
    expect(ledger.summary.totalProduced).toBe(12711);
    expect(ledger.summary.remainingPaavu).toBe(6889);
    expect(ledger.summary.totalBabinIssued).toBe(37);
    expect(ledger.summary.totalBabinConsumed).toBe(12.72);
    expect(ledger.summary.remainingBabin).toBe(24.28);
  });

  it("Test 14: User Bug Fix: Thanarasu Tex has 0 default paavu, and entering first 3,050m does NOT duplicate to 6,100m", async () => {
    // 1. Create powerloom unit with legacy dummy paavuMeters (5050) but paavuCount: 0 and no register entries
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "SAREE",
        weaverName: "Thanarasu Tex",
        machineCount: 40,
        paavuCount: 0,
        paavuMeters: 5050,
        paavuWeightKg: 420.83,
        babinCount: 0,
        individualRate: 45.0,
      },
    });

    // Effective totals must eliminate dummy 5,050 paavu
    const initialTotals = calculateUnitEffectiveTotals({
      ...unit,
      registerEntries: [],
      paavus: [],
    });
    expect(initialTotals.effectivePaavuTotal).toBe(0);
    expect(initialTotals.remainingPaavu).toBe(0);
    expect(initialTotals.paavuWeightKg).toBe(0);

    // Sync must persist 0 paavu to DB
    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unit.id);
    });
    const syncedUnit = await prisma.productionUnit.findUnique({ where: { id: unit.id } });
    expect(syncedUnit?.paavuMeters).toBe(0);
    expect(syncedUnit?.remainingPaavuMeters).toBe(0);
    expect(syncedUnit?.paavuWeightKg).toBe(0);

    // 2. Before any register entry, traditional register ledger must report 0 given & 0 remaining
    const emptyLedger = computeTraditionalRegisterLedger([], {
      remainingPaavu: 0,
      weftStock: 0,
      netBalance: 0,
    });

    expect(emptyLedger.summary.totalPaavuGiven).toBe(0);
    expect(emptyLedger.summary.totalProduced).toBe(0);
    expect(emptyLedger.summary.remainingPaavu).toBe(0);

    // 3. Add first register entry: Paavu Given = 3,050m
    const entry = await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-11-13"),
        entryType: "PAAVU",
        description: "Warp Issued / Paavu Given",
        paavuGivenMeters: 3050,
      },
    });

    const formatted = [
      {
        id: entry.id,
        date: entry.date.toISOString(),
        entryType: entry.entryType,
        description: entry.description,
        paavuGivenMeters: entry.paavuGivenMeters,
        paavuProducedMeters: entry.paavuProducedMeters,
        weftGivenKg: entry.weftGivenKg,
        weftConsumedKg: entry.weftConsumedKg,
        babinCount: entry.babinCount,
        wageRate: entry.wageRate,
        wageEarned: entry.wageEarned,
        cashPaid: entry.cashPaid,
      },
    ];

    // Compute ledger with opening remainingPaavu = 0 (as in our API fix)
    const ledger = computeTraditionalRegisterLedger(formatted as any, {
      remainingPaavu: 0,
      weftStock: 0,
      netBalance: 0,
    });

    // Verify first row remainingPaavu is 3,050m (NOT 6,100m!)
    expect(ledger.rows[0].remainingPaavuMeters).toBe(3050);

    // Verify summary is 3,050m (NOT 6,100m!)
    expect(ledger.summary.totalPaavuGiven).toBe(3050);
    expect(ledger.summary.totalProduced).toBe(0);
    expect(ledger.summary.remainingPaavu).toBe(3050);
  });

  it("Test 15: Saree Babin Consumption (1 set per 200 Sarees / 1,100m) and Veatti Unchanged", async () => {
    // 1. Math verification:
    // 1 Saree = 5.50m
    // 200 Sarees = 1,100m = 1.00 Babin set
    expect(SAREE_DEFAULT_LENGTH_METERS).toBe(5.50);
    expect(SAREE_SAREES_PER_BABIN_SET).toBe(200);
    expect(SAREE_METERS_PER_BABIN_SET).toBe(1100);

    expect(calculateSareeBabinConsumed(1100)).toBe(1.0);
    expect(calculateSareeBabinConsumed(550)).toBe(0.5);
    expect(calculateSareeBabinConsumed(2200)).toBe(2.0);
    expect(calculateSareeBabinConsumed(0)).toBe(0);

    expect(calculateMetersFromSarees(200)).toBe(1100);
    expect(calculateSareesFromMeters(1100)).toBe(200);

    // 2. Saree Traditional Register Ledger:
    // Saree unit issued 5 Babin sets, then produces 200 sarees (1,100m) -> 1 set consumed, 4 sets remaining
    // Then produces another 400 sarees (2,200m) -> 2 sets consumed, 2 sets remaining
    const sareeEntries = [
      {
        id: "sb1",
        date: "2026-11-01",
        entryType: "BABIN",
        description: "Babin Sets Issued",
        paavuGivenMeters: 0,
        paavuProducedMeters: 0,
        weftGivenKg: 0,
        weftConsumedKg: 0,
        babinCount: 5,
        wageRate: 45,
        wageEarned: 0,
        cashPaid: 0,
      },
      {
        id: "sb2",
        date: "2026-11-02",
        entryType: "PRODUCED",
        description: "Saree Production (200 Sarees)",
        paavuGivenMeters: 0,
        paavuProducedMeters: 1100, // 200 Sarees * 5.50m
        weftGivenKg: 0,
        weftConsumedKg: calculateWeftConsumed(1100, 0.182),
        babinCount: 0,
        wageRate: 45,
        wageEarned: calculateTraditionalWage(1100, 45),
        cashPaid: 0,
      },
      {
        id: "sb3",
        date: "2026-11-05",
        entryType: "PRODUCED",
        description: "Saree Production (400 Sarees)",
        paavuGivenMeters: 0,
        paavuProducedMeters: 2200, // 400 Sarees * 5.50m
        weftGivenKg: 0,
        weftConsumedKg: calculateWeftConsumed(2200, 0.182),
        babinCount: 0,
        wageRate: 45,
        wageEarned: calculateTraditionalWage(2200, 45),
        cashPaid: 0,
      },
    ];

    const sareeLedger = computeTraditionalRegisterLedger(
      sareeEntries as any,
      { remainingPaavu: 0, weftStock: 0, netBalance: 0 },
      "SAREE"
    );

    // Row 1 (BABIN): 5 sets issued, balance 5
    expect(sareeLedger.rows[0].babinCount).toBe(5);
    expect(sareeLedger.rows[0].babinConsumed).toBe(0);
    expect(sareeLedger.rows[0].babinBalance).toBe(5);

    // Row 2 (PRODUCED 1100m): 1 set consumed, balance 4
    expect(sareeLedger.rows[1].babinConsumed).toBe(1.0);
    expect(sareeLedger.rows[1].babinBalance).toBe(4);

    // Row 3 (PRODUCED 2200m): 2 sets consumed, balance 2
    expect(sareeLedger.rows[2].babinConsumed).toBe(2.0);
    expect(sareeLedger.rows[2].babinBalance).toBe(2);

    // Summary for Saree
    expect(sareeLedger.summary.totalBabinIssued).toBe(5);
    expect(sareeLedger.summary.totalBabinConsumed).toBe(3.0);
    expect(sareeLedger.summary.remainingBabin).toBe(2);
    expect(sareeLedger.summary.totalBabin).toBe(2);

    // 3. Veatti Production Babin Consumption (Co-optex standard: 500 Veattis / 1,000m per set)
    expect(VEATTI_DEFAULT_LENGTH_METERS).toBe(2.00);
    expect(VEATTI_VEATTIS_PER_BABIN_SET).toBe(500);
    expect(VEATTI_METERS_PER_BABIN_SET).toBe(1000);

    expect(calculateVeattiBabinConsumed(1000)).toBe(1.0);
    expect(calculateVeattiBabinConsumed(500)).toBe(0.5);
    expect(calculateVeattiBabinConsumed(2000)).toBe(2.0);
    expect(calculateVeattiBabinConsumed(0)).toBe(0);

    expect(calculateMetersFromVeattis(500)).toBe(1000);
    expect(calculateVeattisFromMeters(1000)).toBe(500);

    const veattiEntries = [
      {
        id: "vb1",
        date: "2026-11-01",
        entryType: "BABIN",
        description: "Babin Sets Issued",
        paavuGivenMeters: 0,
        paavuProducedMeters: 0,
        weftGivenKg: 0,
        weftConsumedKg: 0,
        babinCount: 5,
        wageRate: 19,
        wageEarned: 0,
        cashPaid: 0,
      },
      {
        id: "vb2",
        date: "2026-11-02",
        entryType: "PRODUCED",
        description: "Veatti Production (500 Veattis)",
        paavuGivenMeters: 0,
        paavuProducedMeters: 1000, // 500 Veattis * 2.00m
        weftGivenKg: 0,
        weftConsumedKg: calculateWeftConsumed(1000, 0.119),
        babinCount: 0,
        wageRate: 19,
        wageEarned: calculateTraditionalWage(1000, 19),
        cashPaid: 0,
      },
      {
        id: "vb3",
        date: "2026-11-05",
        entryType: "PRODUCED",
        description: "Veatti Production (1,000 Veattis)",
        paavuGivenMeters: 0,
        paavuProducedMeters: 2000, // 1000 Veattis * 2.00m
        weftGivenKg: 0,
        weftConsumedKg: calculateWeftConsumed(2000, 0.119),
        babinCount: 0,
        wageRate: 19,
        wageEarned: calculateTraditionalWage(2000, 19),
        cashPaid: 0,
      },
    ];

    const veattiLedger = computeTraditionalRegisterLedger(
      veattiEntries as any,
      { remainingPaavu: 0, weftStock: 0, netBalance: 0 },
      "VEATTI"
    );

    // Row 1 (BABIN): 5 sets issued, balance 5
    expect(veattiLedger.rows[0].babinCount).toBe(5);
    expect(veattiLedger.rows[0].babinConsumed).toBe(0);
    expect(veattiLedger.rows[0].babinBalance).toBe(5);

    // Row 2 (PRODUCED 1000m): 1 set consumed, balance 4
    expect(veattiLedger.rows[1].babinConsumed).toBe(1.0);
    expect(veattiLedger.rows[1].babinBalance).toBe(4);

    // Row 3 (PRODUCED 2000m): 2 sets consumed, balance 2
    expect(veattiLedger.rows[2].babinConsumed).toBe(2.0);
    expect(veattiLedger.rows[2].babinBalance).toBe(2);

    // Summary for Veatti
    expect(veattiLedger.summary.totalBabinIssued).toBe(5);
    expect(veattiLedger.summary.totalBabinConsumed).toBe(3.0);
    expect(veattiLedger.summary.remainingBabin).toBe(2);
    expect(veattiLedger.summary.totalBabin).toBe(2);

    // 4. Effective Totals for Saree Powerloom Unit
    const sareeUnitTotals = calculateUnitEffectiveTotals({
      clothType: "SAREE",
      babinCount: 5,
      paavuMeters: 3300,
      totalProducedMeters: 1100,
      registerEntries: sareeEntries.slice(0, 2), // 5 issued, 1100m produced
    });

    expect(sareeUnitTotals.baseBabinIssued).toBe(5);
    expect(sareeUnitTotals.babinConsumed).toBe(1.0);
    expect(sareeUnitTotals.remainingBabin).toBe(4);
    expect(sareeUnitTotals.babinCount).toBe(4);

    // 5. Effective Totals for Veatti Powerloom Unit
    const veattiUnitTotals = calculateUnitEffectiveTotals({
      clothType: "VEATTI",
      babinCount: 5,
      paavuMeters: 3000,
      totalProducedMeters: 1000,
      registerEntries: veattiEntries.slice(0, 2), // 5 issued, 1000m produced
    });

    expect(veattiUnitTotals.baseBabinIssued).toBe(5);
    expect(veattiUnitTotals.babinConsumed).toBe(1.0);
    expect(veattiUnitTotals.remainingBabin).toBe(4);
    expect(veattiUnitTotals.babinCount).toBe(4);
  });

  it("Test 16: Complete Co-optex Tamil Nadu Veatti Babin Sets Lifecycle with DB Persistence", async () => {
    // 1. Create Veatti Powerloom unit with 10 Babin Sets issued
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "Co-optex Veatti Powerloom",
        machineCount: 4,
        babinCount: 10,
        individualRate: 19.0,
      },
    });

    // 2. Add Babin register entry (10 Sets)
    await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-11-01"),
        entryType: "BABIN",
        description: "Babin Sets Issued",
        babinCount: 10,
      },
    });

    // 3. Add Production entry: 500 Veattis = 1,000 Meters
    await prisma.veattiRegisterEntry.create({
      data: {
        unitId: unit.id,
        date: new Date("2026-11-02"),
        entryType: "PRODUCED",
        description: "500 Dhoties Woven",
        paavuProducedMeters: 1000,
        wageRate: 19.0,
        wageEarned: 19000,
      },
    });

    // 4. Sync unit financials
    await prisma.$transaction(async (tx) => {
      await syncUnitFinancialsAndTotals(tx, unit.id);
    });

    const refreshed = await prisma.productionUnit.findUnique({
      where: { id: unit.id },
      include: { registerEntries: true },
    });

    const totals = calculateUnitEffectiveTotals(refreshed);

    // 10 issued - 1 consumed = 9 remaining Babin Sets
    expect(totals.baseBabinIssued).toBe(10);
    expect(totals.babinConsumed).toBe(1.0);
    expect(totals.babinCount).toBe(9);
    expect(totals.remainingBabin).toBe(9);
  });
});


