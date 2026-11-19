import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import { calculateNetProduction, syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

const updateDailyProductionSchema = z.object({
  paavuId: z.string().optional().nullable(),
  paavuRef: z.string().optional().nullable(),
  productionDate: z.string().optional().nullable(),
  dailyMeters: z.number().min(0).optional(),
  wastageMeters: z.number().min(0).optional(),
  remarks: z.string().optional().nullable(),
});

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
    const existing = await prisma.veattiProductionEntry.findUnique({
      where: { id },
      include: { unit: true, paavu: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Production entry not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateDailyProductionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const dailyMeters = data.dailyMeters ?? existing.dailyMeters;
    const wastageMeters = data.wastageMeters ?? existing.wastageMeters;
    const netProduction = calculateNetProduction(dailyMeters, wastageMeters);
    const productionDate = data.productionDate ? new Date(data.productionDate) : existing.productionDate;

    const updated = await prisma.$transaction(async (tx) => {
      const entry = await tx.veattiProductionEntry.update({
        where: { id },
        data: {
          paavuId: data.paavuId !== undefined ? data.paavuId : existing.paavuId,
          paavuRef: data.paavuRef !== undefined ? data.paavuRef : existing.paavuRef,
          productionDate,
          dailyMeters,
          wastageMeters,
          netProduction,
          remarks: data.remarks !== undefined ? data.remarks?.trim() || null : existing.remarks,
        },
      });

      // Recalculate Paavu if linked
      const targetPaavuId = entry.paavuId || existing.paavuId;
      if (targetPaavuId) {
        const paavuEntries = await tx.veattiProductionEntry.findMany({
          where: { paavuId: targetPaavuId },
        });
        const paavuProduced = paavuEntries.reduce((sum, item) => sum + item.netProduction, 0);

        const currentPaavu = await tx.paavuRecord.findUnique({ where: { id: targetPaavuId } });
        if (currentPaavu) {
          const remaining = Math.max(0, currentPaavu.paavuMeters - paavuProduced);
          await tx.paavuRecord.update({
            where: { id: targetPaavuId },
            data: {
              actualProducedMeters: paavuProduced,
              remainingMeters: remaining,
              meterDifference: round2(paavuProduced - currentPaavu.paavuMeters),
            },
          });
        }
      }

      // Sync Unit's total production, godown stock, and balance to handover
      await syncUnitFinancialsAndTotals(tx, existing.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId,
          entityType: "PRODUCTION",
          entityId: id,
          action: "UPDATE",
          oldValues: JSON.stringify({
            dailyMeters: existing.dailyMeters,
            wastageMeters: existing.wastageMeters,
            netProduction: existing.netProduction,
          }),
          newValues: JSON.stringify({
            dailyMeters,
            wastageMeters,
            netProduction,
          }),
          performedById: user.id,
          details: `Updated Daily Production: ${existing.netProduction}m -> ${netProduction}m for ${existing.unit?.weaverName}`,
        },
      });

      return entry;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update daily production error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update daily production" },
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
    const existing = await prisma.veattiProductionEntry.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Production entry not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.veattiProductionEntry.delete({ where: { id } });

      // Recalculate Paavu if linked
      if (existing.paavuId) {
        const paavuEntries = await tx.veattiProductionEntry.findMany({
          where: { paavuId: existing.paavuId },
        });
        const paavuProduced = paavuEntries.reduce((sum, item) => sum + item.netProduction, 0);

        const currentPaavu = await tx.paavuRecord.findUnique({ where: { id: existing.paavuId } });
        if (currentPaavu) {
          const remaining = Math.max(0, currentPaavu.paavuMeters - paavuProduced);
          await tx.paavuRecord.update({
            where: { id: existing.paavuId },
            data: {
              actualProducedMeters: paavuProduced,
              remainingMeters: remaining,
              meterDifference: round2(paavuProduced - currentPaavu.paavuMeters),
            },
          });
        }
      }

      // Sync Unit's total production, godown stock, and balance to handover
      await syncUnitFinancialsAndTotals(tx, existing.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId,
          entityType: "PRODUCTION",
          entityId: id,
          action: "DELETE",
          oldValues: JSON.stringify(existing),
          performedById: user.id,
          details: `Deleted Daily Production entry of ${existing.netProduction}m for ${existing.unit?.weaverName}`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Production entry deleted successfully" });
  } catch (error: any) {
    console.error("Delete daily production error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete daily production" },
      { status: 500 }
    );
  }
}

