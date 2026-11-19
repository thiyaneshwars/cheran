import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { sub, round2, mul } from "@/lib/decimal";
import { SectionType, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const updatePowerloomSchema = z.object({
  weaverName: z.string().optional(),
  weaverLocation: z.string().optional().nullable(),
  loomReference: z.string().optional().nullable(),
  noOfPaavu: z.number().min(0).optional(),
  totalMeters: z.number().min(0).optional(),
  wageRate: z.number().min(0).optional(),
  grossWages: z.number().min(0).optional(),
  weftBags: z.number().min(0).optional(),
  weftKg: z.number().min(0).optional(),
  bobbinSets: z.number().min(0).optional(),
  advanceDate: z.string().optional().nullable(),
  advancePaid: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const record = await prisma.powerloomTransaction.findUnique({
      where: { id: params.id },
      include: {
        party: true,
        bankAccount: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Powerloom record not found" }, { status: 404 });
    }

    const settlements = await prisma.settlement.findMany({
      where: {
        section: SectionType.POWERLOOM,
        entityType: "PowerloomTransaction",
        entityId: record.id,
      },
      orderBy: { settlementDate: "desc" },
      include: { bankAccount: true },
    });

    const remBalance = Math.max(0, round2(sub(record.totalAmount, record.amountSettled)));

    return NextResponse.json({
      record: {
        ...record,
        category: record.category || "VETTI",
        advanceDate: record.advanceDate ? record.advanceDate.toISOString() : null,
        totalAmount: round2(record.totalAmount),
        amountSettled: round2(record.amountSettled),
        outstandingAmount: remBalance,
        remainingBalance: remBalance,
        grossWages: round2(record.grossWages || record.totalAmount),
        advancePaid: round2(record.advancePaid || 0),
        settlements,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch record" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const existing = await prisma.powerloomTransaction.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Powerloom record not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updatePowerloomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    const meters = data.totalMeters !== undefined ? data.totalMeters : existing.totalMeters;
    const rate = data.wageRate !== undefined ? data.wageRate : existing.wageRate;
    let gross = data.grossWages !== undefined ? data.grossWages : existing.grossWages;
    if (data.totalMeters !== undefined || data.wageRate !== undefined) {
      gross = round2(mul(meters, rate));
    }

    const adv = data.advancePaid !== undefined ? round2(data.advancePaid) : existing.advancePaid;
    let total = data.totalAmount !== undefined ? round2(data.totalAmount) : existing.totalAmount;
    if (data.totalAmount === undefined && (data.totalMeters !== undefined || data.wageRate !== undefined)) {
      total = Math.max(0, round2(sub(gross, adv)));
    }

    const outstanding = Math.max(0, round2(sub(total, existing.amountSettled)));
    const status =
      outstanding <= 0
        ? PaymentStatus.PAID
        : existing.amountSettled > 0
        ? PaymentStatus.PARTIALLY_PAID
        : PaymentStatus.PENDING;

    const updated = await prisma.powerloomTransaction.update({
      where: { id: params.id },
      data: {
        weaverName: data.weaverName ?? existing.weaverName,
        weaverLocation: data.weaverLocation !== undefined ? data.weaverLocation : existing.weaverLocation,
        loomReference: data.loomReference !== undefined ? data.loomReference : existing.loomReference,
        noOfPaavu: data.noOfPaavu ?? existing.noOfPaavu,
        totalMeters: meters,
        wageRate: rate,
        grossWages: gross,
        weftBags: data.weftBags ?? existing.weftBags,
        weftKg: data.weftKg ?? existing.weftKg,
        bobbinSets: data.bobbinSets ?? existing.bobbinSets,
        advanceDate: data.advanceDate !== undefined ? (data.advanceDate ? new Date(data.advanceDate) : null) : existing.advanceDate,
        advancePaid: adv,
        totalAmount: total,
        outstandingAmount: outstanding,
        paymentStatus: status,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : existing.dueDate,
        notes: data.notes !== undefined ? data.notes : existing.notes,
      },
      include: {
        party: true,
        bankAccount: true,
      },
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update powerloom record" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete powerloom records." }, { status: 403 });
    }

    const existing = await prisma.powerloomTransaction.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Powerloom record not found" }, { status: 404 });
    }

    // Delete associated settlements
    await prisma.settlement.deleteMany({
      where: {
        section: SectionType.POWERLOOM,
        entityType: "PowerloomTransaction",
        entityId: params.id,
      },
    });

    await prisma.powerloomTransaction.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Record deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete record" }, { status: 500 });
  }
}
