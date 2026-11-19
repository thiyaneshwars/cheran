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
  paymentMethod: z.string().default("BANK_TRANSFER"), // "BANK_TRANSFER" | "LIQUID_CASH" | "CHEQUE" | "UPI"
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
      return NextResponse.json({ error: "Invalid settlement parameters", details: parsed.error.issues }, { status: 400 });
    }

    const { amount, referenceNo, notes, settlementDate } = parsed.data;
    let { bankAccountId, paymentMethod } = parsed.data;
    const settleAmt = round2(amount);

    if (bankAccountId === "society_liquid_cash") {
      paymentMethod = "LIQUID_CASH";
    }

    const bill = await prisma.sizingBill.findUnique({
      where: { id: params.id },
      include: { party: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Sizing bill not found" }, { status: 404 });
    }

    if (settleAmt > bill.outstandingAmount) {
      return NextResponse.json({
        error: `Settlement amount (₹${settleAmt}) cannot exceed current outstanding balance (₹${bill.outstandingAmount}).`,
      }, { status: 400 });
    }

    const sDate = settlementDate ? new Date(settlementDate) : new Date();
    const sRef = referenceNo || generateRef("SET-SIZ");
    const counterpartyName = bill.party?.name || `${bill.billType || "Sizing"} Bill ${bill.billNumber}`;

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

      // Record Cash Out in Liquid Cash ledger
      await createLiquidCashEntry({
        type: "CASH_OUT",
        amount: settleAmt,
        category: "SIZING_PAYMENT",
        description: `Sizing Bill Settlement: ${counterpartyName} (${bill.billNumber})`,
        notes: notes || undefined,
        userId: user.id,
        entryDate: sDate,
      });

      // Double-entry: Debit AP 2000, Credit Liquid Cash 1010
      const { transaction } = await postTransaction({
        referenceNo: `TXN-${sRef}`,
        transactionDate: sDate,
        section: SectionType.SIZING_BILL,
        type: TransactionType.PAYMENT_PAID,
        direction: Direction.CREDIT,
        amount: settleAmt,
        counterparty: counterpartyName,
        paymentMethod: "LIQUID_CASH",
        notes: `Liquid Cash settlement for ${bill.billType || "Sizing"} Bill ${bill.billNumber}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "2000",
            accountName: "Accounts Payable (Sizing Dues)",
            section: SectionType.SIZING_BILL,
            debit: settleAmt,
            credit: 0,
          },
          {
            accountCode: "1010",
            accountName: "Society Liquid Cash",
            section: SectionType.SIZING_BILL,
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
    } else {
      // 2. BANK SETTLEMENT
      if (!bankAccountId) {
        return NextResponse.json({ error: "Please select a bank account to pay from." }, { status: 400 });
      }

      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) {
        return NextResponse.json({ error: "Selected bank account does not exist." }, { status: 404 });
      }

      // Double-entry: Debit AP 2000 (reduce payable), Credit Bank 1020 (reduce bank balance)
      const { transaction } = await postTransaction({
        referenceNo: `TXN-${sRef}`,
        transactionDate: sDate,
        section: SectionType.SIZING_BILL,
        type: TransactionType.PAYMENT_PAID,
        direction: Direction.CREDIT, // Bank cash outflow -> REDUCES bank balance
        amount: settleAmt,
        counterparty: counterpartyName,
        bankAccountId: bank.id,
        paymentMethod,
        notes: `Settlement for ${bill.billType || "Sizing"} Bill ${bill.billNumber}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "2000",
            accountName: "Accounts Payable (Sizing Dues)",
            section: SectionType.SIZING_BILL,
            debit: settleAmt,
            credit: 0,
          },
          {
            accountCode: "1020",
            accountName: `Bank: ${bank.accountName}`,
            section: SectionType.SIZING_BILL,
            debit: 0,
            credit: settleAmt,
          },
        ],
      });

      transactionId = transaction.id;
      successMessage = `Settlement of ₹${settleAmt.toLocaleString(
        "en-IN"
      )} recorded against ${bill.billNumber}. Bank balance reduced accordingly.`;
    }

    // Create Settlement record
    const settlement = await prisma.settlement.create({
      data: {
        settlementNumber: sRef,
        settlementDate: sDate,
        section: SectionType.SIZING_BILL,
        entityType: "SizingBill",
        entityId: bill.id,
        partyId: bill.partyId || null,
        amount: settleAmt,
        paymentMethod,
        bankAccountId: bankAccountId || null,
        referenceNo: sRef,
        notes,
        transactionId,
        createdById: user.id,
      },
    });

    // Update Sizing Bill
    const newSettled = round2(add(bill.amountSettled, settleAmt));
    const newOutstanding = round2(sub(bill.totalAmount, newSettled));
    const newStatus = newOutstanding <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

    const updatedBill = await prisma.sizingBill.update({
      where: { id: bill.id },
      data: {
        amountSettled: newSettled,
        outstandingAmount: newOutstanding,
        paymentStatus: newStatus,
      },
      include: { party: true },
    });

    // Update Party outstanding balance if party was attached
    if (bill.partyId && bill.party) {
      await prisma.party.update({
        where: { id: bill.partyId },
        data: { currentOutstanding: sub(bill.party.currentOutstanding, settleAmt) },
      });
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      bill: updatedBill,
      settlement,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record settlement" }, { status: 500 });
  }
}
