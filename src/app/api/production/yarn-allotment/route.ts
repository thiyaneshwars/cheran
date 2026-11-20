import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Conversions specified by Co-optex Govt Free Dhothi & Saree Scheme:
export const YARN_CONVERSIONS = {
  DHOTHI: {
    WARP_PER_PIECE: 0.122,  // kg per dhothi
    WEFT_PER_PIECE: 0.119,  // kg per dhothi
    BORDER_PER_PIECE: 0.006, // kg per dhothi
    TOTAL_PER_PIECE: 0.247,
    DEFAULT_WEAVER_RATE: 19.0, // Rs. 19 per piece weaving charge
  },
  SAREE: {
    WARP_PER_PIECE: 0.188,  // kg per saree
    WEFT_PER_PIECE: 0.182,  // kg per saree
    BORDER_PER_PIECE: 0.024, // kg per saree
    TOTAL_PER_PIECE: 0.394,
    DEFAULT_WEAVER_RATE: 42.0, // Rs. 42 per piece weaving charge
  },
};

/**
 * GET /api/production/yarn-allotment
 * List all government yarn inward allotments with calculated piece targets
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allotments = await prisma.govtYarnAllotment.findMany({
      orderBy: { allotmentDate: "desc" },
    });

    // Calculate aggregated totals
    let totalDhothiWarpKg = 0;
    let totalDhothiWeftKg = 0;
    let totalDhothiBorderKg = 0;

    let totalSareeWarpKg = 0;
    let totalSareeWeftKg = 0;
    let totalSareeBorderKg = 0;

    const enrichedAllotments = allotments.map((a) => {
      totalDhothiWarpKg += a.dhothiWarpKg;
      totalDhothiWeftKg += a.dhothiWeftKg;
      totalDhothiBorderKg += a.dhothiBorderKg;

      totalSareeWarpKg += a.sareeWarpKg;
      totalSareeWeftKg += a.sareeWeftKg;
      totalSareeBorderKg += a.sareeBorderKg;

      // Pieces derived for this allotment
      const dhothiPiecesWarp = a.dhothiWarpKg > 0 ? Math.round(a.dhothiWarpKg / YARN_CONVERSIONS.DHOTHI.WARP_PER_PIECE) : 0;
      const dhothiPiecesWeft = a.dhothiWeftKg > 0 ? Math.round(a.dhothiWeftKg / YARN_CONVERSIONS.DHOTHI.WEFT_PER_PIECE) : 0;
      const dhothiPiecesBorder = a.dhothiBorderKg > 0 ? Math.round(a.dhothiBorderKg / YARN_CONVERSIONS.DHOTHI.BORDER_PER_PIECE) : 0;
      const targetDhothiPieces = dhothiPiecesWarp || dhothiPiecesWeft || 0;

      const sareePiecesWarp = a.sareeWarpKg > 0 ? Math.round(a.sareeWarpKg / YARN_CONVERSIONS.SAREE.WARP_PER_PIECE) : 0;
      const sareePiecesWeft = a.sareeWeftKg > 0 ? Math.round(a.sareeWeftKg / YARN_CONVERSIONS.SAREE.WEFT_PER_PIECE) : 0;
      const sareePiecesBorder = a.sareeBorderKg > 0 ? Math.round(a.sareeBorderKg / YARN_CONVERSIONS.SAREE.BORDER_PER_PIECE) : 0;
      const targetSareePieces = sareePiecesWarp || sareePiecesWeft || 0;

      return {
        ...a,
        derived: {
          dhothi: {
            piecesFromWarp: dhothiPiecesWarp,
            piecesFromWeft: dhothiPiecesWeft,
            piecesFromBorder: dhothiPiecesBorder,
            targetPieces: targetDhothiPieces,
            totalKg: +(a.dhothiWarpKg + a.dhothiWeftKg + a.dhothiBorderKg).toFixed(3),
          },
          saree: {
            piecesFromWarp: sareePiecesWarp,
            piecesFromWeft: sareePiecesWeft,
            piecesFromBorder: sareePiecesBorder,
            targetPieces: targetSareePieces,
            totalKg: +(a.sareeWarpKg + a.sareeWeftKg + a.sareeBorderKg).toFixed(3),
          },
        },
      };
    });

    const summary = {
      dhothi: {
        totalWarpKg: +totalDhothiWarpKg.toFixed(3),
        totalWeftKg: +totalDhothiWeftKg.toFixed(3),
        totalBorderKg: +totalDhothiBorderKg.toFixed(3),
        totalYarnKg: +(totalDhothiWarpKg + totalDhothiWeftKg + totalDhothiBorderKg).toFixed(3),
        piecesFromWarp: Math.round(totalDhothiWarpKg / YARN_CONVERSIONS.DHOTHI.WARP_PER_PIECE),
        piecesFromWeft: Math.round(totalDhothiWeftKg / YARN_CONVERSIONS.DHOTHI.WEFT_PER_PIECE),
        piecesFromBorder: Math.round(totalDhothiBorderKg / YARN_CONVERSIONS.DHOTHI.BORDER_PER_PIECE),
        targetTotalPieces: Math.round(totalDhothiWarpKg / YARN_CONVERSIONS.DHOTHI.WARP_PER_PIECE),
      },
      saree: {
        totalWarpKg: +totalSareeWarpKg.toFixed(3),
        totalWeftKg: +totalSareeWeftKg.toFixed(3),
        totalBorderKg: +totalSareeBorderKg.toFixed(3),
        totalYarnKg: +(totalSareeWarpKg + totalSareeWeftKg + totalSareeBorderKg).toFixed(3),
        piecesFromWarp: Math.round(totalSareeWarpKg / YARN_CONVERSIONS.SAREE.WARP_PER_PIECE),
        piecesFromWeft: Math.round(totalSareeWeftKg / YARN_CONVERSIONS.SAREE.WEFT_PER_PIECE),
        piecesFromBorder: Math.round(totalSareeBorderKg / YARN_CONVERSIONS.SAREE.BORDER_PER_PIECE),
        targetTotalPieces: Math.round(totalSareeWarpKg / YARN_CONVERSIONS.SAREE.WARP_PER_PIECE),
      },
    };

    return NextResponse.json({
      allotments: enrichedAllotments,
      summary,
      conversions: YARN_CONVERSIONS,
    });
  } catch (error: any) {
    console.error("GET /api/production/yarn-allotment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch yarn allotment records" },
      { status: 500 }
    );
  }
}

function safeFloat(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? fallback : num;
}

/**
 * POST /api/production/yarn-allotment
 * Create a new yarn allotment inward entry
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const allotmentNo =
      body.allotmentNo?.trim() ||
      `ALLOT-${Date.now().toString().slice(-6)}`;

    const dhothiWarpKg = Math.max(0, safeFloat(body.dhothiWarpKg, 0));
    const dhothiWeftKg = Math.max(0, safeFloat(body.dhothiWeftKg, 0));
    const dhothiBorderKg = Math.max(0, safeFloat(body.dhothiBorderKg, 0));

    const sareeWarpKg = Math.max(0, safeFloat(body.sareeWarpKg, 0));
    const sareeWeftKg = Math.max(0, safeFloat(body.sareeWeftKg, 0));
    const sareeBorderKg = Math.max(0, safeFloat(body.sareeBorderKg, 0));

    const yarnRatePerKg = Math.max(0, safeFloat(body.yarnRatePerKg, 0));
    const bagPrice = Math.max(0, safeFloat(body.bagPrice, 0));
    const dhothiGovtRate = Math.max(0, safeFloat(body.dhothiGovtRate, 0));
    const sareeGovtRate = Math.max(0, safeFloat(body.sareeGovtRate, 0));

    const dhothiWeaverRate =
      safeFloat(body.dhothiWeaverRate, 0) > 0
        ? safeFloat(body.dhothiWeaverRate, 19)
        : YARN_CONVERSIONS.DHOTHI.DEFAULT_WEAVER_RATE; // 19

    const sareeWeaverRate =
      safeFloat(body.sareeWeaverRate, 0) > 0
        ? safeFloat(body.sareeWeaverRate, 42)
        : YARN_CONVERSIONS.SAREE.DEFAULT_WEAVER_RATE; // 42

    const allotment = await prisma.govtYarnAllotment.create({
      data: {
        allotmentNo,
        allotmentDate: body.allotmentDate ? new Date(body.allotmentDate) : new Date(),
        schemeName: body.schemeName || "Tamil Nadu Free Dhothi & Saree Scheme",
        supplierDept: body.supplierDept || "Co-optex / Dept of Handlooms & Textiles",
        dhothiWarpKg,
        dhothiWeftKg,
        dhothiBorderKg,
        sareeWarpKg,
        sareeWeftKg,
        sareeBorderKg,
        yarnRatePerKg,
        bagPrice,
        dhothiGovtRate,
        sareeGovtRate,
        dhothiWeaverRate,
        sareeWeaverRate,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, allotment });
  } catch (error: any) {
    console.error("POST /api/production/yarn-allotment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record yarn allotment" },
      { status: 500 }
    );
  }
}
