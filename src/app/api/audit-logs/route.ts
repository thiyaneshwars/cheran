import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canViewAuditLogs } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canViewAuditLogs(user.role)) {
      return NextResponse.json({ error: "Unauthorized: Insufficient permissions to view audit logs." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        performedBy: {
          select: { fullName: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}
