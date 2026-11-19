import { prisma } from "./db";
import { toDecimal, add, sub, round2, mul, div } from "./decimal";
import {
  SectionType,
  TransactionType,
  Direction,
  TransactionStatus,
  PaymentStatus,
  Role,
} from "@prisma/client";

export interface CreateJournalLineInput {
  accountCode: string;
  accountName: string;
  section?: SectionType;
  debit: number;
  credit: number;
}

export interface UnifiedTransactionInput {
  referenceNo?: string;
  transactionDate?: Date;
  section: SectionType;
  type: TransactionType;
  direction: Direction;
  amount: number;
  counterparty?: string;
  bankAccountId?: string;
  paymentMethod?: string;
  paymentRef?: string;
  notes?: string;
  userId?: string;
  lines: CreateJournalLineInput[];
}

export function generateRef(prefix: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Validate that Debits equal Credits within precise 2-decimal arithmetic
 */
export function validateBalancedLines(lines: CreateJournalLineInput[]): boolean {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit = add(totalDebit, line.debit);
    totalCredit = add(totalCredit, line.credit);
  }
  return round2(totalDebit) === round2(totalCredit);
}

/**
 * Unified Transaction Engine:
 * Creates transaction, balances journal entry, updates bank balances, logs audit.
 */
export async function postTransaction(input: UnifiedTransactionInput) {
  if (!validateBalancedLines(input.lines)) {
    throw new Error("Accounting Integrity Error: Journal entry debits and credits do not balance.");
  }

  const ref = input.referenceNo || generateRef("TXN");
  const amount = round2(input.amount);

  return await prisma.$transaction(async (tx) => {
    // 1. Create Transaction
    const transaction = await tx.transaction.create({
      data: {
        referenceNo: ref,
        transactionDate: input.transactionDate || new Date(),
        section: input.section,
        type: input.type,
        direction: input.direction,
        amount: amount,
        counterparty: input.counterparty,
        bankAccountId: input.bankAccountId,
        paymentMethod: input.paymentMethod || "BANK_TRANSFER",
        paymentRef: input.paymentRef,
        status: TransactionStatus.POSTED,
        notes: input.notes,
        createdById: input.userId,
      },
    });

    // 2. Create Journal Entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber: generateRef("JE"),
        date: input.transactionDate || new Date(),
        description: input.notes || `${input.type} - ${input.section}`,
        transactionId: transaction.id,
        status: "POSTED",
        lines: {
          create: input.lines.map((l) => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            section: l.section || input.section,
            debit: round2(l.debit),
            credit: round2(l.credit),
          })),
        },
      },
    });

    // 3. Update Bank Balance if a bank account is involved in cash flow
    if (input.bankAccountId) {
      const bank = await tx.bankAccount.findUnique({
        where: { id: input.bankAccountId },
      });

      if (bank) {
        let newBalance = bank.currentBalance;
        if (input.direction === Direction.DEBIT) {
          // Cash inflow (money received into bank)
          newBalance = add(bank.currentBalance, amount);
        } else if (input.direction === Direction.CREDIT) {
          // Cash outflow (money paid from bank)
          newBalance = sub(bank.currentBalance, amount);
        }

        await tx.bankAccount.update({
          where: { id: bank.id },
          data: { currentBalance: newBalance },
        });
      }
    }

    // 4. Audit Log
    if (input.userId) {
      await tx.auditLog.create({
        data: {
          action: "CREATE_TRANSACTION",
          entityType: "Transaction",
          entityId: transaction.id,
          performedById: input.userId,
          details: JSON.stringify({
            referenceNo: transaction.referenceNo,
            amount: transaction.amount,
            section: transaction.section,
            type: transaction.type,
          }),
        },
      });
    }

    return { transaction, journalEntry };
  });
}

/**
 * Internal Transfer between society-owned accounts:
 * - Bank Account to Bank Account
 * - Bank Account to Liquid Cash (Bank debit / cash withdrawal for society vault)
 * - Liquid Cash to Bank Account (Cash deposit into bank account)
 * In all cases, consolidated treasury balance (Banks + Liquid Cash) remains unchanged.
 */
