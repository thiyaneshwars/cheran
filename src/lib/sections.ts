import { prisma } from "./db";
import { toDecimal, add, sub, mul, div, round2 } from "./decimal";
import {
  SectionType,
  TransactionType,
  Direction,
  PaymentStatus,
  TransactionStatus,
  AccountStatus,
} from "@prisma/client";
import { generateRef, postTransaction } from "./accounting";

/**
 * 1. Consolidated Bank Balance
 * Total Bank Balance = Sum of all active bank account balances.
 */
export async function getConsolidatedBankBalance() {
  const accounts = await prisma.bankAccount.findMany({
    where: { status: AccountStatus.ACTIVE },
    orderBy: { currentBalance: "asc" },
  });

  let totalBalance = 0;
  for (const acc of accounts) {
    totalBalance = add(totalBalance, acc.currentBalance);
  }

  return {
    totalBalance: round2(totalBalance),
    accounts: accounts.map((acc) => ({
      ...acc,
      currentBalance: round2(acc.currentBalance),
      openingBalance: round2(acc.openingBalance),
      statementBalance: acc.statementBalance !== null ? round2(acc.statementBalance) : null,
    })),
  };
}

/**
 * 2. Section Summaries for 3-Column Standard Layout:
 * - Total Amount Credited (Billed/Earned/Gross)
 * - Amount Settled
 * - Amount Yet to Be Paid (Outstanding)
 */
export async function getSectionFinancialSummary(section: SectionType) {
  if (section === SectionType.SIZING_BILL) {
    const bills = await prisma.sizingBill.findMany();
    let totalCredited = 0;
    let totalSettled = 0;
    let totalOutstanding = 0;

    for (const b of bills) {
      totalCredited = add(totalCredited, b.totalAmount);
      totalSettled = add(totalSettled, b.amountSettled);
      totalOutstanding = add(totalOutstanding, b.outstandingAmount);
    }

    return {
      section: "Sizing Bill",
      totalCredited: round2(totalCredited),
      amountSettled: round2(totalSettled),
      amountOutstanding: round2(totalOutstanding),
      count: bills.length,
    };
  }

  if (section === SectionType.POWERLOOM) {
    const records = await prisma.powerloomTransaction.findMany();
    let totalCredited = 0;
    let totalSettled = 0;
    let totalOutstanding = 0;

    for (const r of records) {
      totalCredited = add(totalCredited, r.totalAmount);
      totalSettled = add(totalSettled, r.amountSettled);
      totalOutstanding = add(totalOutstanding, r.outstandingAmount);
    }

    return {
      section: "Powerloom",
      totalCredited: round2(totalCredited),
      amountSettled: round2(totalSettled),
      amountOutstanding: round2(totalOutstanding),
      count: records.length,
    };
  }

  if (section === SectionType.DAILY_WAGE) {
    const wages = await prisma.wageRecord.findMany();
    let totalGross = 0;
    let totalNet = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const w of wages) {
      totalGross = add(totalGross, w.grossWages);
      totalNet = add(totalNet, w.netWagesPayable);
      totalPaid = add(totalPaid, w.amountPaid);
      totalOutstanding = add(totalOutstanding, w.outstandingWages);
    }

    return {
      section: "Daily Wage",
      totalCredited: round2(totalNet), // Net wages payable credited to workers
      amountSettled: round2(totalPaid),
      amountOutstanding: round2(totalOutstanding),
      grossWages: round2(totalGross),
      count: wages.length,
    };
  }

  if (section === SectionType.TRANSPORT) {
    const bills = await prisma.transportBill.findMany();
    let totalCredited = 0;
    let totalSettled = 0;
    let totalOutstanding = 0;

    for (const t of bills) {
      totalCredited = add(totalCredited, t.totalAmount);
      totalSettled = add(totalSettled, t.amountSettled);
      totalOutstanding = add(totalOutstanding, t.outstandingAmount);
    }

    return {
      section: "Transport",
      totalCredited: round2(totalCredited),
      amountSettled: round2(totalSettled),
      amountOutstanding: round2(totalOutstanding),
      count: bills.length,
    };
  }

  return {
    section: "General",
    totalCredited: 0,
    amountSettled: 0,
    amountOutstanding: 0,
    count: 0,
  };
}

