import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { z } from "zod";

const createWeaverSchema = z.object({
  name: z.string().min(2, "Weaver / Powerloom name is required"),
  location: z.string().min(2, "Location is required"),
  category: z.enum(["VETTI", "SAREE"]).default("VETTI"),
  phone: z.string().optional().nullable(),
  loomCount: z.number().int().min(1).default(1),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: any = { isActive: true };
    if (category && category !== "ALL") {
      where.category = category.toUpperCase();
    }

    // Sync any production units that haven't been added to PowerloomWeaver yet
    const productionUnits = await prisma.productionUnit.findMany({
      orderBy: { createdAt: "desc" },
    });

    for (const pu of productionUnits) {
      if (!pu.weaverName || !pu.weaverName.trim()) continue;
      const normalizedName = pu.weaverName.trim();
      const existing = await prisma.powerloomWeaver.findFirst({
        where: {
          name: { equals: normalizedName },
          category: pu.clothType,
        },
      });

      if (!existing) {
        await prisma.powerloomWeaver.create({
          data: {
            name: normalizedName,
            location: pu.location?.trim() || "Powerloom Production Unit",
            category: pu.clothType,
            loomCount: pu.machineCount || 1,
            notes: `Auto-registered from ${pu.clothType} Production Register`,
            isActive: true,
          },
        });
      }
    }

    const weavers = await prisma.powerloomWeaver.findMany({
      where,
      orderBy: { name: "asc" },
    });

    // Fetch all transactions to compute each weaver's advance balance
    const txns = await prisma.powerloomTransaction.findMany({
      select: {
        weaverName: true,
        advancePaid: true,
        grossWages: true,
        totalAmount: true,
        amountSettled: true,
      },
    });

    const settlements = await prisma.settlement.findMany({
      where: {
        section: "POWERLOOM",
        paymentMethod: "EXISTING_ADVANCE",
      },
      select: {
        entityId: true,
        amount: true,
      },
    });

    const totalAdvanceAdjustedInSettlements = settlements.reduce((sum, s) => sum + s.amount, 0);

    const enriched = weavers.map((w) => {
      const weaverKey = w.name.trim().toLowerCase();
      const weaverTxns = txns.filter(
        (t) => t.weaverName && t.weaverName.trim().toLowerCase().includes(weaverKey)
      );

      // Standalone advances given (where grossWages === 0 and advancePaid > 0)
      const standaloneAdv = weaverTxns
        .filter((t) => (t.grossWages || 0) <= 0)
        .reduce((sum, t) => sum + (t.advancePaid || 0), 0);

      // Advances already deducted inside production contracts (where grossWages > 0)
      const contractAdvDeductions = weaverTxns
        .filter((t) => (t.grossWages || 0) > 0)
        .reduce((sum, t) => sum + (t.advancePaid || 0), 0);

      const availableAdvance = Math.max(0, standaloneAdv - contractAdvDeductions);

      // Match production unit for live paavu and meter numbers
      const matchingUnits = productionUnits.filter(
        (u) => u.weaverName && u.weaverName.trim().toLowerCase() === weaverKey
      );
      const latestUnit = matchingUnits[0];
      const totalPaavu = matchingUnits.reduce((sum, u) => sum + (u.paavuCount || 0), 0);
      const totalMeters = matchingUnits.reduce((sum, u) => sum + (u.paavuMeters || 0), 0);

      return {
        ...w,
        loomCount: w.loomCount || latestUnit?.machineCount || 1,
        paavuCount: totalPaavu || latestUnit?.paavuCount || 0,
        paavuMeters: totalMeters || latestUnit?.paavuMeters || 0,
        unitId: latestUnit?.id || null,
        isFromProduction: matchingUnits.length > 0,
        totalAdvanceGiven: standaloneAdv,
        advanceApplied: contractAdvDeductions,
        availableAdvance,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch powerloom weavers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createWeaverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, location, category, phone, loomCount, notes } = parsed.data;

    const weaver = await prisma.powerloomWeaver.create({
      data: {
        name,
        location,
        category,
        phone: phone || null,
        loomCount: loomCount || 1,
        notes: notes || null,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Powerloom Weaver '${name}' (${category}) registered successfully!`,
        weaver,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to register powerloom weaver" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Weaver ID is required" }, { status: 400 });
    }

    const weaver = await prisma.powerloomWeaver.findUnique({ where: { id } });
    if (!weaver) {
      return NextResponse.json({ error: "Weaver not found" }, { status: 404 });
    }

    await prisma.powerloomWeaver.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Powerloom '${weaver.name}' removed successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to remove powerloom weaver" },
      { status: 500 }
    );
  }
}

