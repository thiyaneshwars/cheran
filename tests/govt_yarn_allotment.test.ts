import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { YARN_CONVERSIONS } from "../src/app/api/production/yarn-allotment/route";

describe("Government Yarn Allotment & Scheme Profit Tally", () => {
  beforeEach(async () => {
    await prisma.govtYarnAllotment.deleteMany({});
  });

  it("calculates Dhothi piece targets accurately based on Govt specifications", () => {
    // 122 KG warp should produce exactly 1,000 Dhothis (122 / 0.122)
    const warpKg = 122.0;
    const weftKg = 119.0;
    const borderKg = 6.0;

    const dhothiPiecesWarp = Math.floor(warpKg / YARN_CONVERSIONS.DHOTHI.WARP_PER_PIECE);
    const dhothiPiecesWeft = Math.floor(weftKg / YARN_CONVERSIONS.DHOTHI.WEFT_PER_PIECE);
    const dhothiPiecesBorder = Math.floor(borderKg / YARN_CONVERSIONS.DHOTHI.BORDER_PER_PIECE);

    expect(dhothiPiecesWarp).toBe(1000);
    expect(dhothiPiecesWeft).toBe(1000);
    expect(dhothiPiecesBorder).toBe(1000);
    expect(YARN_CONVERSIONS.DHOTHI.DEFAULT_WEAVER_RATE).toBe(19.0);
  });

  it("calculates Saree piece targets accurately based on Govt specifications", () => {
    // 188 KG warp should produce exactly 1,000 Sarees (188 / 0.188)
    const warpKg = 188.0;
    const weftKg = 182.0;
    const borderKg = 24.0;

    const sareePiecesWarp = Math.floor(warpKg / YARN_CONVERSIONS.SAREE.WARP_PER_PIECE);
    const sareePiecesWeft = Math.floor(weftKg / YARN_CONVERSIONS.SAREE.WEFT_PER_PIECE);
    const sareePiecesBorder = Math.floor(borderKg / YARN_CONVERSIONS.SAREE.BORDER_PER_PIECE);

    expect(sareePiecesWarp).toBe(1000);
    expect(sareePiecesWeft).toBe(1000);
    expect(sareePiecesBorder).toBe(1000);
    expect(YARN_CONVERSIONS.SAREE.DEFAULT_WEAVER_RATE).toBe(42.0);
  });

  it("persists a Government Yarn Allotment record and tallies wages and piece targets", async () => {
    const allotment = await prisma.govtYarnAllotment.create({
      data: {
        allotmentNo: "TN-GOVT-TEST-001",
        dhothiWarpKg: 244.0, // 244 / 0.122 = 2,000 pcs
        dhothiWeftKg: 238.0, // 238 / 0.119 = 2,000 pcs
        dhothiBorderKg: 12.0, // 12 / 0.006 = 2,000 pcs
        sareeWarpKg: 376.0,  // 376 / 0.188 = 2,000 pcs
        sareeWeftKg: 364.0,  // 364 / 0.182 = 2,000 pcs
        sareeBorderKg: 48.0, // 48 / 0.024 = 2,000 pcs
        dhothiGovtRate: 85.0,
        sareeGovtRate: 180.0,
        dhothiWeaverRate: 19.0,
        sareeWeaverRate: 42.0,
      },
    });

    expect(allotment.id).toBeDefined();
    const expectedDhothis = Math.floor(allotment.dhothiWarpKg / 0.122);
    const expectedSarees = Math.floor(allotment.sareeWarpKg / 0.188);

    expect(expectedDhothis).toBe(2000);
    expect(expectedSarees).toBe(2000);

    // Weaving wage budget
    const totalWeaverWages = expectedDhothis * 19.0 + expectedSarees * 42.0;
    expect(totalWeaverWages).toBe(2000 * 19 + 2000 * 42); // 38,000 + 84,000 = 122,000
    expect(totalWeaverWages).toBe(122000);

    // Society Profit Calculation
    const dhothiProfitPerPiece = allotment.dhothiGovtRate - allotment.dhothiWeaverRate; // 85 - 19 = 66
    const sareeProfitPerPiece = allotment.sareeGovtRate - allotment.sareeWeaverRate;   // 180 - 42 = 138

    expect(dhothiProfitPerPiece).toBe(66);
    expect(sareeProfitPerPiece).toBe(138);

    const totalPotentialProfit = expectedDhothis * dhothiProfitPerPiece + expectedSarees * sareeProfitPerPiece;
    expect(totalPotentialProfit).toBe(2000 * 66 + 2000 * 138); // 132,000 + 276,000 = 408,000
    expect(totalPotentialProfit).toBe(408000);
  });

  it("handles partial updates with empty strings or missing yarn fields without NaN Prisma errors", async () => {
    const created = await prisma.govtYarnAllotment.create({
      data: {
        allotmentNo: "4892",
        sareeWarpKg: 900,
        sareeWeftKg: 833.76,
      },
    });

    expect(created.id).toBeDefined();

    // Simulating safeFloat helper logic
    const safeFloat = (val: any, fallback = 0) => {
      if (val === undefined || val === null || val === "") return fallback;
      const num = typeof val === "number" ? val : parseFloat(val);
      return isNaN(num) ? fallback : num;
    };

    // Updating with empty strings like the user encountered
    const updated = await prisma.govtYarnAllotment.update({
      where: { id: created.id },
      data: {
        allotmentNo: "4892-UPDATED",
        dhothiWarpKg: safeFloat("", 0),
        dhothiWeftKg: safeFloat("", 0),
        dhothiBorderKg: safeFloat("", 0),
        sareeWarpKg: safeFloat(900, 0),
        sareeWeftKg: safeFloat(833.76, 0),
        sareeBorderKg: safeFloat("", 0),
        yarnRatePerKg: safeFloat("", 0),
        bagPrice: safeFloat("", 0),
        dhothiGovtRate: safeFloat("", 0),
        sareeGovtRate: safeFloat("", 0),
        dhothiWeaverRate: safeFloat("", 19),
        sareeWeaverRate: safeFloat("", 42),
      },
    });

    expect(updated.allotmentNo).toBe("4892-UPDATED");
    expect(updated.dhothiWarpKg).toBe(0);
    expect(updated.sareeWarpKg).toBe(900);
    expect(updated.sareeWeftKg).toBe(833.76);
    expect(updated.dhothiWeaverRate).toBe(19);
    expect(updated.sareeWeaverRate).toBe(42);
  });

  it("calculates piece quotas strictly based on Warp for Dhothi and Saree, while Weft and Border are combined into total yarn", async () => {
    // Saree allotment combining Warp (900 kg), Weft (833.76 kg), and Border (40.7 kg)
    const sareeAllotment = await prisma.govtYarnAllotment.create({
      data: {
        allotmentNo: "4892-COMBINED",
        sareeWarpKg: 900.0,
        sareeWeftKg: 833.76,
        sareeBorderKg: 40.7,
        sareeWeaverRate: 42,
      },
    });

    // Pieces are determined strictly from Warp without decimals: 900 / 0.188 = 4787.234 -> 4787 sarees
    const targetPieces = sareeAllotment.sareeWarpKg > 0 ? Math.floor(sareeAllotment.sareeWarpKg / 0.188) : 0;
    const totalYarnKg = sareeAllotment.sareeWarpKg + sareeAllotment.sareeWeftKg + sareeAllotment.sareeBorderKg;

    expect(targetPieces).toBe(4787);
    expect(totalYarnKg).toBeCloseTo(1774.46, 2);
    expect(targetPieces * sareeAllotment.sareeWeaverRate).toBe(4787 * 42); // Rs. 201,054

    // Supplementary inward with only Weft (no Warp): pieces = 0, yarn is combined into stock
    const weftOnly = await prisma.govtYarnAllotment.create({
      data: {
        allotmentNo: "6951-WEFT-SUPPLY",
        sareeWarpKg: 0,
        sareeWeftKg: 1500.0,
      },
    });
    const weftOnlyPieces = weftOnly.sareeWarpKg > 0 ? Math.floor(weftOnly.sareeWarpKg / 0.188) : 0;
    expect(weftOnlyPieces).toBe(0);
    expect(weftOnly.sareeWeftKg).toBe(1500.0);
  });

  it("allows multiple supplementary inward records with the same allotment or challan number", async () => {
    // Dhothi allotment under Challan 4892
    const dhothiEntry = await prisma.govtYarnAllotment.create({
      data: {
        allotmentNo: "4892",
        dhothiWarpKg: 720.0,
      },
    });

    // Saree allotment under the same Challan / Allotment Order 4892
    const sareeEntry = await prisma.govtYarnAllotment.create({
      data: {
        allotmentNo: "4892",
        sareeWarpKg: 900.0,
        sareeWeftKg: 833.76,
      },
    });

    expect(dhothiEntry.id).toBeDefined();
    expect(sareeEntry.id).toBeDefined();
    expect(dhothiEntry.allotmentNo).toBe("4892");
    expect(sareeEntry.allotmentNo).toBe("4892");
  });

  it("truncates decimal values when calculating Dhothi and Saree piece counts (taking only integer before decimal)", () => {
    // 100 KG Warp for Dhothi: 100 / 0.122 = 819.6721...
    // Without decimal consideration, it must be 819 (not rounded to 820)
    const dhothiWarpKg = 100.0;
    const dhothiPieces = Math.floor(dhothiWarpKg / YARN_CONVERSIONS.DHOTHI.WARP_PER_PIECE);
    expect(dhothiPieces).toBe(819);

    // 100 KG Warp for Saree: 100 / 0.188 = 531.9148...
    // Without decimal consideration, it must be 531 (not rounded to 532)
    const sareeWarpKg = 100.0;
    const sareePieces = Math.floor(sareeWarpKg / YARN_CONVERSIONS.SAREE.WARP_PER_PIECE);
    expect(sareePieces).toBe(531);
  });
});
