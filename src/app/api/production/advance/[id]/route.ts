import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import { syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

const updateAdvanceSchema = z.object({
  advanceDate: z.string().optional().nullable(),
  amount: z.number().min(0).optional(),
  paymentMode: z.string().optional(),
  referenceNo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
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
    const existing = await prisma.veattiAdvance.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Advance entry not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateAdvanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const amount = data.amount ?? existing.amount;
    const advanceDate = data.advanceDate ? new Date(data.advanceDate) : existing.advanceDate;

    const updated = await prisma.$transaction(async (tx) => {
      const adv = await tx.veattiAdvance.update({
        where: { id },
        data: {
          advanceDate,
          amount,
          ...(data.paymentMode ? { paymentMode: data.paymentMode } : {}),
          ...(data.referenceNo !== undefined ? { referenceNo: data.referenceNo?.trim() || null } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        },
      });

      // Synchronize unit's financial tally
      await syncUnitFinancialsAndTotals(tx, existing.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId,
          entityType: "ADVANCE",
          entityId: id,
          action: "UPDATE",
          oldValues: JSON.stringify({ amount: existing.amount, mode: existing.paymentMode }),
          newValues: JSON.stringify({ amount, mode: data.paymentMode || existing.paymentMode }),
          performedById: user.id,
          details: `Updated Advance: ₹${existing.amount} -> ₹${amount} for ${existing.unit?.weaverName}`,
        },
      });

      return adv;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update advance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update advance entry" },
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
    const existing = await prisma.veattiAdvance.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Advance entry not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.veattiAdvance.delete({ where: { id } });

      // Synchronize unit's financial tally
      await syncUnitFinancialsAndTotals(tx, existing.unitId);

      await tx.veattiAuditLog.create({
        data: {
          unitId: existing.unitId,
          entityType: "ADVANCE",
          entityId: id,
          action: "DELETE",
          oldValues: JSON.stringify(existing),
          performedById: user.id,
          details: `Deleted Advance payment of ₹${existing.amount} for ${existing.unit?.weaverName}`,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Advance entry deleted successfully" });
  } catch (error: any) {
    console.error("Delete advance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete advance entry" },
      { status: 500 }
    );
  }
}

