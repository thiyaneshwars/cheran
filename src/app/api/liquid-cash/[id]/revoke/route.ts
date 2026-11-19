import { NextResponse } from "next/server";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { revokeLiquidCashEntry } from "@/lib/liquid-cash";
import { z } from "zod";

const revokeSchema = z.object({
  reason: z.string().min(3, "Reason for revocation must be at least 3 characters"),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json(
        { error: "Unauthorized: Insufficient permissions to revoke liquid cash transactions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Reason for revocation is required.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await revokeLiquidCashEntry(params.id, parsed.data.reason, user.id);

    return NextResponse.json({
      success: true,
      message: "Liquid cash transaction revoked and balance restored safely!",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to revoke liquid cash transaction" },
      { status: 500 }
    );
  }
}
