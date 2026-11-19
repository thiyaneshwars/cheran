import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { calculateBabinAllocation } from "@/lib/babin-calculations";

const updateBabinSchema = z.object({
  date: z.string().optional().nullable(),
  powerloomName: z.string().min(1, "Powerloom name is required").optional(),
  jarigaiKg: z.number().positive("Jarigai KG must be greater than zero").optional(),
  unitId: z.string().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBabinSchema.parse({
      ...body,
      jarigaiKg: body.jarigaiKg !== undefined ? Number(body.jarigaiKg) : undefined,
    });

    const existing = await prisma.babinEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Babin entry not found" }, { status: 404 });
    }

    const effectiveKg = parsed.jarigaiKg !== undefined ? parsed.jarigaiKg : existing.jarigaiKg;
    const calc = calculateBabinAllocation(effectiveKg);

    const updated = await prisma.babinEntry.update({
      where: { id },
      data: {
        date: parsed.date ? new Date(parsed.date) : existing.date,
        powerloomName: parsed.powerloomName ? parsed.powerloomName.trim() : existing.powerloomName,
        unitId: parsed.unitId !== undefined ? parsed.unitId : existing.unitId,
        jarigaiKg: calc.jarigaiKg,
        totalSarees: calc.totalSarees,
        setsProduced: calc.setsProduced,
        remainingSarees: calc.remainingSarees,
        remainingKg: calc.remainingKg,
        status: parsed.status || existing.status,
        notes: parsed.notes !== undefined ? (parsed.notes?.trim() || null) : existing.notes,
      },
      include: {
        unit: {
          select: { id: true, weaverName: true, location: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/production/babin/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update babin entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.babinEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Babin entry not found" }, { status: 404 });
    }

    await prisma.babinEntry.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Babin allocation entry for ${existing.powerloomName} deleted successfully.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/production/babin/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete babin entry" },
      { status: 500 }
    );
  }
}

