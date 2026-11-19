import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { postTransaction, generateRef } from "@/lib/accounting";
import { mul, sub, round2, add } from "@/lib/decimal";
import { createLiquidCashEntry } from "@/lib/liquid-cash";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const createPowerloomSchema = z.object({
  transactionNumber: z.string().optional(),
  transactionDate: z.string().optional(),
  category: z.enum(["VETTI", "SAREE"]).default("VETTI"),
  weaverName: z.string().optional().default("General Powerloom"),
  weaverLocation: z.string().optional().nullable(),
  loomReference: z.string().optional().nullable(),
  noOfPaavu: z.number().min(0).default(0),
  totalMeters: z.number().min(0).default(0),
  wageRate: z.number().min(0).default(0),
  grossWages: z.number().min(0).optional(),
  weftBags: z.number().min(0).default(0),
  weftKg: z.number().min(0).default(0),
  bobbinSets: z.number().min(0).default(0),
  advancePaid: z.number().min(0).default(0),
  dueDate: z.string().optional(),
  paymentMethod: z.string().optional().default("BANK_TRANSFER"), // "BANK_TRANSFER" | "LIQUID_CASH" | "EXISTING_ADVANCE"
  bankAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  productionQuantity: z.number().min(0).optional(),
  rate: z.number().min(0).optional(),
  partyId: z.string().optional().nullable(),
  advanceDate: z.string().optional().nullable(),
  totalAmount: z.number().min(0).optional(),
  amountSettled: z.number().min(0).optional(),
  advanceIncludedInSettled: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status") as PaymentStatus | null;
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (category && category !== "ALL") {
      where.category = category.toUpperCase();
    }
    if (search) {
      where.OR = [
        { transactionNumber: { contains: search } },
        { weaverName: { contains: search } },
        { weaverLocation: { contains: search } },
        { loomReference: { contains: search } },
        { party: { name: { contains: search } } },
      ];
    }
    if (status) where.paymentStatus = status;

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    const records = await prisma.powerloomTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: {
        party: true,
        bankAccount: true,
      },
    });

    const recordIds = records.map((r) => r.id);
    const settlements =
      recordIds.length > 0
        ? await prisma.settlement.findMany({
            where: {
              section: SectionType.POWERLOOM,
              entityType: "PowerloomTransaction",
              entityId: { in: recordIds },
            },
            orderBy: { settlementDate: "desc" },
            include: { bankAccount: true },
          })
        : [];

    let totalCredited = 0;
    let amountSettled = 0;
    let amountOutstanding = 0;

    for (const r of records) {
      totalCredited = add(totalCredited, r.totalAmount);
      amountSettled = add(amountSettled, r.amountSettled);
      amountOutstanding = add(amountOutstanding, r.outstandingAmount);
    }

    return NextResponse.json({
      summary: {
        totalCredited: round2(totalCredited),
        amountSettled: round2(amountSettled),
        amountOutstanding: round2(amountOutstanding),
      },
      records: records.map((r) => {
        const recSettlements = settlements.filter((s) => s.entityId === r.id);
        const remBalance = Math.max(0, round2(sub(r.totalAmount, r.amountSettled)));
        return {
          ...r,
          category: r.category || "VETTI",
          advanceDate: r.advanceDate ? r.advanceDate.toISOString() : null,
          totalAmount: round2(r.totalAmount),
          amountSettled: round2(r.amountSettled),
          outstandingAmount: remBalance,
          remainingBalance: remBalance,
          grossWages: round2(r.grossWages || r.totalAmount),
          advancePaid: round2(r.advancePaid || 0),
          settlements: recSettlements,
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch powerloom transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPowerloomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const {
      category,
      weaverName,
      weaverLocation,
      loomReference,
      noOfPaavu,
      totalMeters,
      wageRate,
      weftBags,
      weftKg,
      bobbinSets,
      advancePaid,
      dueDate,
      notes,
      attachmentUrl,
      partyId,
    } = parsed.data;

    let { bankAccountId, paymentMethod } = parsed.data;
    if (bankAccountId === "society_liquid_cash") {
      paymentMethod = "LIQUID_CASH";
    }

    const transactionNumber =
      parsed.data.transactionNumber || generateRef(category === "VETTI" ? "PL-VET" : "PL-SAR");
    const txnDate = parsed.data.transactionDate ? new Date(parsed.data.transactionDate) : new Date();

    // Calculation: Gross Wages = totalMeters * wageRate (or fallback to productionQuantity * rate)
    const effectiveMeters = totalMeters > 0 ? totalMeters : (parsed.data.productionQuantity || 0);
    const effectiveRate = wageRate > 0 ? wageRate : (parsed.data.rate || 0);

    let grossWages = round2(mul(effectiveMeters, effectiveRate));
    if (grossWages <= 0 && parsed.data.grossWages) {
      grossWages = round2(parsed.data.grossWages);
    }

    // Advance automatically reduces from the gross wages to calculate net payable amount to weaver
    const advance = round2(advancePaid || 0);
    const netPayable = round2(Math.max(0, sub(grossWages, advance)));

    let finalTotalAmount: number;
    let finalAmountSettled: number;

    if (parsed.data.totalAmount !== undefined && parsed.data.totalAmount !== null) {
      finalTotalAmount = round2(parsed.data.totalAmount);
    } else if (grossWages > 0) {
      finalTotalAmount = parsed.data.advanceIncludedInSettled ? grossWages : netPayable;
    } else {
      finalTotalAmount = advance;
    }

    if (parsed.data.amountSettled !== undefined && parsed.data.amountSettled !== null) {
      finalAmountSettled = round2(parsed.data.amountSettled);
    } else if (parsed.data.advanceIncludedInSettled) {
      finalAmountSettled = advance;
    } else {
      finalAmountSettled = 0;
    }

    const finalOutstanding = Math.max(0, round2(sub(finalTotalAmount, finalAmountSettled)));
    const finalStatus =
      finalOutstanding <= 0
        ? PaymentStatus.PAID
        : finalAmountSettled > 0
        ? PaymentStatus.PARTIALLY_PAID
        : PaymentStatus.PENDING;

    // Check liquid cash balance if paying advance via liquid cash
    if (advance > 0 && paymentMethod === "LIQUID_CASH") {
      const liquidAccount = await prisma.liquidCashAccount.findUnique({
        where: { id: "society_liquid_cash" },
      });
      const currentCashBalance = liquidAccount?.currentBalance || 0;
      if (currentCashBalance < advance) {
        return NextResponse.json(
          {
            error: `Insufficient Liquid Cash balance (₹${currentCashBalance.toLocaleString(
              "en-IN"
            )}) for advance payment of ₹${advance.toLocaleString("en-IN")}.`,
          },
          { status: 400 }
        );
      }
    }

    let transactionId: string | null = null;

    // Handle cash/bank outflow if new advance is paid today
    if (advance > 0) {
      if (paymentMethod === "LIQUID_CASH") {
        await createLiquidCashEntry({
          type: "CASH_OUT",
          amount: advance,
          category: "POWERLOOM_ADVANCE",
          description: `Powerloom Advance: ${weaverName} (${transactionNumber})`,
          notes: notes || undefined,
          userId: user.id,
          entryDate: parsed.data.advanceDate ? new Date(parsed.data.advanceDate) : txnDate,
        });
        bankAccountId = null;
      } else if (bankAccountId && bankAccountId !== "society_liquid_cash" && paymentMethod !== "EXISTING_ADVANCE") {
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: { decrement: advance } },
        });
      }
    }

    // Double-entry accounting:
    if (grossWages > 0 || advance > 0) {
      const financialAmount = grossWages > 0 ? grossWages : advance;
      const lines: any[] = [];

      if (grossWages > 0) {
        lines.push({
          accountCode: "5000",
          accountName: `Powerloom Weaving Expense (${category})`,
          section: SectionType.POWERLOOM,
          debit: grossWages,
          credit: 0,
        });
        if (advance > 0) {
          if (paymentMethod === "LIQUID_CASH") {
            lines.push({
              accountCode: "1010",
              accountName: "Society Liquid Cash",
              section: SectionType.POWERLOOM,
              debit: 0,
              credit: advance,
            });
          } else if (bankAccountId && paymentMethod !== "EXISTING_ADVANCE") {
            lines.push({
              accountCode: "1020",
              accountName: "Bank Account",
              section: SectionType.POWERLOOM,
              debit: 0,
              credit: advance,
            });
          } else {
            lines.push({
              accountCode: "2000",
              accountName: "Weaver Advance Applied",
              section: SectionType.POWERLOOM,
              debit: 0,
              credit: advance,
            });
          }
        }
        if (netPayable > 0) {
          lines.push({
            accountCode: "2000",
            accountName: "Accounts Payable (Powerloom Weavers)",
            section: SectionType.POWERLOOM,
            debit: 0,
            credit: netPayable,
          });
        }
      } else {
        // Pure advance payment
        lines.push({
          accountCode: "2000",
          accountName: "Weaver Advance",
          section: SectionType.POWERLOOM,
          debit: advance,
          credit: 0,
        });
        if (paymentMethod === "LIQUID_CASH") {
          lines.push({
            accountCode: "1010",
            accountName: "Society Liquid Cash",
            section: SectionType.POWERLOOM,
            debit: 0,
            credit: advance,
          });
        } else {
          lines.push({
            accountCode: "1020",
            accountName: "Bank Account",
            section: SectionType.POWERLOOM,
            debit: 0,
            credit: advance,
          });
        }
      }

      const { transaction } = await postTransaction({
        referenceNo: `TXN-${transactionNumber}`,
        transactionDate: txnDate,
        section: SectionType.POWERLOOM,
        type: TransactionType.EXPENSE_RECORDED,
        direction: Direction.CREDIT,
        amount: financialAmount,
        counterparty: `${weaverName || "Powerloom Weaver"} (${weaverLocation || category})`,
        notes: `${category} Powerloom: ${noOfPaavu} Paavu, ${effectiveMeters}m @ ₹${effectiveRate}/m, Adv: ₹${advance}, Net Total: ₹${finalTotalAmount}`,
        userId: user.id,
        lines,
      });
      transactionId = transaction.id;
    }

    const plRecord = await prisma.powerloomTransaction.create({
      data: {
        transactionNumber,
        transactionDate: txnDate,
        category,
        weaverName: weaverName || "General Powerloom",
        weaverLocation: weaverLocation || null,
        loomReference: loomReference || null,
        noOfPaavu,
        totalMeters: effectiveMeters,
        wageRate: effectiveRate,
        grossWages,
        weftBags,
        weftKg,
        bobbinSets,
        advanceDate: parsed.data.advanceDate ? new Date(parsed.data.advanceDate) : (advance > 0 ? txnDate : null),
        advancePaid: advance,
        productionQuantity: effectiveMeters,
        rate: effectiveRate,
        totalAmount: finalTotalAmount,
        amountSettled: finalAmountSettled,
        outstandingAmount: finalOutstanding,
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentStatus: finalStatus,
        bankAccountId: bankAccountId || null,
        notes: notes || null,
        attachmentUrl: attachmentUrl || null,
        partyId: partyId || null,
        transactionId,
      },
      include: { party: true },
    });

    if (parsed.data.advanceIncludedInSettled && finalAmountSettled > 0) {
      await prisma.settlement.create({
        data: {
          settlementNumber: generateRef("SET-ADV"),
          settlementDate: parsed.data.advanceDate ? new Date(parsed.data.advanceDate) : txnDate,
          section: SectionType.POWERLOOM,
          entityType: "PowerloomTransaction",
          entityId: plRecord.id,
          partyId: plRecord.partyId || null,
          amount: finalAmountSettled,
          paymentMethod: paymentMethod === "LIQUID_CASH" ? "LIQUID_CASH" : "EXISTING_ADVANCE",
          bankAccountId: bankAccountId || null,
          referenceNo: `ADV-${transactionNumber}`,
          notes: "Advance applied towards settlement",
          transactionId,
          createdById: user.id,
        },
      });
    }

    return NextResponse.json({ success: true, record: plRecord }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create powerloom record" }, { status: 500 });
  }
}

