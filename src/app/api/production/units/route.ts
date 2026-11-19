import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2, round3 } from "@/lib/decimal";
import { z } from "zod";
import { syncUnitFinancialsAndTotals, calculateVaravuAmount, calculateUnitEffectiveTotals } from "@/lib/veatti-calculations";

const createUnitSchema = z.object({
  clothType: z.enum(["VEATTI", "SAREE"]),
  weaverName: z.string().min(1, "Weaver/Unit name is required"),
  location: z.string().optional().nullable(),
  entryDate: z.string().optional().nullable(),
  machineCount: z.number().int().min(1).default(1),
  paavuCount: z.number().int().min(0).default(0),
  paavuMeters: z.number().min(0).default(0),
  paavuWeightKg: z.number().min(0).default(0),
  individualRate: z.number().min(0).default(0),
  rateUnit: z.enum(["PER_KG", "PER_METER"]).default("PER_KG"),
  conversionRatio: z.number().min(0.001).default(12.0),
  weftMultiplier: z.number().min(0.001).optional(),
  initialWeftKg: z.number().min(0).default(0),
  initialAdvance: z.number().min(0).default(0),
  babinCount: z.number().int().min(0).default(0),
  targetMeters: z.number().min(0).default(0),
  targetDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  autoCreatePaavus: z.boolean().default(true),
  paavuPrefix: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clothType = searchParams.get("clothType"); // "VEATTI" | "SAREE"
    const search = searchParams.get("search");

    const where: any = {};
    if (clothType) {
      where.clothType = clothType;
    }
    if (search) {
      where.OR = [
        { weaverName: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const units = await prisma.productionUnit.findMany({
      where,
      include: {
        paavus: {
          orderBy: { createdAt: "desc" },
        },
        handovers: {
          orderBy: { handoverDate: "desc" },
        },
        dailyProductions: {
          orderBy: { productionDate: "desc" },
        },
        rateHistories: {
          orderBy: { effectiveDate: "desc" },
        },
        varavuEntries: {
          orderBy: { transactionDate: "desc" },
        },
        advanceEntries: {
          orderBy: { advanceDate: "desc" },
        },
        registerEntries: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = units.map((u) => {
      const totals = calculateUnitEffectiveTotals(u);

      // If cached DB fields diverge from real computed totals, trigger background sync
      if (
        Math.abs(u.totalProducedMeters - totals.totalProduction) > 0.01 ||
        Math.abs(u.paavuMeters - totals.effectivePaavuTotal) > 0.01 ||
        u.babinCount !== totals.babinCount ||
        Math.abs((u.remainingPaavuMeters || 0) - totals.remainingPaavu) > 0.01
      ) {
        prisma.$transaction((tx) => syncUnitFinancialsAndTotals(tx, u.id)).catch(() => {});
      }

      return {
        ...u,
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
        individualRate: round2(u.individualRate || 0),
        rateUnit: u.rateUnit || "PER_KG",
        conversionRatio: round2(u.conversionRatio || 12.0),
        weftMultiplier: u.weftMultiplier ? round3(u.weftMultiplier) : (u.clothType === "SAREE" ? 0.182 : 0.119),
        initialWeftKg: round3(u.initialWeftKg || 0),
        initialAdvance: round2(u.initialAdvance || 0),
        totalVaravuAmount: round2(totals.totalVaravu || 0),
        totalAdvancePaid: round2(totals.totalAdvance || 0),
        currentBalance: round2(totals.currentBalance),
        isExcessAdvance: totals.currentBalance < 0,
        excessAdvanceAmount: totals.currentBalance < 0 ? round2(Math.abs(totals.currentBalance)) : 0,
        amountPayable: totals.currentBalance > 0 ? round2(totals.currentBalance) : 0,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch production units" },
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
    const parsed = createUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const entryDate = data.entryDate ? new Date(data.entryDate) : new Date();
    const targetDate = data.targetDate ? new Date(data.targetDate) : null;
    const balanceToHandover = data.targetMeters;

    const defaultWeftMultiplier = data.clothType === "SAREE" ? 0.182 : 0.119;
    const effectiveWeftMultiplier =
      data.weftMultiplier !== undefined && data.weftMultiplier !== null && data.weftMultiplier > 0
        ? data.weftMultiplier
        : defaultWeftMultiplier;

    const unit = await prisma.$transaction(async (tx) => {
      const createdUnit = await tx.productionUnit.create({
        data: {
          clothType: data.clothType,
          weaverName: data.weaverName.trim(),
          location: data.location?.trim() || null,
          entryDate,
          machineCount: data.machineCount,
          paavuCount: data.paavuCount,
          paavuMeters: data.paavuMeters,
          paavuWeightKg: data.paavuWeightKg,
          individualRate: data.individualRate,
          rateUnit: data.rateUnit,
          conversionRatio: data.conversionRatio,
          weftMultiplier: effectiveWeftMultiplier,
          initialWeftKg: data.initialWeftKg || 0,
          weftStockKg: data.initialWeftKg || 0,
          initialAdvance: data.initialAdvance,
          babinCount: data.babinCount,
          targetMeters: data.targetMeters,
          targetDate,
          totalProducedMeters: 0,
          handoveredMeters: 0,
          godownMeters: 0,
          balanceToHandover,
          totalVaravuAmount: 0,
          totalAdvancePaid: data.initialAdvance,
          currentBalance: -data.initialAdvance,
          notes: data.notes?.trim() || null,
        },
      });

      // 1. If individualRate > 0, record in rate history
      if (data.individualRate > 0) {
        await tx.veattiRateHistory.create({
          data: {
            unitId: createdUnit.id,
            rate: data.individualRate,
            rateUnit: data.rateUnit,
            effectiveDate: entryDate,
            notes: "Initial Rate Configured",
          },
        });
      }

      // 2. If paavuWeightKg > 0 & individualRate > 0, create initial Varavu entry
      if (data.clothType === "VEATTI" && data.paavuWeightKg > 0 && data.individualRate > 0) {
        const qty = data.rateUnit === "PER_METER" ? data.paavuMeters : data.paavuWeightKg;
        const varavuAmount = calculateVaravuAmount(qty, data.individualRate);
        await tx.veattiVaravu.create({
          data: {
            unitId: createdUnit.id,
            transactionDate: entryDate,
            varavuType: "INITIAL_PAAVU",
            paavuKg: data.paavuWeightKg,
            rate: data.individualRate,
            rateUnit: data.rateUnit,
            amount: varavuAmount,
            paymentMode: "CASH",
            remarks: `Initial Paavu Given (${data.paavuWeightKg} KG @ ₹${data.individualRate})`,
          },
        });
      }

      // 3. If initialAdvance > 0, create initial Advance entry
      if (data.clothType === "VEATTI" && data.initialAdvance > 0) {
        await tx.veattiAdvance.create({
          data: {
            unitId: createdUnit.id,
            advanceDate: entryDate,
            amount: data.initialAdvance,
            paymentMode: "CASH",
            description: "Initial Contract Advance Payment",
          },
        });
      }

      // 4. Auto create paavus if requested
      if (data.autoCreatePaavus && data.paavuCount > 0) {
        const meterPerPaavu =
          data.paavuCount > 0 && data.paavuMeters > 0
            ? round2(data.paavuMeters / data.paavuCount)
            : round2(data.paavuMeters);
        const weightPerPaavu =
          data.paavuCount > 0 && data.paavuWeightKg > 0
            ? round2(data.paavuWeightKg / data.paavuCount)
            : 0;

        const prefix = data.paavuPrefix || (data.clothType === "VEATTI" ? "PV-V" : "PV-S");
        const timestampSuffix = Date.now().toString().slice(-4);

        for (let i = 1; i <= data.paavuCount; i++) {
          await tx.paavuRecord.create({
            data: {
              clothType: data.clothType,
              unitId: createdUnit.id,
              weaverName: data.weaverName,
              paavuNumber: `${prefix}-${timestampSuffix}-${i}`,
              paavuMeters: meterPerPaavu,
              paavuWeightKg: weightPerPaavu,
              remainingMeters: meterPerPaavu,
              dateGiven: entryDate,
              status: "UNLOADED",
              notes: `Batch Paavu #${i} for ${data.weaverName}`,
            },
          });
        }
      }

      // 5. Tally unit financials
      const synced = await syncUnitFinancialsAndTotals(tx, createdUnit.id);
      return synced || createdUnit;
    });

    // Auto-sync into PowerloomWeaver so it is immediately selectable elsewhere
    const existingWeaver = await prisma.powerloomWeaver.findFirst({
      where: {
        name: { equals: data.weaverName.trim() },
        category: data.clothType,
      },
    });

    if (!existingWeaver) {
      await prisma.powerloomWeaver.create({
        data: {
          name: data.weaverName.trim(),
          location: data.location?.trim() || "Powerloom Production Unit",
          category: data.clothType,
          loomCount: data.machineCount,
          notes: `Auto-registered from Production Contract ${unit.id}`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "PRODUCTION_UNIT_CREATED",
        entityType: "ProductionUnit",
        entityId: unit.id,
        performedById: user.id,
        details: `Created ${data.clothType} unit for "${data.weaverName}". Paavu: ${data.paavuCount} (${data.paavuMeters}m, ${data.paavuWeightKg}kg), Rate: ₹${data.individualRate}/${data.rateUnit}, Weft: ${effectiveWeftMultiplier} kg/m, Opening Weft: ${data.initialWeftKg || 0}kg, Target: ${data.targetMeters}m.`,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    console.error("Create unit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create production unit" },
      { status: 500 }
    );
  }
}
