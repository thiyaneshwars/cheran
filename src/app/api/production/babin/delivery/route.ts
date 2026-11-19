import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  calculateBabinSetFinancials,
  reconcilePowerloomBabinSets,
  isExcludedFromBabin,
  BABIN_DEFAULT_RATE_PER_SET,
  BABIN_DEFAULT_WAGE_PER_SET,
  BABIN_DEFAULT_PROFIT_PER_SET,
} from "@/lib/babin-calculations";
import { round2 } from "@/lib/decimal";

const deliverySchema = z.object({
  date: z.string().min(1, "Date is required"),
  powerloomName: z.string().min(1, "Powerloom name is required"),
  setsGiven: z.number().int().positive("Sets given must be at least 1"),
  ratePerSet: z.number().positive().default(BABIN_DEFAULT_RATE_PER_SET),
  wagePerSet: z.number().positive().default(BABIN_DEFAULT_WAGE_PER_SET),
  profitPerSet: z.number().positive().default(BABIN_DEFAULT_PROFIT_PER_SET),
  settledAmount: z.number().min(0).default(0),
  babinEntryId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const filterPowerloom = searchParams.get("powerloomName");

    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { powerloomName: { contains: search.trim() } },
        { notes: { contains: search.trim() } },
      ];
    }

    if (filterPowerloom && filterPowerloom.trim()) {
      where.powerloomName = filterPowerloom.trim();
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // 1. Fetch deliveries
    const deliveries = await prisma.babinSetDelivery.findMany({
      where,
      include: {
        unit: {
          select: {
            id: true,
            weaverName: true,
            location: true,
            machineCount: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Exclude units requested by user to be kept out of Jarigai page (Amman, Parimala, Kumar, Thanarasu)
    const validDeliveries = deliveries.filter((d) => !isExcludedFromBabin(d.powerloomName));

    // 2. Fetch all allocations to calculate allocated sets per powerloom
    const allocations = await prisma.babinEntry.findMany({
      select: {
        powerloomName: true,
        setsProduced: true,
      },
    });
    const validAllocations = allocations.filter((a) => !isExcludedFromBabin(a.powerloomName));

    // Map of powerloomName -> total allocated sets from thread
    const allocatedSetsMap = new Map<string, number>();
    for (const alloc of validAllocations) {
      const name = alloc.powerloomName.trim();
      const current = allocatedSetsMap.get(name) || 0;
      allocatedSetsMap.set(name, current + alloc.setsProduced);
    }

    // 3. Fetch ALL deliveries (unfiltered by date) to compute powerloom cumulative status
    const allDeliveries = await prisma.babinSetDelivery.findMany({
      select: {
        powerloomName: true,
        setsGiven: true,
        totalAmount: true,
        totalWage: true,
        totalProfit: true,
        settledAmount: true,
        yetToSettle: true,
      },
    });
    const validAllDeliveries = allDeliveries.filter((d) => !isExcludedFromBabin(d.powerloomName));

    const deliveredSetsMap = new Map<string, {
      setsGiven: number;
      totalAmount: number;
      totalWage: number;
      totalProfit: number;
      settledAmount: number;
      yetToSettle: number;
    }>();

    for (const d of validAllDeliveries) {
      const name = d.powerloomName.trim();
      const current = deliveredSetsMap.get(name) || {
        setsGiven: 0,
        totalAmount: 0,
        totalWage: 0,
        totalProfit: 0,
        settledAmount: 0,
        yetToSettle: 0,
      };
      deliveredSetsMap.set(name, {
        setsGiven: current.setsGiven + d.setsGiven,
        totalAmount: current.totalAmount + d.totalAmount,
        totalWage: current.totalWage + d.totalWage,
        totalProfit: current.totalProfit + d.totalProfit,
        settledAmount: current.settledAmount + d.settledAmount,
        yetToSettle: current.yetToSettle + d.yetToSettle,
      });
    }

    // 4. Combine powerloom names strictly from active Babin allocations and deliveries
    const units = await prisma.productionUnit.findMany({
      select: { id: true, weaverName: true, location: true },
    });

    const powerloomNameSet = new Set<string>();
    validAllocations.forEach((a) => powerloomNameSet.add(a.powerloomName.trim()));
    validAllDeliveries.forEach((d) => powerloomNameSet.add(d.powerloomName.trim()));

    // Build powerloom summaries
    const powerloomSummaries = Array.from(powerloomNameSet).filter((name) => !isExcludedFromBabin(name)).map((name) => {
      const allocated = allocatedSetsMap.get(name) || 0;
      const stats = deliveredSetsMap.get(name) || {
        setsGiven: 0,
        totalAmount: 0,
        totalWage: 0,
        totalProfit: 0,
        settledAmount: 0,
        yetToSettle: 0,
      };

      const recon = reconcilePowerloomBabinSets(
        name,
        allocated,
        stats.setsGiven,
        stats.settledAmount
      );

      const matchedUnit = units.find(
        (u) => u.weaverName?.toLowerCase() === name.toLowerCase()
      );

      return {
        ...recon,
        unitId: matchedUnit?.id || null,
        location: matchedUnit?.location || null,
      };
    });

    // 5. Compute Overall Summary from currently queried deliveries
    let totalSetsGiven = 0;
    let totalAmount = 0;
    let totalWage = 0;
    let totalProfit = 0;
    let totalSettled = 0;
    let totalYetToSettle = 0;

    for (const d of validDeliveries) {
      totalSetsGiven += d.setsGiven;
      totalAmount += d.totalAmount;
      totalWage += d.totalWage;
      totalProfit += d.totalProfit;
      totalSettled += d.settledAmount;
      totalYetToSettle += d.yetToSettle;
    }

    // Sum overall powerloom reconciliation stats
    const totalAllocatedSets = powerloomSummaries.reduce((sum, p) => sum + p.allocatedSets, 0);
    const totalDeliveredSets = powerloomSummaries.reduce((sum, p) => sum + p.deliveredSets, 0);
    const totalYetToGiveSets = powerloomSummaries.reduce((sum, p) => sum + p.yetToGive, 0);
    const totalExtraGivenSets = powerloomSummaries.reduce((sum, p) => sum + p.extraGiven, 0);

    return NextResponse.json({
      deliveries: validDeliveries,
      powerloomSummaries,
      summary: {
        totalSetsGiven,
        totalAmount: round2(totalAmount),
        totalWage: round2(totalWage),
        totalProfit: round2(totalProfit),
        totalSettled: round2(totalSettled),
        totalYetToSettle: round2(totalYetToSettle),
        totalAllocatedSets,
        totalDeliveredSets,
        totalYetToGiveSets,
        totalExtraGivenSets,
        totalEntries: deliveries.length,
      },
      suggestions: powerloomSummaries.map((p) => ({
        name: p.powerloomName,
        unitId: p.unitId,
        location: p.location,
        allocatedSets: p.allocatedSets,
        deliveredSets: p.deliveredSets,
        yetToGive: p.yetToGive,
        extraGiven: p.extraGiven,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/production/babin/delivery error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Babin deliveries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = deliverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const {
      date,
      powerloomName,
      setsGiven,
      ratePerSet,
      wagePerSet,
      profitPerSet,
      settledAmount,
      babinEntryId,
      unitId,
      notes,
    } = parsed.data;

    // Financial calculations: ₹450 total, ₹250 wage, ₹200 profit
    const fin = calculateBabinSetFinancials(
      setsGiven,
      settledAmount,
      ratePerSet,
      wagePerSet,
      profitPerSet
    );

    // Resolve or link unitId
    let resolvedUnitId = unitId || null;
    if (!resolvedUnitId) {
      const matchedUnit = await prisma.productionUnit.findFirst({
        where: {
          weaverName: {
            equals: powerloomName.trim(),
          },
        },
      });
      if (matchedUnit) resolvedUnitId = matchedUnit.id;
    }

    const delivery = await prisma.babinSetDelivery.create({
      data: {
        date: new Date(date),
        powerloomName: powerloomName.trim(),
        unitId: resolvedUnitId,
        babinEntryId: babinEntryId || null,
        setsGiven: fin.setsGiven,
        ratePerSet: fin.ratePerSet,
        wagePerSet: fin.wagePerSet,
        profitPerSet: fin.profitPerSet,
        totalAmount: fin.totalAmount,
        totalWage: fin.totalWage,
        totalProfit: fin.totalProfit,
        settledAmount: fin.settledAmount,
        yetToSettle: fin.yetToSettle,
        paymentStatus: fin.paymentStatus,
        notes: notes?.trim() || null,
      },
      include: {
        unit: {
          select: {
            id: true,
            weaverName: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/production/babin/delivery error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record Babin delivery" },
      { status: 500 }
    );
  }
}

