const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedUsers() {
  console.log("Seeding official users...");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("Society@2026", salt);

  const users = [
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
      fullName: "M. Thangavel (Data Entry Operator)",
      role: Role.DATA_ENTRY,
      phone: "9842100003",
    },
    {
      email: "auditor@cheran.coop",
      fullName: "P. Sundararajan (Co-operative Auditor)",
      role: Role.AUDITOR,
      phone: "9842100004",
    },
    {
      email: "management@cheran.coop",
      fullName: "S. K. Periasamy (Society President)",
      role: Role.MANAGEMENT,
      phone: "9842100005",
    },
  ];

  for (const u of users) {
    const upserted = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        role: u.role,
        phone: u.phone,
        passwordHash,
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
    console.log(`✓ User ready: ${upserted.email} (${upserted.role})`);
  }

  // Ensure default LiquidCashAccount exists
  await prisma.liquidCashAccount.upsert({
    where: { id: "society_liquid_cash" },
    update: {},
    create: {
      id: "society_liquid_cash",
      accountName: "Society Liquid Cash (கையிருப்பு ரொக்கம்)",
      currentBalance: 0.0,
    },
  });
  console.log("✓ Liquid Cash Account ready");

  console.log("\nAll credentials configured with password: Society@2026");
}

seedUsers()
  .catch((e) => {
    console.error("Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
