import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { add, sub, round2 } from "@/lib/decimal";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const payWageSchema = z.object({
  amount: z.number().positive(),
  bankAccountId: z.string().min(1),
  paymentMethod: z.string().default("BANK_TRANSFER"),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  paymentDate: z.string().optional(),
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
    const parsed = payWageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment details", details: parsed.error.issues }, { status: 400 });
    }

    const { amount, bankAccountId, paymentMethod, referenceNo, notes, paymentDate } = parsed.data;
    const payAmt = round2(amount);

    const wage = await prisma.wageRecord.findUnique({
      where: { id: params.id },
      include: { worker: true },
    });

    if (!wage) {
      return NextResponse.json({ error: "Wage record not found." }, { status: 404 });
    }

    if (payAmt > wage.outstandingWages) {
      return NextResponse.json({
        error: `Payment amount (${payAmt}) cannot exceed outstanding wages (${wage.outstandingWages}).`,
      }, { status: 400 });
    }

    const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bank) {
      return NextResponse.json({ error: "Selected bank account does not exist." }, { status: 404 });
    }

    const pDate = paymentDate ? new Date(paymentDate) : new Date();
    const pRef = referenceNo || generateRef("WAG-PAY");

    // Double-entry: Debit Wages Payable 2100 (reduce liability), Credit Bank 1020 (cash outflow)
    // Does NOT create an expense again (no double counting)!
    const { transaction } = await postTransaction({
      referenceNo: `TXN-${pRef}`,
      transactionDate: pDate,
      section: SectionType.DAILY_WAGE,
      type: TransactionType.WAGE_PAYMENT,
      direction: Direction.CREDIT, // Bank outflow
      amount: payAmt,
      counterparty: wage.worker?.name || wage.workDescription || "Daily Wage Worker",
      bankAccountId: bank.id,
      paymentMethod,
      notes: `Wage Payment to ${wage.worker?.name || wage.workDescription || "Worker"}: ${notes || ""}`,
      userId: user.id,
      lines: [
        {
          accountCode: "2100",
          accountName: "Wages Payable (Workers)",
          section: SectionType.DAILY_WAGE,
          debit: payAmt,
          credit: 0,
        },
        {
          accountCode: "1020",
          accountName: `Bank: ${bank.accountName}`,
          section: SectionType.DAILY_WAGE,
          debit: 0,
          credit: payAmt,
        },
      ],
    });

    const settlement = await prisma.settlement.create({
      data: {
        settlementNumber: pRef,
        settlementDate: pDate,
        section: SectionType.DAILY_WAGE,
        entityType: "WageRecord",
        entityId: wage.id,
        workerId: wage.workerId,
        amount: payAmt,
        paymentMethod,
        bankAccountId: bank.id,
        referenceNo: pRef,
        notes,
        transactionId: transaction.id,
        createdById: user.id,
      },
    });

    const newPaid = round2(add(wage.amountPaid, payAmt));
    const newOutstanding = round2(sub(wage.netWagesPayable, newPaid));
    const newStatus = newOutstanding <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

    const updatedWage = await prisma.wageRecord.update({
      where: { id: wage.id },
      data: {
        amountPaid: newPaid,
        outstandingWages: newOutstanding,
        paymentStatus: newStatus,
        paymentDate: pDate,
        bankAccountId: bank.id,
      },
      include: { worker: true },
    });

    return NextResponse.json({
      success: true,
      message: `Wage payment of ₹${payAmt} recorded for ${wage.worker?.name || wage.workDescription || "worker"}`,
      record: updatedWage,
      settlement,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to disburse wage" }, { status: 500 });
  }
}
