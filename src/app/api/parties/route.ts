import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canWriteTransactions } from "@/lib/auth";
import { round2 } from "@/lib/decimal";
import { PartyType } from "@prisma/client";
import { z } from "zod";

const partySchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  partyType: z.nativeEnum(PartyType).default(PartyType.CUSTOMER),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  openingBalance: z.number().default(0),
});

export async function GET() {
  try {
    const parties = await prisma.party.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(
      parties.map((p) => ({
        ...p,
        openingBalance: round2(p.openingBalance),
        currentOutstanding: round2(p.currentOutstanding),
      }))
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch parties" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteTransactions(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = partySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const opBal = round2(parsed.data.openingBalance);
    const party = await prisma.party.create({
      data: {
        ...parsed.data,
        openingBalance: opBal,
        currentOutstanding: opBal,
      },
    });

    return NextResponse.json(party, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create party" }, { status: 500 });
  }
}
