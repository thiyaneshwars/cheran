import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Safety guard: Protect existing real-time data
  const txnCount = await prisma.transaction.count();
  const bankCount = await prisma.bankAccount.count();
  if ((txnCount > 0 || bankCount > 0) && process.env.FORCE_INIT !== "true") {
    console.warn("⚠️ Production database already contains live data. Wiping aborted to protect live data.");
    console.warn("If you intentionally want to reset, run with FORCE_INIT=true");
    return;
  }

  console.log("Setting up Clean Production Database for Cheran Co-operative Society...");

  // 1. Wipe all transactional & production demo records
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.sizingBill.deleteMany();
  await prisma.powerloomTransaction.deleteMany();
  await prisma.powerloomWeaver.deleteMany();
  await prisma.wageRecord.deleteMany();
  await prisma.transportBill.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bankReconciliation.deleteMany();
  await prisma.liquidCashEntry.deleteMany();
  await prisma.governmentHandoverLog.deleteMany();
  await prisma.paavuRecord.deleteMany();
  await prisma.productionUnit.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();

  // 2. Ensure Active Accounting Period (FY 2026-2027)
  await prisma.accountingPeriod.deleteMany();
  await prisma.accountingPeriod.create({
    data: {
      name: "FY 2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isClosed: false,
    },
  });

  // 3. Set Up Official Society Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("Society@2026", salt);

  const users = [
    {
      email: "production@cheran",
      fullName: "Cheran Powerloom Production Manager (உற்பத்தி பிரிவு)",
      role: Role.PRODUCTION,
      phone: "9842100002",
    },
    {
      email: "aduit@cheran",
      fullName: "Cheran Statutory Auditor & Accountant (தணிக்கையாளர்)",
      role: Role.ADMIN,
      phone: "9842100001",
    },
    {
      email: "audit@cheran",
      fullName: "Cheran Statutory Auditor & Accountant (Alias)",
      role: Role.ADMIN,
      phone: "9842100001",
    },
    {
      email: "admin@cheran.coop",
      fullName: "K. R. Sengottaiyan (Secretary / Admin)",
      role: Role.ADMIN,
      phone: "9842100001",
    },
    {
      email: "accountant@cheran.coop",
      fullName: "R. Natarajan (Head Accountant)",
      role: Role.ACCOUNTANT,
      phone: "9842100002",
    },
    {
      email: "operator@cheran.coop",
      fullName: "S. Kavitha (Data Entry Operator)",
      role: Role.DATA_ENTRY,
      phone: "9842100003",
    },
    {
      email: "auditor@cheran.coop",
      fullName: "CA S. Sundararajan (Statutory Auditor)",
      role: Role.AUDITOR,
      phone: "9842100004",
    },
    {
      email: "management@cheran.coop",
      fullName: "M. Arumugam (Society President)",
      role: Role.MANAGEMENT,
      phone: "9842100005",
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        role: u.role,
        phone: u.phone,
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        phone: u.phone,
        isActive: true,
      },
    });
  }

  // 4. Reset Liquid Cash vault account
  await prisma.liquidCashAccount.upsert({
    where: { id: "society_liquid_cash" },
    update: { currentBalance: 0.0 },
    create: {
      id: "society_liquid_cash",
      accountName: "Society Liquid Cash (கையிருப்பு ரொக்கம்)",
      currentBalance: 0.0,
    },
  });

  // 5. Clean Bank Accounts, Parties and Workers (Ready for real master entries)
  await prisma.bankAccount.deleteMany();
  await prisma.party.deleteMany();
  await prisma.worker.deleteMany();

  // 6. Record single initial audit log of clean production initialization
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (admin) {
    await prisma.auditLog.create({
      data: {
        action: "PRODUCTION_ENVIRONMENT_INITIALIZED",
        entityType: "System",
        entityId: "SYS-INIT",
        performedById: admin.id,
        details: "Clean production accounting and textile database initialized. All demo values, looms, and units wiped. Ready for real-time live data entry.",
      },
    });
  }

  console.log("Production database clean setup complete! Zero demo records remain.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
