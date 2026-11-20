import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateProfitAnalysis } from "@/lib/sections";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let dateRange: { startDate?: Date; endDate?: Date } | undefined;
    if (startDate || endDate) {
      dateRange = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };
    }

    const analysis = await calculateProfitAnalysis(dateRange);

    // Calculate Govt Free Dhothi & Saree Scheme Profit Tally
    const allotments = await prisma.govtYarnAllotment.findMany({
      orderBy: { allotmentDate: "desc" },
    });

    const handovers = await prisma.governmentHandoverLog.findMany({
      where: dateRange
        ? {
            handoverDate: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          }
        : undefined,
    });

    const latestAllotment = allotments[0];
    const dhothiGovtRate = latestAllotment?.dhothiGovtRate || 0;
    const sareeGovtRate = latestAllotment?.sareeGovtRate || 0;
    const dhothiWeaverRate = latestAllotment?.dhothiWeaverRate || 19.0; // Rs. 19 standard
    const sareeWeaverRate = latestAllotment?.sareeWeaverRate || 42.0;   // Rs. 42 standard
    const bagPrice = latestAllotment?.bagPrice || 0;
    const yarnRatePerKg = latestAllotment?.yarnRatePerKg || 0;

    let totalDhothiHandoverPieces = 0;
    let totalSareeHandoverPieces = 0;

    for (const h of handovers) {
      const p =
        h.pieces && h.pieces > 0
          ? h.pieces
          : Math.round(h.meters / (h.clothType === "SAREE" ? 5.5 : 3.65));
      if (h.clothType === "VEATTI") totalDhothiHandoverPieces += p;
      if (h.clothType === "SAREE") totalSareeHandoverPieces += p;
    }

    const dhothiProfitPerPiece = Math.max(0, dhothiGovtRate - dhothiWeaverRate);
    const sareeProfitPerPiece = Math.max(0, sareeGovtRate - sareeWeaverRate);

    const dhothiTotalGovtRevenue = +(totalDhothiHandoverPieces * dhothiGovtRate).toFixed(2);
    const dhothiTotalWeaverWages = +(totalDhothiHandoverPieces * dhothiWeaverRate).toFixed(2);
    const dhothiTotalProfit = +(totalDhothiHandoverPieces * dhothiProfitPerPiece).toFixed(2);

    const sareeTotalGovtRevenue = +(totalSareeHandoverPieces * sareeGovtRate).toFixed(2);
    const sareeTotalWeaverWages = +(totalSareeHandoverPieces * sareeWeaverRate).toFixed(2);
    const sareeTotalProfit = +(totalSareeHandoverPieces * sareeProfitPerPiece).toFixed(2);

    const totalSchemeRevenue = +(dhothiTotalGovtRevenue + sareeTotalGovtRevenue).toFixed(2);
    const totalSchemeWeaverWages = +(dhothiTotalWeaverWages + sareeTotalWeaverWages).toFixed(2);
    const totalSchemeProfit = +(dhothiTotalProfit + sareeTotalProfit).toFixed(2);

    return NextResponse.json({
      ...analysis,
      govtSchemeProfit: {
        allotmentsCount: allotments.length,
        rates: {
          dhothiGovtRate,
          sareeGovtRate,
          dhothiWeaverRate,
          sareeWeaverRate,
          bagPrice,
          yarnRatePerKg,
        },
        dhothi: {
          handoverPieces: totalDhothiHandoverPieces,
          govtRate: dhothiGovtRate,
          weaverRate: dhothiWeaverRate,
          profitPerPiece: dhothiProfitPerPiece,
          totalRevenue: dhothiTotalGovtRevenue,
          totalWeaverExpense: dhothiTotalWeaverWages,
          netProfit: dhothiTotalProfit,
        },
        saree: {
          handoverPieces: totalSareeHandoverPieces,
          govtRate: sareeGovtRate,
          weaverRate: sareeWeaverRate,
          profitPerPiece: sareeProfitPerPiece,
          totalRevenue: sareeTotalGovtRevenue,
          totalWeaverExpense: sareeTotalWeaverWages,
          netProfit: sareeTotalProfit,
        },
        totalSchemeRevenue,
        totalSchemeWeaverWages,
        totalSchemeProfit,
      },
    });
  } catch (error: any) {
    console.error("GET /api/profit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate profit analysis" },
      { status: 500 }
    );
  }
}
