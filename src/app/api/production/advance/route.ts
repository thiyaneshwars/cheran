import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import { syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

const advanceSchema = z.object({
  unitId: z.string().min(1, "Unit ID is required"),
  advanceDate: z.string().optional().nullable(),
  amount: z.number().min(0, "Advance amount must be non-negative"),
  paymentMode: z.string().default("CASH"),
  referenceNo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
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
      where.advanceDate = {};
      if (startDate) where.advanceDate.gte = new Date(startDate);
      if (endDate) where.advanceDate.lte = new Date(endDate);
    }

    const entries = await prisma.veattiAdvance.findMany({
      where,
      include: {
        unit: {
          select: { id: true, weaverName: true, totalAdvancePaid: true, currentBalance: true },
        },
      },
      orderBy: { advanceDate: "desc" },
    });

    const formatted = entries.map((e) => ({
      ...e,
      amount: round2(e.amount),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch advance entries" },
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
    const parsed = advanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const advanceDate = data.advanceDate ? new Date(data.advanceDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const advance = await tx.veattiAdvance.create({
        data: {
          unitId: data.unitId,
          advanceDate,
          amount: data.amount,
          paymentMode: data.paymentMode,
          referenceNo: data.referenceNo?.trim() || null,
          description: data.description?.trim() || null,
        },
        include: { unit: true },
      });

      // Synchronize unit's financial tally
      await syncUnitFinancialsAndTotals(tx, data.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: data.unitId,
          entityType: "ADVANCE",
          entityId: advance.id,
          action: "CREATE",
          newValues: JSON.stringify({
            amount: data.amount,
            mode: data.paymentMode,
            ref: data.referenceNo,
          }),
          performedById: user.id,
          details: `Paid Advance: ₹${data.amount} via ${data.paymentMode} to ${advance.unit?.weaverName}`,
        },
      });

      return advance;
    });

    return NextResponse.json({ success: true, advance: result }, { status: 201 });
  } catch (error: any) {
    console.error("Create advance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create advance entry" },
      { status: 500 }
    );
  }
}