/**
 * 3. Profit & Loss Analysis Engine
 * Gross Profit = Recognized Revenue - Direct Costs
 * Net Profit = Recognized Revenue - All Recognized Expenses
 * Profit Margin (%) = (Net Profit / Recognized Revenue) * 100
 */
export async function calculateProfitAnalysis(dateRange?: { startDate?: Date; endDate?: Date }) {
  // Query all posted journal lines
  const whereLines: any = {
    journalEntry: {
      status: "POSTED",
    },
  };

  if (dateRange?.startDate || dateRange?.endDate) {
    whereLines.journalEntry.date = {};
    if (dateRange.startDate) whereLines.journalEntry.date.gte = dateRange.startDate;
    if (dateRange.endDate) whereLines.journalEntry.date.lte = dateRange.endDate;
  }

  const lines = await prisma.journalLine.findMany({
    where: whereLines,
  });

  let sizingRevenue = 0;
  let powerloomRevenue = 0;
  let directCosts = 0;
  let wageExpense = 0;
  let transportExpense = 0;
  let otherExpenses = 0;

  for (const line of lines) {
    // 4000: Sizing Bill Revenue (Credits increase revenue)
    if (line.accountCode === "4000") {
      sizingRevenue = add(sizingRevenue, sub(line.credit, line.debit));
    }
    // 4100: Powerloom Revenue
    else if (line.accountCode === "4100") {
      powerloomRevenue = add(powerloomRevenue, sub(line.credit, line.debit));
    }
    // 5000: Direct Operating Costs (Debits increase expense)
    else if (line.accountCode === "5000") {
      directCosts = add(directCosts, sub(line.debit, line.credit));
    }
    // 5100: Daily Wage Expense
    else if (line.accountCode === "5100") {
      wageExpense = add(wageExpense, sub(line.debit, line.credit));
    }
    // 5200: Transport Freight Expense
    else if (line.accountCode === "5200") {
      transportExpense = add(transportExpense, sub(line.debit, line.credit));
    }
    // 5300: General Operating Expenses
    else if (line.accountCode === "5300") {
      otherExpenses = add(otherExpenses, sub(line.debit, line.credit));
    }
  }

  // Babin Set Deliveries: ₹450 total rate = ₹250 weaver wage + ₹200 society profit
  const whereBabin: any = {};
  if (dateRange?.startDate || dateRange?.endDate) {
    whereBabin.date = {};
    if (dateRange.startDate) whereBabin.date.gte = dateRange.startDate;
    if (dateRange.endDate) whereBabin.date.lte = dateRange.endDate;
  }
  const babinDeliveries = await prisma.babinSetDelivery.findMany({ where: whereBabin });
  let babinRevenue = 0;
  let babinWageExpense = 0;
  let babinProfit = 0;
  for (const b of babinDeliveries) {
    babinRevenue = add(babinRevenue, b.totalAmount);
    babinWageExpense = add(babinWageExpense, b.totalWage);
    babinProfit = add(babinProfit, b.totalProfit);
  }

  const totalRevenue = add(add(sizingRevenue, powerloomRevenue), babinRevenue);
  const grossProfit = sub(totalRevenue, directCosts);
  const totalOperatingExpenses = add(add(add(wageExpense, transportExpense), otherExpenses), babinWageExpense);
  const totalExpenses = add(directCosts, totalOperatingExpenses);
  const netProfit = sub(totalRevenue, totalExpenses);

  const profitMarginPercent =
    totalRevenue > 0 ? round2(div(mul(netProfit, 100), totalRevenue)) : null;

  return {
    sizingRevenue: round2(sizingRevenue),
    powerloomRevenue: round2(powerloomRevenue),
    babinRevenue: round2(babinRevenue),
    babinWageExpense: round2(babinWageExpense),
    babinProfit: round2(babinProfit),
    totalRevenue: round2(totalRevenue),
    directCosts: round2(directCosts),
    grossProfit: round2(grossProfit),
    wageExpense: round2(wageExpense),
    transportExpense: round2(transportExpense),
    otherExpenses: round2(otherExpenses),
    totalOperatingExpenses: round2(totalOperatingExpenses),
    totalExpenses: round2(totalExpenses),
    netProfit: round2(netProfit),
    profitMarginPercent: profitMarginPercent, // null if 0 revenue to prevent division by 0
    sectionContributions: {
      sizing: {
        revenue: round2(sizingRevenue),
        profitContribution: round2(sizingRevenue),
      },
      powerloom: {
        revenue: round2(powerloomRevenue),
        profitContribution: round2(powerloomRevenue),
      },
      babin: {
        revenue: round2(babinRevenue),
        expense: round2(babinWageExpense),
        profitContribution: round2(babinProfit),
      },
      dailyWage: {
        expense: round2(wageExpense),
      },
      transport: {
        expense: round2(transportExpense),
      },
    },
  };
}

