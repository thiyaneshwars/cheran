import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { calculateUnitEffectiveTotals } from "@/lib/veatti-calculations";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get("type"); // "VEATTI" | "SAREE" | null

    // Fetch all production units with relations needed for live calculation
    const units = await prisma.productionUnit.findMany({
      where: filterType ? { clothType: filterType } : undefined,
      include: {
        paavus: true,
        handovers: { orderBy: { handoverDate: "desc" } },
        registerEntries: true,
        dailyProductions: true,
        varavuEntries: true,
        advanceEntries: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Map each unit to its accurate live effective totals
    const effectiveUnits = units.map((u) => {
      const totals = calculateUnitEffectiveTotals(u);
      return {
        ...u,
        totalProducedMeters: totals.totalProduction,
        paavuMeters: totals.effectivePaavuTotal,
        paavuWeightKg: totals.paavuWeightKg,
        babinCount: totals.babinCount,
        remainingPaavuMeters: totals.remainingPaavu,
        totalVaravuAmount: totals.totalVaravu,
        totalAdvancePaid: totals.totalAdvance,
        currentBalance: totals.currentBalance,
      };
    });

    // Fetch all paavu records
    const allPaavus = await prisma.paavuRecord.findMany({
      where: filterType ? { clothType: filterType } : undefined,
      orderBy: { createdAt: "desc" },
    });

    // Fetch all government handover logs
    const allHandovers = await prisma.governmentHandoverLog.findMany({
      where: filterType ? { clothType: filterType } : undefined,
    });

    // Calculate aggregated metrics for Veatti
    const veattiUnits = effectiveUnits.filter((u) => u.clothType === "VEATTI");
    const veattiPaavus = allPaavus.filter((p) => p.clothType === "VEATTI");
    const veattiHandovers = allHandovers.filter((h) => h.clothType === "VEATTI");

    const veattiTotalProduced = veattiUnits.reduce(
      (acc, u) => acc + (u.totalProducedMeters || 0),
      0
    );
    const veattiTotalHandovered = veattiHandovers.reduce(
      (acc, h) => acc + (h.meters || 0),
      0
    );
    const veattiTotalPaavuMeters = veattiUnits.reduce(
      (acc, u) => acc + (u.paavuMeters || 0),
      0
    );
    const veattiRawTarget = veattiUnits.reduce(
      (acc, u) => acc + (u.targetMeters || 0),
      0
    );
    const veattiTotalTarget = veattiRawTarget > veattiTotalProduced ? veattiRawTarget : (veattiTotalPaavuMeters > 0 ? veattiTotalPaavuMeters : veattiTotalProduced);
    const veattiGodownAvailable = Math.max(0, veattiTotalProduced - veattiTotalHandovered);
    const veattiBalanceToHandover = Math.max(0, veattiTotalTarget - veattiTotalHandovered);

    // Financial Metrics for Veatti
    const veattiTotalPaavuKg = veattiUnits.reduce(
      (acc, u) => acc + (u.paavuWeightKg || 0),
      0
    );
    const veattiTotalVaravu = veattiUnits.reduce(
      (acc, u) => acc + (u.totalVaravuAmount || 0),
      0
    );
    const veattiTotalAdvance = veattiUnits.reduce(
      (acc, u) => acc + (u.totalAdvancePaid || 0),
      0
    );
    const veattiAmountPayable = veattiUnits.reduce(
      (acc, u) => acc + (u.currentBalance > 0 ? u.currentBalance : 0),
      0
    );
    const veattiExcessAdvance = veattiUnits.reduce(
      (acc, u) => acc + (u.currentBalance < 0 ? Math.abs(u.currentBalance) : 0),
      0
    );
    const veattiNetBalance = veattiTotalVaravu - veattiTotalAdvance;

    // Calculate aggregated metrics for Saree
    const sareeUnits = effectiveUnits.filter((u) => u.clothType === "SAREE");
    const sareePaavus = allPaavus.filter((p) => p.clothType === "SAREE");
    const sareeHandovers = allHandovers.filter((h) => h.clothType === "SAREE");

    const sareeTotalProduced = sareeUnits.reduce(
      (acc, u) => acc + (u.totalProducedMeters || 0),
      0
    );
    const sareeTotalHandovered = sareeHandovers.reduce(
      (acc, h) => acc + (h.meters || 0),
      0
    );
    const sareeTotalPaavuMeters = sareeUnits.reduce(
      (acc, u) => acc + (u.paavuMeters || 0),
      0
    );
    const sareeRawTarget = sareeUnits.reduce(
      (acc, u) => acc + (u.targetMeters || 0),
      0
    );
    const sareeTotalTarget = sareeRawTarget > sareeTotalProduced ? sareeRawTarget : (sareeTotalPaavuMeters > 0 ? sareeTotalPaavuMeters : sareeTotalProduced);
    const sareeGodownAvailable = Math.max(0, sareeTotalProduced - sareeTotalHandovered);
    const sareeBalanceToHandover = Math.max(0, sareeTotalTarget - sareeTotalHandovered);

    // Financial Metrics for Saree
    const sareeTotalPaavuKg = sareeUnits.reduce(
      (acc, u) => acc + (u.paavuWeightKg || 0),
      0
    );
    const sareeTotalVaravu = sareeUnits.reduce(
      (acc, u) => acc + (u.totalVaravuAmount || 0),
      0
    );
    const sareeTotalAdvance = sareeUnits.reduce(
      (acc, u) => acc + (u.totalAdvancePaid || 0),
      0
    );
    const sareeAmountPayable = sareeUnits.reduce(
      (acc, u) => acc + (u.currentBalance > 0 ? u.currentBalance : 0),
      0
    );
    const sareeExcessAdvance = sareeUnits.reduce(
      (acc, u) => acc + (u.currentBalance < 0 ? Math.abs(u.currentBalance) : 0),
      0
    );
    const sareeNetBalance = sareeTotalVaravu - sareeTotalAdvance;

    // Calculate Central Godown Weft Stock vs Issued Weft Bags to Powerlooms
    const allotments = await prisma.govtYarnAllotment.findMany();
    let totalDhothiGovtWeftKg = 0;
    let totalSareeGovtWeftKg = 0;
    for (const a of allotments) {
      totalDhothiGovtWeftKg += a.dhothiWeftKg || 0;
      totalSareeGovtWeftKg += a.sareeWeftKg || 0;
    }

    const veattiWeftIssued = veattiUnits.reduce((acc, u) => {
      const regWeft = (u.registerEntries || []).reduce((s: number, r: any) => s + (r.weftGivenKg || 0), 0);
      return acc + (u.initialWeftKg || 0) + regWeft;
    }, 0);
    const veattiWeftAtLooms = veattiUnits.reduce((acc, u) => acc + (u.weftStockKg || 0), 0);
    const veattiGodownWeftKg = Math.max(0, totalDhothiGovtWeftKg - veattiWeftIssued);

    const sareeWeftIssued = sareeUnits.reduce((acc, u) => {
      const regWeft = (u.registerEntries || []).reduce((s: number, r: any) => s + (r.weftGivenKg || 0), 0);
      return acc + (u.initialWeftKg || 0) + regWeft;
    }, 0);
    const sareeWeftAtLooms = sareeUnits.reduce((acc, u) => acc + (u.weftStockKg || 0), 0);
    const sareeGodownWeftKg = Math.max(0, totalSareeGovtWeftKg - sareeWeftIssued);

    return NextResponse.json({
      overview: {
        veatti: {
          totalProducedMeters: round2(veattiTotalProduced),
          godownAvailableMeters: round2(veattiGodownAvailable),
          totalHandoveredMeters: round2(veattiTotalHandovered),
          balanceToHandoverMeters: round2(veattiBalanceToHandover),
          targetMeters: round2(veattiTotalTarget),
          totalPaavuKg: round2(veattiTotalPaavuKg),
          totalVaravuAmount: round2(veattiTotalVaravu),
          totalAdvancePaid: round2(veattiTotalAdvance),
          amountPayable: round2(veattiAmountPayable),
          excessAdvance: round2(veattiExcessAdvance),
          netBalance: round2(veattiNetBalance),
          activeUnitsCount: veattiUnits.length,
          unloadedPaavuCount: veattiPaavus.filter((p) => p.status === "UNLOADED").length,
          runningPaavuCount: veattiPaavus.filter((p) => p.status === "RUNNING").length,
          completedPaavuCount: veattiPaavus.filter((p) => p.status === "COMPLETED").length,
        },
        saree: {
          totalProducedMeters: round2(sareeTotalProduced),
          godownAvailableMeters: round2(sareeGodownAvailable),
          totalHandoveredMeters: round2(sareeTotalHandovered),
          balanceToHandoverMeters: round2(sareeBalanceToHandover),
          targetMeters: round2(sareeTotalTarget),
          totalPaavuKg: round2(sareeTotalPaavuKg),
          totalVaravuAmount: round2(sareeTotalVaravu),
          totalAdvancePaid: round2(sareeTotalAdvance),
          amountPayable: round2(sareeAmountPayable),
          excessAdvance: round2(sareeExcessAdvance),
          netBalance: round2(sareeNetBalance),
          activeUnitsCount: sareeUnits.length,
          unloadedPaavuCount: sareePaavus.filter((p) => p.status === "UNLOADED").length,
          runningPaavuCount: sareePaavus.filter((p) => p.status === "RUNNING").length,
          completedPaavuCount: sareePaavus.filter((p) => p.status === "COMPLETED").length,
        },
        weftInventory: {
          veatti: {
            govtTotalWeftKg: round2(totalDhothiGovtWeftKg),
            govtTotalWeftBags: +(totalDhothiGovtWeftKg / 60).toFixed(1),
            totalIssuedKg: round2(veattiWeftIssued),
            totalIssuedBags: +(veattiWeftIssued / 60).toFixed(1),
            godownStockKg: round2(veattiGodownWeftKg),
            godownStockBags: +(veattiGodownWeftKg / 60).toFixed(1),
            totalLoomStockKg: round2(veattiWeftAtLooms),
            totalLoomStockBags: +(veattiWeftAtLooms / 60).toFixed(1),
            weftRatePerPiece: 0.119,
            kgPerBag: 60,
          },
          saree: {
            govtTotalWeftKg: round2(totalSareeGovtWeftKg),
            govtTotalWeftBags: +(totalSareeGovtWeftKg / 50).toFixed(1),
            totalIssuedKg: round2(sareeWeftIssued),
            totalIssuedBags: +(sareeWeftIssued / 50).toFixed(1),
            godownStockKg: round2(sareeGodownWeftKg),
            godownStockBags: +(sareeGodownWeftKg / 50).toFixed(1),
            totalLoomStockKg: round2(sareeWeftAtLooms),
            totalLoomStockBags: +(sareeWeftAtLooms / 50).toFixed(1),
            weftRatePerPiece: 0.182,
            kgPerBag: 50,
          },
        },
        totalConsolidated: {
          totalProducedMeters: round2(veattiTotalProduced + sareeTotalProduced),
          godownAvailableMeters: round2(veattiGodownAvailable + sareeGodownAvailable),
          totalHandoveredMeters: round2(veattiTotalHandovered + sareeTotalHandovered),
          balanceToHandoverMeters: round2(veattiBalanceToHandover + sareeBalanceToHandover),
        },
      },
      recentUnits: units.slice(0, 8),
      unloadedPaavus: allPaavus.filter((p) => p.status === "UNLOADED"),
      runningPaavus: allPaavus.filter((p) => p.status === "RUNNING"),
      completedPaavus: allPaavus.filter((p) => p.status === "COMPLETED").slice(0, 10),
    });
  } catch (error: any) {
    console.error("Production overview API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch production overview" },
      { status: 500 }
    );
  }
}
