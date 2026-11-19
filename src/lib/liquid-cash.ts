import { prisma } from "./db";
import { round2, add, sub } from "./decimal";

export interface CreateLiquidCashInput {
  type: "CASH_IN" | "CASH_OUT" | "ADJUSTMENT";
  amount: number;
  category: string;
  description: string;
  notes?: string;
  bankAccountId?: string;
  voucherNo?: string;
  entryDate?: Date;
  userId?: string;
}

export function generateVoucherNo(prefix = "LC"): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${random}`;
}

/**
 * Get or initialize Society Liquid Cash Account along with entries and stats
 */
export async function getLiquidCashDetails() {
  let account = await prisma.liquidCashAccount.findUnique({
    where: { id: "society_liquid_cash" },
  });

  if (!account) {
    account = await prisma.liquidCashAccount.create({
      data: {
        id: "society_liquid_cash",
        accountName: "Society Liquid Cash",
        currentBalance: 0.0,
      },
    });
  }

  const entries = await prisma.liquidCashEntry.findMany({
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    include: {
      bankAccount: {
        select: {
          id: true,
          bankName: true,
          accountName: true,
          accountNumber: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      revokedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  // Calculate stats from active entries
  let totalCashIn = 0;
  let totalCashOut = 0;
  let activeCount = 0;
  let revokedCount = 0;

  for (const entry of entries) {
    if (entry.status === "ACTIVE") {
      activeCount += 1;
      if (entry.type === "CASH_IN") {
        totalCashIn = add(totalCashIn, entry.amount);
      } else if (entry.type === "CASH_OUT") {
        totalCashOut = add(totalCashOut, entry.amount);
      }
    } else if (entry.status === "REVOKED") {
      revokedCount += 1;
    }
  }

  return {
    account: {
      ...account,
      currentBalance: round2(account.currentBalance),
    },
    stats: {
      currentBalance: round2(account.currentBalance),
      totalCashIn: round2(totalCashIn),
      totalCashOut: round2(totalCashOut),
      activeCount,
      revokedCount,
      totalEntries: entries.length,
    },
    entries: entries.map((e) => ({
      ...e,
      amount: round2(e.amount),
      balanceBefore: round2(e.balanceBefore),
      balanceAfter: round2(e.balanceAfter),
    })),
  };
}

/**
 * Update Liquid Cash: Record Cash In, Cash Out, or Cash Count Adjustment
 */
export async function createLiquidCashEntry(input: CreateLiquidCashInput) {
  const amt = round2(input.amount);
  if (amt <= 0 && input.type !== "ADJUSTMENT") {
    throw new Error("Amount must be greater than zero.");
  }
  if (input.type === "ADJUSTMENT" && amt < 0) {
    throw new Error("Adjusted balance cannot be negative.");
  }

  const voucher = input.voucherNo?.trim() || generateVoucherNo();

  return await prisma.$transaction(async (tx) => {
    // 1. Ensure liquid cash account exists
    let account = await tx.liquidCashAccount.findUnique({
      where: { id: "society_liquid_cash" },
    });

    if (!account) {
      account = await tx.liquidCashAccount.create({
        data: {
          id: "society_liquid_cash",
          accountName: "Society Liquid Cash",
          currentBalance: 0.0,
        },
      });
    }

    const balanceBefore = round2(account.currentBalance);
    let balanceAfter = balanceBefore;

    if (input.type === "CASH_IN") {
      balanceAfter = add(balanceBefore, amt);
    } else if (input.type === "CASH_OUT") {
      balanceAfter = sub(balanceBefore, amt);
    } else if (input.type === "ADJUSTMENT") {
      balanceAfter = amt;
    }

    // 2. Handle linked bank account if provided
    let linkedBankName = "";
    if (input.bankAccountId) {
      const bank = await tx.bankAccount.findUnique({
        where: { id: input.bankAccountId },
      });
      if (!bank) {
        throw new Error("Linked bank account not found.");
      }
      linkedBankName = bank.accountName;

      if (input.type === "CASH_IN") {
        // Cash drawn from bank into liquid cash -> bank balance decreases
        await tx.bankAccount.update({
          where: { id: bank.id },
          data: { currentBalance: sub(bank.currentBalance, amt) },
        });
      } else if (input.type === "CASH_OUT") {
        // Cash deposited from liquid cash into bank -> bank balance increases
        await tx.bankAccount.update({
          where: { id: bank.id },
          data: { currentBalance: add(bank.currentBalance, amt) },
        });
      }
    }

    // 3. Update Liquid Cash Account Balance
    const updatedAccount = await tx.liquidCashAccount.update({
      where: { id: account.id },
      data: { currentBalance: balanceAfter },
    });

    // 4. Create Entry
    const entry = await tx.liquidCashEntry.create({
      data: {
        voucherNo: voucher,
        entryDate: input.entryDate || new Date(),
        type: input.type,
        category: input.category || "GENERAL",
        amount: amt,
        balanceBefore,
        balanceAfter,
        description: input.description,
        notes: input.notes,
        status: "ACTIVE",
        accountId: account.id,
        bankAccountId: input.bankAccountId || null,
        createdById: input.userId || null,
      },
      include: {
        bankAccount: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // 5. Audit Log
    if (input.userId) {
      await tx.auditLog.create({
        data: {
          action: "UPDATE_LIQUID_CASH",
          entityType: "LiquidCashEntry",
          entityId: entry.id,
          performedById: input.userId,
          details: JSON.stringify({
            voucherNo: entry.voucherNo,
            type: entry.type,
            amount: amt,
            balanceBefore,
            balanceAfter,
            linkedBank: linkedBankName || null,
          }),
        },
      });
    }

    return {
      entry,
      account: updatedAccount,
    };
  });
}

/**
 * Revoke an existing active Liquid Cash entry
 * Restores previous balance and reverts linked bank account changes
 */
export async function revokeLiquidCashEntry(
  entryId: string,
  reason: string,
  userId?: string
) {
  if (!reason || reason.trim().length < 3) {
    throw new Error("A valid reason for revocation is required (min 3 characters).");
  }

  return await prisma.$transaction(async (tx) => {
    const entry = await tx.liquidCashEntry.findUnique({
      where: { id: entryId },
      include: { bankAccount: true },
    });

    if (!entry) {
      throw new Error("Liquid cash record not found.");
    }

    if (entry.status === "REVOKED") {
      throw new Error("This entry has already been revoked.");
    }

    const account = await tx.liquidCashAccount.findUnique({
      where: { id: entry.accountId },
    });

    if (!account) {
      throw new Error("Liquid cash account not found.");
    }

    const currentBal = round2(account.currentBalance);
    let restoredBal = currentBal;

    if (entry.type === "CASH_IN") {
      // Original entry added cash -> Revocation subtracts it
      restoredBal = sub(currentBal, entry.amount);
    } else if (entry.type === "CASH_OUT") {
      // Original entry removed cash -> Revocation adds it back
      restoredBal = add(currentBal, entry.amount);
    } else if (entry.type === "ADJUSTMENT") {
      // Original entry changed balance to entry.amount -> Restore balanceBefore
      restoredBal = entry.balanceBefore;
    }

    // Revert linked bank account if applicable
    if (entry.bankAccountId) {
      const bank = await tx.bankAccount.findUnique({
        where: { id: entry.bankAccountId },
      });
      if (bank) {
        if (entry.type === "CASH_IN") {
          // Originally cash drawn from bank (decreased bank) -> Revert adds back to bank
          await tx.bankAccount.update({
            where: { id: bank.id },
            data: { currentBalance: add(bank.currentBalance, entry.amount) },
          });
        } else if (entry.type === "CASH_OUT") {
          // Originally cash deposited to bank (increased bank) -> Revert subtracts from bank
          await tx.bankAccount.update({
            where: { id: bank.id },
            data: { currentBalance: sub(bank.currentBalance, entry.amount) },
          });
        }
      }
    }

    // Update account balance
    const updatedAccount = await tx.liquidCashAccount.update({
      where: { id: account.id },
      data: { currentBalance: restoredBal },
    });

    // Mark entry as REVOKED
    const updatedEntry = await tx.liquidCashEntry.update({
      where: { id: entry.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedById: userId || null,
        revocationReason: reason.trim(),
      },
      include: {
        bankAccount: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        revokedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Audit Log
    if (userId) {
      await tx.auditLog.create({
        data: {
          action: "REVOKE_LIQUID_CASH_ENTRY",
          entityType: "LiquidCashEntry",
          entityId: entry.id,
          performedById: userId,
          details: JSON.stringify({
            voucherNo: entry.voucherNo,
            type: entry.type,
            amount: entry.amount,
            revocationReason: reason.trim(),
            restoredBalance: restoredBal,
          }),
        },
      });
    }

    return {
      success: true,
      restoredBalance: restoredBal,
      entry: updatedEntry,
      account: updatedAccount,
    };
  });
}
