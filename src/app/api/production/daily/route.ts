import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import { calculateNetProduction, syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

const dailyProductionSchema = z.object({
  unitId: z.string().min(1, "Unit ID is required"),
  paavuId: z.string().optional().nullable(),
  paavuRef: z.string().optional().nullable(),
  productionDate: z.string().optional().nullable(),
  dailyMeters: z.number().min(0, "Daily meters must be positive"),
  wastageMeters: z.number().min(0).default(0),
  remarks: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");
    const clothType = searchParams.get("clothType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (unitId) where.unitId = unitId;
    if (clothType) {
      where.unit = { clothType };
    }
    if (startDate || endDate) {
      where.productionDate = {};
      if (startDate) where.productionDate.gte = new Date(startDate);
      if (endDate) where.productionDate.lte = new Date(endDate);
    }

    const entries = await prisma.veattiProductionEntry.findMany({
      where,
      include: {
        unit: {
          select: { id: true, weaverName: true, targetMeters: true, handoveredMeters: true },
        },
        paavu: {
          select: { id: true, paavuNumber: true, paavuMeters: true, machineNumber: true },
        },
      },
      orderBy: { productionDate: "desc" },
    });

    const formatted = entries.map((e) => ({
      ...e,
      dailyMeters: round2(e.dailyMeters),
      wastageMeters: round2(e.wastageMeters),
      netProduction: round2(e.netProduction),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch production entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = dailyProductionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const productionDate = data.productionDate ? new Date(data.productionDate) : new Date();
    const netProduction = calculateNetProduction(data.dailyMeters, data.wastageMeters);

    const result = await prisma.$transaction(async (tx) => {
      // Create production entry
      const entry = await tx.veattiProductionEntry.create({
        data: {
          unitId: data.unitId,
          paavuId: data.paavuId || null,
          paavuRef: data.paavuRef || null,
          productionDate,
          dailyMeters: data.dailyMeters,
          wastageMeters: data.wastageMeters,
          netProduction,
          remarks: data.remarks?.trim() || null,
        },
        include: { unit: true, paavu: true },
      });

      // If linked to a Paavu, update paavu's actualProducedMeters & status
      if (data.paavuId) {
        const paavuEntries = await tx.veattiProductionEntry.findMany({
          where: { paavuId: data.paavuId },
        });
        const paavuProduced = paavuEntries.reduce((sum, item) => sum + item.netProduction, 0);

        const currentPaavu = await tx.paavuRecord.findUnique({ where: { id: data.paavuId } });
        if (currentPaavu) {
          const remaining = Math.max(0, currentPaavu.paavuMeters - paavuProduced);
          await tx.paavuRecord.update({
            where: { id: data.paavuId },
            data: {
              actualProducedMeters: paavuProduced,
              remainingMeters: remaining,
              meterDifference: round2(paavuProduced - currentPaavu.paavuMeters),
            },
          });
        }
      }

      // Sync Unit's total production, godown stock, and balance to handover
      await syncUnitFinancialsAndTotals(tx, data.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: data.unitId,
          entityType: "PRODUCTION",
          entityId: entry.id,
          action: "CREATE",
          newValues: JSON.stringify({
            dailyMeters: data.dailyMeters,
            wastageMeters: data.wastageMeters,
            netProduction,
            date: productionDate,
          }),
          performedById: user.id,
          details: `Recorded Daily Production: ${data.dailyMeters}m (Net: ${netProduction}m, Waste: ${data.wastageMeters}m) for Unit ${entry.unit?.weaverName}`,
        },
      });

      return entry;
    });

    return NextResponse.json({ success: true, entry: result }, { status: 201 });
  } catch (error: any) {
    console.error("Create daily production error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record daily production" },
      { status: 500 }
    );
  }
}

