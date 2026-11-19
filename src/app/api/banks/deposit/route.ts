import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageBankAccounts, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { round2, add } from "@/lib/decimal";
import { SectionType, TransactionType, Direction } from "@prisma/client";
import { z } from "zod";

const depositSchema = z.object({
  bankAccountId: z.string().min(1, "Bank account is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  transactionDate: z.string().optional(),
  paymentMethod: z.string().default("CASH_DEPOSIT"),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!canManageBankAccounts(user.role) && !canWriteTransactions(user.role))) {
      return NextResponse.json(
        { error: "Unauthorized: Insufficient permissions to add bank funds." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid deposit details", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { bankAccountId, amount, transactionDate, paymentMethod, referenceNo, notes } =
      parsed.data;
    const depositAmt = round2(amount);

    const bank = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bank) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const dDate = transactionDate ? new Date(transactionDate) : new Date();
    const dRef = referenceNo || generateRef("DEP");

    // Post Double-entry transaction:
    // Debit Bank 1020 (cash inflow into bank account)
    // Credit Capital / Treasury reserve 3000
    const { transaction } = await postTransaction({
      referenceNo: `TXN-${dRef}`,
      transactionDate: dDate,
      section: SectionType.GENERAL,
      type: TransactionType.PAYMENT_RECEIVED,
      direction: Direction.DEBIT, // Debit Bank increases bank balance
      amount: depositAmt,
      counterparty: "Treasury Deposit",
      bankAccountId: bank.id,
      paymentMethod,
      notes: notes || `Direct fund addition to ${bank.accountName}`,
      userId: user.id,
      lines: [
        {
          accountCode: "1020",
          accountName: `Bank: ${bank.accountName}`,
          section: SectionType.GENERAL,
          debit: depositAmt,
          credit: 0,
        },
        {
          accountCode: "3000",
          accountName: "Member Capital & General Reserves",
          section: SectionType.GENERAL,
          debit: 0,
          credit: depositAmt,
        },
      ],
    });

    const updatedBank = await prisma.bankAccount.findUnique({
      where: { id: bank.id },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully added ₹${depositAmt.toLocaleString("en-IN")} to ${bank.accountName}. New balance: ₹${(updatedBank?.currentBalance || 0).toLocaleString("en-IN")}`,
      bank: updatedBank,
      transaction,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process deposit" },
      { status: 500 }
    );
  }
}
