import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Wrap $transaction to apply safe default timeouts (timeout: 60000ms, maxWait: 15000ms) for interactive transactions in SQLite
const originalTransaction = basePrisma.$transaction.bind(basePrisma);
(basePrisma as any).$transaction = function (arg: any, options?: any) {
  if (typeof arg === "function") {
    return originalTransaction(arg, {
      maxWait: 15000,
      timeout: 60000,
      ...options,
    });
  }
  return originalTransaction(arg, options);
};

export const prisma = basePrisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
