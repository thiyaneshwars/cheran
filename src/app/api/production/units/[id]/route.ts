import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2, round3 } from "@/lib/decimal";
import { z } from "zod";
import { syncUnitFinancialsAndTotals, calculateVaravuAmount, calculateUnitEffectiveTotals } from "@/lib/veatti-calculations";

const updateUnitSchema = z.object({
  weaverName: z.string().optional(),
  location: z.string().optional().nullable(),
  entryDate: z.string().optional().nullable(),
  machineCount: z.number().int().min(1).optional(),
  paavuCount: z.number().int().min(0).optional(),
  paavuMeters: z.number().min(0).optional(),
  paavuWeightKg: z.number().min(0).optional(),
  individualRate: z.number().min(0).optional(),
  rateUnit: z.enum(["PER_KG", "PER_METER"]).optional(),
  conversionRatio: z.number().min(0.001).optional(),
  weftMultiplier: z.number().min(0.001).optional(),
  initialWeftKg: z.number().min(0).optional(),
  initialAdvance: z.number().min(0).optional(),
  babinCount: z.number().int().min(0).optional(),
  targetMeters: z.number().min(0).optional(),
  targetDate: z.string().optional().nullable(),
  totalProducedMeters: z.number().min(0).optional(),
  handoveredMeters: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
  applyRateToExistingVaravu: z.boolean().optional().default(false),
});

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const unit = await prisma.productionUnit.findUnique({
      where: { id },
      include: {
        paavus: { orderBy: { createdAt: "desc" } },
        handovers: { orderBy: { handoverDate: "desc" } },
        dailyProductions: { orderBy: { productionDate: "desc" } },
        rateHistories: { orderBy: { effectiveDate: "desc" } },
        varavuEntries: { orderBy: { transactionDate: "desc" } },
        advanceEntries: { orderBy: { advanceDate: "desc" } },
        registerEntries: { orderBy: { date: "asc" } },
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: "Production unit not found" }, { status: 404 });
    }

    const totals = calculateUnitEffectiveTotals(unit);

    return NextResponse.json({
      ...unit,
      totalProducedMeters: round2(totals.totalProduction),
      handoveredMeters: round2(totals.totalHandover),
      godownMeters: round2(totals.godownStock),
      balanceToHandover: round2(totals.balanceToHandover),
      targetMeters: round2(totals.targetMeters),
      paavuMeters: round2(totals.effectivePaavuTotal),
      paavuWeightKg: round2(totals.paavuWeightKg || 0),
      babinCount: totals.babinCount,
      weftStockKg: round2(totals.weftStockKg || 0),
      remainingPaavuMeters: round2(totals.remainingPaavu || 0),
      individualRate: round2(unit.individualRate || 0),
      rateUnit: unit.rateUnit || "PER_KG",
      conversionRatio: round2(unit.conversionRatio || 12.0),
      weftMultiplier: unit.weftMultiplier ? round3(unit.weftMultiplier) : (unit.clothType === "SAREE" ? 0.182 : 0.119),
      initialWeftKg: round3(unit.initialWeftKg || 0),
      initialAdvance: round2(unit.initialAdvance || 0),
      totalVaravuAmount: round2(totals.totalVaravu || 0),
      totalAdvancePaid: round2(totals.totalAdvance || 0),
      currentBalance: round2(totals.currentBalance),
      isExcessAdvance: totals.currentBalance < 0,
      excessAdvanceAmount: totals.currentBalance < 0 ? round2(Math.abs(totals.currentBalance)) : 0,
      amountPayable: totals.currentBalance > 0 ? round2(totals.currentBalance) : 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch production unit" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const existing = await prisma.productionUnit.findUnique({
      where: { id },
      include: { varavuEntries: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Production unit not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updatedUnit = await prisma.$transaction(async (tx) => {
      // 1. If individualRate changed, log rate history
      const rateChanged =
        data.individualRate !== undefined && data.individualRate !== existing.individualRate;
      if (rateChanged) {
        await tx.veattiRateHistory.create({
          data: {
            unitId: id,
            rate: data.individualRate!,
            rateUnit: data.rateUnit || existing.rateUnit,
            effectiveDate: new Date(),
            previousRate: existing.individualRate,
            notes: `Rate updated from ₹${existing.individualRate} to ₹${data.individualRate}`,
          },
        });

        // If explicitly requested, update existing Varavu entries
        if (data.applyRateToExistingVaravu) {
          for (const v of existing.varavuEntries) {
            const newAmount = calculateVaravuAmount(v.paavuKg, data.individualRate!);
            await tx.veattiVaravu.update({
              where: { id: v.id },
              data: {
                rate: data.individualRate!,
                rateUnit: data.rateUnit || existing.rateUnit,
                amount: newAmount,
                remarks: `${v.remarks || ""} (Rate re-applied: ₹${data.individualRate})`.trim(),
              },
            });
          }
        }
      }

      // 2. Update unit record
      await tx.productionUnit.update({
        where: { id },
        data: {
          ...(data.weaverName ? { weaverName: data.weaverName.trim() } : {}),
          ...(data.location !== undefined ? { location: data.location?.trim() || null } : {}),
          ...(data.entryDate !== undefined
            ? { entryDate: data.entryDate ? new Date(data.entryDate) : existing.entryDate }
            : {}),
          ...(data.machineCount ? { machineCount: data.machineCount } : {}),
          ...(data.paavuCount !== undefined ? { paavuCount: data.paavuCount } : {}),
          ...(data.paavuMeters !== undefined ? { paavuMeters: data.paavuMeters } : {}),
          ...(data.paavuWeightKg !== undefined ? { paavuWeightKg: data.paavuWeightKg } : {}),
          ...(data.individualRate !== undefined ? { individualRate: data.individualRate } : {}),
          ...(data.rateUnit ? { rateUnit: data.rateUnit } : {}),
          ...(data.conversionRatio !== undefined ? { conversionRatio: data.conversionRatio } : {}),
          ...(data.weftMultiplier !== undefined ? { weftMultiplier: data.weftMultiplier } : {}),
          ...(data.initialWeftKg !== undefined ? { initialWeftKg: data.initialWeftKg } : {}),
          ...(data.initialAdvance !== undefined ? { initialAdvance: data.initialAdvance } : {}),
          ...(data.babinCount !== undefined ? { babinCount: data.babinCount } : {}),
          ...(data.targetMeters !== undefined ? { targetMeters: data.targetMeters } : {}),
          ...(data.targetDate !== undefined
            ? { targetDate: data.targetDate ? new Date(data.targetDate) : null }
            : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        },
      });

      // 3. Tally unit financials and production metrics
      const synced = await syncUnitFinancialsAndTotals(tx, id);
      return synced;
    });

    // Sync with PowerloomWeaver if weaver name or machine count changed
    if (data.weaverName || data.machineCount || data.location !== undefined) {
      const matchName = existing.weaverName.trim();
      const weaverRecord = await prisma.powerloomWeaver.findFirst({
        where: { name: { equals: matchName }, category: existing.clothType },
      });
      if (weaverRecord) {
        await prisma.powerloomWeaver.update({
          where: { id: weaverRecord.id },
          data: {
            ...(data.weaverName ? { name: data.weaverName.trim() } : {}),
            ...(data.location !== undefined
              ? { location: data.location?.trim() || "Powerloom Production Unit" }
              : {}),
            ...(data.machineCount ? { loomCount: data.machineCount } : {}),
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "PRODUCTION_UNIT_UPDATED",
        entityType: "ProductionUnit",
        entityId: id,
        performedById: user.id,
        details: `Updated ${existing.clothType} unit "${updatedUnit?.weaverName}". KG: ${data.paavuWeightKg ?? existing.paavuWeightKg}, Rate: ₹${data.individualRate ?? existing.individualRate}, Varavu: ₹${updatedUnit?.totalVaravuAmount}, Advance: ₹${updatedUnit?.totalAdvancePaid}, Balance: ₹${updatedUnit?.currentBalance}.`,
      },
    });

    return NextResponse.json(updatedUnit);
  } catch (error: any) {
    console.error("Update unit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update production unit" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const existing = await prisma.productionUnit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Production unit not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete cascade relations
      await tx.veattiRegisterEntry.deleteMany({ where: { unitId: id } });
      await tx.veattiAuditLog.deleteMany({ where: { unitId: id } });
      await tx.veattiVaravu.deleteMany({ where: { unitId: id } });
      await tx.veattiAdvance.deleteMany({ where: { unitId: id } });
      await tx.veattiRateHistory.deleteMany({ where: { unitId: id } });
      await tx.veattiProductionEntry.deleteMany({ where: { unitId: id } });
      await tx.governmentHandoverLog.deleteMany({ where: { unitId: id } });
      await tx.paavuRecord.deleteMany({ where: { unitId: id } });
      await tx.babinSetDelivery.deleteMany({ where: { unitId: id } });
      await tx.babinEntry.deleteMany({ where: { unitId: id } });
      await tx.productionUnit.delete({ where: { id } });
    });

    await prisma.auditLog.create({
      data: {
        action: "PRODUCTION_UNIT_DELETED",
        entityType: "ProductionUnit",
        entityId: id,
        performedById: user.id,
        details: `Deleted production unit "${existing.weaverName}".`,
      },
    });

    return NextResponse.json({ success: true, message: "Unit deleted successfully" });
  } catch (error: any) {
    console.error("Delete unit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete production unit" },
      { status: 500 }
    );
  }
}
