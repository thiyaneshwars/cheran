import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { add, sub, round2 } from "@/lib/decimal";
import { createLiquidCashEntry } from "@/lib/liquid-cash";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const settleSchema = z.object({
  amount: z.number().positive(),
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

    const bill = await prisma.transportBill.findUnique({
      where: { id: params.id },
    });

    if (!bill) {
      return NextResponse.json({ error: "Transport bill not found" }, { status: 404 });
    }

    if (settleAmt > bill.outstandingAmount) {
      return NextResponse.json({
        error: `Settlement amount (${settleAmt}) cannot exceed outstanding amount (${bill.outstandingAmount}).`,
      }, { status: 400 });
    }

    const sDate = settlementDate ? new Date(settlementDate) : new Date();
    const sRef = referenceNo || generateRef("SET-TR");

    let transactionId: string | null = null;
    let successMessage = "";

    if (paymentMethod === "LIQUID_CASH") {
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

      await createLiquidCashEntry({
        type: "CASH_OUT",
        amount: settleAmt,
        category: "TRANSPORT_PAYMENT",
        description: `Transport Freight Settlement: ${bill.transporterName} (${bill.transactionNumber})`,
        notes: notes || undefined,
        userId: user.id,
        entryDate: sDate,
      });

      const { transaction } = await postTransaction({
        referenceNo: `TXN-${sRef}`,
        transactionDate: sDate,
        section: SectionType.TRANSPORT,
        type: TransactionType.PAYMENT_PAID,
        direction: Direction.CREDIT,
        amount: settleAmt,
        counterparty: bill.transporterName,
        paymentMethod: "LIQUID_CASH",
        notes: `Liquid Cash settlement for transport bill ${bill.transactionNumber}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "2000",
            accountName: "Accounts Payable (Transporters)",
            section: SectionType.TRANSPORT,
            debit: settleAmt,
            credit: 0,
          },
          {
            accountCode: "1010",
            accountName: "Society Liquid Cash",
            section: SectionType.TRANSPORT,
            debit: 0,
            credit: settleAmt,
          },
        ],
      });

      transactionId = transaction.id;
      bankAccountId = null;
      successMessage = `Transport bill settled with ₹${settleAmt} from Liquid Cash.`;
    } else {
      if (!bankAccountId) {
        return NextResponse.json({ error: "Please select a bank account to pay from." }, { status: 400 });
      }

      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) {
        return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
      }

      // Double-entry: Debit AP 2000 (clear liability), Credit Bank 1020 (cash outflow)
      const { transaction } = await postTransaction({
        referenceNo: `TXN-${sRef}`,
        transactionDate: sDate,
        section: SectionType.TRANSPORT,
        type: TransactionType.PAYMENT_PAID,
        direction: Direction.CREDIT,
        amount: settleAmt,
        counterparty: bill.transporterName,
        bankAccountId: bank.id,
        paymentMethod,
        notes: `Transport settlement for bill ${bill.transactionNumber}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "2000",
            accountName: "Accounts Payable (Transporters)",
            section: SectionType.TRANSPORT,
            debit: settleAmt,
            credit: 0,
          },
          {
            accountCode: "1020",
            accountName: `Bank: ${bank.accountName}`,
            section: SectionType.TRANSPORT,
            debit: 0,
            credit: settleAmt,
          },
        ],
      });

      transactionId = transaction.id;
      successMessage = `Transport bill settled with ₹${settleAmt} from Bank.`;
    }

    const settlement = await prisma.settlement.create({
      data: {
        settlementNumber: sRef,
        settlementDate: sDate,
        section: SectionType.TRANSPORT,
        entityType: "TransportBill",
        entityId: bill.id,
        amount: settleAmt,
        paymentMethod,
        bankAccountId: bankAccountId || null,
        referenceNo: sRef,
        notes,
        transactionId,
        createdById: user.id,
      },
    });

    const newSettled = round2(add(bill.amountSettled, settleAmt));
    const newOutstanding = round2(sub(bill.totalAmount, newSettled));
    const newStatus = newOutstanding <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

    const updatedBill = await prisma.transportBill.update({
      where: { id: bill.id },
      data: {
        amountSettled: newSettled,
        outstandingAmount: newOutstanding,
        paymentStatus: newStatus,
        bankAccountId: bankAccountId || bill.bankAccountId,
      },
    });

    return NextResponse.json({
      success: true,
      message: successMessage,
      bill: updatedBill,
      settlement,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to settle transport bill" }, { status: 500 });
  }
}
