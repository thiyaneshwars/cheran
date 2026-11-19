import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePassword, signToken } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(3, "Please enter a valid credential"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid username or password format." }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const normalizedInput = email.toLowerCase().trim();

    // Support both aduit@cheran and audit@cheran seamlessly
    let user = await prisma.user.findUnique({
      where: { email: normalizedInput },
    });

    if (!user && (normalizedInput === "audit@cheran" || normalizedInput === "aduit@cheran")) {
      user = await prisma.user.findFirst({
        where: {
          email: { in: ["aduit@cheran", "audit@cheran", "auditor@cheran.coop"] }
        }
      });
    }

    if (!user && normalizedInput === "production@cheran") {
      user = await prisma.user.findFirst({
        where: {
          email: { in: ["production@cheran", "production@cheran.coop"] }
        }
      });
    }

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials or inactive account." }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    const token = signToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      token,
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        performedById: user.id,
        details: `User logged in: ${user.email} (${user.role})`,
      },
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}
