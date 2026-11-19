import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { add, sub, round2 } from "@/lib/decimal";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const createTransportSchema = z.object({
  transactionNumber: z.string().optional(),
  transactionDate: z.string().optional(),
  vehicleNumber: z.string().optional(),
  transporterName: z.string().min(1),
  sourceLocation: z.string().optional(),
  destinationLocation: z.string().optional(),
  description: z.string().optional(),
  freightCharge: z.number().min(0),
  additionalExpenses: z.number().min(0).default(0),
  dueDate: z.string().optional(),
  bankAccountId: z.string().optional(),
  notes: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status") as PaymentStatus | null;

    const where: any = {};
    if (search) {
      where.OR = [
        { transactionNumber: { contains: search } },
        { transporterName: { contains: search } },
        { vehicleNumber: { contains: search } },
        { sourceLocation: { contains: search } },
        { destinationLocation: { contains: search } },
      ];
    }
    if (status) where.paymentStatus = status;

    const bills = await prisma.transportBill.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: { bankAccount: true },
    });

    let totalCredited = 0;
    let amountSettled = 0;
    let amountOutstanding = 0;

    for (const b of bills) {
      totalCredited = add(totalCredited, b.totalAmount);
      amountSettled = add(amountSettled, b.amountSettled);
      amountOutstanding = add(amountOutstanding, b.outstandingAmount);
    }

    return NextResponse.json({
      summary: {
        totalCredited: round2(totalCredited),
        amountSettled: round2(amountSettled),
        amountOutstanding: round2(amountOutstanding),
      },
      bills: bills.map((b) => ({
        ...b,
        freightCharge: round2(b.freightCharge),
        additionalExpenses: round2(b.additionalExpenses),
        totalAmount: round2(b.totalAmount),
        amountSettled: round2(b.amountSettled),
        outstandingAmount: round2(b.outstandingAmount),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch transport bills" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTransportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const {
      transporterName,
      vehicleNumber,
      sourceLocation,
      destinationLocation,
      description,
      freightCharge,
      additionalExpenses,
      dueDate,
      bankAccountId,
      notes,
      attachmentUrl,
    } = parsed.data;

    const transactionNumber = parsed.data.transactionNumber || generateRef("TR");
    const txnDate = parsed.data.transactionDate ? new Date(parsed.data.transactionDate) : new Date();

    const totalAmount = round2(add(freightCharge, additionalExpenses));
    if (totalAmount <= 0) {
      return NextResponse.json({ error: "Total transport charge must be greater than zero." }, { status: 400 });
    }

    // Double entry: Dr Transport Freight Expense (5200), Cr Accounts Payable (2000)
    const { transaction } = await postTransaction({
      referenceNo: `TXN-${transactionNumber}`,
      transactionDate: txnDate,
      section: SectionType.TRANSPORT,
      type: TransactionType.EXPENSE_RECORDED,
      direction: Direction.CREDIT,
      amount: totalAmount,
      counterparty: transporterName,
      notes: `Transport Bill ${transactionNumber}: ${vehicleNumber || ""} - ${transporterName}`,
      userId: user.id,
      lines: [
        {
          accountCode: "5200",
          accountName: "Transport Freight Expense",
          section: SectionType.TRANSPORT,
          debit: totalAmount,
          credit: 0,
        },
        {
          accountCode: "2000",
          accountName: "Accounts Payable (Transporters)",
          section: SectionType.TRANSPORT,
          debit: 0,
          credit: totalAmount,
        },
      ],
    });

    const transportBill = await prisma.transportBill.create({
      data: {
        transactionNumber,
        transactionDate: txnDate,
        vehicleNumber,
        transporterName,
        sourceLocation,
        destinationLocation,
        description,
        freightCharge: round2(freightCharge),
        additionalExpenses: round2(additionalExpenses),
        totalAmount,
        amountSettled: 0,
        outstandingAmount: totalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        bankAccountId,
        paymentStatus: PaymentStatus.PENDING,
        notes,
        attachmentUrl,
        transactionId: transaction.id,
      },
    });

    return NextResponse.json({ success: true, bill: transportBill }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create transport bill" }, { status: 500 });
  }
}
