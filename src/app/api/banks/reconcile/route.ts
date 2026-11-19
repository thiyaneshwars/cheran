import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageBankAccounts } from "@/lib/auth";
import { sub, round2 } from "@/lib/decimal";
import { z } from "zod";

const reconcileSchema = z.object({
  bankAccountId: z.string().min(1),
  statementDate: z.string(),
  statementBalance: z.number(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageBankAccounts(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reconcileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const { bankAccountId, statementDate, statementBalance, notes } = parsed.data;

    const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bank) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const difference = round2(sub(statementBalance, bank.currentBalance));
    const status = difference === 0 ? "MATCHED" : "DISCREPANCY";

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        statementDate: new Date(statementDate),
        statementBalance: round2(statementBalance),
        bookBalance: round2(bank.currentBalance),
        difference,
        status,
        notes,
      },
    });

    // Update statement balance on bank account
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { statementBalance: round2(statementBalance) },
    });

    return NextResponse.json({ success: true, reconciliation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Reconciliation failed" }, { status: 500 });
  }
}
