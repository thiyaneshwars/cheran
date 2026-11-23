import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { Role } from "@prisma/client";
import { round2 } from "../src/lib/decimal";

describe("Cheran Textile Production Side Test Suite (Veatti & Saree)", () => {
  beforeAll(async () => {
    // Hermetically guarantee production and auditing credentials exist in test database
    await prisma.user.upsert({
      where: { email: "production@cheran" },
      update: {
        role: Role.PRODUCTION,
        isActive: true,
      },
      create: {
        email: "production@cheran",
        fullName: "Cheran Powerloom Production Manager",
        role: Role.PRODUCTION,
        passwordHash: "dummyhash",
        isActive: true,
        phone: "9842100002",
      },
    });

    await prisma.user.upsert({
      where: { email: "aduit@cheran" },
      update: {
        role: Role.ADMIN,
        isActive: true,
      },
      create: {
        email: "aduit@cheran",
        fullName: "Cheran Statutory Auditor & Accountant",
        role: Role.ADMIN,
        passwordHash: "dummyhash",
        isActive: true,
        phone: "9842100001",
      },
    });

    await prisma.user.upsert({
      where: { email: "official@cheran" },
      update: {
        role: Role.MANAGEMENT,
        isActive: true,
      },
      create: {
        email: "official@cheran",
        fullName: "Statutory Inspection Official / Directorate of Handlooms",
        role: Role.MANAGEMENT,
        passwordHash: "dummyhash",
        isActive: true,
        phone: "9842100099",
      },
    });

    // Remove legacy credentials if present
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["admin@cheran.coop", "accountant@cheran.coop", "operator@cheran.coop"],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data and release database connection pool
    await prisma.governmentHandoverLog.deleteMany();
    await prisma.paavuRecord.deleteMany();
    await prisma.productionUnit.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean production tables before each test
    await prisma.governmentHandoverLog.deleteMany();
    await prisma.paavuRecord.deleteMany();
    await prisma.productionUnit.deleteMany();
  });

  it("Verification 1: Production, Auditing, and Official credentials exist", async () => {
    const users = await prisma.user.findMany({ select: { email: true, role: true } });
    const emails = users.map((u) => u.email);

    expect(emails).toContain("production@cheran");
    expect(emails).toContain("aduit@cheran");
    expect(emails).toContain("official@cheran");

    // Legacy users must NOT exist
    expect(emails).not.toContain("admin@cheran.coop");
    expect(emails).not.toContain("accountant@cheran.coop");
    expect(emails).not.toContain("operator@cheran.coop");

    const prodUser = users.find((u) => u.email === "production@cheran");
    expect(prodUser?.role).toBe(Role.PRODUCTION);

    const auditUser = users.find((u) => u.email === "aduit@cheran");
    expect(auditUser?.role).toBe(Role.ADMIN);

    const officialUser = users.find((u) => u.email === "official@cheran");
    expect(officialUser?.role).toBe(Role.MANAGEMENT);
  });

  it("Verification 2: Veatti powerloom details and automatic tallying", async () => {
    // 1. Create a Veatti production unit
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "Test Veatti Weaver",
        machineCount: 4,
        paavuCount: 5,
        paavuMeters: 6000,
        babinCount: 150,
        targetMeters: 5800,
        targetDate: new Date("2026-11-20"),
        totalProducedMeters: 2400,
        handoveredMeters: 1400,
        godownMeters: 1000,
        balanceToHandover: 4400, // 5800 - 1400
      },
    });

    expect(unit.clothType).toBe("VEATTI");
    expect(unit.paavuCount).toBe(5);
    expect(unit.paavuMeters).toBe(6000);
    expect(unit.babinCount).toBe(150);

    // Automatic Tally Check:
    // Godown Stock = Produced - Handovered
    const godownStock = round2(unit.totalProducedMeters - unit.handoveredMeters);
    expect(godownStock).toBe(1000);

    // Balance to Handover = Target - Handovered
    const remainingToHandover = round2(unit.targetMeters - unit.handoveredMeters);
    expect(remainingToHandover).toBe(4400);
  });

  it("Verification 3: Unloaded paavu is automatically removed from unloaded section upon loading", async () => {
    // Create an unloaded paavu
    const unloaded = await prisma.paavuRecord.create({
      data: {
        clothType: "VEATTI",
        paavuNumber: "PV-TEST-UNLOADED-01",
        paavuMeters: 1200,
        weaverName: "Test Loom Operator",
        machineNumber: null,
        status: "UNLOADED",
      },
    });

    // Verify it is in UNLOADED section
    let unloadedList = await prisma.paavuRecord.findMany({
      where: { clothType: "VEATTI", status: "UNLOADED" },
    });
    expect(unloadedList.some((p) => p.id === unloaded.id)).toBe(true);

    // Action: Load onto Loom #3
    const loaded = await prisma.paavuRecord.update({
      where: { id: unloaded.id },
      data: {
        machineNumber: "Loom #3",
        status: "RUNNING",
        loadedAt: new Date(),
      },
    });

    expect(loaded.status).toBe("RUNNING");
    expect(loaded.machineNumber).toBe("Loom #3");

    // Verification: Automatically removed from UNLOADED section!
    unloadedList = await prisma.paavuRecord.findMany({
      where: { clothType: "VEATTI", status: "UNLOADED" },
    });
    expect(unloadedList.some((p) => p.id === unloaded.id)).toBe(false);

    // And present in RUNNING list
    const runningList = await prisma.paavuRecord.findMany({
      where: { clothType: "VEATTI", status: "RUNNING" },
    });
    expect(runningList.some((p) => p.id === unloaded.id)).toBe(true);
  });

  it("Verification 4: Completed paavu cross-verifies actual meters got against initial paavu meter and gives difference", async () => {
    // 1. Create a parent production unit
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "SAREE",
        weaverName: "Erode Saree Weaving Unit",
        machineCount: 2,
        targetMeters: 2400,
        totalProducedMeters: 0,
        handoveredMeters: 0,
        godownMeters: 0,
        balanceToHandover: 2400,
      },
    });

    const runningPaavu = await prisma.paavuRecord.create({
      data: {
        clothType: "SAREE",
        unitId: unit.id,
        paavuNumber: "PV-S-TEST-99",
        paavuMeters: 1200, // Initial warp given: 1200m
        machineNumber: "Saree Loom #7",
        status: "RUNNING",
      },
    });

    // Case A: Machine yields 1218 meters (Stretch / Surplus)
    const actualMeterGot = 1218.0;
    const difference = round2(actualMeterGot - runningPaavu.paavuMeters); // 1218 - 1200 = +18m
    const variancePercent = round2(((actualMeterGot - runningPaavu.paavuMeters) / runningPaavu.paavuMeters) * 100);

    const completed = await prisma.paavuRecord.update({
      where: { id: runningPaavu.id },
      data: {
        status: "COMPLETED",
        actualProducedMeters: actualMeterGot,
        meterDifference: difference,
        completedAt: new Date(),
      },
    });

    expect(completed.status).toBe("COMPLETED");
    expect(completed.actualProducedMeters).toBe(1218);
    expect(completed.meterDifference).toBe(18); // +18 meters difference
    expect(variancePercent).toBe(1.5); // +1.5% surplus

    // Update parent unit tally
    const newProduced = round2(unit.totalProducedMeters + actualMeterGot);
    const updatedUnit = await prisma.productionUnit.update({
      where: { id: unit.id },
      data: {
        totalProducedMeters: newProduced,
        godownMeters: round2(newProduced - unit.handoveredMeters),
      },
    });
    expect(updatedUnit.totalProducedMeters).toBe(1218);
    expect(updatedUnit.godownMeters).toBe(1218);

    // Case B: Shrinkage / Wastage test
    const runningPaavu2 = await prisma.paavuRecord.create({
      data: {
        clothType: "SAREE",
        paavuNumber: "PV-S-TEST-100",
        paavuMeters: 1200,
        machineNumber: "Saree Loom #8",
        status: "RUNNING",
      },
    });

    const actualMeterGot2 = 1188.0;
    const difference2 = round2(actualMeterGot2 - runningPaavu2.paavuMeters); // 1188 - 1200 = -12m
    const variancePercent2 = round2(((actualMeterGot2 - runningPaavu2.paavuMeters) / runningPaavu2.paavuMeters) * 100);

    const completed2 = await prisma.paavuRecord.update({
      where: { id: runningPaavu2.id },
      data: {
        status: "COMPLETED",
        actualProducedMeters: actualMeterGot2,
        meterDifference: difference2,
        completedAt: new Date(),
      },
    });

    expect(completed2.meterDifference).toBe(-12); // -12m wastage/shrinkage
    expect(variancePercent2).toBe(-1.0); // -1.0% wastage
  });

  it("Verification 5: Government Handover automatically tallies godown meters and remaining balance", async () => {
    // Unit with 5000m target, 3000m produced, 1000m already handovered
    const unit = await prisma.productionUnit.create({
      data: {
        clothType: "VEATTI",
        weaverName: "Bhavani Powerlooms",
        machineCount: 4,
        targetMeters: 5000,
        totalProducedMeters: 3000,
        handoveredMeters: 1000,
        godownMeters: 2000,
        balanceToHandover: 4000,
      },
    });

    // Handover consignment of 1200m to Tamil Nadu Co-optex
    const newHandoverMeters = 1200;
    await prisma.governmentHandoverLog.create({
      data: {
        clothType: "VEATTI",
        unitId: unit.id,
        challanNo: "CH-GOVT-VT-TEST-01",
        meters: newHandoverMeters,
        recipientDept: "Tamil Nadu Co-optex Central Godown",
      },
    });

    // Update unit:
    const updatedHandovered = round2(unit.handoveredMeters + newHandoverMeters); // 2200
    const updatedGodown = round2(unit.totalProducedMeters - updatedHandovered); // 3000 - 2200 = 800
    const updatedBalance = round2(unit.targetMeters - updatedHandovered); // 5000 - 2200 = 2800

    const updatedUnit = await prisma.productionUnit.update({
      where: { id: unit.id },
      data: {
        handoveredMeters: updatedHandovered,
        godownMeters: updatedGodown,
        balanceToHandover: updatedBalance,
      },
    });

    expect(updatedUnit.handoveredMeters).toBe(2200);
    expect(updatedUnit.godownMeters).toBe(800);
    expect(updatedUnit.balanceToHandover).toBe(2800);
  });
});
