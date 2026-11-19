import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import {
  calculatePaavuMetersFromKg,
  calculatePaavuKgFromMeters,
  calculateRemainingMeters,
  syncUnitFinancialsAndTotals,
} from "@/lib/veatti-calculations";

const createPaavuSchema = z.object({
  clothType: z.enum(["VEATTI", "SAREE"]),
  paavuNumber: z.string().min(1, "Paavu number is required"),
  paavuMeters: z.number().min(0).optional(),
  paavuWeightKg: z.number().min(0).optional().default(0),
  dateGiven: z.string().optional().nullable(),
  weaverName: z.string().optional().nullable(),
  machineNumber: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  status: z.enum(["UNLOADED", "RUNNING", "COMPLETED"]).optional().default("UNLOADED"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clothType = searchParams.get("clothType"); // "VEATTI" | "SAREE"
    const status = searchParams.get("status"); // "UNLOADED" | "RUNNING" | "COMPLETED"
    const unitId = searchParams.get("unitId");

    const where: any = {};
    if (clothType) where.clothType = clothType;
    if (status) where.status = status;
    if (unitId) where.unitId = unitId;

    const paavus = await prisma.paavuRecord.findMany({
      where,
      include: {
        unit: {
          select: {
            id: true,
            weaverName: true,
            location: true,
            conversionRatio: true,
            individualRate: true,
            rateUnit: true,
          },
        },
        productionEntries: {
          orderBy: { productionDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = paavus.map((p) => {
      const produced = p.actualProducedMeters ?? 0;
      const remaining = calculateRemainingMeters(p.paavuMeters, produced);
      return {
        ...p,
        paavuMeters: round2(p.paavuMeters),
        paavuWeightKg: round2(p.paavuWeightKg || 0),
        actualProducedMeters: p.actualProducedMeters ? round2(p.actualProducedMeters) : null,
        remainingMeters: round2(remaining),
        meterDifference: p.meterDifference ? round2(p.meterDifference) : null,
        variancePercent:
          p.actualProducedMeters && p.paavuMeters > 0
            ? round2(((p.actualProducedMeters - p.paavuMeters) / p.paavuMeters) * 100)
            : null,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch paavu records" },
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
    const parsed = createPaavuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get unit if attached to get conversion ratio
    let unit = null;
    if (data.unitId) {
      unit = await prisma.productionUnit.findUnique({ where: { id: data.unitId } });
    }

    const ratio = unit?.conversionRatio || 12.0;

    let paavuMeters = data.paavuMeters || 0;
    let paavuWeightKg = data.paavuWeightKg || 0;

    // Auto-compute meters if KG is provided and meters is 0
    if (paavuWeightKg > 0 && (!paavuMeters || paavuMeters === 0)) {
      paavuMeters = calculatePaavuMetersFromKg(paavuWeightKg, ratio);
    } else if (paavuMeters > 0 && (!paavuWeightKg || paavuWeightKg === 0)) {
      paavuWeightKg = calculatePaavuKgFromMeters(paavuMeters, ratio);
    }

    const isLoaded = Boolean(data.machineNumber && data.machineNumber.trim().length > 0);
    const dateGiven = data.dateGiven ? new Date(data.dateGiven) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const paavu = await tx.paavuRecord.create({
        data: {
          clothType: data.clothType,
          paavuNumber: data.paavuNumber.trim(),
          paavuMeters,
          paavuWeightKg,
          remainingMeters: paavuMeters,
          dateGiven,
          weaverName: data.weaverName?.trim() || unit?.weaverName || null,
          machineNumber: isLoaded ? data.machineNumber!.trim() : null,
          status: isLoaded ? "RUNNING" : (data.status || "UNLOADED"),
          loadedAt: isLoaded ? new Date() : null,
          unitId: data.unitId || null,
          notes: data.notes?.trim() || null,
        },
        include: {
          unit: true,
        },
      });

      // If assigned to a unit, update paavu count, meters, and weight on unit
      if (data.unitId) {
        await tx.productionUnit.update({
          where: { id: data.unitId },
          data: {
            paavuCount: { increment: 1 },
            paavuMeters: { increment: paavuMeters },
            paavuWeightKg: { increment: paavuWeightKg },
          },
        });
        await syncUnitFinancialsAndTotals(tx, data.unitId);
      }

      await tx.veattiAuditLog.create({
        data: {
          unitId: data.unitId || null,
          entityType: "PAAVU",
          entityId: paavu.id,
          action: "CREATE",
          newValues: JSON.stringify({
            paavuNumber: paavu.paavuNumber,
            meters: paavuMeters,
            weightKg: paavuWeightKg,
            status: paavu.status,
          }),
          performedById: user.id,
          details: `Added Paavu ${paavu.paavuNumber} (${paavuMeters}m, ${paavuWeightKg}kg) to unit ${data.weaverName || unit?.weaverName || "Shed"}`,
        },
      });

      return paavu;
    });

    return NextResponse.json({ success: true, paavu: result }, { status: 201 });
  } catch (error: any) {
    console.error("Create paavu error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create paavu record" },
      { status: 500 }
    );
  }
}
