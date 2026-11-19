import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const loadSchema = z.object({
  machineNumber: z.string().min(1, "Machine / Loom number is required"),
  notes: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const paavu = await prisma.paavuRecord.findUnique({ where: { id } });
    if (!paavu) {
      return NextResponse.json({ error: "Paavu record not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = loadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid machine number" },
        { status: 400 }
      );
    }

    const updated = await prisma.paavuRecord.update({
      where: { id },
      data: {
        machineNumber: parsed.data.machineNumber.trim(),
        status: "RUNNING",
        loadedAt: new Date(),
        notes: parsed.data.notes?.trim() || paavu.notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "PAAVU_LOADED",
        entityType: "PaavuRecord",
        entityId: id,
        performedById: user.id,
        details: `Loaded paavu "${updated.paavuNumber}" (${updated.paavuMeters}m) into machine "${updated.machineNumber}". Status moved to RUNNING.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Paavu ${updated.paavuNumber} successfully loaded onto ${updated.machineNumber}`,
      paavu: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load paavu onto machine" },
      { status: 500 }
    );
  }
}
