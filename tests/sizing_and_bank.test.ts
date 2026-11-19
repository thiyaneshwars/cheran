import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { getConsolidatedBankBalance } from "../src/lib/sections";
import { postTransaction, generateRef } from "../src/lib/accounting";
import { add, sub, mul, round2 } from "../src/lib/decimal";
import { SectionType, TransactionType, Direction, PaymentStatus } from "@prisma/client";

describe("Sizing Bill & Bank Balance Feedback Tests", () => {
  beforeEach(async () => {
    await prisma.transaction.deleteMany({
      where: { referenceNo: { contains: "DEP" } },
    });
    await prisma.bankAccount.deleteMany();
    await prisma.sizingBill.deleteMany({
      where: { billNumber: { in: ["VET-001", "SAR-002-TEST"] } },
    });
    await prisma.powerloomTransaction.deleteMany({
      where: { transactionNumber: { in: ["PL-VET-001", "PL-TEST-002", "PL-SAR-001"] } },
    });
    await prisma.powerloomWeaver.deleteMany({
      where: { name: { contains: "Test Powerloom Weaver" } },
    });
  });

  it("Dashboard Bank Account: Deposits accumulate and bank accounts are in increasing order", async () => {
    // 1. Create Account A with 1,00,000
    const bankA = await prisma.bankAccount.create({
      data: {
        bankName: "Canara Bank",
        accountName: "Main Operations Account",
        accountNumber: "CNRB001122",
        branchName: "Erode Main",
        ifscCode: "CNRB0001234",
        currentBalance: 100000,
        openingBalance: 100000,
      },
    });

    // Create Account B with 75,000
    const bankB = await prisma.bankAccount.create({
      data: {
        bankName: "Indian Bank",
        accountName: "Secondary Account",
        accountNumber: "IDIB005566",
        branchName: "Bhavani Branch",
        ifscCode: "IDIB0005678",
        currentBalance: 75000,
        openingBalance: 75000,
      },
    });

    // Verify initial consolidated balance: 1,75,000
    let consolidated = await getConsolidatedBankBalance();
    expect(consolidated.totalBalance).toBe(175000);
    // Verified sorted in increasing order: 75,000, then 100,000
    expect(consolidated.accounts[0].currentBalance).toBe(75000);
    expect(consolidated.accounts[1].currentBalance).toBe(100000);

    // 2. Deposit 50,000 into Account A
    const depositAmt = 50000;
    const { transaction } = await postTransaction({
      referenceNo: generateRef("DEP"),
      transactionDate: new Date(),
      section: SectionType.GENERAL,
      type: TransactionType.PAYMENT_RECEIVED,
      direction: Direction.DEBIT,
      amount: depositAmt,
      bankAccountId: bankA.id,
      lines: [
        {
          accountCode: "1020",
          accountName: "Bank Account A",
          debit: depositAmt,
          credit: 0,
        },
        {
          accountCode: "3000",
          accountName: "Treasury Deposit",
          debit: 0,
          credit: depositAmt,
        },
      ],
    });

    // 3. Verify Account A balance became 1,50,000
    const updatedBankA = await prisma.bankAccount.findUnique({ where: { id: bankA.id } });
    expect(updatedBankA?.currentBalance).toBe(150000);

    // 4. Verify Total Bank Balance shows in total value (150,000 + 75,000 = 225,000)
    consolidated = await getConsolidatedBankBalance();
    expect(consolidated.totalBalance).toBe(225000);
    // Still in increasing order: 75,000, then 150,000
    expect(consolidated.accounts[0].currentBalance).toBe(75000);
    expect(consolidated.accounts[1].currentBalance).toBe(150000);
  });

  it("Sizing Bill: Calculation decides total amount based on noOfBags * bagWeightKg * ratePerKg", async () => {
    const noOfBags = 20;
    const bagWeightKg = 60; // 60 kg per bag
    const ratePerKg = 18.5; // ₹18.50 per kg

    const totalKg = mul(noOfBags, bagWeightKg); // 1200 kg
    const totalAmount = mul(totalKg, ratePerKg); // 22,200

    const vettiBill = await prisma.sizingBill.create({
      data: {
        billNumber: "VET-001",
        billType: "VETTI",
        noOfBags,
        bagWeightKg,
        ratePerKg,
        totalKg,
        quantity: totalKg,
        rate: ratePerKg,
        totalAmount,
        amountSettled: 0,
        outstandingAmount: totalAmount,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    expect(vettiBill.billType).toBe("VETTI");
    expect(vettiBill.totalKg).toBe(1200);
    expect(vettiBill.totalAmount).toBe(22200);
    expect(vettiBill.outstandingAmount).toBe(22200);
  });

  it("Sizing Bill Settlement: Settle amount reduces bank balance and pending bill amount", async () => {
    // 1. Bank account with 1,50,000
    const bank = await prisma.bankAccount.create({
      data: {
        bankName: "Indian Overseas Bank",
        accountName: "Treasury Account",
        accountNumber: "IOBA119922",
        branchName: "Anthiyur Branch",
        ifscCode: "IOBA0001199",
        currentBalance: 150000,
        openingBalance: 150000,
      },
    });

    // 2. Sizing bill for 22,200
    const bill = await prisma.sizingBill.create({
      data: {
        billNumber: "VET-002",
        billType: "VETTI",
        noOfBags: 20,
        bagWeightKg: 60,
        ratePerKg: 18.5,
        totalKg: 1200,
        quantity: 1200,
        rate: 18.5,
        totalAmount: 22200,
        amountSettled: 0,
        outstandingAmount: 22200,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    // 3. Settle partial amount 10,000 from Bank Account
    const settleAmt = 10000;
    const { transaction } = await postTransaction({
      referenceNo: "SET-VET-002",
      transactionDate: new Date(),
      section: SectionType.SIZING_BILL,
      type: TransactionType.PAYMENT_PAID,
      direction: Direction.CREDIT, // Outflow reduces bank balance
      amount: settleAmt,
      bankAccountId: bank.id,
      lines: [
        {
          accountCode: "2000",
          accountName: "Accounts Payable",
          section: SectionType.SIZING_BILL,
          debit: settleAmt,
          credit: 0,
        },
        {
          accountCode: "1020",
          accountName: "Bank Account",
          section: SectionType.SIZING_BILL,
          debit: 0,
          credit: settleAmt,
        },
      ],
    });

    const newSettled = round2(add(bill.amountSettled, settleAmt));
    const newOutstanding = round2(sub(bill.totalAmount, newSettled));

    const updatedBill = await prisma.sizingBill.update({
      where: { id: bill.id },
      data: {
        amountSettled: newSettled,
        outstandingAmount: newOutstanding,
        paymentStatus: newOutstanding <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID,
      },
    });

    // 4. Verify Bank Balance is REDUCED from 150,000 by 10,000 -> 140,000
    const updatedBank = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
    expect(updatedBank?.currentBalance).toBe(140000);

    // 5. Verify Pending Amount on the Bill is REDUCED from 22,200 to 12,200
    expect(updatedBill.outstandingAmount).toBe(12200);
    expect(updatedBill.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);

    // 6. Settle remaining 12,200
    const remainingAmt = 12200;
    await postTransaction({
      referenceNo: "SET-VET-002-FINAL",
      transactionDate: new Date(),
      section: SectionType.SIZING_BILL,
      type: TransactionType.PAYMENT_PAID,
      direction: Direction.CREDIT,
      amount: remainingAmt,
      bankAccountId: bank.id,
      lines: [
        {
          accountCode: "2000",
          accountName: "Accounts Payable",
          section: SectionType.SIZING_BILL,
          debit: remainingAmt,
          credit: 0,
        },
        {
          accountCode: "1020",
          accountName: "Bank Account",
          section: SectionType.SIZING_BILL,
          debit: 0,
          credit: remainingAmt,
        },
      ],
    });

    const finalBill = await prisma.sizingBill.update({
      where: { id: bill.id },
      data: {
        amountSettled: 22200,
        outstandingAmount: 0,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    // Bank balance reduces further to 127,800
    const finalBank = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
    expect(finalBank?.currentBalance).toBe(127800);
    // Bill pending is 0 and status is PAID
    expect(finalBill.outstandingAmount).toBe(0);
    expect(finalBill.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it("Powerloom: Register weavers by category & record contract tallying advance paid", async () => {
    // 1. Register Weaver
    const weaver = await prisma.powerloomWeaver.create({
      data: {
        name: "Test Powerloom Weaver",
        location: "Chennimalai North",
        category: "VETTI",
        phone: "9842101010",
        loomCount: 6,
      },
    });

    expect(weaver.name).toBe("Test Powerloom Weaver");
    expect(weaver.category).toBe("VETTI");
    expect(weaver.location).toBe("Chennimalai North");

    // 2. Record Contract with Paavu, Meters, Wage Rate, Weft bags & kg, Bobbin sets, and Advance Paid
    const noOfPaavu = 4;
    const totalMeters = 2400; // 2400 meters
    const wageRate = 25; // ₹25 per meter
    const grossWages = mul(totalMeters, wageRate); // ₹60,000
    const advancePaid = 10000; // ₹10,000 advance
    const netTotal = sub(grossWages, advancePaid); // ₹50,000 net payable

    const contract = await prisma.powerloomTransaction.create({
      data: {
        transactionNumber: "PL-VET-001",
        category: "VETTI",
        weaverName: weaver.name,
        weaverLocation: weaver.location,
        noOfPaavu,
        totalMeters,
        wageRate,
        grossWages,
        weftBags: 8,
        weftKg: 400,
        bobbinSets: 4,
        advancePaid,
        productionQuantity: totalMeters,
        rate: wageRate,
        totalAmount: netTotal,
        amountSettled: 0,
        outstandingAmount: netTotal,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    expect(contract.category).toBe("VETTI");
    expect(contract.grossWages).toBe(60000);
    expect(contract.advancePaid).toBe(10000);
    expect(contract.totalAmount).toBe(50000); // Tally: Gross - Advance = 50,000
    expect(contract.outstandingAmount).toBe(50000);
  });

  it("Powerloom Settlement: Settle amount reduces bank balance and contract pending amount", async () => {
    // 1. Bank account with 2,00,000
    const bank = await prisma.bankAccount.create({
      data: {
        bankName: "State Bank of India",
        accountName: "Weaving Operating A/c",
        accountNumber: "SBIN889900",
        branchName: "Chennimalai Branch",
        ifscCode: "SBIN0008899",
        currentBalance: 200000,
        openingBalance: 200000,
      },
    });

    // 2. Saree Contract for 50,000 net
    const contract = await prisma.powerloomTransaction.create({
      data: {
        transactionNumber: "PL-SAR-001",
        category: "SAREE",
        weaverName: "S. Mohan Saree Weavers",
        weaverLocation: "Sirumugai",
        noOfPaavu: 6,
        totalMeters: 1800,
        wageRate: 30,
        grossWages: 54000,
        advancePaid: 4000,
        totalAmount: 50000,
        amountSettled: 0,
        outstandingAmount: 50000,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    // 3. Settle 30,000 from Bank Account
    const settleAmt = 30000;
    await postTransaction({
      referenceNo: "SET-PL-SAR-001",
      transactionDate: new Date(),
      section: SectionType.POWERLOOM,
      type: TransactionType.PAYMENT_PAID,
      direction: Direction.CREDIT, // Bank cash outflow
      amount: settleAmt,
      bankAccountId: bank.id,
      lines: [
        {
          accountCode: "2000",
          accountName: "Accounts Payable",
          section: SectionType.POWERLOOM,
          debit: settleAmt,
          credit: 0,
        },
        {
          accountCode: "1020",
          accountName: "Bank Account",
          section: SectionType.POWERLOOM,
          debit: 0,
          credit: settleAmt,
        },
      ],
    });

    const updatedContract = await prisma.powerloomTransaction.update({
      where: { id: contract.id },
      data: {
        amountSettled: settleAmt,
        outstandingAmount: sub(contract.totalAmount, settleAmt),
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
      },
    });

    // Verify Bank Balance REDUCED by 30,000 (from 200,000 to 170,000)
    const updatedBank = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
    expect(updatedBank?.currentBalance).toBe(170000);

    // Verify Contract Pending Due REDUCED by 30,000 (from 50,000 to 20,000)
    expect(updatedContract.amountSettled).toBe(30000);
    expect(updatedContract.outstandingAmount).toBe(20000);
    expect(updatedContract.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);
  });

  afterAll(async () => {
    // Only clean up test-specific records
    await prisma.bankAccount.deleteMany({
      where: { accountNumber: { in: ["CNRB001122", "IDIB005566", "CNRB-TEST-001"] } },
    });
    await prisma.sizingBill.deleteMany({
      where: { billNumber: { in: ["VET-001", "SAR-002-TEST"] } },
    });
    await prisma.powerloomTransaction.deleteMany({
      where: { transactionNumber: { in: ["PL-VET-001", "PL-TEST-002"] } },
    });
    await prisma.powerloomWeaver.deleteMany({ where: { name: { contains: "Test" } } });
  });
});

