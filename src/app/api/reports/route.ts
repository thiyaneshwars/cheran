import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canViewReports } from "@/lib/auth";
import { add, sub, round2, formatINR } from "@/lib/decimal";
import { getConsolidatedBankBalance, calculateProfitAnalysis } from "@/lib/sections";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canViewReports(user.role)) {
      return NextResponse.json({ error: "Unauthorized: Insufficient permissions to view reports." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "trial-balance";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const accountId = searchParams.get("accountId");
    const partyId = searchParams.get("partyId");
    const workerId = searchParams.get("workerId");

    const dateFilter: any = {};
    if (startDateParam) dateFilter.gte = new Date(startDateParam);
    if (endDateParam) dateFilter.lte = new Date(endDateParam);
    const hasDateFilter = startDateParam || endDateParam;

    switch (reportType) {
      case "consolidated-bank": {
        const data = await getConsolidatedBankBalance();
        return NextResponse.json({ type: reportType, title: "Consolidated Bank Balance Report", data });
      }

      case "bank-ledger": {
        const bank = accountId
          ? await prisma.bankAccount.findUnique({ where: { id: accountId } })
          : await prisma.bankAccount.findFirst({ where: { isDefault: true } });

        if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

        const txns = await prisma.transaction.findMany({
          where: {
            bankAccountId: bank.id,
            ...(hasDateFilter ? { transactionDate: dateFilter } : {}),
          },
          orderBy: { transactionDate: "asc" },
        });

        let running = bank.openingBalance;
        const entries = txns.map((t) => {
          if (t.direction === "DEBIT") running = add(running, t.amount);
          else running = sub(running, t.amount);
          return {
            date: t.transactionDate,
            referenceNo: t.referenceNo,
            type: t.type,
            counterparty: t.counterparty,
            debit: t.direction === "DEBIT" ? round2(t.amount) : 0,
            credit: t.direction === "CREDIT" ? round2(t.amount) : 0,
            runningBalance: round2(running),
            status: t.status,
          };
        });

        return NextResponse.json({
          type: reportType,
          title: `Bank Ledger - ${bank.accountName} (${bank.bankName})`,
          bank,
          openingBalance: round2(bank.openingBalance),
          closingBalance: round2(running),
          entries,
        });
      }

      case "sizing-register": {
        const bills = await prisma.sizingBill.findMany({
          where: hasDateFilter ? { billDate: dateFilter } : {},
          include: { party: true },
          orderBy: { billDate: "desc" },
        });
        return NextResponse.json({
          type: reportType,
          title: "Sizing Bill Register",
          data: bills.map((b) => ({
            billNumber: b.billNumber,
            date: b.billDate,
            party: b.party?.name || `${b.billType || "Sizing"} Bill`,
            numberOfBeams: b.numberOfBeams ?? "-",
            quantity: b.quantity,
            rate: b.rate,
            totalAmount: round2(b.totalAmount),
            amountSettled: round2(b.amountSettled),
            outstandingAmount: round2(b.outstandingAmount),
            status: b.paymentStatus,
          })),
        });
      }

      case "powerloom-register": {
        const records = await prisma.powerloomTransaction.findMany({
          where: hasDateFilter ? { transactionDate: dateFilter } : {},
          include: { party: true },
          orderBy: { transactionDate: "desc" },
        });
        return NextResponse.json({
          type: reportType,
          title: "Powerloom Production Register",
          data: records.map((r) => {
            const remBalance = Math.max(0, round2(sub(r.totalAmount, r.amountSettled)));
            return {
              transactionNumber: r.transactionNumber,
              date: r.transactionDate,
              party: r.weaverName || r.party?.name || `${r.category || "Powerloom"} Contract`,
              category: r.category || "VETTI",
              loomReference: r.loomReference || "-",
              advanceDate: r.advanceDate ? r.advanceDate.toISOString().split("T")[0] : "-",
              advancePaid: round2(r.advancePaid || 0),
              totalAmountToBeSettled: round2(r.totalAmount),
              amountSettled: round2(r.amountSettled),
              remainingBalance: remBalance,
              status: r.paymentStatus,
            };
          }),
        });
      }

      case "wage-register": {
        const wages = await prisma.wageRecord.findMany({
          where: hasDateFilter ? { workDate: dateFilter } : {},
          include: { worker: true },
          orderBy: { workDate: "desc" },
        });
        return NextResponse.json({
          type: reportType,
          title: "Daily Wage Register",
          data: wages.map((w) => ({
            workDate: w.workDate,
            wageType: w.wageType || "OTHERS",
            particulars:
              w.wageType === "BABIN"
                ? `Babin (${w.babinRuns || 0} runs, ${w.babinDistributed || 0} dist)`
                : (w.workDescription || w.worker?.name || "Labor"),
            babinRuns: w.wageType === "BABIN" ? (w.babinRuns ?? 0) : "-",
            babinDistributed: w.wageType === "BABIN" ? (w.babinDistributed ?? 0) : "-",
            wagesGiven: round2(w.amountPaid || w.grossWages),
            dailyProfit: w.dailyProfit !== null && w.dailyProfit !== undefined ? round2(w.dailyProfit) : "-",
            paymentMethod: w.paymentMethod === "LIQUID_CASH" ? "Liquid Cash" : "Bank Account",
            status: w.paymentStatus,
          })),
        });
      }

      case "transport-register": {
        const transport = await prisma.transportBill.findMany({
          where: hasDateFilter ? { transactionDate: dateFilter } : {},
          orderBy: { transactionDate: "desc" },
        });
        return NextResponse.json({
          type: reportType,
          title: "Transport & Logistics Freight Register",
          data: transport.map((t) => ({
            transactionNumber: t.transactionNumber,
            date: t.transactionDate,
            transporterName: t.transporterName,
            vehicleNumber: t.vehicleNumber,
            route: `${t.sourceLocation || ""} -> ${t.destinationLocation || ""}`,
            freightCharge: round2(t.freightCharge),
            additionalExpenses: round2(t.additionalExpenses),
            totalAmount: round2(t.totalAmount),
            amountSettled: round2(t.amountSettled),
            outstandingAmount: round2(t.outstandingAmount),
            status: t.paymentStatus,
          })),
        });
      }

      case "outstanding-receivables": {
        const sizing = await prisma.sizingBill.findMany({
          where: { outstandingAmount: { gt: 0 } },
          include: { party: true },
        });
        const powerloom = await prisma.powerloomTransaction.findMany({
          where: { outstandingAmount: { gt: 0 } },
          include: { party: true },
        });

        const items = [
          ...sizing.map((s) => ({
            section: "Sizing Bill",
            reference: s.billNumber,
            party: s.party?.name || `${s.billType || "Sizing"} Bill`,
            total: round2(s.totalAmount),
            settled: round2(s.amountSettled),
            outstanding: round2(s.outstandingAmount),
            dueDate: s.dueDate,
          })),
          ...powerloom.map((p) => ({
            section: "Powerloom",
            reference: p.transactionNumber,
            party: p.weaverName || p.party?.name || `${p.category || "Powerloom"} Contract`,
            total: round2(p.totalAmount),
            settled: round2(p.amountSettled),
            outstanding: round2(p.outstandingAmount),
            dueDate: p.dueDate,
          })),
        ];

        const totalReceivables = items.reduce((acc, i) => add(acc, i.outstanding), 0);
        return NextResponse.json({
          type: reportType,
          title: "Outstanding Receivables Statement",
          totalReceivables: round2(totalReceivables),
          data: items,
        });
      }

      case "outstanding-payables": {
        const wages = await prisma.wageRecord.findMany({
          where: { outstandingWages: { gt: 0 } },
          include: { worker: true },
        });
        const transport = await prisma.transportBill.findMany({
          where: { outstandingAmount: { gt: 0 } },
        });

        const items = [
          ...wages.map((w) => ({
            section: "Daily Wage",
            reference: `WAGE-${w.id.slice(-4)}`,
            payee: w.worker ? `${w.worker.name} (${w.worker.workerCode})` : (w.workDescription || "Daily Wage"),
            total: round2(w.netWagesPayable),
            settled: round2(w.amountPaid),
            outstanding: round2(w.outstandingWages),
          })),
          ...transport.map((t) => ({
            section: "Transport",
            reference: t.transactionNumber,
            payee: t.transporterName,
            total: round2(t.totalAmount),
            settled: round2(t.amountSettled),
            outstanding: round2(t.outstandingAmount),
          })),
        ];

        const totalPayables = items.reduce((acc, i) => add(acc, i.outstanding), 0);
        return NextResponse.json({
          type: reportType,
          title: "Outstanding Payables Statement",
          totalPayables: round2(totalPayables),
          data: items,
        });
      }

      case "party-ledger": {
        const party = partyId
          ? await prisma.party.findUnique({ where: { id: partyId } })
          : await prisma.party.findFirst();

        if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });

        const sizing = await prisma.sizingBill.findMany({
          where: { partyId: party.id },
        });
        const powerloom = await prisma.powerloomTransaction.findMany({
          where: { partyId: party.id },
        });
        const settlements = await prisma.settlement.findMany({
          where: { partyId: party.id },
        });

        const entries = [
          ...sizing.map((s) => ({
            date: s.billDate,
            type: "Sizing Bill",
            reference: s.billNumber,
            debit: round2(s.totalAmount),
            credit: 0,
          })),
          ...powerloom.map((p) => ({
            date: p.transactionDate,
            type: "Powerloom Production",
            reference: p.transactionNumber,
            debit: round2(p.totalAmount),
            credit: 0,
          })),
          ...settlements.map((st) => ({
            date: st.settlementDate,
            type: "Payment Received",
            reference: st.settlementNumber,
            debit: 0,
            credit: round2(st.amount),
          })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json({
          type: reportType,
          title: `Party Ledger - ${party.name} (${party.code})`,
          party,
          currentOutstanding: round2(party.currentOutstanding),
          entries,
        });
      }

      case "worker-ledger": {
        const worker = workerId
          ? await prisma.worker.findUnique({ where: { id: workerId } })
          : await prisma.worker.findFirst();

        if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

        const wages = await prisma.wageRecord.findMany({
          where: { workerId: worker.id },
          orderBy: { workDate: "asc" },
        });

        return NextResponse.json({
          type: reportType,
          title: `Worker Ledger - ${worker.name} (${worker.workerCode})`,
          worker,
          wages: wages.map((w) => ({
            date: w.workDate,
            days: w.daysWorked,
            gross: round2(w.grossWages),
            net: round2(w.netWagesPayable),
            paid: round2(w.amountPaid),
            outstanding: round2(w.outstandingWages),
          })),
        });
      }

      case "trial-balance": {
        // Enforces: Total debits must equal total credits
        const lines = await prisma.journalLine.findMany({
          include: { journalEntry: true },
          where: { journalEntry: { status: "POSTED" } },
        });

        const accountsMap: Record<string, { code: string; name: string; debit: number; credit: number }> = {};
        let grandDebit = 0;
        let grandCredit = 0;

        for (const line of lines) {
          if (!accountsMap[line.accountCode]) {
            accountsMap[line.accountCode] = {
              code: line.accountCode,
              name: line.accountName,
              debit: 0,
              credit: 0,
            };
          }
          accountsMap[line.accountCode].debit = add(accountsMap[line.accountCode].debit, line.debit);
          accountsMap[line.accountCode].credit = add(accountsMap[line.accountCode].credit, line.credit);
          grandDebit = add(grandDebit, line.debit);
          grandCredit = add(grandCredit, line.credit);
        }

        const trialBalanceAccounts = Object.values(accountsMap).sort((a, b) => a.code.localeCompare(b.code));

        return NextResponse.json({
          type: reportType,
          title: "Trial Balance Statement",
          asOfDate: new Date(),
          accounts: trialBalanceAccounts,
          totalDebits: round2(grandDebit),
          totalCredits: round2(grandCredit),
          isBalanced: round2(grandDebit) === round2(grandCredit),
        });
      }

      case "profit-loss": {
        const profit = await calculateProfitAnalysis(
          hasDateFilter
            ? {
                startDate: startDateParam ? new Date(startDateParam) : undefined,
                endDate: endDateParam ? new Date(endDateParam) : undefined,
              }
            : undefined
        );
        return NextResponse.json({
          type: reportType,
          title: "Statement of Profit & Loss",
          data: profit,
        });
      }

      case "cash-flow": {
        const bankData = await getConsolidatedBankBalance();
        const settlementsIn = await prisma.settlement.findMany({
          where: {
            section: { in: ["SIZING_BILL", "POWERLOOM"] },
            ...(hasDateFilter ? { settlementDate: dateFilter } : {}),
          },
        });
        const settlementsOut = await prisma.settlement.findMany({
          where: {
            section: { in: ["DAILY_WAGE", "TRANSPORT"] },
            ...(hasDateFilter ? { settlementDate: dateFilter } : {}),
          },
        });

        const totalCashIn = settlementsIn.reduce((acc, s) => add(acc, s.amount), 0);
        const totalCashOut = settlementsOut.reduce((acc, s) => add(acc, s.amount), 0);
        const netCashFlow = sub(totalCashIn, totalCashOut);

        return NextResponse.json({
          type: reportType,
          title: "Cash Flow Statement",
          cashInflow: round2(totalCashIn),
          cashOutflow: round2(totalCashOut),
          netCashFlow: round2(netCashFlow),
          consolidatedClosingCash: bankData.totalBalance,
        });
      }

      case "audit-log": {
        const logs = await prisma.auditLog.findMany({
          take: 100,
          orderBy: { createdAt: "desc" },
          include: { performedBy: { select: { fullName: true, role: true } } },
        });
        return NextResponse.json({
          type: reportType,
          title: "Comprehensive Audit Log Report",
          data: logs,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown report type: ${reportType}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
