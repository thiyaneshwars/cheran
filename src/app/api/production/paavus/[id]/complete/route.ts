import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";

const completeSchema = z.object({
  actualProducedMeters: z.number().positive("Actual produced meters must be greater than zero"),
  notes: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const paavu = await prisma.paavuRecord.findUnique({ where: { id } });
    if (!paavu) {
      return NextResponse.json({ error: "Paavu record not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid actual meters" },
        { status: 400 }
      );
    }

    const actualProduced = parsed.data.actualProducedMeters;
    const difference = round2(actualProduced - paavu.paavuMeters);
    const variancePercent = round2(((actualProduced - paavu.paavuMeters) / paavu.paavuMeters) * 100);

    const updated = await prisma.paavuRecord.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        actualProducedMeters: actualProduced,
        meterDifference: difference,
        notes: parsed.data.notes?.trim() || paavu.notes,
      },
    });

    // If tied to a production unit, increment unit's totalProducedMeters and update godown balance
    if (paavu.unitId) {
      const unit = await prisma.productionUnit.findUnique({ where: { id: paavu.unitId } });
      if (unit) {
        const newProduced = round2(unit.totalProducedMeters + actualProduced);
        const newGodown = Math.max(0, round2(newProduced - unit.handoveredMeters));
        const newBalance = Math.max(0, round2(unit.targetMeters - unit.handoveredMeters));

        await prisma.productionUnit.update({
          where: { id: paavu.unitId },
          data: {
            totalProducedMeters: newProduced,
            godownMeters: newGodown,
            balanceToHandover: newBalance,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "PAAVU_COMPLETED",
        entityType: "PaavuRecord",
        entityId: id,
        performedById: user.id,
        details: `Completed paavu "${updated.paavuNumber}". Paavu Meter: ${paavu.paavuMeters}m, Got: ${actualProduced}m, Difference: ${difference > 0 ? "+" : ""}${difference}m (${variancePercent}%).`,
      },
    });

    return NextResponse.json({
      success: true,
      paavu: {
        ...updated,
        variancePercent,
      },
      verification: {
        paavuMeters: paavu.paavuMeters,
        actualProducedMeters: actualProduced,
        meterDifference: difference,
        variancePercent,
        type: difference >= 0 ? "SURPLUS_OR_EXACT" : "SHORTAGE_OR_WASTAGE",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to complete paavu production" },
      { status: 500 }
    );
  }
}
