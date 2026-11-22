import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";
import { z } from "zod";

const updateHandoverSchema = z.object({
  clothType: z.enum(["VEATTI", "SAREE"]).optional(),
  unitId: z.string().optional().nullable(),
  challanNo: z.string().min(1, "Challan / Order number is required").optional(),
  handoverDate: z.string().optional(),
  meters: z.number().positive("Meters must be greater than zero").optional(),
  pieces: z.number().optional().nullable(),
  recipientDept: z.string().optional(),
  vehicleNo: z.string().optional().nullable(),
  officerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const handover = await prisma.governmentHandoverLog.findUnique({
      where: { id },
      include: {
        unit: {
          select: { id: true, weaverName: true, targetMeters: true, totalProducedMeters: true },
        },
      },
    });

    if (!handover) {
      return NextResponse.json({ error: "Government handover not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...handover,
      meters: round2(handover.meters),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch government handover" },
      { status: 500 }
    );
  }
}

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
    const existing = await prisma.governmentHandoverLog.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Government handover not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateHandoverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const clothType = data.clothType || existing.clothType;
    const challanNo = data.challanNo ? data.challanNo.trim() : existing.challanNo;
    const handoverDate = data.handoverDate ? new Date(data.handoverDate) : existing.handoverDate;
    const meters = data.meters !== undefined ? data.meters : existing.meters;

    let pieces = data.pieces;
    if (pieces === undefined || pieces === null || pieces <= 0) {
      const pieceLen = clothType === "SAREE" ? 5.5 : 3.65;
      pieces = Math.floor(meters / pieceLen);
    }

    const recipientDept = data.recipientDept ? data.recipientDept.trim() : existing.recipientDept;
    const vehicleNo = data.vehicleNo !== undefined ? (data.vehicleNo ? data.vehicleNo.trim() : null) : existing.vehicleNo;
    const officerName = data.officerName !== undefined ? (data.officerName ? data.officerName.trim() : null) : existing.officerName;
    const notes = data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : existing.notes;
    const unitId = data.unitId !== undefined ? (data.unitId || null) : existing.unitId;

    const updated = await prisma.$transaction(async (tx) => {
      const h = await tx.governmentHandoverLog.update({
        where: { id },
        data: {
          clothType,
          unitId,
          challanNo,
          handoverDate,
          meters,
          pieces,
          recipientDept,
          vehicleNo,
          officerName,
          notes,
        },
      });

      // Recalculate old unit if changed
      if (existing.unitId && existing.unitId !== unitId) {
        await syncUnitFinancialsAndTotals(tx, existing.unitId);
      }
      // Recalculate new unit if linked
      if (unitId) {
        await syncUnitFinancialsAndTotals(tx, unitId);
      }

      try {
        await tx.auditLog.create({
          data: {
            action: "GOVT_HANDOVER_UPDATED",
            entityType: "GovernmentHandoverLog",
            entityId: id,
            performedById: user.id,
            details: `Updated Handover Challan #${challanNo}: ${meters}m (${pieces} pcs) of ${clothType}.`,
          },
        });
      } catch (auditErr) {
        console.warn("Audit log skipped:", auditErr);
      }

      return h;
    });

    return NextResponse.json({ success: true, handover: updated });
  } catch (error: any) {
    console.error("Update government handover error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update government handover" },
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
    const existing = await prisma.governmentHandoverLog.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Government handover not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.governmentHandoverLog.delete({
        where: { id },
      });

      // If unit was linked, recalculate its totals
      if (existing.unitId) {
        await syncUnitFinancialsAndTotals(tx, existing.unitId);
      }

      await tx.auditLog.create({
        data: {
          action: "GOVT_HANDOVER_DELETED",
          entityType: "GovernmentHandoverLog",
          entityId: id,
          performedById: user.id,
          details: `Deleted Government Handover of ${existing.meters}m under Challan #${existing.challanNo}.`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Government Handover Challan #${existing.challanNo} deleted successfully`,
    });
  } catch (error: any) {
    console.error("Delete government handover error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete government handover" },
      { status: 500 }
    );
  }
}

