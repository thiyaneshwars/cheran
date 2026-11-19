import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageBankAccounts } from "@/lib/auth";
import { z } from "zod";

const updateBankSchema = z.object({
  bankName: z.string().min(2).optional(),
  accountName: z.string().min(2).optional(),
  accountNumber: z.string().min(4).optional(),
  branchName: z.string().min(2).optional(),
  ifscCode: z.string().min(4).optional(),
  accountType: z.enum(["SAVINGS", "CURRENT", "OVERDRAFT", "CASH"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "FROZEN"]).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || !canManageBankAccounts(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateBankSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const updated = await prisma.bankAccount.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, bank: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update bank account" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user || !canManageBankAccounts(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const bank = await prisma.bankAccount.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            transactions: true,
            settlements: true,
            sizingBills: true,
            powerloomTransactions: true,
            wageRecords: true,
            transportBills: true,
          },
        },
      },
    });

    if (!bank) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const totalUsage =
      bank._count.transactions +
      bank._count.settlements +
      bank._count.sizingBills +
      bank._count.powerloomTransactions +
      bank._count.wageRecords +
      bank._count.transportBills;

    if (totalUsage > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete a bank account that has existing transactions or settlements associated with it.",
        },
        { status: 400 }
      );
    }

    await prisma.bankAccount.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Bank account removed successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete bank account" }, { status: 500 });
  }
}
