import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { z } from "zod";

const workerSchema = z.object({
  workerCode: z.string().min(2),
  name: z.string().min(2),
  phone: z.string().optional(),
  department: z.string().optional(),
  dailyRate: z.number().min(0),
  openingAdvance: z.number().default(0),
});

export async function GET() {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { wageRecords: true },
        },
      },
    });

    return NextResponse.json(
      workers.map((w) => ({
        ...w,
        dailyRate: round2(w.dailyRate),
        openingAdvance: round2(w.openingAdvance),
        currentAdvance: round2(w.currentAdvance),
      }))
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch workers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = workerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const opAdv = round2(parsed.data.openingAdvance);
    const worker = await prisma.worker.create({
      data: {
        ...parsed.data,
        dailyRate: round2(parsed.data.dailyRate),
        openingAdvance: opAdv,
        currentAdvance: opAdv,
      },
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create worker" }, { status: 500 });
  }
}
