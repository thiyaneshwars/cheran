import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  calculateBabinSetFinancials,
  BABIN_DEFAULT_RATE_PER_SET,
  BABIN_DEFAULT_WAGE_PER_SET,
  BABIN_DEFAULT_PROFIT_PER_SET,
} from "@/lib/babin-calculations";

const updateSchema = z.object({
  date: z.string().optional(),
  powerloomName: z.string().min(1).optional(),
  setsGiven: z.number().int().positive().optional(),
  ratePerSet: z.number().positive().optional(),
  wagePerSet: z.number().positive().optional(),
  profitPerSet: z.number().positive().optional(),
  settledAmount: z.number().min(0).optional(),
  unitId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.babinSetDelivery.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Babin delivery record not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const setsGiven = parsed.data.setsGiven ?? existing.setsGiven;
    const ratePerSet = parsed.data.ratePerSet ?? existing.ratePerSet ?? BABIN_DEFAULT_RATE_PER_SET;
    const wagePerSet = parsed.data.wagePerSet ?? existing.wagePerSet ?? BABIN_DEFAULT_WAGE_PER_SET;
    const profitPerSet = parsed.data.profitPerSet ?? existing.profitPerSet ?? BABIN_DEFAULT_PROFIT_PER_SET;
    const settledAmount = parsed.data.settledAmount ?? existing.settledAmount;

    const fin = calculateBabinSetFinancials(
      setsGiven,
      settledAmount,
      ratePerSet,
      wagePerSet,
      profitPerSet
    );

    const updated = await prisma.babinSetDelivery.update({
      where: { id },
      data: {
        date: parsed.data.date ? new Date(parsed.data.date) : existing.date,
        powerloomName: parsed.data.powerloomName?.trim() ?? existing.powerloomName,
        unitId: parsed.data.unitId !== undefined ? parsed.data.unitId : existing.unitId,
        setsGiven: fin.setsGiven,
        ratePerSet: fin.ratePerSet,
        wagePerSet: fin.wagePerSet,
        profitPerSet: fin.profitPerSet,
        totalAmount: fin.totalAmount,
        totalWage: fin.totalWage,
        totalProfit: fin.totalProfit,
        settledAmount: fin.settledAmount,
        yetToSettle: fin.yetToSettle,
        paymentStatus: fin.paymentStatus,
        notes: parsed.data.notes !== undefined ? (parsed.data.notes?.trim() || null) : existing.notes,
      },
      include: {
        unit: {
          select: {
            id: true,
            weaverName: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/production/babin/delivery/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update Babin delivery" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.babinSetDelivery.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Babin delivery record not found" },
        { status: 404 }
      );
    }

    await prisma.babinSetDelivery.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Babin delivery for ${existing.powerloomName} (${existing.setsGiven} sets) deleted successfully.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/production/babin/delivery/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete Babin delivery" },
      { status: 500 }
    );
  }
}

