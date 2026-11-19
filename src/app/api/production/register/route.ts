import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateWeftConsumed,
  calculateTraditionalWage,
  calculateBagsToKg,
  computeTraditionalRegisterLedger,
  syncUnitFinancialsAndTotals,
  TRADITIONAL_DEFAULT_WAGE_RATE,
} from "@/lib/veatti-calculations";

/**
 * GET /api/production/register?unitId=...
 * Fetch traditional register entries with running tallies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");

    const where: any = {};
    if (unitId && unitId !== "ALL") {
      where.unitId = unitId;
    }

    const entries = await prisma.veattiRegisterEntry.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        unit: {
          select: {
            id: true,
            weaverName: true,
            clothType: true,
            location: true,
            machineCount: true,
            individualRate: true,
          },
        },
      },
    });

    // Format entries for running ledger computation
    const formatted = entries.map((e: any) => ({
      id: e.id,
      unitId: e.unitId,
      weaverName: e.unit?.weaverName || "",
      clothType: e.unit?.clothType || "VEATTI",
      date: e.date.toISOString(),
      entryType: e.entryType,
      description: e.description,
      paavuGivenMeters: e.paavuGivenMeters,
      paavuProducedMeters: e.paavuProducedMeters,
      remainingPaavuMeters: e.remainingPaavuMeters,
      weftGivenKg: e.weftGivenKg,
      weftBagsGiven: e.weftBagsGiven,
      weftConsumedKg: e.weftConsumedKg,
      weftBalanceKg: e.weftBalanceKg,
      babinCount: e.babinCount,
      beamCount: e.beamCount,
      wageRate: e.wageRate,
      wageEarned: e.wageEarned,
      cashPaid: e.cashPaid,
      netBalance: e.netBalance,
      notes: e.notes || "",
    }));

    // If filtered by a single unit, compute running ledger with opening balances
    let ledgerResult: any = { rows: formatted, summary: null };
    if (unitId && unitId !== "ALL") {
      const unit = await prisma.productionUnit.findUnique({
        where: { id: unitId },
        select: {
          clothType: true,
          initialWeftKg: true,
          paavuMeters: true,
          initialAdvance: true,
          babinCount: true,
        },
      });

      const openingBalances = unit
        ? {
            weftStock: unit.initialWeftKg || 0,
            remainingPaavu: 0, // Traditional register computes running paavu strictly from its register entries
            netBalance: -(unit.initialAdvance || 0),
            babinStock: unit.babinCount || 0,
          }
        : undefined;

      ledgerResult = computeTraditionalRegisterLedger(
        formatted as any,
        openingBalances,
        unit?.clothType || "VEATTI"
      );
    }

    return NextResponse.json({
      entries: ledgerResult.rows,
      summary: ledgerResult.summary,
    });
  } catch (error: any) {
    console.error("GET /api/production/register error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch register entries" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/production/register
 * Create a new traditional handwritten register entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      unitId,
      date,
      entryType = "PRODUCED",
      description = "",
      paavuGivenMeters = 0,
      paavuProducedMeters = 0,
      weftGivenKg = 0,
      weftBagsGiven = 0,
      babinCount = 0,
      beamCount = 0,
      wageRate,
      cashPaid = 0,
      notes,
    } = body;

    if (!unitId) {
      return NextResponse.json({ error: "Powerloom Unit ID is required" }, { status: 400 });
    }

    // Verify unit exists
    const unit = await prisma.productionUnit.findUnique({ where: { id: unitId } });
    if (!unit) {
      return NextResponse.json({ error: "Powerloom unit not found" }, { status: 404 });
    }

    const effectiveWageRate = Number(
      wageRate !== undefined && wageRate !== null && wageRate !== ""
        ? wageRate
        : unit.individualRate || TRADITIONAL_DEFAULT_WAGE_RATE
    );

    const produced = Number(paavuProducedMeters || 0);
    const givenPaavu = Number(paavuGivenMeters || 0);
    const cash = Number(cashPaid || 0);
    const babin = Number(babinCount || 0);
    const beam = Number(beamCount || 0);

    // Auto Weft Given: if bag count given but not KG, multiply by kgPerBag (60 kg/bag for Veatti, 50 kg/bag for Saree)
    let effectiveWeftGiven = Number(weftGivenKg || 0);
    const bags = Number(weftBagsGiven || 0);
    if (bags > 0 && effectiveWeftGiven === 0) {
      effectiveWeftGiven = calculateBagsToKg(bags, unit.clothType);
    }

    // Auto Weft Consumed = Produced Meters * Unit's configured Weft Multiplier (e.g. 0.119/0.110 for Veatti, 0.182/0.175 for Saree)
    const unitWeftMultiplier = (unit as any).weftMultiplier || (unit.clothType === "SAREE" ? 0.182 : 0.119);
    const weftConsumed = produced > 0 ? calculateWeftConsumed(produced, unitWeftMultiplier) : 0;

    // Auto Wage Earned = Produced Meters * Wage Rate
    const wageEarned = produced > 0 ? calculateTraditionalWage(produced, effectiveWageRate) : 0;

    const entryDate = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx: any) => {
      // Create register entry
      const entry = await tx.veattiRegisterEntry.create({
        data: {
          unitId,
          date: entryDate,
          entryType,
          description: description || `${entryType} entry`,
          paavuGivenMeters: givenPaavu,
          paavuProducedMeters: produced,
          weftGivenKg: effectiveWeftGiven,
          weftBagsGiven: bags,
          weftConsumedKg: weftConsumed,
          babinCount: babin,
          beamCount: beam,
          wageRate: effectiveWageRate,
          wageEarned,
          cashPaid: cash,
          notes: notes || null,
        },
      });

      // Synchronize unit totals
      const updatedUnit = await syncUnitFinancialsAndTotals(tx, unitId);

      // Audit Log
      await tx.veattiAuditLog.create({
        data: {
          unitId,
          entityType: "REGISTER_ENTRY",
          entityId: entry.id,
          action: "CREATE",
          newValues: JSON.stringify({
            entryType,
            description,
            paavuGivenMeters: givenPaavu,
            paavuProducedMeters: produced,
            weftConsumedKg: weftConsumed,
            wageEarned,
            cashPaid: cash,
          }),
          details: `Created register entry: ${description || entryType}`,
        },
      });

      return { entry, updatedUnit };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/production/register error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create register entry" },
      { status: 500 }
    );
  }
}

