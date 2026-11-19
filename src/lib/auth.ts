import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { cookies, headers } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "cheran-accounting-secret-jwt-key-2026-production-ready";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      const user = verifyToken(token);
      if (user) return user;
    }

    const headerList = await headers();
    const authHeader = headerList.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const bearerToken = authHeader.substring(7);
      return verifyToken(bearerToken);
    }
  } catch {
    return null;
  }
  return null;
}

// Permissions Matrix
export function canWriteTransactions(role: Role): boolean {
  return ([Role.ADMIN, Role.ACCOUNTANT, Role.DATA_ENTRY] as Role[]).includes(role);
}

export function canReverseOrDelete(role: Role): boolean {
  return ([Role.ADMIN, Role.ACCOUNTANT] as Role[]).includes(role);
}

export function canManageBankAccounts(role: Role): boolean {
  return ([Role.ADMIN, Role.ACCOUNTANT] as Role[]).includes(role);
}

export function canManageUsers(role: Role): boolean {
  return role === Role.ADMIN;
}

export function canViewAuditLogs(role: Role): boolean {
  return ([Role.ADMIN, Role.AUDITOR, Role.ACCOUNTANT] as Role[]).includes(role);
}

export function canViewReports(role: Role): boolean {
  return ([Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.MANAGEMENT] as Role[]).includes(role);
}

export function canAccessProduction(role: Role): boolean {
  return ([Role.PRODUCTION, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.MANAGEMENT] as Role[]).includes(role);
}

export function canManageProduction(role: Role): boolean {
  return ([Role.PRODUCTION, Role.ADMIN, Role.ACCOUNTANT] as Role[]).includes(role);
}
