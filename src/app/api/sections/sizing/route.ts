import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { mul, round2, add } from "@/lib/decimal";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const createSizingBillSchema = z.object({
  billNumber: z.string().optional(),
  billDate: z.string().optional(),
  billType: z.enum(["VETTI", "SAREE", "SALLI"]).default("VETTI"),
  numberOfBeams: z.number().min(0).optional().nullable(),
  noOfBags: z.number().min(0).default(0),
  bagWeightKg: z.number().min(0).default(0),
  ratePerKg: z.number().min(0).default(0),
  partyId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0).optional(),
  rate: z.number().min(0).optional(),
  dueDate: z.string().optional(),
  bankAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status") as PaymentStatus | null;
    const billType = searchParams.get("billType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (billType && billType !== "ALL") {
      const bType = billType.toUpperCase();
      if (bType === "SAREE" || bType === "SALLI") {
        where.billType = { in: ["SAREE", "SALLI"] };
      } else {
        where.billType = bType;
      }
    }
    if (search) {
      where.OR = [
        { billNumber: { contains: search } },
        { party: { name: { contains: search } } },
        { description: { contains: search } },
      ];
    }
    if (status) where.paymentStatus = status;

    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate);
      if (endDate) where.billDate.lte = new Date(endDate);
    }

    const bills = await prisma.sizingBill.findMany({
      where,
      orderBy: { billDate: "desc" },
      include: {
        party: true,
        bankAccount: true,
      },
    });

    const billIds = bills.map((b) => b.id);
    const settlements = billIds.length > 0
      ? await prisma.settlement.findMany({
          where: {
            entityType: "SizingBill",
            entityId: { in: billIds },
          },
          orderBy: { settlementDate: "desc" },
          include: {
            bankAccount: { select: { id: true, bankName: true, accountName: true, accountNumber: true } },
            createdBy: { select: { id: true, fullName: true } },
          },
        })
      : [];

    const settlementsByBillId: Record<string, any[]> = {};
    for (const s of settlements) {
      if (!settlementsByBillId[s.entityId]) {
        settlementsByBillId[s.entityId] = [];
      }
      settlementsByBillId[s.entityId].push(s);
    }

    // 3 Primary standard columns
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
        billType: b.billType || "VETTI",
        numberOfBeams: b.numberOfBeams ?? null,
        noOfBags: b.noOfBags || 0,
        bagWeightKg: b.bagWeightKg || 0,
        ratePerKg: b.ratePerKg || 0,
        totalKg: b.totalKg || round2(mul(b.noOfBags || 0, b.bagWeightKg || 0)),
        totalAmount: round2(b.totalAmount),
        amountSettled: round2(b.amountSettled),
        outstandingAmount: round2(b.outstandingAmount),
        settlements: settlementsByBillId[b.id] || [],
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch sizing bills" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSizingBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const {
      billType,
      numberOfBeams,
      noOfBags,
      bagWeightKg,
      ratePerKg,
      partyId,
      description,
      dueDate,
      bankAccountId,
      notes,
      attachmentUrl,
    } = parsed.data;

    const billNumber = parsed.data.billNumber || generateRef(billType === "VETTI" ? "VET" : "SAL");
    const billDate = parsed.data.billDate ? new Date(parsed.data.billDate) : new Date();

    // Calculation: Total Weight (kg) = noOfBags * bagWeightKg; Total Value = Total Weight * ratePerKg
    let totalKg = round2(mul(noOfBags, bagWeightKg));
    let totalAmount = round2(mul(totalKg, ratePerKg));

    // Fallback to direct quantity * rate if bags wasn't provided
    if (totalAmount <= 0 && parsed.data.quantity && parsed.data.rate) {
      totalKg = parsed.data.quantity;
      totalAmount = round2(mul(parsed.data.quantity, parsed.data.rate));
    }

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "Total bill amount must be greater than zero. Please enter No. of Bags, Bags in kg, and Rate per kg." },
        { status: 400 }
      );
    }

    const isSaree = billType === "SAREE" || billType === "SALLI";
    let partyName = `${isSaree ? "Saree" : "Vetti"} Yarn Sizing`;
    if (partyId) {
      const party = await prisma.party.findUnique({ where: { id: partyId } });
      if (party) partyName = party.name;
    }

    // Double-entry accounting:
    // Debit 5000: Direct Operating Cost / Sizing Expense
    // Credit 2000: Accounts Payable / Sizing Pending Due
    const { transaction } = await postTransaction({
      referenceNo: `TXN-${billNumber}`,
      transactionDate: billDate,
      section: SectionType.SIZING_BILL,
      type: TransactionType.EXPENSE_RECORDED,
      direction: Direction.CREDIT,
      amount: totalAmount,
      counterparty: partyName,
      notes: `${billType} Sizing Bill ${billNumber}: ${noOfBags} bags @ ${bagWeightKg} kg, Rate ₹${ratePerKg}/kg${numberOfBeams ? `, Beams: ${numberOfBeams}` : ""}`,
      userId: user.id,
      lines: [
        {
          accountCode: "5000",
          accountName: `Sizing Operating Expense (${billType})`,
          section: SectionType.SIZING_BILL,
          debit: totalAmount,
          credit: 0,
        },
        {
          accountCode: "2000",
          accountName: "Accounts Payable (Sizing Dues)",
          section: SectionType.SIZING_BILL,
          debit: 0,
          credit: totalAmount,
        },
      ],
    });

    const sizingBill = await prisma.sizingBill.create({
      data: {
        billNumber,
        billDate,
        billType,
        partyId: partyId || null,
        description: description || `${billType} sizing: ${noOfBags} bags × ${bagWeightKg} kg`,
        numberOfBeams: numberOfBeams ?? null,
        noOfBags,
        bagWeightKg,
        ratePerKg,
        totalKg,
        quantity: totalKg,
        rate: ratePerKg,
        totalAmount,
        amountSettled: 0,
        outstandingAmount: totalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentStatus: PaymentStatus.PENDING,
        bankAccountId: bankAccountId || null,
        notes: notes || null,
        attachmentUrl: attachmentUrl || null,
        transactionId: transaction.id,
      },
      include: { party: true },
    });

    if (partyId) {
      const party = await prisma.party.findUnique({ where: { id: partyId } });
      if (party) {
        await prisma.party.update({
          where: { id: partyId },
          data: { currentOutstanding: add(party.currentOutstanding, totalAmount) },
        });
      }
    }

    return NextResponse.json({ success: true, bill: sizingBill }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create sizing bill" }, { status: 500 });
  }
}
