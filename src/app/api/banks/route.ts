import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageBankAccounts } from "@/lib/auth";
import { maskAccountNumber, round2, toDecimal } from "@/lib/decimal";
import { z } from "zod";
import { AccountStatus, AccountType } from "@prisma/client";

const createBankSchema = z.object({
  bankName: z.string().min(2),
  accountName: z.string().min(2),
  accountNumber: z.string().min(4),
  branchName: z.string().min(2),
  ifscCode: z.string().min(4),
  accountType: z.enum(["SAVINGS", "CURRENT", "OVERDRAFT", "CASH"]).default("CURRENT"),
  openingBalance: z.number().default(0),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  try {
    const accounts = await prisma.bankAccount.findMany({
      orderBy: { currentBalance: "asc" },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    const formatted = accounts.map((acc) => ({
      ...acc,
      maskedAccountNumber: maskAccountNumber(acc.accountNumber),
      currentBalance: round2(acc.currentBalance),
      openingBalance: round2(acc.openingBalance),
      statementBalance: acc.statementBalance ? round2(acc.statementBalance) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch bank accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageBankAccounts(user.role)) {
      return NextResponse.json({ error: "Unauthorized: Insufficient permissions to manage bank accounts." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBankSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid bank account details", details: parsed.error.issues }, { status: 400 });
    }

    const { bankName, accountName, accountNumber, branchName, ifscCode, accountType, openingBalance, isDefault } = parsed.data;

    const opBal = round2(openingBalance);
    const newAccount = await prisma.bankAccount.create({
      data: {
        bankName,
        accountName,
        accountNumber,
        branchName,
        ifscCode,
        accountType: accountType as AccountType,
        openingBalance: opBal,
        currentBalance: opBal,
        statementBalance: opBal,
        status: AccountStatus.ACTIVE,
        isDefault,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE_BANK_ACCOUNT",
        entityType: "BankAccount",
        entityId: newAccount.id,
        performedById: user.id,
        details: JSON.stringify({ bankName, accountName, openingBalance: opBal }),
      },
    });

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create bank account" }, { status: 500 });
  }
}
