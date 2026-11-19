import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { add, sub, round2 } from "@/lib/decimal";
import { createLiquidCashEntry } from "@/lib/liquid-cash";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const settleSchema = z.object({
  amount: z.number().positive("Settlement amount must be greater than zero"),
  bankAccountId: z.string().optional().nullable(),
  paymentMethod: z.string().default("BANK_TRANSFER"), // "BANK_TRANSFER" | "LIQUID_CASH" | "CHEQUE" | "UPI" | "EXISTING_ADVANCE"
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  settlementDate: z.string().optional(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = settleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settlement data", details: parsed.error.issues }, { status: 400 });
    }

    const { amount, referenceNo, notes, settlementDate } = parsed.data;
    let { bankAccountId, paymentMethod } = parsed.data;
    const settleAmt = round2(amount);

    if (bankAccountId === "society_liquid_cash") {
      paymentMethod = "LIQUID_CASH";
    }

    const record = await prisma.powerloomTransaction.findUnique({
      where: { id: params.id },
      include: { party: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Powerloom contract not found" }, { status: 404 });
    }

    if (settleAmt > record.outstandingAmount) {
      return NextResponse.json({
        error: `Settlement amount (₹${settleAmt}) cannot exceed outstanding amount (₹${record.outstandingAmount}).`,
      }, { status: 400 });
    }

    const sDate = settlementDate ? new Date(settlementDate) : new Date();
    const sRef = referenceNo || generateRef("SET");
    const counterpartyName =
      record.weaverName || record.party?.name || `${record.category || "Powerloom"} Weaving Due`;

    let transactionId: string | null = null;
    let successMessage = "";

    if (paymentMethod === "LIQUID_CASH") {
      // 1. LIQUID CASH SETTLEMENT: Check Liquid Cash balance
      const liquidAccount = await prisma.liquidCashAccount.findUnique({
        where: { id: "society_liquid_cash" },
      });
      const currentCashBalance = liquidAccount?.currentBalance || 0;
      if (currentCashBalance < settleAmt) {
        return NextResponse.json(
          {
            error: `Insufficient Liquid Cash balance (₹${currentCashBalance.toLocaleString(
              "en-IN"
            )}) for settlement of ₹${settleAmt.toLocaleString("en-IN")}.`,
          },
          { status: 400 }
        );
      }

      // Record Cash Out from Society Liquid Cash
      await createLiquidCashEntry({
        type: "CASH_OUT",
        amount: settleAmt,
        category: "POWERLOOM_PAYMENT",
        description: `Powerloom Settlement: ${counterpartyName} (${record.transactionNumber})`,
        notes: notes || undefined,
        userId: user.id,
        entryDate: sDate,
      });

      // Double-entry: Debit AP 2000, Credit Liquid Cash 1010
      const { transaction } = await postTransaction({
        referenceNo: `TXN-${sRef}`,
        transactionDate: sDate,
        section: SectionType.POWERLOOM,
        type: TransactionType.PAYMENT_PAID,
        direction: Direction.CREDIT,
        amount: settleAmt,
        counterparty: counterpartyName,
        paymentMethod: "LIQUID_CASH",
        notes: `Liquid Cash settlement for ${record.category || "Powerloom"} contract ${record.transactionNumber}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "2000",
            accountName: "Accounts Payable (Powerloom Dues)",
            section: SectionType.POWERLOOM,
            debit: settleAmt,
            credit: 0,
          },
          {
            accountCode: "1010",
            accountName: "Society Liquid Cash",
            section: SectionType.POWERLOOM,
            debit: 0,
            credit: settleAmt,
          },
        ],
      });
      transactionId = transaction.id;
      bankAccountId = null;
      successMessage = `Settlement of ₹${settleAmt.toLocaleString(
        "en-IN"
      )} recorded from Society Liquid Cash. Balance deducted directly.`;
    } else if (paymentMethod === "EXISTING_ADVANCE") {
      // 2. WEAVER ADVANCE ADJUSTMENT: Deduct from previously given advance
      const { transaction } = await postTransaction({
        referenceNo: `TXN-${sRef}`,
        transactionDate: sDate,
        section: SectionType.POWERLOOM,
        type: TransactionType.PAYMENT_PAID,
        direction: Direction.DEBIT,
        amount: settleAmt,
        counterparty: counterpartyName,
        paymentMethod: "EXISTING_ADVANCE",
        notes: `Adjusted against existing advance for ${counterpartyName} (${record.transactionNumber}): ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "2000",
            accountName: "Accounts Payable (Powerloom Dues)",
            section: SectionType.POWERLOOM,
            debit: settleAmt,
            credit: 0,
          },
          {
            accountCode: "2000",
            accountName: "Weaver Advance Adjustment",
            section: SectionType.POWERLOOM,
            debit: 0,
            credit: settleAmt,
          },
        ],
      });
      transactionId = transaction.id;
      bankAccountId = null;
      successMessage = `Advance adjustment of ₹${settleAmt.toLocaleString(
        "en-IN"
      )} applied against ${record.transactionNumber}. Pending balance reduced accordingly.`;
    } else {
      // 3. BANK SETTLEMENT: Verify bank account
      if (!bankAccountId) {
        return NextResponse.json({ error: "Please select a bank account to pay from." }, { status: 400 });
      }

      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) {
        return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
      }

      const { transaction } = await postTransaction({
        referenceNo: `TXN-${sRef}`,
        transactionDate: sDate,
        section: SectionType.POWERLOOM,
        type: TransactionType.PAYMENT_PAID,
        direction: Direction.CREDIT,
        amount: settleAmt,
        counterparty: counterpartyName,
        bankAccountId: bank.id,
        paymentMethod,
        notes: `Settlement for ${record.category || "Powerloom"} contract ${record.transactionNumber}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "2000",
            accountName: "Accounts Payable (Powerloom Dues)",
            section: SectionType.POWERLOOM,
            debit: settleAmt,
            credit: 0,
          },
          {
            accountCode: "1020",
            accountName: `Bank: ${bank.accountName}`,
            section: SectionType.POWERLOOM,
            debit: 0,
            credit: settleAmt,
          },
        ],
      });
      transactionId = transaction.id;
      successMessage = `Settlement of ₹${settleAmt.toLocaleString(
        "en-IN"
      )} recorded against ${record.transactionNumber}. Bank balance reduced accordingly.`;
    }

    const settlement = await prisma.settlement.create({
      data: {
        settlementNumber: sRef,
        settlementDate: sDate,
        section: SectionType.POWERLOOM,
        entityType: "PowerloomTransaction",
        entityId: record.id,
        partyId: record.partyId || null,
        amount: settleAmt,
        paymentMethod,
        bankAccountId: bankAccountId || null,
        referenceNo: sRef,
        notes,
        transactionId,
        createdById: user.id,
      },
    });

    const newSettled = round2(add(record.amountSettled, settleAmt));
    const newOutstanding = round2(Math.max(0, sub(record.totalAmount, newSettled)));
    const newStatus = newOutstanding <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

    const updatedRecord = await prisma.powerloomTransaction.update({
      where: { id: record.id },
      data: {
        amountSettled: newSettled,
        outstandingAmount: newOutstanding,
        paymentStatus: newStatus,
      },
      include: { party: true },
    });

    if (record.partyId && record.party) {
      await prisma.party.update({
        where: { id: record.partyId },
        data: { currentOutstanding: sub(record.party.currentOutstanding, settleAmt) },
      });
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      record: updatedRecord,
      settlement,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to settle" }, { status: 500 });
  }
}

