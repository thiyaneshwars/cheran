import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { calculateBabinAllocation, isExcludedFromBabin } from "@/lib/babin-calculations";
import { round2, round3 } from "@/lib/decimal";

const babinSchema = z.object({
  date: z.string().optional().nullable(),
  powerloomName: z.string().min(1, "Powerloom name is required"),
  jarigaiKg: z.number().positive("Jarigai KG must be greater than zero"),
  unitId: z.string().optional().nullable(),
  status: z.string().default("ALLOCATED"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const powerloomName = searchParams.get("powerloomName");

    const where: any = {};

    if (powerloomName) {
      where.powerloomName = { contains: powerloomName };
    }

    if (search) {
      where.OR = [
        { powerloomName: { contains: search } },
        { notes: { contains: search } },
      ];
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

    const entries = await prisma.babinEntry.findMany({
      where,
      include: {
        unit: {
          select: { id: true, weaverName: true, location: true, machineCount: true },
        },
      },
      orderBy: { date: "desc" },
    });

    // Exclude units requested by user to be kept out of Jarigai page (Amman, Parimala, Kumar, Thanarasu)
    const validEntries = entries.filter((e) => !isExcludedFromBabin(e.powerloomName));

    // Build autocomplete suggestions: deduplicated distinct names strictly from valid past babin entries
    const suggestionMap = new Map<string, { name: string; unitId?: string; location?: string }>();

    validEntries.forEach((e) => {
      if (e.powerloomName) {
        const key = e.powerloomName.trim().toLowerCase();
        if (!suggestionMap.has(key)) {
          suggestionMap.set(key, {
            name: e.powerloomName.trim(),
            unitId: e.unitId || undefined,
            location: e.unit?.location || undefined,
          });
        }
      }
    });

    const suggestions = Array.from(suggestionMap.values());

    // Compute summary totals
    const totalJarigaiKg = validEntries.reduce((acc, e) => acc + (e.jarigaiKg || 0), 0);
    const totalSarees = validEntries.reduce((acc, e) => acc + (e.totalSarees || 0), 0);
    const totalSetsProduced = validEntries.reduce((acc, e) => acc + (e.setsProduced || 0), 0);
    const totalRemainingSarees = validEntries.reduce((acc, e) => acc + (e.remainingSarees || 0), 0);
    const totalRemainingKg = validEntries.reduce((acc, e) => acc + (e.remainingKg || 0), 0);

    return NextResponse.json({
      entries: validEntries.map((e) => ({
        ...e,
        jarigaiKg: round3(e.jarigaiKg),
        remainingKg: round3(e.remainingKg),
      })),
      suggestions,
      summary: {
        totalJarigaiKg: round3(totalJarigaiKg),
        totalSarees,
        totalSetsProduced,
        totalRemainingSarees,
        totalRemainingKg: round3(totalRemainingKg),
        totalEntries: entries.length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/production/babin error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch babin allocation entries" },
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
    const parsed = babinSchema.parse({
      ...body,
      jarigaiKg: Number(body.jarigaiKg),
    });

    const calculation = calculateBabinAllocation(parsed.jarigaiKg);

    let linkedUnitId = parsed.unitId || null;
    if (!linkedUnitId) {
      const match = await prisma.productionUnit.findFirst({
        where: {
          weaverName: parsed.powerloomName.trim(),
        },
      });
      if (match) linkedUnitId = match.id;
    }

    const entry = await prisma.babinEntry.create({
      data: {
        date: parsed.date ? new Date(parsed.date) : new Date(),
        powerloomName: parsed.powerloomName.trim(),
        unitId: linkedUnitId,
        jarigaiKg: calculation.jarigaiKg,
        conversionFactor: calculation.conversionFactor,
        sareePerSet: calculation.sareePerSet,
        totalSarees: calculation.totalSarees,
        setsProduced: calculation.setsProduced,
        remainingSarees: calculation.remainingSarees,
        remainingKg: calculation.remainingKg,
        status: parsed.status || "ALLOCATED",
        notes: parsed.notes?.trim() || null,
      },
      include: {
        unit: {
          select: { id: true, weaverName: true, location: true },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/production/babin error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create babin allocation entry" },
      { status: 500 }
    );
  }
}

