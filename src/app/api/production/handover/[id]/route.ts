import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

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

