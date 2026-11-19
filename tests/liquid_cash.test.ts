import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
const db = prisma as any;
import {
  getLiquidCashDetails,
  createLiquidCashEntry,
  revokeLiquidCashEntry,
} from "../src/lib/liquid-cash";
import { AccountType, Role } from "@prisma/client";

describe("Liquid Cash Operations & Revocation Tests", () => {
  let testUser: any;
  let testBank: any;

  beforeEach(async () => {
    // Clean up test records and isolate liquid cash balance to 0
    await db.liquidCashEntry.deleteMany({});
    await prisma.liquidCashAccount.upsert({
      where: { id: "society_liquid_cash" },
      update: { currentBalance: 0 },
      create: {
        id: "society_liquid_cash",
        accountName: "Society Liquid Cash (கையிருப்பு ரொக்கம்)",
        currentBalance: 0,
      },
    });
    await prisma.bankAccount.deleteMany({
      where: { accountNumber: "CNRB12345678" },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "_test" } },
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: "accountant_test@cheran.coop",
        passwordHash: "dummyhash",
        fullName: "Test Accountant",
        role: Role.ACCOUNTANT,
      },
    });

    // Create a test bank account
    testBank = await prisma.bankAccount.create({
      data: {
        bankName: "Canara Bank",
        accountName: "Treasury Operational A/c",
        accountNumber: "CNRB12345678",
        branchName: "Erode Main",
        ifscCode: "CNRB0001122",
        accountType: AccountType.CURRENT,
        openingBalance: 100000,
        currentBalance: 100000,
      },
    });
  });

  it("1. Initialize liquid cash account with 0 balance", async () => {
    const details = await getLiquidCashDetails();
    expect(details.account.currentBalance).toBe(0);
    expect(details.entries).toHaveLength(0);
    expect(details.stats.activeCount).toBe(0);
  });

  it("2. Update Liquid Cash: Cash In adds to balance", async () => {
    const { entry, account } = await createLiquidCashEntry({
      type: "CASH_IN",
      amount: 15000,
      category: "DIRECT_COLLECTION",
      description: "Direct cash sales collected at counter",
      userId: testUser.id,
    });

    expect(entry.status).toBe("ACTIVE");
    expect(entry.amount).toBe(15000);
    expect(entry.balanceBefore).toBe(0);
    expect(entry.balanceAfter).toBe(15000);
    expect(account.currentBalance).toBe(15000);

    const details = await getLiquidCashDetails();
    expect(details.stats.currentBalance).toBe(15000);
    expect(details.stats.totalCashIn).toBe(15000);
    expect(details.stats.activeCount).toBe(1);
  });

  it("3. Update Liquid Cash: Cash Out deducts from balance", async () => {
    // Setup initial cash
    await createLiquidCashEntry({
      type: "CASH_IN",
      amount: 20000,
      category: "INITIAL",
      description: "Opening cash in hand",
      userId: testUser.id,
    });

    // Spend petty cash
    const { entry, account } = await createLiquidCashEntry({
      type: "CASH_OUT",
      amount: 3500,
      category: "PETTY_EXPENSE",
      description: "Purchased office stationery and tea expenses",
      userId: testUser.id,
    });

    expect(entry.amount).toBe(3500);
    expect(entry.balanceBefore).toBe(20000);
    expect(entry.balanceAfter).toBe(16500);
    expect(account.currentBalance).toBe(16500);

    const details = await getLiquidCashDetails();
    expect(details.stats.currentBalance).toBe(16500);
    expect(details.stats.totalCashIn).toBe(20000);
    expect(details.stats.totalCashOut).toBe(3500);
  });

  it("4. Linked Bank Cash Withdrawal: Updates both Liquid Cash and Bank Account", async () => {
    // Draw ₹25,000 from Canara Bank into liquid cash
    const { entry, account } = await createLiquidCashEntry({
      type: "CASH_IN",
      amount: 25000,
      category: "CASH_DRAWN_FROM_BANK",
      description: "Cash withdrawal from Canara Bank for weekly wages",
      bankAccountId: testBank.id,
      userId: testUser.id,
    });

    expect(account.currentBalance).toBe(25000);

    // Verify Bank Account balance reduced from ₹1,00,000 to ₹75,000
    const updatedBank = await prisma.bankAccount.findUnique({
      where: { id: testBank.id },
    });
    expect(updatedBank?.currentBalance).toBe(75000);
  });

  it("5. Revoke Liquid Cash Entry: Restores balances and creates audit trail", async () => {
    // Add Cash drawn from bank: ₹10,000
    const { entry } = await createLiquidCashEntry({
      type: "CASH_IN",
      amount: 10000,
      category: "CASH_DRAWN_FROM_BANK",
      description: "Accidental double entry",
      bankAccountId: testBank.id,
      userId: testUser.id,
    });

    // Check balances before revocation
    let details = await getLiquidCashDetails();
    expect(details.stats.currentBalance).toBe(10000);
    let bank = await prisma.bankAccount.findUnique({ where: { id: testBank.id } });
    expect(bank?.currentBalance).toBe(90000);

    // End user revokes the entry
    const revokeResult = await revokeLiquidCashEntry(
      entry.id,
      "Duplicate entry recorded by error",
      testUser.id
    );

    expect(revokeResult.success).toBe(true);
    expect(revokeResult.restoredBalance).toBe(0);
    expect(revokeResult.entry.status).toBe("REVOKED");
    expect(revokeResult.entry.revocationReason).toBe("Duplicate entry recorded by error");

    // Liquid cash balance restored to 0
    details = await getLiquidCashDetails();
    expect(details.stats.currentBalance).toBe(0);
    expect(details.stats.activeCount).toBe(0);
    expect(details.stats.revokedCount).toBe(1);

    // Bank balance restored to ₹1,00,000
    bank = await prisma.bankAccount.findUnique({ where: { id: testBank.id } });
    expect(bank?.currentBalance).toBe(100000);

    // Audit log was recorded
    const audit = await prisma.auditLog.findFirst({
      where: { action: "REVOKE_LIQUID_CASH_ENTRY", entityId: entry.id },
    });
    expect(audit).not.toBeNull();
    expect(audit?.entityId).toBe(entry.id);
  });

  it("6. Disallow double revocation of the same entry", async () => {
    const { entry } = await createLiquidCashEntry({
      type: "CASH_IN",
      amount: 5000,
      category: "GENERAL",
      description: "Test cash",
      userId: testUser.id,
    });

    await revokeLiquidCashEntry(entry.id, "First revocation", testUser.id);

    // Second revocation should fail
    await expect(
      revokeLiquidCashEntry(entry.id, "Second revocation", testUser.id)
    ).rejects.toThrow("already been revoked");
  });

  it("7. Balance Adjustment works and can be revoked", async () => {
    // Initial cash
    await createLiquidCashEntry({
      type: "CASH_IN",
      amount: 10000,
      category: "GENERAL",
      description: "Initial cash",
      userId: testUser.id,
    });

    // Adjust balance to physical count of ₹9,800
    const { entry: adjEntry, account } = await createLiquidCashEntry({
      type: "ADJUSTMENT",
      amount: 9800,
      category: "CASH_COUNT_RECONCILIATION",
      description: "Physical cash count adjustment (₹200 shortage)",
      userId: testUser.id,
    });

    expect(account.currentBalance).toBe(9800);
    expect(adjEntry.balanceBefore).toBe(10000);
    expect(adjEntry.balanceAfter).toBe(9800);

    // Revoke the adjustment
    await revokeLiquidCashEntry(adjEntry.id, "Miscount corrected", testUser.id);
    const details = await getLiquidCashDetails();
    expect(details.stats.currentBalance).toBe(10000); // Restored to balanceBefore
  });

  afterAll(async () => {
    await db.liquidCashEntry.deleteMany({
      where: { description: { contains: "test" } },
    });
    await prisma.bankAccount.deleteMany({
      where: { accountNumber: "CNRB12345678" },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "_test" } },
    });
  });
});

