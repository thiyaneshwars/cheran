import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";
import { syncUnitFinancialsAndTotals } from "@/lib/veatti-calculations";

const handoverSchema = z.object({
  clothType: z.enum(["VEATTI", "SAREE"]),
  unitId: z.string().optional().nullable(),
  challanNo: z.string().min(1, "Challan / Order number is required"),
  handoverDate: z.string().optional(),
  meters: z.number().positive("Meters must be greater than zero"),
  recipientDept: z.string().default("Tamil Nadu Handlooms & Textiles / Co-optex"),
  vehicleNo: z.string().optional().nullable(),
  officerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clothType = searchParams.get("clothType");

    const handovers = await prisma.governmentHandoverLog.findMany({
      where: clothType ? { clothType } : undefined,
      include: {
        unit: {
          select: { id: true, weaverName: true, targetMeters: true, totalProducedMeters: true },
        },
      },
      orderBy: { handoverDate: "desc" },
    });

    return NextResponse.json(
      handovers.map((h) => ({
        ...h,
        meters: round2(h.meters),
      }))
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch government handovers" },
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
    const parsed = handoverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const handoverDate = data.handoverDate ? new Date(data.handoverDate) : new Date();

    const handover = await prisma.governmentHandoverLog.create({
      data: {
        clothType: data.clothType,
        unitId: data.unitId || null,
        challanNo: data.challanNo.trim(),
        handoverDate,
        meters: data.meters,
        recipientDept: data.recipientDept.trim(),
        vehicleNo: data.vehicleNo?.trim() || null,
        officerName: data.officerName?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    // If unitId is provided, sync unit totals
    if (data.unitId) {
      await prisma.$transaction(async (tx) => {
        await syncUnitFinancialsAndTotals(tx, data.unitId!);
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "GOVT_HANDOVER_RECORDED",
        entityType: "GovernmentHandoverLog",
        entityId: handover.id,
        performedById: user.id,
        details: `Handed over ${data.meters}m of ${data.clothType} to ${data.recipientDept} under Challan #${data.challanNo}.`,
      },
    });

    return NextResponse.json({ success: true, handover }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record government handover" },
      { status: 500 }
    );
  }
}
