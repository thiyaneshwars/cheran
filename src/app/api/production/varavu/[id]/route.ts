import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import { calculateVaravuAmount, syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

const updateVaravuSchema = z.object({
  transactionDate: z.string().optional().nullable(),
  varavuType: z.string().optional(),
  paavuKg: z.number().min(0).optional(),
  rate: z.number().min(0).optional(),
  rateUnit: z.enum(["PER_KG", "PER_METER"]).optional(),
  paymentMode: z.string().optional(),
  referenceNo: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const existing = await prisma.veattiVaravu.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Varavu entry not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateVaravuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const paavuKg = data.paavuKg ?? existing.paavuKg;
    const rate = data.rate ?? existing.rate;
    const amount = calculateVaravuAmount(paavuKg, rate);
    const transactionDate = data.transactionDate ? new Date(data.transactionDate) : existing.transactionDate;

    const updated = await prisma.$transaction(async (tx) => {
      const varavu = await tx.veattiVaravu.update({
        where: { id },
        data: {
          transactionDate,
          ...(data.varavuType ? { varavuType: data.varavuType } : {}),
          paavuKg,
          rate,
          ...(data.rateUnit ? { rateUnit: data.rateUnit } : {}),
          amount,
          ...(data.paymentMode ? { paymentMode: data.paymentMode } : {}),
          ...(data.referenceNo !== undefined ? { referenceNo: data.referenceNo?.trim() || null } : {}),
          ...(data.remarks !== undefined ? { remarks: data.remarks?.trim() || null } : {}),
        },
      });

      // Synchronize unit's financial tally
      await syncUnitFinancialsAndTotals(tx, existing.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId,
          entityType: "VARAVU",
          entityId: id,
          action: "UPDATE",
          oldValues: JSON.stringify({
            paavuKg: existing.paavuKg,
            rate: existing.rate,
            amount: existing.amount,
          }),
          newValues: JSON.stringify({
            paavuKg,
            rate,
            amount,
          }),
          performedById: user.id,
          details: `Updated Varavu: ${existing.paavuKg}kg @ ₹${existing.rate} (₹${existing.amount}) -> ${paavuKg}kg @ ₹${rate} (₹${amount}) for ${existing.unit?.weaverName}`,
        },
      });

      return varavu;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update varavu error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update varavu entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const existing = await prisma.veattiVaravu.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Varavu entry not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.veattiVaravu.delete({ where: { id } });

      // Synchronize unit's financial tally
      await syncUnitFinancialsAndTotals(tx, existing.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId,
          entityType: "VARAVU",
          entityId: id,
          action: "DELETE",
          oldValues: JSON.stringify(existing),
          performedById: user.id,
          details: `Deleted Varavu entry of ₹${existing.amount} (${existing.paavuKg}kg @ ₹${existing.rate}) for ${existing.unit?.weaverName}`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Varavu entry deleted successfully" });
  } catch (error: any) {
    console.error("Delete varavu error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete varavu entry" },
      { status: 500 }
    );
  }
}

