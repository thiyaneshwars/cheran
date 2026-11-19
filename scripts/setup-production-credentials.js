const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function setupProductionCredentials() {
  console.log("=== Setting up Production & Auditing Credentials ===");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("Society@2026", salt);

  // 1. Create or ensure aduit@cheran exists
  const aduitUser = await prisma.user.upsert({
    where: { email: "aduit@cheran" },
    update: {
      fullName: "Cheran Statutory Auditor & Accountant (தணிக்கையாளர்)",
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
    },
    create: {
      email: "aduit@cheran",
      fullName: "Cheran Statutory Auditor & Accountant (தணிக்கையாளர்)",
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
      phone: "9842100001",
    },
  });
  console.log("[✓] Configured Credential: aduit@cheran (Role: ADMIN/AUDITOR)");

  // Also create audit@cheran alias
  await prisma.user.upsert({
    where: { email: "audit@cheran" },
    update: {
      fullName: "Cheran Statutory Auditor & Accountant (English Alias)",
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
    },
    create: {
      email: "audit@cheran",
      fullName: "Cheran Statutory Auditor & Accountant (English Alias)",
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
      phone: "9842100001",
    },
  });
  console.log("[✓] Configured Credential: audit@cheran (Alias)");

  // 2. Create production@cheran
  const productionUser = await prisma.user.upsert({
    where: { email: "production@cheran" },
    update: {
      fullName: "Cheran Powerloom Production Manager (உற்பத்தி பிரிவு)",
      role: Role.PRODUCTION,
      passwordHash,
      isActive: true,
    },
    create: {
      email: "production@cheran",
      fullName: "Cheran Powerloom Production Manager (உற்பத்தி பிரிவு)",
      role: Role.PRODUCTION,
      passwordHash,
      isActive: true,
      phone: "9842100002",
    },
  });
  console.log("[✓] Configured Credential: production@cheran (Role: PRODUCTION)");

  // 3. Reassign references from other users to aduitUser before deleting them
  const oldUsers = await prisma.user.findMany({
    where: {
      email: {
        notIn: ["production@cheran", "aduit@cheran", "audit@cheran"],
      },
    },
  });

  console.log(`Found ${oldUsers.length} legacy credentials to remove...`);

  for (const old of oldUsers) {
    try {
      await prisma.auditLog.updateMany({
        where: { performedById: old.id },
        data: { performedById: aduitUser.id },
      });
      await prisma.liquidCashEntry.updateMany({
        where: { createdById: old.id },
        data: { createdById: aduitUser.id },
      });
      await prisma.liquidCashEntry.updateMany({
        where: { revokedById: old.id },
        data: { revokedById: aduitUser.id },
      });
      await prisma.transaction.updateMany({
        where: { createdById: old.id },
        data: { createdById: aduitUser.id },
      });
      await prisma.transaction.updateMany({
        where: { lastModifiedById: old.id },
        data: { lastModifiedById: aduitUser.id },
      });
      await prisma.settlement.updateMany({
        where: { createdById: old.id },
        data: { createdById: aduitUser.id },
      });

      await prisma.user.delete({ where: { id: old.id } });
      console.log(`[✓] Removed legacy user: ${old.email}`);
    } catch (err) {
      console.warn(`[!] Note on removing ${old.email}:`, err.message);
    }
  }

  const finalUsers = await prisma.user.findMany({
    select: { email: true, fullName: true, role: true },
  });
  console.log("\n================ ACTIVE SYSTEM USERS ================");
  console.table(finalUsers);
  console.log("=====================================================\n");
}

setupProductionCredentials()
  .catch((e) => {
    console.error("Error setting up credentials:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
