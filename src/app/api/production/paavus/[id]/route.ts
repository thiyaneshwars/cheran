import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import {
  calculatePaavuMetersFromKg,
  calculateRemainingMeters,
  syncUnitFinancialsAndTotals,
} from "@/lib/veatti-calculations";

const updatePaavuSchema = z.object({
  paavuNumber: z.string().min(1).optional(),
  paavuMeters: z.number().min(0).optional(),
  paavuWeightKg: z.number().min(0).optional(),
  dateGiven: z.string().optional().nullable(),
  weaverName: z.string().optional().nullable(),
  machineNumber: z.string().optional().nullable(),
  status: z.enum(["UNLOADED", "RUNNING", "COMPLETED"]).optional(),
  actualProducedMeters: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
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
    const paavu = await prisma.paavuRecord.findUnique({
      where: { id },
      include: {
        unit: true,
        productionEntries: { orderBy: { productionDate: "desc" } },
      },
    });

    if (!paavu) {
      return NextResponse.json({ error: "Paavu record not found" }, { status: 404 });
    }

    const produced = paavu.actualProducedMeters ?? 0;
    const remaining = calculateRemainingMeters(paavu.paavuMeters, produced);

    return NextResponse.json({
      ...paavu,
      paavuMeters: round2(paavu.paavuMeters),
      paavuWeightKg: round2(paavu.paavuWeightKg || 0),
      remainingMeters: round2(remaining),
      meterDifference: paavu.meterDifference ? round2(paavu.meterDifference) : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch paavu" },
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
    const existing = await prisma.paavuRecord.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Paavu record not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updatePaavuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const ratio = existing.unit?.conversionRatio || 12.0;

    let newMeters = data.paavuMeters ?? existing.paavuMeters;
    let newKg = data.paavuWeightKg ?? existing.paavuWeightKg;

    // If Paavu KG is modified and meters wasn't explicitly changed, recalculate meters
    if (data.paavuWeightKg !== undefined && data.paavuMeters === undefined && newKg > 0) {
      newMeters = calculatePaavuMetersFromKg(newKg, ratio);
    }

    const produced = data.actualProducedMeters ?? existing.actualProducedMeters ?? 0;
    const remaining = calculateRemainingMeters(newMeters, produced);
    const meterDiff = data.actualProducedMeters !== undefined ? round2(produced - newMeters) : existing.meterDifference;

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.paavuRecord.update({
        where: { id },
        data: {
          ...(data.paavuNumber ? { paavuNumber: data.paavuNumber.trim() } : {}),
          paavuMeters: newMeters,
          paavuWeightKg: newKg,
          remainingMeters: remaining,
          ...(data.dateGiven !== undefined
            ? { dateGiven: data.dateGiven ? new Date(data.dateGiven) : existing.dateGiven }
            : {}),
          ...(data.weaverName !== undefined ? { weaverName: data.weaverName?.trim() || null } : {}),
          ...(data.machineNumber !== undefined ? { machineNumber: data.machineNumber?.trim() || null } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.actualProducedMeters !== undefined
            ? {
                actualProducedMeters: data.actualProducedMeters,
                meterDifference: meterDiff,
              }
            : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        },
      });

      // Recalculate Unit's total paavu meters and weight if unitId is present
      if (existing.unitId) {
        const allUnitPaavus = await tx.paavuRecord.findMany({
          where: { unitId: existing.unitId },
        });

        const totalUnitMeters = allUnitPaavus.reduce((sum, item) => sum + item.paavuMeters, 0);
        const totalUnitKg = allUnitPaavus.reduce((sum, item) => sum + (item.paavuWeightKg || 0), 0);

        await tx.productionUnit.update({
          where: { id: existing.unitId },
          data: {
            paavuMeters: totalUnitMeters,
            paavuWeightKg: totalUnitKg,
            paavuCount: allUnitPaavus.length,
          },
        });

        await syncUnitFinancialsAndTotals(tx, existing.unitId);
      }

      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId || null,
          entityType: "PAAVU",
          entityId: id,
          action: "UPDATE",
          oldValues: JSON.stringify({
            meters: existing.paavuMeters,
            weightKg: existing.paavuWeightKg,
            status: existing.status,
          }),
          newValues: JSON.stringify({
            meters: newMeters,
            weightKg: newKg,
            status: data.status || existing.status,
          }),
          performedById: user.id,
          details: `Updated Paavu ${existing.paavuNumber}: ${existing.paavuWeightKg}kg -> ${newKg}kg, ${existing.paavuMeters}m -> ${newMeters}m`,
        },
      });

      return p;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update paavu error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update paavu" },
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
    const existing = await prisma.paavuRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Paavu record not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Disconnect or delete relations
      await tx.veattiProductionEntry.updateMany({
        where: { paavuId: id },
        data: { paavuId: null },
      });

      await tx.paavuRecord.delete({ where: { id } });

      if (existing.unitId) {
        const remainingPaavus = await tx.paavuRecord.findMany({
          where: { unitId: existing.unitId },
        });

        const totalUnitMeters = remainingPaavus.reduce((sum, item) => sum + item.paavuMeters, 0);
        const totalUnitKg = remainingPaavus.reduce((sum, item) => sum + (item.paavuWeightKg || 0), 0);

        await tx.productionUnit.update({
          where: { id: existing.unitId },
          data: {
            paavuCount: remainingPaavus.length,
            paavuMeters: totalUnitMeters,
            paavuWeightKg: totalUnitKg,
          },
        });

        await syncUnitFinancialsAndTotals(tx, existing.unitId);
      }

      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId || null,
          entityType: "PAAVU",
          entityId: id,
          action: "DELETE",
          oldValues: JSON.stringify(existing),
          performedById: user.id,
          details: `Deleted Paavu ${existing.paavuNumber} (${existing.paavuMeters}m, ${existing.paavuWeightKg}kg)`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Paavu deleted successfully" });
  } catch (error: any) {
    console.error("Delete paavu error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete paavu" },
      { status: 500 }
    );
  }
}

