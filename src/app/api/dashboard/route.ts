import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDashboardMetrics, calculateProfitAnalysis, getConsolidatedBankBalance } from "@/lib/sections";
import { add, sub, round2 } from "@/lib/decimal";
import { getGlobalProductionOverview } from "@/lib/veatti-calculations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionFilter = searchParams.get("section");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let dateRange: { startDate?: Date; endDate?: Date } | undefined;
    if (startDateParam || endDateParam) {
      dateRange = {
        startDate: startDateParam ? new Date(startDateParam) : undefined,
        endDate: endDateParam ? new Date(endDateParam) : undefined,
      };
    }

    const metrics = await getDashboardMetrics();
    const profitAnalysis = await calculateProfitAnalysis(dateRange);
    const bankDetails = await getConsolidatedBankBalance();

    // Section summaries
    const sizingBills = await prisma.sizingBill.findMany();
    const plRecords = await prisma.powerloomTransaction.findMany();
    const wageRecords = await prisma.wageRecord.findMany();
    const transportBills = await prisma.transportBill.findMany();

    const sizingSummary = {
      totalCredited: sizingBills.reduce((acc, b) => add(acc, b.totalAmount), 0),
      amountSettled: sizingBills.reduce((acc, b) => add(acc, b.amountSettled), 0),
      amountOutstanding: sizingBills.reduce((acc, b) => add(acc, b.outstandingAmount), 0),
    };

    const plSummary = {
      totalCredited: plRecords.reduce((acc, b) => add(acc, b.totalAmount), 0),
      amountSettled: plRecords.reduce((acc, b) => add(acc, b.amountSettled), 0),
      amountOutstanding: plRecords.reduce((acc, b) => add(acc, b.outstandingAmount), 0),
    };

    const wageSummary = {
      totalCredited: wageRecords.reduce((acc, b) => add(acc, b.netWagesPayable), 0),
      amountSettled: wageRecords.reduce((acc, b) => add(acc, b.amountPaid), 0),
      amountOutstanding: wageRecords.reduce((acc, b) => add(acc, b.outstandingWages), 0),
      grossWages: wageRecords.reduce((acc, b) => add(acc, b.grossWages), 0),
    };

    const transportSummary = {
      totalCredited: transportBills.reduce((acc, b) => add(acc, b.totalAmount), 0),
      amountSettled: transportBills.reduce((acc, b) => add(acc, b.amountSettled), 0),
      amountOutstanding: transportBills.reduce((acc, b) => add(acc, b.outstandingAmount), 0),
    };

    // Monthly income vs expense aggregation for charts
    const journalLines = await prisma.journalLine.findMany({
      include: {
        journalEntry: true,
      },
      where: {
        journalEntry: {
          status: "POSTED",
        },
      },
    });

    const monthlyMap: Record<string, { month: string; income: number; expense: number }> = {};
    for (const line of journalLines) {
      const d = new Date(line.journalEntry.date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mLabel = d.toLocaleString("default", { month: "short", year: "2-digit" });

      if (!monthlyMap[mKey]) {
        monthlyMap[mKey] = { month: mLabel, income: 0, expense: 0 };
      }

      if (line.accountCode === "4000" || line.accountCode === "4100") {
        const netRev = sub(line.credit, line.debit);
        monthlyMap[mKey].income = add(monthlyMap[mKey].income, netRev);
      } else if (["5000", "5100", "5200", "5300"].includes(line.accountCode)) {
        const netExp = sub(line.debit, line.credit);
        monthlyMap[mKey].expense = add(monthlyMap[mKey].expense, netExp);
      }
    }

    const monthlyChart = Object.values(monthlyMap);

    // Section comparison data for charts
    const sectionRevenueComparison = [
      { name: "Sizing Bill", revenue: sizingSummary.totalCredited, outstanding: sizingSummary.amountOutstanding },
      { name: "Powerloom", revenue: plSummary.totalCredited, outstanding: plSummary.amountOutstanding },
    ];

    const sectionExpenseComparison = [
      { name: "Daily Wages", expense: wageSummary.totalCredited, outstanding: wageSummary.amountOutstanding },
      { name: "Transport", expense: transportSummary.totalCredited, outstanding: transportSummary.amountOutstanding },
    ];

    // Recent Transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        bankAccount: true,
      },
    });

    // Pending Items
    const pendingSizing = await prisma.sizingBill.findMany({
      where: { paymentStatus: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { party: true },
      take: 5,
    });

    const pendingTransport = await prisma.transportBill.findMany({
      where: { paymentStatus: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
      take: 5,
    });

    const productionOverview = await getGlobalProductionOverview(prisma);

    return NextResponse.json({
      metrics,
      profitAnalysis,
      bankDetails,
      productionOverview,
      sectionSummaries: {
        sizing: sizingSummary,
        powerloom: plSummary,
        dailyWage: wageSummary,
        transport: transportSummary,
      },
      charts: {
        monthlyChart,
        sectionRevenueComparison,
        sectionExpenseComparison,
      },
      recentTransactions,
      pendingItems: {
        sizing: pendingSizing,
        transport: pendingTransport,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load dashboard metrics" }, { status: 500 });
  }
}
