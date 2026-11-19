import { NextResponse } from "next/server";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { getLiquidCashDetails, createLiquidCashEntry } from "@/lib/liquid-cash";
import { z } from "zod";

const createEntrySchema = z.object({
  type: z.enum(["CASH_IN", "CASH_OUT", "ADJUSTMENT"]),
  amount: z.number().nonnegative("Amount must be non-negative"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
  bankAccountId: z.string().optional().nullable(),
  voucherNo: z.string().optional(),
  entryDate: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getLiquidCashDetails();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch liquid cash data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json(
        { error: "Unauthorized: Insufficient permissions to update liquid cash." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid liquid cash input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { type, amount, category, description, notes, bankAccountId, voucherNo, entryDate } =
      parsed.data;

    const result = await createLiquidCashEntry({
      type,
      amount,
      category,
      description,
      notes,
      bankAccountId: bankAccountId || undefined,
      voucherNo,
      entryDate: entryDate ? new Date(entryDate) : undefined,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Liquid cash balance updated successfully.",
      result,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update liquid cash" },
      { status: 500 }
    );
  }
}
