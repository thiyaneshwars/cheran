import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateWeftConsumed,
  calculateTraditionalWage,
  calculateBagsToKg,
  syncUnitFinancialsAndTotals,
  TRADITIONAL_DEFAULT_WAGE_RATE,
} from "@/lib/veatti-calculations";

/**
 * GET /api/production/register/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await prisma.veattiRegisterEntry.findUnique({
      where: { id },
      include: {
        unit: {
          select: {
            id: true,
            weaverName: true,
            clothType: true,
            location: true,
            individualRate: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Register entry not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error("GET /api/production/register/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch register entry" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/production/register/[id]
 * Update a traditional register entry and re-tally unit totals atomically
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.veattiRegisterEntry.findUnique({
      where: { id },
      include: { unit: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Register entry not found" }, { status: 404 });
    }

    const {
      date,
      entryType = existing.entryType,
      description = existing.description,
      paavuGivenMeters,
      paavuProducedMeters,
      weftGivenKg,
      weftBagsGiven,
      babinCount,
      beamCount,
      wageRate,
      cashPaid,
      notes,
    } = body;

    const produced = Number(
      paavuProducedMeters !== undefined ? paavuProducedMeters : existing.paavuProducedMeters
    );
    const givenPaavu = Number(
      paavuGivenMeters !== undefined ? paavuGivenMeters : existing.paavuGivenMeters
    );
    const effectiveWageRate = Number(
      wageRate !== undefined ? wageRate : existing.wageRate || TRADITIONAL_DEFAULT_WAGE_RATE
    );
    const cash = Number(cashPaid !== undefined ? cashPaid : existing.cashPaid);
    const babin = Number(babinCount !== undefined ? babinCount : existing.babinCount);
    const beam = Number(beamCount !== undefined ? beamCount : existing.beamCount);
    const bags = Number(weftBagsGiven !== undefined ? weftBagsGiven : existing.weftBagsGiven);

    let effectiveWeftGiven = Number(
      weftGivenKg !== undefined ? weftGivenKg : existing.weftGivenKg
    );
    if (bags > 0 && (weftGivenKg === undefined || weftGivenKg === null || effectiveWeftGiven === 0)) {
      effectiveWeftGiven = calculateBagsToKg(bags, existing.unit?.clothType);
    }

    // Auto Weft Consumed = Produced Meters * Unit's configured Weft Multiplier (e.g. 0.119/0.110 for Veatti, 0.182/0.175 for Saree)
    const unitWeftMultiplier =
      (existing.unit as any)?.weftMultiplier ||
      (existing.unit?.clothType === "SAREE" ? 0.182 : 0.119);
    const weftConsumed = produced > 0 ? calculateWeftConsumed(produced, unitWeftMultiplier) : 0;

    // Auto Wage Earned = Produced Meters * Wage Rate
    const wageEarned = produced > 0 ? calculateTraditionalWage(produced, effectiveWageRate) : 0;

    const entryDate = date ? new Date(date) : existing.date;

    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.veattiRegisterEntry.update({
        where: { id },
        data: {
          date: entryDate,
          entryType,
          description,
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
          notes: notes !== undefined ? notes : existing.notes,
        },
      });

      // Synchronize unit totals
      const updatedUnit = await syncUnitFinancialsAndTotals(tx, existing.unitId);

      // Audit Log
      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId,
          entityType: "REGISTER_ENTRY",
          entityId: id,
          action: "UPDATE",
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify(updated),
          details: `Updated register entry: ${description}`,
        },
      });

      return { entry: updated, updatedUnit };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PUT /api/production/register/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update register entry" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/production/register/[id]
 * Delete register entry and recalculate unit totals atomically
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.veattiRegisterEntry.findUnique({
      where: { id },
      include: { unit: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Register entry not found" }, { status: 404 });
    }

    const unitId = existing.unitId;

    await prisma.$transaction(async (tx: any) => {
      await tx.veattiRegisterEntry.delete({ where: { id } });
      await syncUnitFinancialsAndTotals(tx, unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId,
          entityType: "REGISTER_ENTRY",
          entityId: id,
          action: "DELETE",
          oldValues: JSON.stringify(existing),
          details: `Deleted register entry: ${existing.description}`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Register entry deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/production/register/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete register entry" },
      { status: 500 }
    );
  }
}

