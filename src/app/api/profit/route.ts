import { NextResponse } from "next/server";
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
    return NextResponse.json(analysis);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to calculate profit analysis" }, { status: 500 });
  }
}
