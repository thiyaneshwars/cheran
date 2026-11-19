import { NextResponse } from "next/server";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { executeInternalBankTransfer } from "@/lib/accounting";
import { z } from "zod";

const transferSchema = z.object({
  fromBankAccountId: z.string().min(1),
  toBankAccountId: z.string().min(1),
  amount: z.number().positive(),
  transferDate: z.string().optional(),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid transfer parameters", details: parsed.error.issues }, { status: 400 });
    }

    const { fromBankAccountId, toBankAccountId, amount, transferDate, referenceNo, notes } = parsed.data;

    const result = await executeInternalBankTransfer({
      fromBankAccountId,
      toBankAccountId,
      amount,
      transferDate: transferDate ? new Date(transferDate) : undefined,
      referenceNo,
      notes,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Internal bank transfer executed successfully without changing consolidated balance.",
      transaction: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute transfer" }, { status: 500 });
  }
}
