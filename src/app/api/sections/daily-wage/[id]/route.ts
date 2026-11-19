import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { round2 } from "@/lib/decimal";
import { createLiquidCashEntry } from "@/lib/liquid-cash";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const updateDailyWageSchema = z.object({
  wageType: z.enum(["BABIN", "OTHERS"]).optional(),
  workDate: z.string().optional(),
  babinRuns: z.number().min(0).optional(),
  babinDistributed: z.number().min(0).optional(),
  dailyProfit: z.number().optional().nullable(),
  workDescription: z.string().optional().nullable(),
  amount: z.number().positive("Wages amount must be greater than zero"),
  paymentMethod: z.enum(["BANK_TRANSFER", "LIQUID_CASH"]),
  bankAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const wage = await prisma.wageRecord.findUnique({
      where: { id: params.id },
      include: {
        worker: true,
        bankAccount: true,
        transaction: true,
      },
    });

    if (!wage) {
      return NextResponse.json({ error: "Wage record not found" }, { status: 404 });
    }

    return NextResponse.json({
      record: {
        ...wage,
        grossWages: round2(wage.grossWages),
        netWagesPayable: round2(wage.netWagesPayable),
        amountPaid: round2(wage.amountPaid),
        outstandingWages: round2(wage.outstandingWages),
        dailyProfit: wage.dailyProfit !== null && wage.dailyProfit !== undefined ? round2(wage.dailyProfit) : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch record" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const existingWage = await prisma.wageRecord.findUnique({
      where: { id: params.id },
    });

    if (!existingWage) {
      return NextResponse.json({ error: "Wage record not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateDailyWageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const {
      amount,
      paymentMethod,
      bankAccountId,
      babinRuns,
      babinDistributed,
      dailyProfit,
      workDescription,
      notes,
    } = parsed.data;

    const wageType = parsed.data.wageType || (existingWage.wageType as "BABIN" | "OTHERS") || "OTHERS";
    const newAmount = round2(amount);
    const workDate = parsed.data.workDate ? new Date(parsed.data.workDate) : existingWage.workDate;

    // 1. REVERSE PREVIOUS FINANCIAL ENTRIES TO PREVENT DUPLICATES
    if (existingWage.paymentMethod === "LIQUID_CASH") {
      await prisma.liquidCashAccount.update({
        where: { id: "society_liquid_cash" },
        data: { currentBalance: { increment: existingWage.amountPaid } },
      });
      if (existingWage.liquidCashEntryId) {
        await prisma.liquidCashEntry.delete({ where: { id: existingWage.liquidCashEntryId } }).catch(() => {});
      }
    } else if (existingWage.paymentMethod === "BANK_TRANSFER" && existingWage.bankAccountId) {
      await prisma.bankAccount.update({
        where: { id: existingWage.bankAccountId },
        data: { currentBalance: { increment: existingWage.amountPaid } },
      });
    }

    if (existingWage.transactionId) {
      await prisma.journalLine.deleteMany({
        where: { journalEntry: { transactionId: existingWage.transactionId } },
      });
      await prisma.journalEntry.deleteMany({
        where: { transactionId: existingWage.transactionId },
      });
      await prisma.transaction.delete({
        where: { id: existingWage.transactionId },
      }).catch(() => {});
    }

    // 2. APPLY NEW PAYMENT OUTFLOW & RECORD TRANSACTION
    let newTransactionId: string | null = null;
    let newLiquidCashEntryId: string | null = null;
    let selectedBankId: string | null = null;

    const counterparty =
      wageType === "BABIN"
        ? "Babin Workers"
        : (workDescription || "Daily Wage Labor");

    const description =
      wageType === "BABIN"
        ? `Babin Wages: ${babinRuns ?? existingWage.babinRuns} runs, ${babinDistributed ?? existingWage.babinDistributed} distributed${dailyProfit ? ` (Profit: ₹${dailyProfit})` : ""}`
        : `Daily Wage (Others): ${workDescription || existingWage.workDescription || "Labor"}`;

    const ref = generateRef(wageType === "BABIN" ? "BAB" : "WAG");

    if (paymentMethod === "LIQUID_CASH") {
      const liquidAccount = await prisma.liquidCashAccount.findUnique({
        where: { id: "society_liquid_cash" },
      });
      const currentCashBalance = liquidAccount?.currentBalance || 0;
      if (currentCashBalance < newAmount) {
        return NextResponse.json(
          {
            error: `Insufficient Liquid Cash balance (₹${currentCashBalance.toLocaleString(
              "en-IN"
            )}) for wage payment of ₹${newAmount.toLocaleString("en-IN")}.`,
          },
          { status: 400 }
        );
      }

      const cashEntry = await createLiquidCashEntry({
        type: "CASH_OUT",
        amount: newAmount,
        category: "DAILY_WAGE",
        description: `${description} (${ref})`,
        notes: notes || undefined,
        userId: user.id,
        entryDate: workDate,
      });
      newLiquidCashEntryId = cashEntry.entry.id;

      const { transaction } = await postTransaction({
        referenceNo: `TXN-${ref}`,
        transactionDate: workDate,
        section: SectionType.DAILY_WAGE,
        type: TransactionType.EXPENSE_RECORDED,
        direction: Direction.CREDIT,
        amount: newAmount,
        counterparty,
        paymentMethod: "LIQUID_CASH",
        notes: `${description}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "5100",
            accountName: "Daily Wage Expense",
            section: SectionType.DAILY_WAGE,
            debit: newAmount,
            credit: 0,
          },
          {
            accountCode: "1010",
            accountName: "Society Liquid Cash",
            section: SectionType.DAILY_WAGE,
            debit: 0,
            credit: newAmount,
          },
        ],
      });
      newTransactionId = transaction.id;
    } else {
      if (!bankAccountId) {
        return NextResponse.json({ error: "Please select a bank account for payment." }, { status: 400 });
      }

      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) {
        return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
      }
      selectedBankId = bank.id;

      await prisma.bankAccount.update({
        where: { id: bank.id },
        data: { currentBalance: { decrement: newAmount } },
      });

      const { transaction } = await postTransaction({
        referenceNo: `TXN-${ref}`,
        transactionDate: workDate,
        section: SectionType.DAILY_WAGE,
        type: TransactionType.EXPENSE_RECORDED,
        direction: Direction.CREDIT,
        amount: newAmount,
        counterparty,
        bankAccountId: bank.id,
        paymentMethod: "BANK_TRANSFER",
        notes: `${description}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "5100",
            accountName: "Daily Wage Expense",
            section: SectionType.DAILY_WAGE,
            debit: newAmount,
            credit: 0,
          },
          {
            accountCode: "1020",
            accountName: `Bank: ${bank.accountName}`,
            section: SectionType.DAILY_WAGE,
            debit: 0,
            credit: newAmount,
          },
        ],
      });
      newTransactionId = transaction.id;
    }

    // 3. UPDATE WAGE RECORD
    const updatedWage = await prisma.wageRecord.update({
      where: { id: params.id },
      data: {
        wageType,
        workDate,
        workDescription:
          wageType === "BABIN"
            ? `Babin (${babinRuns ?? existingWage.babinRuns} runs, ${babinDistributed ?? existingWage.babinDistributed} distributed)`
            : (workDescription || existingWage.workDescription || "Others Daily Wage"),
        dailyWage: newAmount,
        grossWages: newAmount,
        netWagesPayable: newAmount,
        amountPaid: newAmount,
        outstandingWages: 0,
        paymentStatus: PaymentStatus.PAID,
        paymentDate: workDate,
        paymentMethod,
        bankAccountId: selectedBankId,
        liquidCashEntryId: newLiquidCashEntryId,
        babinRuns: wageType === "BABIN" ? (babinRuns ?? existingWage.babinRuns) : 0,
        babinDistributed: wageType === "BABIN" ? (babinDistributed ?? existingWage.babinDistributed) : 0,
        dailyProfit:
          wageType === "BABIN"
            ? (dailyProfit !== undefined ? (dailyProfit !== null ? round2(dailyProfit) : null) : existingWage.dailyProfit)
            : null,
        notes: notes !== undefined ? notes : existingWage.notes,
        transactionId: newTransactionId,
      },
      include: {
        worker: true,
        bankAccount: true,
      },
    });

    return NextResponse.json({ success: true, record: updatedWage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update wage record" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete wage records." }, { status: 403 });
    }

    const wage = await prisma.wageRecord.findUnique({
      where: { id: params.id },
    });

    if (!wage) {
      return NextResponse.json({ error: "Wage record not found" }, { status: 404 });
    }

    // Reverse financial postings
    if (wage.paymentMethod === "LIQUID_CASH") {
      await prisma.liquidCashAccount.update({
        where: { id: "society_liquid_cash" },
        data: { currentBalance: { increment: wage.amountPaid } },
      });
      if (wage.liquidCashEntryId) {
        await prisma.liquidCashEntry.delete({ where: { id: wage.liquidCashEntryId } }).catch(() => {});
      }
    } else if (wage.paymentMethod === "BANK_TRANSFER" && wage.bankAccountId) {
      await prisma.bankAccount.update({
        where: { id: wage.bankAccountId },
        data: { currentBalance: { increment: wage.amountPaid } },
      });
    }

    if (wage.transactionId) {
      await prisma.journalLine.deleteMany({
        where: { journalEntry: { transactionId: wage.transactionId } },
      });
      await prisma.journalEntry.deleteMany({
        where: { transactionId: wage.transactionId },
      });
      await prisma.transaction.delete({
        where: { id: wage.transactionId },
      }).catch(() => {});
    }

    await prisma.wageRecord.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Wage record deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete record" }, { status: 500 });
  }
}
