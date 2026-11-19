import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import { calculateVaravuAmount, syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

const rateConfigSchema = z.object({
  unitId: z.string().min(1, "Unit ID is required"),
  rate: z.number().min(0, "Rate must be non-negative"),
  rateUnit: z.enum(["PER_KG", "PER_METER"]).default("PER_KG"),
  effectiveDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  applyToExistingVaravu: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");

    const where: any = {};
    if (unitId) where.unitId = unitId;

    const rates = await prisma.veattiRateHistory.findMany({
      where,
      include: {
        unit: {
          select: { id: true, weaverName: true, individualRate: true, rateUnit: true },
        },
      },
      orderBy: { effectiveDate: "desc" },
    });

    const formatted = rates.map((r) => ({
      ...r,
      rate: round2(r.rate),
      previousRate: r.previousRate ? round2(r.previousRate) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch rate history" },
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
    const parsed = rateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();

    const unit = await prisma.productionUnit.findUnique({
      where: { id: data.unitId },
      include: { varavuEntries: true },
    });

    if (!unit) {
      return NextResponse.json({ error: "Production unit not found" }, { status: 404 });
    }

    const previousRate = unit.individualRate;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create rate history entry
      const history = await tx.veattiRateHistory.create({
        data: {
          unitId: data.unitId,
          rate: data.rate,
          rateUnit: data.rateUnit,
          effectiveDate,
          previousRate,
          notes: data.notes?.trim() || `Configured rate: ₹${data.rate}/${data.rateUnit}`,
        },
      });

      // 2. Update unit's current rate
      await tx.productionUnit.update({
        where: { id: data.unitId },
        data: {
          individualRate: data.rate,
          rateUnit: data.rateUnit,
        },
      });

      // 3. If explicit option to re-apply to existing transactions is enabled
      if (data.applyToExistingVaravu && unit.varavuEntries.length > 0) {
        for (const v of unit.varavuEntries) {
          const newAmount = calculateVaravuAmount(v.paavuKg, data.rate);
          await tx.veattiVaravu.update({
            where: { id: v.id },
            data: {
              rate: data.rate,
              rateUnit: data.rateUnit,
              amount: newAmount,
              remarks: `${v.remarks || ""} (Re-calculated at new rate: ₹${data.rate})`.trim(),
            },
          });
        }
      }

      // 4. Sync unit's financial tally
      const syncedUnit = await syncUnitFinancialsAndTotals(tx, data.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: data.unitId,
          entityType: "RATE",
          entityId: history.id,
          action: "UPDATE",
          oldValues: JSON.stringify({ rate: previousRate, unit: unit.rateUnit }),
          newValues: JSON.stringify({
            rate: data.rate,
            unit: data.rateUnit,
            appliedToExisting: data.applyToExistingVaravu,
          }),
          performedById: user.id,
          details: `Updated individual rate for ${unit.weaverName} to ₹${data.rate}/${data.rateUnit}${data.applyToExistingVaravu ? " (Applied to existing transactions)" : ""}`,
        },
      });

      return { history, unit: syncedUnit };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    console.error("Configure rate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to configure rate" },
      { status: 500 }
    );
  }
}

