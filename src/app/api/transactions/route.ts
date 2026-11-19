import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction } from "@/lib/accounting";
import { round2 } from "@/lib/decimal";
import { SectionType, TransactionType, Direction } from "@prisma/client";
import { z } from "zod";

const createTxnSchema = z.object({
  referenceNo: z.string().optional(),
  transactionDate: z.string().optional(),
  section: z.nativeEnum(SectionType),
  type: z.nativeEnum(TransactionType),
  direction: z.nativeEnum(Direction),
  amount: z.number().positive(),
  counterparty: z.string().optional(),
  bankAccountId: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      accountCode: z.string(),
      accountName: z.string(),
      section: z.nativeEnum(SectionType).optional(),
      debit: z.number().default(0),
      credit: z.number().default(0),
    })
  ).min(2),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const section = searchParams.get("section") as SectionType | null;
    const type = searchParams.get("type") as TransactionType | null;
    const status = searchParams.get("status") as any | null;
    const bankAccountId = searchParams.get("bankAccountId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: any = {};

    if (search) {
      where.OR = [
        { referenceNo: { contains: search } },
        { counterparty: { contains: search } },
        { notes: { contains: search } },
      ];
    }
    if (section) where.section = section;
    if (type) where.type = type;
    if (status) where.status = status;
    if (bankAccountId) where.bankAccountId = bankAccountId;

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { transactionDate: "desc" },
        include: {
          bankAccount: true,
          createdBy: { select: { fullName: true, email: true } },
          journalEntries: {
            include: { lines: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: transactions.map((t) => ({
        ...t,
        amount: round2(t.amount),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTxnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const res = await postTransaction({
      ...parsed.data,
      transactionDate: parsed.data.transactionDate ? new Date(parsed.data.transactionDate) : new Date(),
      userId: user.id,
    });

    return NextResponse.json({ success: true, transaction: res.transaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record transaction" }, { status: 400 });
  }
}
