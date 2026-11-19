import { NextResponse } from "next/server";
import { getCurrentUser, canReverseOrDelete } from "@/lib/auth";
import { reverseTransaction } from "@/lib/accounting";
import { z } from "zod";

const reverseSchema = z.object({
  reason: z.string().min(3),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || !canReverseOrDelete(user.role)) {
      return NextResponse.json({ error: "Unauthorized: Only Admin and Accountants can reverse transactions." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reverseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Reason for reversal is required." }, { status: 400 });
    }

    const reversal = await reverseTransaction(params.id, parsed.data.reason, user.id);

    return NextResponse.json({
      success: true,
      message: "Transaction reversed successfully and all balances restored.",
      reversal,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reverse transaction" }, { status: 500 });
  }
}
