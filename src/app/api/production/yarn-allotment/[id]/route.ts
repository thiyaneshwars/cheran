import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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

    const allotment = await prisma.govtYarnAllotment.update({
      where: { id },
      data: {
        allotmentNo: body.allotmentNo?.trim(),
        allotmentDate: body.allotmentDate ? new Date(body.allotmentDate) : undefined,
        schemeName: body.schemeName,
        supplierDept: body.supplierDept,
        dhothiWarpKg: body.dhothiWarpKg !== undefined ? parseFloat(body.dhothiWarpKg) : undefined,
        dhothiWeftKg: body.dhothiWeftKg !== undefined ? parseFloat(body.dhothiWeftKg) : undefined,
        dhothiBorderKg: body.dhothiBorderKg !== undefined ? parseFloat(body.dhothiBorderKg) : undefined,
        sareeWarpKg: body.sareeWarpKg !== undefined ? parseFloat(body.sareeWarpKg) : undefined,
        sareeWeftKg: body.sareeWeftKg !== undefined ? parseFloat(body.sareeWeftKg) : undefined,
        sareeBorderKg: body.sareeBorderKg !== undefined ? parseFloat(body.sareeBorderKg) : undefined,
        yarnRatePerKg: body.yarnRatePerKg !== undefined ? parseFloat(body.yarnRatePerKg) : undefined,
        bagPrice: body.bagPrice !== undefined ? parseFloat(body.bagPrice) : undefined,
        dhothiGovtRate: body.dhothiGovtRate !== undefined ? parseFloat(body.dhothiGovtRate) : undefined,
        sareeGovtRate: body.sareeGovtRate !== undefined ? parseFloat(body.sareeGovtRate) : undefined,
        dhothiWeaverRate: body.dhothiWeaverRate !== undefined ? parseFloat(body.dhothiWeaverRate) : undefined,
        sareeWeaverRate: body.sareeWeaverRate !== undefined ? parseFloat(body.sareeWeaverRate) : undefined,
        notes: body.notes,
      },
    });

    return NextResponse.json({ success: true, allotment });
  } catch (error: any) {
    console.error("PUT /api/production/yarn-allotment/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update yarn allotment" },
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
    await prisma.govtYarnAllotment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Allotment deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/production/yarn-allotment/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete yarn allotment" },
      { status: 500 }
    );
  }
}
