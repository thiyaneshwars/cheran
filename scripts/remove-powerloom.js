const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function listAll() {
  console.log("\n=================== REGISTERED WEAVERS ===================");
  const weavers = await prisma.powerloomWeaver.findMany({
    orderBy: { createdAt: "asc" },
  });
  if (weavers.length === 0) {
    console.log("No weavers found.");
  } else {
    weavers.forEach((w, i) => {
      console.log(
        `[#${i + 1}] ID: ${w.id} | Name: "${w.name}" | Location: "${w.location}" | Category: ${w.category} | Looms: ${w.loomCount || 1}`
      );
    });
  }

  console.log("\n================= POWERLOOM TRANSACTIONS =================");
  const txns = await prisma.powerloomTransaction.findMany({
    orderBy: { createdAt: "desc" },
  });
  if (txns.length === 0) {
    console.log("No powerloom transactions found.");
  } else {
    txns.forEach((t, i) => {
      console.log(
        `[#${i + 1}] ID: ${t.id} | Voucher: ${t.transactionNumber} | Weaver: "${t.weaverName}" | Amount: ₹${t.totalAmount} | Status: ${t.paymentStatus}`
      );
    });
  }
  console.log("==========================================================\n");
  return { weavers, txns };
}

async function deduplicateWeavers() {
  console.log("Checking for duplicate weavers (same name + location)...");
  const weavers = await prisma.powerloomWeaver.findMany({
    orderBy: { createdAt: "asc" },
  });

  const seen = new Set();
  const toDelete = [];

  for (const w of weavers) {
    const key = `${w.name.trim().toLowerCase()}::${w.location.trim().toLowerCase()}`;
    if (seen.has(key)) {
      toDelete.push(w.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length === 0) {
    console.log("No duplicate weavers found.");
    return;
  }

  console.log(`Found ${toDelete.length} duplicate weaver(s) to remove.`);
  const deleted = await prisma.powerloomWeaver.deleteMany({
    where: { id: { in: toDelete } },
  });
  console.log(`✅ Successfully removed ${deleted.count} duplicate weaver(s).`);
}

async function deleteWeaver(identifier) {
  try {
    const cleanId = identifier.replace(/^#/, "");
    const weavers = await prisma.powerloomWeaver.findMany({
      orderBy: { createdAt: "asc" },
    });

    let target = null;
    // Check if cleanId is a 1-based index
    const idx = parseInt(cleanId, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= weavers.length) {
      target = weavers[idx - 1];
    } else {
      // Find by ID or partial name
      target =
        weavers.find((w) => w.id === identifier) ||
        weavers.find((w) => w.name.toLowerCase().includes(identifier.toLowerCase()));
    }

    if (!target) {
      console.log(`❌ Weaver matching '${identifier}' not found.`);
      return;
    }

    await prisma.powerloomWeaver.delete({ where: { id: target.id } });
    console.log(`✅ Removed weaver '${target.name}' (${target.location}) [ID: ${target.id}].`);
  } catch (err) {
    console.error(`❌ Failed to delete weaver:`, err.message);
  }
}

async function deleteTransaction(identifier) {
  try {
    const cleanId = identifier.replace(/^#/, "");
    const txns = await prisma.powerloomTransaction.findMany({
      orderBy: { createdAt: "desc" },
    });

    let target = null;
    const idx = parseInt(cleanId, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= txns.length) {
      target = txns[idx - 1];
    } else {
      target =
        txns.find((t) => t.id === identifier) ||
        txns.find((t) => t.transactionNumber.toLowerCase() === identifier.toLowerCase());
    }

    if (!target) {
      console.log(`❌ Transaction matching '${identifier}' not found.`);
      return;
    }

    // Clean up linked accounting transaction and journal entries if present
    if (target.transactionId) {
      await prisma.journalLine.deleteMany({
        where: { entry: { transactionId: target.transactionId } },
      });
      await prisma.journalEntry.deleteMany({
        where: { transactionId: target.transactionId },
      });
      await prisma.transaction.deleteMany({
        where: { id: target.transactionId },
      });
      console.log(`✅ Cleaned up linked ledger journal entries for TXN-${target.transactionNumber}.`);
    }

    await prisma.powerloomTransaction.delete({ where: { id: target.id } });
    console.log(`✅ Removed powerloom transaction ${target.transactionNumber} [ID: ${target.id}].`);
  } catch (err) {
    console.error(`❌ Failed to delete transaction:`, err.message);
  }
}

async function deleteMatchingWeavers(query) {
  try {
    const res = await prisma.powerloomWeaver.deleteMany({
      where: {
        OR: [
          { name: { contains: query } },
          { location: { contains: query } },
        ],
      },
    });
    console.log(`✅ Successfully removed ${res.count} weaver(s) matching '${query}'.`);
  } catch (err) {
    console.error(`❌ Failed to delete weavers:`, err.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || "list";

  try {
    if (action === "list") {
      await listAll();
      console.log("Usage examples:");
      console.log("  node scripts/remove-powerloom.js dedupe                (removes duplicate weavers)");
      console.log("  node scripts/remove-powerloom.js weaver <# or ID>      (e.g., weaver #2 or weaver cmv7...)");
      console.log("  node scripts/remove-powerloom.js remove-all <name>     (e.g., remove-all Ramasamy)");
      console.log("  node scripts/remove-powerloom.js txn <# or Voucher>    (e.g., txn #1 or txn PL-VET-138629-8941)");
    } else if (action === "dedupe") {
      await deduplicateWeavers();
      await listAll();
    } else if (action === "remove-all" && args[1]) {
      await deleteMatchingWeavers(args[1]);
      await listAll();
    } else if (action === "weaver" && args[1]) {
      await deleteWeaver(args[1]);
      await listAll();
    } else if (action === "txn" && args[1]) {
      await deleteTransaction(args[1]);
      await listAll();
    } else {
      console.log(`Unknown action '${action}'. Run 'node scripts/remove-powerloom.js' to see list.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
