import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { add, sub, mul, div, round2, formatINR, sum } from "../src/lib/decimal";
import {
  executeInternalBankTransfer,
  postTransaction,
  reverseTransaction,
  validateBalancedLines,
} from "../src/lib/accounting";
import {
  getConsolidatedBankBalance,
  calculateProfitAnalysis,
} from "../src/lib/sections";
import {
  SectionType,
  TransactionType,
  Direction,
  AccountStatus,
  PaymentStatus,
} from "@prisma/client";

describe("Co-operative Society Accounting Engine Test Suite", () => {
  beforeEach(async () => {
    // Clean test database tables
    await prisma.journalLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.settlement.deleteMany();
    await prisma.bankReconciliation.deleteMany();
    await prisma.sizingBill.deleteMany();
    await prisma.powerloomTransaction.deleteMany();
    await prisma.wageRecord.deleteMany();
    await prisma.transportBill.deleteMany();
    await prisma.babinSetDelivery.deleteMany();
    await prisma.babinEntry.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.party.deleteMany();
    await prisma.worker.deleteMany();
    await prisma.liquidCashEntry.deleteMany();
    await prisma.liquidCashAccount.deleteMany();
    await prisma.auditLog.deleteMany();
  });

  it("Scenario 1: Bank aggregation", async () => {
    // Bank A: 500,000, Bank B: 300,000, Bank C: 200,000
    await prisma.bankAccount.create({
      data: {
        bankName: "State Bank of India",
        accountName: "Bank Account A",
        accountNumber: "112233445566",
        branchName: "Main Branch",
        ifscCode: "SBIN0001234",
        openingBalance: 500000,
        currentBalance: 500000,
        status: AccountStatus.ACTIVE,
      },
    });

    await prisma.bankAccount.create({
      data: {
        bankName: "Canara Bank",
        accountName: "Bank Account B",
        accountNumber: "998877665544",
        branchName: "Industrial Area",
        ifscCode: "CNRB0005678",
        openingBalance: 300000,
        currentBalance: 300000,
        status: AccountStatus.ACTIVE,
      },
    });

    await prisma.bankAccount.create({
      data: {
        bankName: "HDFC Bank",
        accountName: "Bank Account C",
        accountNumber: "554433221100",
        branchName: "Weavers Colony",
        ifscCode: "HDFC0009988",
        openingBalance: 200000,
        currentBalance: 200000,
        status: AccountStatus.ACTIVE,
      },
    });

    const consolidated = await getConsolidatedBankBalance();
    expect(consolidated.totalBalance).toBe(1000000);
    expect(consolidated.accounts.length).toBe(3);
  });

  it("Scenario 2: Partial settlement", async () => {
    // Bill amount: 200,000. 1st settlement: 50,000. 2nd settlement: 25,000.
    // Expected outstanding amount: 125,000.
    const party = await prisma.party.create({
      data: {
        code: "CUST-001",
        name: "Coimbatore Textiles",
        openingBalance: 0,
        currentOutstanding: 200000,
      },
    });

    const bill = await prisma.sizingBill.create({
      data: {
        billNumber: "SIZ-101",
        partyId: party.id,
        quantity: 1000,
        rate: 200,
        totalAmount: 200000,
        amountSettled: 0,
        outstandingAmount: 200000,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    // 1st Settlement of 50,000
    const settle1 = 50000;
    const billAfter1 = await prisma.sizingBill.update({
      where: { id: bill.id },
      data: {
        amountSettled: add(bill.amountSettled, settle1),
        outstandingAmount: sub(bill.outstandingAmount, settle1),
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
      },
    });

    expect(billAfter1.amountSettled).toBe(50000);
    expect(billAfter1.outstandingAmount).toBe(150000);

    // 2nd Settlement of 25,000
    const settle2 = 25000;
    const billAfter2 = await prisma.sizingBill.update({
      where: { id: bill.id },
      data: {
        amountSettled: add(billAfter1.amountSettled, settle2),
        outstandingAmount: sub(billAfter1.outstandingAmount, settle2),
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
      },
    });

    expect(billAfter2.amountSettled).toBe(75000);
    expect(billAfter2.outstandingAmount).toBe(125000);
  });

  it("Scenario 3: Wage payment", () => {
    // Gross wages: 30,000, Advances applied: 5,000, Deductions: 1,000, Payment made: 10,000
    // Expected net wages payable: 24,000
    // Expected outstanding wages: 14,000
    const grossWages = 30000;
    const advancesApplied = 5000;
    const deductions = 1000;
    const paymentMade = 10000;

    const netWagesPayable = sub(grossWages, add(advancesApplied, deductions));
    expect(netWagesPayable).toBe(24000);

    const outstandingWages = sub(netWagesPayable, paymentMade);
    expect(outstandingWages).toBe(14000);
  });

  it("Scenario 4: Internal transfer", async () => {
    // Bank A: 500,000, Bank B: 300,000. Transfer 100,000 from Bank A to Bank B.
    // Bank A -> 400,000, Bank B -> 400,000, Consolidated -> 800,000 (unchanged)
    const bankA = await prisma.bankAccount.create({
      data: {
        bankName: "SBI",
        accountName: "Bank A",
        accountNumber: "1111",
        branchName: "Main",
        ifscCode: "SBIN0001",
        openingBalance: 500000,
        currentBalance: 500000,
      },
    });

    const bankB = await prisma.bankAccount.create({
      data: {
        bankName: "Canara",
        accountName: "Bank B",
        accountNumber: "2222",
        branchName: "Branch B",
        ifscCode: "CNRB0002",
        openingBalance: 300000,
        currentBalance: 300000,
      },
    });

    const initialConsolidated = await getConsolidatedBankBalance();
    expect(initialConsolidated.totalBalance).toBe(800000);

    await executeInternalBankTransfer({
      fromBankAccountId: bankA.id,
      toBankAccountId: bankB.id,
      amount: 100000,
    });

    const updatedA = await prisma.bankAccount.findUnique({ where: { id: bankA.id } });
    const updatedB = await prisma.bankAccount.findUnique({ where: { id: bankB.id } });
    const finalConsolidated = await getConsolidatedBankBalance();

    expect(updatedA?.currentBalance).toBe(400000);
    expect(updatedB?.currentBalance).toBe(400000);
    expect(finalConsolidated.totalBalance).toBe(800000); // Unchanged!
  });

  it("Scenario 4b: Bank to Liquid Cash and Liquid Cash to Bank internal transfers", async () => {
    // Create Bank Account with 2,00,000 balance
    const bank = await prisma.bankAccount.create({
      data: {
        bankName: "Canara Bank",
        accountName: "Society Operative Bank",
        accountNumber: "99887766",
        branchName: "Erode",
        ifscCode: "CNRB0001234",
        currentBalance: 200000,
      },
    });

    // 1. Withdraw 50,000 from Bank to Liquid Cash
    await executeInternalBankTransfer({
      fromBankAccountId: bank.id,
      toBankAccountId: "LIQUID_CASH",
      amount: 50000,
      notes: "Cash withdrawal from Canara bank to office vault",
    });

    const updatedBankAfterWdl = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
    const cashAccountAfterWdl = await prisma.liquidCashAccount.findUnique({
      where: { id: "society_liquid_cash" },
    });

    expect(updatedBankAfterWdl?.currentBalance).toBe(150000);
    expect(cashAccountAfterWdl?.currentBalance).toBe(50000);

    // Verify Liquid Cash Entry was created
    const wdlEntry = await prisma.liquidCashEntry.findFirst({
      where: { type: "CASH_IN", category: "BANK_WITHDRAWAL" },
    });
    expect(wdlEntry).toBeDefined();
    expect(wdlEntry?.amount).toBe(50000);

    // 2. Deposit 20,000 from Liquid Cash back into Bank
    await executeInternalBankTransfer({
      fromBankAccountId: "LIQUID_CASH",
      toBankAccountId: bank.id,
      amount: 20000,
      notes: "Surplus cash deposited back into Canara bank",
    });

    const updatedBankAfterDep = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
    const cashAccountAfterDep = await prisma.liquidCashAccount.findUnique({
      where: { id: "society_liquid_cash" },
    });

    expect(updatedBankAfterDep?.currentBalance).toBe(170000);
    expect(cashAccountAfterDep?.currentBalance).toBe(30000);

    // Total Treasury (Bank 170k + Cash 30k) = 200k (Initial starting total)
    expect((updatedBankAfterDep?.currentBalance || 0) + (cashAccountAfterDep?.currentBalance || 0)).toBe(200000);
  });

  it("Scenario 5: Expense settlement without double counting", async () => {
    // Expense 20,000 recognized. Later paid from bank.
    // Expense is recognized exactly once. Bank decreases by 20,000. Payable is cleared.
    const bank = await prisma.bankAccount.create({
      data: {
        bankName: "Society Main Bank",
        accountName: "Current Account",
        accountNumber: "44445555",
        branchName: "City",
        ifscCode: "SBIN0009999",
        currentBalance: 100000,
      },
    });

    // Step 1: Record transport expense on credit (Dr 5200 Expense 20k, Cr 2000 AP 20k)
    await postTransaction({
      section: SectionType.TRANSPORT,
      type: TransactionType.EXPENSE_RECORDED,
      direction: Direction.CREDIT,
      amount: 20000,
      lines: [
        { accountCode: "5200", accountName: "Transport Freight Expense", debit: 20000, credit: 0 },
        { accountCode: "2000", accountName: "Accounts Payable", debit: 0, credit: 20000 },
      ],
    });

    let profit = await calculateProfitAnalysis();
    expect(profit.transportExpense).toBe(20000);
    expect(profit.totalExpenses).toBe(20000);

    // Step 2: Pay the liability from Bank (Dr 2000 AP 20k, Cr 1020 Bank 20k)
    await postTransaction({
      section: SectionType.TRANSPORT,
      type: TransactionType.PAYMENT_PAID,
      direction: Direction.CREDIT, // Bank outflow
      amount: 20000,
      bankAccountId: bank.id,
      lines: [
        { accountCode: "2000", accountName: "Accounts Payable", debit: 20000, credit: 0 },
        { accountCode: "1020", accountName: "Bank Account", debit: 0, credit: 20000 },
      ],
    });

    // Verify Expense is NOT counted twice!
    profit = await calculateProfitAnalysis();
    expect(profit.transportExpense).toBe(20000); // Still 20,000, not 40,000!

    // Verify bank balance decreased by 20,000
    const updatedBank = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
    expect(updatedBank?.currentBalance).toBe(80000);
  });

  it("Scenario 6: Profit calculation", () => {
    // Recognized revenue: 500,000, Direct costs: 200,000, Operating expenses: 100,000
    // Expected net profit: 200,000, Expected profit margin: 40%
    const revenue = 500000;
    const directCosts = 200000;
    const operatingExpenses = 100000;

    const totalExpenses = add(directCosts, operatingExpenses);
    const netProfit = sub(revenue, totalExpenses);
    const profitMargin = div(mul(netProfit, 100), revenue);

    expect(netProfit).toBe(200000);
    expect(profitMargin).toBe(40);
  });

  it("Scenario 7: Transaction reversal restores balances and preserves audit trail", async () => {
    const bank = await prisma.bankAccount.create({
      data: {
        bankName: "SBI",
        accountName: "Society Account",
        accountNumber: "123456",
        branchName: "Main",
        ifscCode: "SBIN0001",
        currentBalance: 50000,
      },
    });

    // Post a payment received (inflow of 10,000)
    const { transaction } = await postTransaction({
      section: SectionType.SIZING_BILL,
      type: TransactionType.PAYMENT_RECEIVED,
      direction: Direction.DEBIT,
      amount: 10000,
      bankAccountId: bank.id,
      lines: [
        { accountCode: "1020", accountName: "Bank Account", debit: 10000, credit: 0 },
        { accountCode: "1200", accountName: "Accounts Receivable", debit: 0, credit: 10000 },
      ],
    });

    const bankAfterPayment = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
    expect(bankAfterPayment?.currentBalance).toBe(60000);

    // Now reverse the transaction
    await reverseTransaction(transaction.id, "Erroneous credit entry entered by operator");

    // Check bank balance is restored to 50,000
    const bankAfterReversal = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
    expect(bankAfterReversal?.currentBalance).toBe(50000);

    // Verify original transaction is preserved as REVERSED
    const originalTx = await prisma.transaction.findUnique({ where: { id: transaction.id } });
    expect(originalTx?.status).toBe("REVERSED");

    // Verify Reversal transaction exists
    const reversalTx = await prisma.transaction.findFirst({
      where: { reversalOfId: transaction.id },
    });
    expect(reversalTx).toBeDefined();
    expect(reversalTx?.amount).toBe(10000);
  });

  afterAll(async () => {
    await prisma.journalLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.settlement.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.sizingBill.deleteMany();
    await prisma.powerloomTransaction.deleteMany();
    await prisma.wageRecord.deleteMany();
    await prisma.transportBill.deleteMany();
    await prisma.bankReconciliation.deleteMany();
    await prisma.liquidCashEntry.deleteMany();
    await prisma.bankAccount.deleteMany();
  });
});