/**
 * 4. Overall Dashboard Financial Summary Cards
 * 1. Total Bank Balance
 * 2. Total Outstanding Receivables (AR)
 * 3. Total Outstanding Payables (AP)
 * 4. Total Revenue
 * 5. Total Settlements Paid
 * 6. Total Expenses
 * 7. Net Profit
 * 8. Number of Pending Transactions
 */
export async function getDashboardMetrics() {
  const bankData = await getConsolidatedBankBalance();
  const profitData = await calculateProfitAnalysis();

  // Receivables from Sizing and Powerloom
  const sizingBills = await prisma.sizingBill.findMany();
  const plRecords = await prisma.powerloomTransaction.findMany();
  let totalReceivables = 0;
  for (const b of sizingBills) totalReceivables = add(totalReceivables, b.outstandingAmount);
  for (const p of plRecords) totalReceivables = add(totalReceivables, p.outstandingAmount);

  // Payables from Wages and Transport
  const wageRecords = await prisma.wageRecord.findMany();
  const transportBills = await prisma.transportBill.findMany();
  let totalPayables = 0;
  for (const w of wageRecords) totalPayables = add(totalPayables, w.outstandingWages);
  for (const t of transportBills) totalPayables = add(totalPayables, t.outstandingAmount);

  // Settlements Paid (outflow settlements)
  const settlements = await prisma.settlement.findMany();
  let totalSettlementsPaid = 0;
  for (const s of settlements) {
    if (s.section === SectionType.DAILY_WAGE || s.section === SectionType.TRANSPORT) {
      totalSettlementsPaid = add(totalSettlementsPaid, s.amount);
    }
  }

  // Pending count
  const pendingTransactions = await prisma.transaction.count({
    where: { status: TransactionStatus.PENDING },
  });

  const pendingBills =
    (await prisma.sizingBill.count({ where: { paymentStatus: PaymentStatus.PENDING } })) +
    (await prisma.powerloomTransaction.count({ where: { paymentStatus: PaymentStatus.PENDING } })) +
    (await prisma.wageRecord.count({ where: { paymentStatus: PaymentStatus.PENDING } })) +
    (await prisma.transportBill.count({ where: { paymentStatus: PaymentStatus.PENDING } }));

  return {
    consolidatedBankBalance: bankData.totalBalance,
    bankAccounts: bankData.accounts,
    totalReceivables: round2(totalReceivables),
    totalPayables: round2(totalPayables),
    totalRevenue: profitData.totalRevenue,
    totalSettlementsPaid: round2(totalSettlementsPaid),
    totalExpenses: profitData.totalExpenses,
    netProfit: profitData.netProfit,
    profitMarginPercent: profitData.profitMarginPercent,
    pendingCount: pendingTransactions + pendingBills,
  };
}
