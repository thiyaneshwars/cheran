import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import { calculateVaravuAmount, syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

const varavuSchema = z.object({
  unitId: z.string().min(1, "Unit ID is required"),
  transactionDate: z.string().optional().nullable(),
  varavuType: z.string().default("PAAVU_PRODUCTION"),
  paavuKg: z.number().min(0, "Paavu KG/Quantity must be non-negative"),
  rate: z.number().min(0, "Rate must be non-negative"),
  rateUnit: z.enum(["PER_KG", "PER_METER"]).default("PER_KG"),
  paymentMode: z.string().default("CASH"),
  referenceNo: z.string().optional().nullable(),
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
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const entries = await prisma.veattiVaravu.findMany({
      where,
      include: {
        unit: {
          select: { id: true, weaverName: true, individualRate: true, rateUnit: true },
        },
      },
      orderBy: { transactionDate: "desc" },
    });

    const formatted = entries.map((e) => ({
      ...e,
      paavuKg: round2(e.paavuKg),
      rate: round2(e.rate),
      amount: round2(e.amount),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch varavu entries" },
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
    const parsed = varavuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();

    // Automatic calculation: Varavu Amount = Paavu KG × Applicable Rate
    const amount = calculateVaravuAmount(data.paavuKg, data.rate);

    const result = await prisma.$transaction(async (tx) => {
      const varavu = await tx.veattiVaravu.create({
        data: {
          unitId: data.unitId,
          transactionDate,
          varavuType: data.varavuType,
          paavuKg: data.paavuKg,
          rate: data.rate,
          rateUnit: data.rateUnit,
          amount,
          paymentMode: data.paymentMode,
          referenceNo: data.referenceNo?.trim() || null,
          remarks: data.remarks?.trim() || null,
        },
        include: { unit: true },
      });

      // Synchronize unit's financial tally
      await syncUnitFinancialsAndTotals(tx, data.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: data.unitId,
          entityType: "VARAVU",
          entityId: varavu.id,
          action: "CREATE",
          newValues: JSON.stringify({
            paavuKg: data.paavuKg,
            rate: data.rate,
            amount,
            type: data.varavuType,
          }),
          performedById: user.id,
          details: `Added Varavu: ${data.paavuKg} KG @ ₹${data.rate} = ₹${amount} for ${varavu.unit?.weaverName}`,
        },
      });

      return varavu;
    });

    return NextResponse.json({ success: true, varavu: result }, { status: 201 });
  } catch (error: any) {
    console.error("Create varavu error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create varavu entry" },
      { status: 500 }
    );
  }
}

