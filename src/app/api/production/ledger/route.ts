import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { computeRunningLedger, LedgerTransaction } from "@/lib/veatti-calculations";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const transactionType = searchParams.get("type"); // "ALL" | "VARAVU" | "ADVANCE" | "PRODUCTION" | "HANDOVER"
    const search = searchParams.get("search");

    // Fetch Veatti units matching search or unitId
    const unitWhere: any = { clothType: "VEATTI" };
    if (unitId) unitWhere.id = unitId;
    if (search) {
      unitWhere.OR = [
        { weaverName: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const units = await prisma.productionUnit.findMany({
      where: unitWhere,
      include: {
        varavuEntries: true,
        advanceEntries: true,
        dailyProductions: { include: { paavu: true } },
        handovers: true,
      },
      orderBy: { weaverName: "asc" },
    });

    const unitMap = new Map(units.map((u) => [u.id, u.weaverName]));
    const transactions: LedgerTransaction[] = [];

    // Collect all transactions from all matching units
    for (const unit of units) {
      // 1. Varavu transactions
      if (!transactionType || transactionType === "ALL" || transactionType === "VARAVU") {
        for (const v of unit.varavuEntries) {
          transactions.push({
            id: v.id,
            date: v.transactionDate.toISOString(),
            type: "VARAVU",
            weaverName: unit.weaverName,
            unitId: unit.id,
            paavuKg: round2(v.paavuKg),
            rate: round2(v.rate),
            varavuAmount: round2(v.amount),
            paymentMode: v.paymentMode,
            referenceNo: v.referenceNo || undefined,
            notes: v.remarks || `Varavu: ${v.paavuKg} KG @ ₹${v.rate}`,
          });
        }
      }

      // 2. Advance transactions
      if (!transactionType || transactionType === "ALL" || transactionType === "ADVANCE") {
        for (const a of unit.advanceEntries) {
          transactions.push({
            id: a.id,
            date: a.advanceDate.toISOString(),
            type: "ADVANCE",
            weaverName: unit.weaverName,
            unitId: unit.id,
            advanceAmount: round2(a.amount),
            paymentMode: a.paymentMode,
            referenceNo: a.referenceNo || undefined,
            notes: a.description || `Advance Paid via ${a.paymentMode}`,
          });
        }
      }

      // 3. Production entries
      if (!transactionType || transactionType === "ALL" || transactionType === "PRODUCTION") {
        for (const p of unit.dailyProductions) {
          transactions.push({
            id: p.id,
            date: p.productionDate.toISOString(),
            type: "PRODUCTION",
            weaverName: unit.weaverName,
            unitId: unit.id,
            productionMeters: round2(p.netProduction || p.dailyMeters),
            referenceNo: p.paavuRef || p.paavu?.paavuNumber || undefined,
            notes: p.remarks || `Daily Loom Production (Net: ${p.netProduction}m, Waste: ${p.wastageMeters}m)`,
          });
        }
      }

      // 4. Handover entries
      if (!transactionType || transactionType === "ALL" || transactionType === "HANDOVER") {
        for (const h of unit.handovers) {
          transactions.push({
            id: h.id,
            date: h.handoverDate.toISOString(),
            type: "HANDOVER",
            weaverName: unit.weaverName,
            unitId: unit.id,
            handoverMeters: round2(h.meters),
            referenceNo: h.challanNo,
            notes: `Govt Handover: ${h.meters}m (Challan: ${h.challanNo})`,
          });
        }
      }
    }

    // Filter by date range if provided
    let filteredTxs = transactions;
    if (startDate) {
      const start = new Date(startDate).getTime();
      filteredTxs = filteredTxs.filter((tx) => new Date(tx.date).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // inclusive of end day
      filteredTxs = filteredTxs.filter((tx) => new Date(tx.date).getTime() <= end);
    }

    // Compute running ledger with opening and closing balances
    const ledger = computeRunningLedger(filteredTxs, 0);

    // Calculate aggregated summary
    const totalVaravu = units.reduce((acc, u) => acc + (u.totalVaravuAmount || 0), 0);
    const totalAdvance = units.reduce((acc, u) => acc + (u.totalAdvancePaid || 0), 0);
    const totalProduction = units.reduce((acc, u) => acc + (u.totalProducedMeters || 0), 0);
    const totalHandover = units.reduce((acc, u) => acc + (u.handoveredMeters || 0), 0);
    const totalPaavuKg = units.reduce((acc, u) => acc + (u.paavuWeightKg || 0), 0);
    const netBalance = totalVaravu - totalAdvance;

    return NextResponse.json({
      ledgerRows: ledger.rows,
      summary: {
        totalTransactions: ledger.rows.length,
        openingBalance: 0,
        closingBalance: ledger.closingBalance,
        totalCredit: ledger.totalCredit,
        totalDebit: ledger.totalDebit,
        totalVaravu: round2(totalVaravu),
        totalAdvance: round2(totalAdvance),
        totalProduction: round2(totalProduction),
        totalHandover: round2(totalHandover),
        totalPaavuKg: round2(totalPaavuKg),
        netBalance: round2(netBalance),
        isExcessAdvance: netBalance < 0,
        amountPayable: netBalance > 0 ? round2(netBalance) : 0,
        excessAdvance: netBalance < 0 ? round2(Math.abs(netBalance)) : 0,
      },
      units: units.map((u) => ({
        id: u.id,
        weaverName: u.weaverName,
        location: u.location,
        individualRate: round2(u.individualRate),
        rateUnit: u.rateUnit,
        paavuWeightKg: round2(u.paavuWeightKg),
        totalVaravuAmount: round2(u.totalVaravuAmount),
        totalAdvancePaid: round2(u.totalAdvancePaid),
        currentBalance: round2(u.currentBalance),
      })),
    });
  } catch (error: any) {
    console.error("Ledger fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch accounting ledger" },
      { status: 500 }
    );
  }
}