export async function executeInternalBankTransfer(params: {
  fromBankAccountId: string;
  toBankAccountId: string;
  amount: number;
  transferDate?: Date;
  referenceNo?: string;
  notes?: string;
  userId?: string;
}) {
  const amt = round2(params.amount);
  if (amt <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const isFromCash =
    params.fromBankAccountId === "LIQUID_CASH" ||
    params.fromBankAccountId === "society_liquid_cash";
  const isToCash =
    params.toBankAccountId === "LIQUID_CASH" ||
    params.toBankAccountId === "society_liquid_cash";

  if (isFromCash && isToCash) {
    throw new Error("Source and destination accounts cannot both be Liquid Cash.");
  }
  if (params.fromBankAccountId === params.toBankAccountId) {
    throw new Error("Source and destination accounts cannot be the same.");
  }

  return await prisma.$transaction(async (tx) => {
    // -------------------------------------------------------------
    // CASE 1: BANK -> LIQUID CASH (Withdraw cash from bank to vault)
    // -------------------------------------------------------------
    if (!isFromCash && isToCash) {
      const fromBank = await tx.bankAccount.findUnique({
        where: { id: params.fromBankAccountId },
      });
      if (!fromBank) {
        throw new Error("Source bank account does not exist.");
      }
      if (fromBank.currentBalance < amt) {
        throw new Error(
          `Insufficient balance in ${fromBank.accountName}. Available: ₹${fromBank.currentBalance.toLocaleString("en-IN")}`
        );
      }

      let cashAccount = await tx.liquidCashAccount.findUnique({
        where: { id: "society_liquid_cash" },
      });
      if (!cashAccount) {
        cashAccount = await tx.liquidCashAccount.create({
          data: {
            id: "society_liquid_cash",
            accountName: "Society Liquid Cash",
            currentBalance: 0.0,
          },
        });
      }

      const ref = params.referenceNo || generateRef("WDL");
      const voucher = `LC-WDL-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Transaction
      const transaction = await tx.transaction.create({
        data: {
          referenceNo: ref,
          transactionDate: params.transferDate || new Date(),
          section: SectionType.BANK_TRANSFER,
          type: TransactionType.INTERNAL_TRANSFER,
          direction: Direction.DEBIT,
          amount: amt,
          counterparty: `${fromBank.accountName} -> Society Liquid Cash`,
          bankAccountId: fromBank.id,
          paymentMethod: "INTERNAL_TRANSFER",
          status: TransactionStatus.POSTED,
          notes:
            params.notes ||
            `Bank withdrawal to Liquid Cash vault from ${fromBank.accountName}`,
          createdById: params.userId,
        },
      });

      // 2. Liquid Cash Entry
      await tx.liquidCashEntry.create({
        data: {
          voucherNo: voucher,
          entryDate: params.transferDate || new Date(),
          type: "CASH_IN",
          category: "BANK_WITHDRAWAL",
          amount: amt,
          balanceBefore: round2(cashAccount.currentBalance),
          balanceAfter: add(cashAccount.currentBalance, amt),
          description: `Cash withdrawn from ${fromBank.accountName} (${fromBank.bankName}) into Liquid Cash Vault`,
          notes: params.notes || "Bank debit into Society Liquid Cash",
          status: "ACTIVE",
          accountId: cashAccount.id,
          bankAccountId: fromBank.id,
          createdById: params.userId,
        },
      });

      // 3. Journal Entry (Debit: Cash on Hand, Credit: Bank)
      await tx.journalEntry.create({
        data: {
          entryNumber: generateRef("JE"),
          date: params.transferDate || new Date(),
          description: `Cash withdrawal from ${fromBank.accountName} to Liquid Cash`,
          transactionId: transaction.id,
          status: "POSTED",
          lines: {
            create: [
              {
                accountCode: "1010-CASH",
                accountName: "Society Liquid Cash",
                section: SectionType.BANK_TRANSFER,
                debit: amt,
                credit: 0,
              },
              {
                accountCode: `1020-${fromBank.id.slice(-4)}`,
                accountName: `Bank: ${fromBank.accountName}`,
                section: SectionType.BANK_TRANSFER,
                debit: 0,
                credit: amt,
              },
            ],
          },
        },
      });

      // 4. Update balances
      await tx.bankAccount.update({
        where: { id: fromBank.id },
        data: { currentBalance: sub(fromBank.currentBalance, amt) },
      });

      await tx.liquidCashAccount.update({
        where: { id: cashAccount.id },
        data: { currentBalance: add(cashAccount.currentBalance, amt) },
      });

      // 5. Audit Log
      if (params.userId) {
        await tx.auditLog.create({
          data: {
            action: "INTERNAL_TRANSFER_BANK_TO_CASH",
            entityType: "Transaction",
            entityId: transaction.id,
            performedById: params.userId,
            details: JSON.stringify({
              from: fromBank.accountName,
              to: "Society Liquid Cash",
              amount: amt,
              referenceNo: ref,
            }),
          },
        });
      }

      return transaction;
    }

    // -------------------------------------------------------------
    // CASE 2: LIQUID CASH -> BANK (Deposit cash from vault into bank)
    // -------------------------------------------------------------
    if (isFromCash && !isToCash) {
      const toBank = await tx.bankAccount.findUnique({
        where: { id: params.toBankAccountId },
      });
      if (!toBank) {
        throw new Error("Destination bank account does not exist.");
      }

      let cashAccount = await tx.liquidCashAccount.findUnique({
        where: { id: "society_liquid_cash" },
      });
      if (!cashAccount) {
        cashAccount = await tx.liquidCashAccount.create({
          data: {
            id: "society_liquid_cash",
            accountName: "Society Liquid Cash",
            currentBalance: 0.0,
          },
        });
      }

      if (cashAccount.currentBalance < amt) {
        throw new Error(
          `Insufficient liquid cash on hand. Available: ₹${cashAccount.currentBalance.toLocaleString("en-IN")}`
        );
      }

      const ref = params.referenceNo || generateRef("DEP");
      const voucher = `LC-DEP-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Transaction
      const transaction = await tx.transaction.create({
        data: {
          referenceNo: ref,
          transactionDate: params.transferDate || new Date(),
          section: SectionType.BANK_TRANSFER,
          type: TransactionType.INTERNAL_TRANSFER,
          direction: Direction.CREDIT,
          amount: amt,
          counterparty: `Society Liquid Cash -> ${toBank.accountName}`,
          bankAccountId: toBank.id,
          paymentMethod: "INTERNAL_TRANSFER",
          status: TransactionStatus.POSTED,
          notes:
            params.notes ||
            `Cash deposit into ${toBank.accountName} from Liquid Cash Vault`,
          createdById: params.userId,
        },
      });

      // 2. Liquid Cash Entry
      await tx.liquidCashEntry.create({
        data: {
          voucherNo: voucher,
          entryDate: params.transferDate || new Date(),
          type: "CASH_OUT",
          category: "BANK_DEPOSIT",
          amount: amt,
          balanceBefore: round2(cashAccount.currentBalance),
          balanceAfter: sub(cashAccount.currentBalance, amt),
          description: `Cash deposited into ${toBank.accountName} (${toBank.bankName}) from Liquid Cash Vault`,
          notes: params.notes || "Liquid cash deposited into bank account",
          status: "ACTIVE",
          accountId: cashAccount.id,
          bankAccountId: toBank.id,
          createdById: params.userId,
        },
      });

      // 3. Journal Entry (Debit: Bank, Credit: Cash on Hand)
      await tx.journalEntry.create({
        data: {
          entryNumber: generateRef("JE"),
          date: params.transferDate || new Date(),
          description: `Cash deposit from Liquid Cash to ${toBank.accountName}`,
          transactionId: transaction.id,
          status: "POSTED",
          lines: {
            create: [
              {
                accountCode: `1020-${toBank.id.slice(-4)}`,
                accountName: `Bank: ${toBank.accountName}`,
                section: SectionType.BANK_TRANSFER,
                debit: amt,
                credit: 0,
              },
              {
                accountCode: "1010-CASH",
                accountName: "Society Liquid Cash",
                section: SectionType.BANK_TRANSFER,
                debit: 0,
                credit: amt,
              },
            ],
          },
        },
      });

      // 4. Update balances
      await tx.liquidCashAccount.update({
        where: { id: cashAccount.id },
        data: { currentBalance: sub(cashAccount.currentBalance, amt) },
      });

      await tx.bankAccount.update({
        where: { id: toBank.id },
        data: { currentBalance: add(toBank.currentBalance, amt) },
      });

      // 5. Audit Log
      if (params.userId) {
        await tx.auditLog.create({
          data: {
            action: "INTERNAL_TRANSFER_CASH_TO_BANK",
            entityType: "Transaction",
            entityId: transaction.id,
            performedById: params.userId,
            details: JSON.stringify({
              from: "Society Liquid Cash",
              to: toBank.accountName,
              amount: amt,
              referenceNo: ref,
            }),
          },
        });
      }

      return transaction;
    }

    // -------------------------------------------------------------
    // CASE 3: BANK -> BANK (Standard transfer between society bank accounts)
    // -------------------------------------------------------------
    const fromBank = await tx.bankAccount.findUnique({
      where: { id: params.fromBankAccountId },
    });
    const toBank = await tx.bankAccount.findUnique({
      where: { id: params.toBankAccountId },
    });

    if (!fromBank || !toBank) {
      throw new Error("One or both bank accounts do not exist.");
    }
    if (fromBank.currentBalance < amt) {
      throw new Error(
        `Insufficient balance in ${fromBank.accountName}. Available: ₹${fromBank.currentBalance.toLocaleString("en-IN")}`
      );
    }

    const ref = params.referenceNo || generateRef("TRF");

    // Create Transfer Transaction
    const transaction = await tx.transaction.create({
      data: {
        referenceNo: ref,
        transactionDate: params.transferDate || new Date(),
        section: SectionType.BANK_TRANSFER,
        type: TransactionType.INTERNAL_TRANSFER,
        direction: Direction.DEBIT, // Neutral/internal
        amount: amt,
        counterparty: `${fromBank.accountName} -> ${toBank.accountName}`,
        bankAccountId: toBank.id,
        paymentMethod: "INTERNAL_TRANSFER",
        status: TransactionStatus.POSTED,
        notes:
          params.notes ||
          `Internal transfer of ${amt} from ${fromBank.accountName} to ${toBank.accountName}`,
        createdById: params.userId,
      },
    });

    // Journal Entry: Debit Destination Bank, Credit Source Bank
    await tx.journalEntry.create({
      data: {
        entryNumber: generateRef("JE"),
        date: params.transferDate || new Date(),
        description: `Transfer from ${fromBank.accountName} to ${toBank.accountName}`,
        transactionId: transaction.id,
        status: "POSTED",
        lines: {
          create: [
            {
              accountCode: `1020-${toBank.id.slice(-4)}`,
              accountName: `Bank: ${toBank.accountName}`,
              section: SectionType.BANK_TRANSFER,
              debit: amt,
              credit: 0,
            },
            {
              accountCode: `1020-${fromBank.id.slice(-4)}`,
              accountName: `Bank: ${fromBank.accountName}`,
              section: SectionType.BANK_TRANSFER,
              debit: 0,
              credit: amt,
            },
          ],
        },
      },
    });

    // Update both bank balances:
    // fromBank decreases by amt, toBank increases by amt
    await tx.bankAccount.update({
      where: { id: fromBank.id },
      data: { currentBalance: sub(fromBank.currentBalance, amt) },
    });

    await tx.bankAccount.update({
      where: { id: toBank.id },
      data: { currentBalance: add(toBank.currentBalance, amt) },
    });

    // Audit Log
    if (params.userId) {
      await tx.auditLog.create({
        data: {
          action: "INTERNAL_BANK_TRANSFER",
          entityType: "Transaction",
          entityId: transaction.id,
          performedById: params.userId,
          details: JSON.stringify({
            from: fromBank.accountName,
            to: toBank.accountName,
            amount: amt,
            referenceNo: ref,
          }),
        },
      });
    }

    return transaction;
  });
}


/**
 * Reversal Engine:
 * Reverses a posted transaction, creating compensating journal lines, restoring balances.
 * Preserves the original record and audit trail.
 */
export async function reverseTransaction(transactionId: string, reason: string, userId?: string) {
  return await prisma.$transaction(async (tx) => {
    const original = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        journalEntries: {
          include: { lines: true },
        },
      },
    });

    if (!original) {
      throw new Error("Transaction not found.");
    }
    if (original.status === TransactionStatus.REVERSED) {
      throw new Error("Transaction has already been reversed.");
    }

    const reversalRef = `REV-${original.referenceNo}`;

    // Mark original as REVERSED
    await tx.transaction.update({
      where: { id: original.id },
      data: { status: TransactionStatus.REVERSED },
    });

    // Create Reversal Transaction
    const reversalTx = await tx.transaction.create({
      data: {
        referenceNo: reversalRef,
        transactionDate: new Date(),
        section: original.section,
        type: TransactionType.REVERSAL,
        direction: original.direction === Direction.DEBIT ? Direction.CREDIT : Direction.DEBIT,
        amount: original.amount,
        counterparty: original.counterparty,
        bankAccountId: original.bankAccountId,
        paymentMethod: original.paymentMethod,
        paymentRef: original.paymentRef,
        status: TransactionStatus.POSTED,
        notes: `Reversal of ${original.referenceNo}: ${reason}`,
        createdById: userId,
        reversalOfId: original.id,
      },
    });

    // Swap Debits and Credits in Reversing Journal Entry
    const originalJE = original.journalEntries[0];
    if (originalJE) {
      await tx.journalEntry.create({
        data: {
          entryNumber: generateRef("JE-REV"),
          date: new Date(),
          description: `Compensating Entry for Reversal of ${original.referenceNo}`,
          transactionId: reversalTx.id,
          status: "POSTED",
          lines: {
            create: originalJE.lines.map((line) => ({
              accountCode: line.accountCode,
              accountName: line.accountName,
              section: line.section,
              debit: line.credit, // SWAP
              credit: line.debit, // SWAP
            })),
          },
        },
      });
    }

    // Revert Bank Account Balance if applicable
    if (original.bankAccountId) {
      const bank = await tx.bankAccount.findUnique({ where: { id: original.bankAccountId } });
      if (bank) {
        let restoredBalance = bank.currentBalance;
        if (original.direction === Direction.DEBIT) {
          // Original added money to bank -> Reversal removes it
          restoredBalance = sub(bank.currentBalance, original.amount);
        } else if (original.direction === Direction.CREDIT) {
          // Original removed money from bank -> Reversal returns it
          restoredBalance = add(bank.currentBalance, original.amount);
        }

        await tx.bankAccount.update({
          where: { id: bank.id },
          data: { currentBalance: restoredBalance },
        });
      }
    }

    // Check if this transaction had an associated Settlement and restore bill/wage balances
    const settlements = await tx.settlement.findMany({
      where: { transactionId: original.id },
    });

    for (const s of settlements) {
      if (s.section === SectionType.SIZING_BILL) {
        const bill = await tx.sizingBill.findUnique({ where: { id: s.entityId } });
        if (bill) {
          const newSettled = sub(bill.amountSettled, s.amount);
          const newOutstanding = add(bill.outstandingAmount, s.amount);
          await tx.sizingBill.update({
            where: { id: bill.id },
            data: {
              amountSettled: newSettled,
              outstandingAmount: newOutstanding,
              paymentStatus: newSettled <= 0 ? PaymentStatus.PENDING : PaymentStatus.PARTIALLY_PAID,
            },
          });
        }
      } else if (s.section === SectionType.POWERLOOM) {
        const pl = await tx.powerloomTransaction.findUnique({ where: { id: s.entityId } });
        if (pl) {
          const newSettled = sub(pl.amountSettled, s.amount);
          const newOutstanding = add(pl.outstandingAmount, s.amount);
          await tx.powerloomTransaction.update({
            where: { id: pl.id },
            data: {
              amountSettled: newSettled,
              outstandingAmount: newOutstanding,
              paymentStatus: newSettled <= 0 ? PaymentStatus.PENDING : PaymentStatus.PARTIALLY_PAID,
            },
          });
        }
      } else if (s.section === SectionType.DAILY_WAGE) {
        const wage = await tx.wageRecord.findUnique({ where: { id: s.entityId } });
        if (wage) {
          const newPaid = sub(wage.amountPaid, s.amount);
          const newOutstanding = add(wage.outstandingWages, s.amount);
          await tx.wageRecord.update({
            where: { id: wage.id },
            data: {
              amountPaid: newPaid,
              outstandingWages: newOutstanding,
              paymentStatus: newPaid <= 0 ? PaymentStatus.PENDING : PaymentStatus.PARTIALLY_PAID,
            },
          });
        }
      } else if (s.section === SectionType.TRANSPORT) {
        const tr = await tx.transportBill.findUnique({ where: { id: s.entityId } });
        if (tr) {
          const newSettled = sub(tr.amountSettled, s.amount);
          const newOutstanding = add(tr.outstandingAmount, s.amount);
          await tx.transportBill.update({
            where: { id: tr.id },
            data: {
              amountSettled: newSettled,
              outstandingAmount: newOutstanding,
              paymentStatus: newSettled <= 0 ? PaymentStatus.PENDING : PaymentStatus.PARTIALLY_PAID,
            },
          });
        }
      }
    }

    // Audit Log
    if (userId) {
      await tx.auditLog.create({
        data: {
          action: "REVERSE_TRANSACTION",
          entityType: "Transaction",
          entityId: reversalTx.id,
          performedById: userId,
          details: JSON.stringify({
            originalRef: original.referenceNo,
            reversalRef: reversalRef,
            amount: original.amount,
            reason: reason,
          }),
        },
      });
    }

    return reversalTx;
  });
}
