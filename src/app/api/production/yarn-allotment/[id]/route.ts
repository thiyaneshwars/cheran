import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function safeFloat(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? fallback : num;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: any = {};
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    body = await request.json();

    const allotment = await prisma.govtYarnAllotment.update({
      where: { id },
      data: {
        allotmentNo: body.allotmentNo !== undefined ? body.allotmentNo?.trim() : undefined,
        allotmentDate: body.allotmentDate ? new Date(body.allotmentDate) : undefined,
        schemeName: body.schemeName !== undefined ? body.schemeName : undefined,
        supplierDept: body.supplierDept !== undefined ? body.supplierDept : undefined,
        dhothiWarpKg: body.dhothiWarpKg !== undefined ? safeFloat(body.dhothiWarpKg, 0) : undefined,
        dhothiWeftKg: body.dhothiWeftKg !== undefined ? safeFloat(body.dhothiWeftKg, 0) : undefined,
        dhothiBorderKg: body.dhothiBorderKg !== undefined ? safeFloat(body.dhothiBorderKg, 0) : undefined,
        sareeWarpKg: body.sareeWarpKg !== undefined ? safeFloat(body.sareeWarpKg, 0) : undefined,
        sareeWeftKg: body.sareeWeftKg !== undefined ? safeFloat(body.sareeWeftKg, 0) : undefined,
        sareeBorderKg: body.sareeBorderKg !== undefined ? safeFloat(body.sareeBorderKg, 0) : undefined,
        yarnRatePerKg: body.yarnRatePerKg !== undefined ? safeFloat(body.yarnRatePerKg, 0) : undefined,
        bagPrice: body.bagPrice !== undefined ? safeFloat(body.bagPrice, 0) : undefined,
        dhothiGovtRate: body.dhothiGovtRate !== undefined ? safeFloat(body.dhothiGovtRate, 0) : undefined,
        sareeGovtRate: body.sareeGovtRate !== undefined ? safeFloat(body.sareeGovtRate, 0) : undefined,
        dhothiWeaverRate: body.dhothiWeaverRate !== undefined ? safeFloat(body.dhothiWeaverRate, 19) : undefined,
        sareeWeaverRate: body.sareeWeaverRate !== undefined ? safeFloat(body.sareeWeaverRate, 42) : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    });

    return NextResponse.json({ success: true, allotment });
  } catch (error: any) {
    console.error("PUT /api/production/yarn-allotment/[id] error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: `An allotment with number "${body.allotmentNo}" already exists.` },
        { status: 409 }
      );
    }
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
