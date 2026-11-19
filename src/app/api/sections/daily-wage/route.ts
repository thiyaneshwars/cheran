import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { round2, add } from "@/lib/decimal";
import { createLiquidCashEntry } from "@/lib/liquid-cash";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const createDailyWageSchema = z.object({
  wageType: z.enum(["BABIN", "OTHERS"]),
  workDate: z.string().optional(),
  // Babin fields
  babinRuns: z.number().min(0).optional().default(0),
  babinDistributed: z.number().min(0).optional().default(0),
  dailyProfit: z.number().optional().nullable(),
  // Others fields
  workDescription: z.string().optional().nullable(),
  // Common fields
  amount: z.number().positive("Wages amount must be greater than zero"),
  paymentMethod: z.enum(["BANK_TRANSFER", "LIQUID_CASH"]),
  bankAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  workerId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const wageType = searchParams.get("wageType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status") as PaymentStatus | null;

    const where: any = {};
    if (wageType && wageType !== "ALL") {
      where.wageType = wageType.toUpperCase();
    }
    if (search) {
      where.OR = [
        { workDescription: { contains: search } },
        { worker: { name: { contains: search } } },
        { notes: { contains: search } },
      ];
    }
    if (status) where.paymentStatus = status;

    if (startDate || endDate) {
      where.workDate = {};
      if (startDate) where.workDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.workDate.lte = end;
      }
    }

    const wages = await prisma.wageRecord.findMany({
      where,
      orderBy: { workDate: "desc" },
      include: {
        worker: true,
        bankAccount: true,
      },
    });

    let totalGross = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let babinWagesTotal = 0;
    let othersWagesTotal = 0;
    let totalBabinRuns = 0;
    let totalBabinDistributed = 0;
    let totalDailyProfit = 0;

    for (const w of wages) {
      totalGross = add(totalGross, w.grossWages);
      totalPaid = add(totalPaid, w.amountPaid);
      totalOutstanding = add(totalOutstanding, w.outstandingWages);

      if (w.wageType === "BABIN") {
        babinWagesTotal = add(babinWagesTotal, w.amountPaid || w.grossWages);
        totalBabinRuns = add(totalBabinRuns, w.babinRuns || 0);
        totalBabinDistributed = add(totalBabinDistributed, w.babinDistributed || 0);
        if (w.dailyProfit) {
          totalDailyProfit = add(totalDailyProfit, w.dailyProfit);
        }
      } else {
        othersWagesTotal = add(othersWagesTotal, w.amountPaid || w.grossWages);
      }
    }

    return NextResponse.json({
      summary: {
        totalGross: round2(totalGross),
        totalCredited: round2(totalGross),
        amountSettled: round2(totalPaid),
        amountOutstanding: round2(totalOutstanding),
        babinWagesTotal: round2(babinWagesTotal),
        othersWagesTotal: round2(othersWagesTotal),
        totalBabinRuns,
        totalBabinDistributed,
        totalDailyProfit: round2(totalDailyProfit),
      },
      wages: wages.map((w) => ({
        ...w,
        grossWages: round2(w.grossWages),
        netWagesPayable: round2(w.netWagesPayable),
        amountPaid: round2(w.amountPaid),
        outstandingWages: round2(w.outstandingWages),
        dailyProfit: w.dailyProfit !== null && w.dailyProfit !== undefined ? round2(w.dailyProfit) : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch daily wage records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createDailyWageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const {
      wageType,
      babinRuns,
      babinDistributed,
      dailyProfit,
      workDescription,
      amount,
      paymentMethod,
      bankAccountId,
      notes,
      workerId,
    } = parsed.data;

    const wageAmount = round2(amount);
    const workDate = parsed.data.workDate ? new Date(parsed.data.workDate) : new Date();

    let transactionId: string | null = null;
    let liquidCashEntryId: string | null = null;
    let selectedBankId: string | null = null;

    const counterparty =
      wageType === "BABIN"
        ? "Babin Workers"
        : (workDescription || "Daily Wage Labor");

    const description =
      wageType === "BABIN"
        ? `Babin Wages: ${babinRuns} runs, ${babinDistributed} distributed${dailyProfit ? ` (Profit: ₹${dailyProfit})` : ""}`
        : `Daily Wage (Others): ${workDescription || "Labor"}`;

    const ref = generateRef(wageType === "BABIN" ? "BAB" : "WAG");

    // Financial Integration: Outgoing expense reducing Cash or Bank
    if (paymentMethod === "LIQUID_CASH") {
      // 1. Verify liquid cash balance
      const liquidAccount = await prisma.liquidCashAccount.findUnique({
        where: { id: "society_liquid_cash" },
      });
      const currentCashBalance = liquidAccount?.currentBalance || 0;
      if (currentCashBalance < wageAmount) {
        return NextResponse.json(
          {
            error: `Insufficient Liquid Cash balance (₹${currentCashBalance.toLocaleString(
              "en-IN"
            )}) for wage payment of ₹${wageAmount.toLocaleString("en-IN")}.`,
          },
          { status: 400 }
        );
      }

      // Record CASH_OUT
      const cashEntry = await createLiquidCashEntry({
        type: "CASH_OUT",
        amount: wageAmount,
        category: "DAILY_WAGE",
        description: `${description} (${ref})`,
        notes: notes || undefined,
        userId: user.id,
        entryDate: workDate,
      });
      liquidCashEntryId = cashEntry.entry.id;

      // Double-entry: Debit 5100 Daily Wage Expense, Credit 1010 Society Liquid Cash
      const { transaction } = await postTransaction({
        referenceNo: `TXN-${ref}`,
        transactionDate: workDate,
        section: SectionType.DAILY_WAGE,
        type: TransactionType.EXPENSE_RECORDED,
        direction: Direction.CREDIT,
        amount: wageAmount,
        counterparty,
        paymentMethod: "LIQUID_CASH",
        notes: `${description}: ${notes || ""}`,
        userId: user.id,
        lines: [
          {
            accountCode: "5100",
            accountName: "Daily Wage Expense",
            section: SectionType.DAILY_WAGE,
            debit: wageAmount,
            credit: 0,
          },
          {
            accountCode: "1010",
            accountName: "Society Liquid Cash",
            section: SectionType.DAILY_WAGE,
            debit: 0,
            credit: wageAmount,
          },
        ],
      });
      transactionId = transaction.id;
    } else {
      // 2. Bank transfer payment
      if (!bankAccountId) {
        return NextResponse.json({ error: "Please select a bank account for payment." }, { status: 400 });
      }

      const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bank) {
        return NextResponse.json({ error: "Bank account not found." }, { status: 404 });
      }
      selectedBankId = bank.id;

      // Outgoing payment reducing bank balance
      await prisma.bankAccount.update({
        where: { id: bank.id },
        data: { currentBalance: { decrement: wageAmount } },
      });

      // Double-entry: Debit 5100 Daily Wage Expense, Credit 1020 Bank Account
      const { transaction } = await postTransaction({
        referenceNo: `TXN-${ref}`,
        transactionDate: workDate,
        section: SectionType.DAILY_WAGE,
        type: TransactionType.EXPENSE_RECORDED,
        direction: Direction.CREDIT,
        amount: wageAmount,
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
            debit: wageAmount,
            credit: 0,
          },
          {
            accountCode: "1020",
            accountName: `Bank: ${bank.accountName}`,
            section: SectionType.DAILY_WAGE,
            debit: 0,
            credit: wageAmount,
          },
        ],
      });
      transactionId = transaction.id;
    }

    // Save Wage Record (Directly recorded as PAID since wages are paid on record)
    const wageRecord = await prisma.wageRecord.create({
      data: {
        wageType,
        workDate,
        workerId: workerId || null,
        workDescription:
          wageType === "BABIN"
            ? `Babin (${babinRuns} runs, ${babinDistributed} distributed)`
            : (workDescription || "Others Daily Wage"),
        daysWorked: 1,
        dailyWage: wageAmount,
        grossWages: wageAmount,
        advancesApplied: 0,
        deductions: 0,
        netWagesPayable: wageAmount,
        amountPaid: wageAmount,
        outstandingWages: 0,
        paymentStatus: PaymentStatus.PAID,
        paymentDate: workDate,
        paymentMethod,
        bankAccountId: selectedBankId,
        liquidCashEntryId,
        babinRuns: wageType === "BABIN" ? babinRuns : 0,
        babinDistributed: wageType === "BABIN" ? babinDistributed : 0,
        dailyProfit: wageType === "BABIN" && dailyProfit !== undefined && dailyProfit !== null ? round2(dailyProfit) : null,
        notes: notes || null,
        transactionId,
      },
      include: {
        worker: true,
        bankAccount: true,
      },
    });

    return NextResponse.json({ success: true, record: wageRecord }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create wage record" }, { status: 500 });
  }
}
