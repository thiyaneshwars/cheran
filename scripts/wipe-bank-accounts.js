const { PrismaClient } = require("@prisma/client");

async function wipeDatabase(dbUrl, dbName) {
  process.env.DATABASE_URL = dbUrl;
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    console.log(`Connecting to ${dbName} (${dbUrl})...`);
    // Ensure all references (if any exist) are cleared first
    await prisma.journalLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.settlement.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.sizingBill.deleteMany();
    await prisma.powerloomTransaction.deleteMany();
    await prisma.wageRecord.deleteMany();
    await prisma.transportBill.deleteMany();
    await prisma.bankReconciliation.deleteMany();
    await prisma.liquidCashEntry.deleteMany();
    
    // Reset Liquid Cash Account balance to 0
    await prisma.liquidCashAccount.upsert({
      where: { id: "society_liquid_cash" },
      update: { currentBalance: 0 },
      create: {
        id: "society_liquid_cash",
        accountName: "Society Liquid Cash (கையிருப்பு ரொக்கம்)",
        currentBalance: 0,
      },
    });

    // Now delete all bank accounts
    const deleted = await prisma.bankAccount.deleteMany();
    console.log(`✅ [${dbName}] Successfully wiped ${deleted.count} bank accounts.`);
    
    const count = await prisma.bankAccount.count();
    console.log(`🔍 [${dbName}] Current bank account count: ${count}`);
  } catch (err) {
    console.error(`❌ Error wiping ${dbName}:`, err);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("=== WIPING ALL DEMO BANK ACCOUNTS FOR ORIGINAL DATA READINESS ===\n");
  await wipeDatabase("file:./dev.db", "Development Database (dev.db)");
  console.log("");
  await wipeDatabase("file:./prod.db", "Production Database (prod.db)");
  console.log("\nAll demo bank account records have been successfully purged!");
}

main();
