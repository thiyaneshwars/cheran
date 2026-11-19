const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedProductionData() {
  console.log("=== Seeding Initial Textile Production Data (Veatti & Saree) ===");

  // Check if production units already exist
  const existingUnits = await prisma.productionUnit.count();
  if (existingUnits > 0) {
    console.log(`Found ${existingUnits} existing production unit(s). Skipping seed.`);
    return;
  }

  // 1. Veatti Production Unit (வேட்டி பிரிவு)
  const veattiUnit1 = await prisma.productionUnit.create({
    data: {
      clothType: "VEATTI",
      weaverName: "K. R. Sengottaiyan Powerlooms (செங்கோட்டையன் விசைத்தறி)",
      location: "Chennimalai Loom Shed #4",
      machineCount: 6,
      paavuCount: 5,
      paavuMeters: 6000.0,
      babinCount: 150,
      targetMeters: 5800.0,
      targetDate: new Date("2026-11-15"),
      totalProducedMeters: 2420.0,
      handoveredMeters: 1800.0,
      godownMeters: 620.0,
      balanceToHandover: 4000.0,
      notes: "Govt Free Dhoti Scheme (விலையில்லா வேட்டி திட்டம் 2026-27)",
    },
  });

  const veattiUnit2 = await prisma.productionUnit.create({
    data: {
      clothType: "VEATTI",
      weaverName: "M. Thangavel Powerloom Unit (தங்கவேல் தறி கூடம்)",
      location: "Bhavani Road, Erode",
      machineCount: 4,
      paavuCount: 4,
      paavuMeters: 4800.0,
      babinCount: 120,
      targetMeters: 4600.0,
      targetDate: new Date("2026-11-20"),
      totalProducedMeters: 1200.0,
      handoveredMeters: 800.0,
      godownMeters: 400.0,
      balanceToHandover: 3800.0,
      notes: "Co-optex Premium Vetti Order",
    },
  });

  // Paavus for Veatti:
  // - Completed paavu with difference check
  await prisma.paavuRecord.create({
    data: {
      clothType: "VEATTI",
      unitId: veattiUnit1.id,
      weaverName: veattiUnit1.weaverName,
      paavuNumber: "PV-V-101",
      paavuMeters: 1200.0,
      machineNumber: "Loom #1 (தறி 1)",
      status: "COMPLETED",
      loadedAt: new Date("2026-10-01"),
      completedAt: new Date("2026-10-12"),
      actualProducedMeters: 1215.0,
      meterDifference: 15.0, // +15m stretch
      notes: "Clean finish, minimal warp wastage",
    },
  });

  await prisma.paavuRecord.create({
    data: {
      clothType: "VEATTI",
      unitId: veattiUnit1.id,
      weaverName: veattiUnit1.weaverName,
      paavuNumber: "PV-V-102",
      paavuMeters: 1200.0,
      machineNumber: "Loom #2 (தறி 2)",
      status: "COMPLETED",
      loadedAt: new Date("2026-10-05"),
      completedAt: new Date("2026-10-18"),
      actualProducedMeters: 1205.0,
      meterDifference: 5.0,
      notes: "Verified by Quality Inspector",
    },
  });

  // - Running paavu in machine
  await prisma.paavuRecord.create({
    data: {
      clothType: "VEATTI",
      unitId: veattiUnit1.id,
      weaverName: veattiUnit1.weaverName,
      paavuNumber: "PV-V-103",
      paavuMeters: 1200.0,
      machineNumber: "Loom #3 (தறி 3)",
      status: "RUNNING",
      loadedAt: new Date("2026-10-19"),
      notes: "Currently running - 60% woven",
    },
  });

  // - Unloaded paavus (ready to be loaded)
  await prisma.paavuRecord.create({
    data: {
      clothType: "VEATTI",
      unitId: veattiUnit1.id,
      weaverName: veattiUnit1.weaverName,
      paavuNumber: "PV-V-104",
      paavuMeters: 1200.0,
      machineNumber: null,
      status: "UNLOADED",
      notes: "Sized beam delivered to mill floor. Awaiting machine allocation.",
    },
  });

  await prisma.paavuRecord.create({
    data: {
      clothType: "VEATTI",
      unitId: veattiUnit1.id,
      weaverName: veattiUnit1.weaverName,
      paavuNumber: "PV-V-105",
      paavuMeters: 1200.0,
      machineNumber: null,
      status: "UNLOADED",
      notes: "Ready in sizing godown",
    },
  });

  // 2. Saree Production Unit (சேலை பிரிவு)
  const sareeUnit1 = await prisma.productionUnit.create({
    data: {
      clothType: "SAREE",
      weaverName: "V. Palanisamy Modern Looms (பழனிசாமி தறிக்கூடம்)",
      location: "Sirumugai Road Cluster",
      machineCount: 8,
      paavuCount: 6,
      paavuMeters: 7200.0,
      babinCount: 180,
      targetMeters: 7000.0,
      targetDate: new Date("2026-11-25"),
      totalProducedMeters: 3650.0,
      handoveredMeters: 2500.0,
      godownMeters: 1150.0,
      balanceToHandover: 4500.0,
      notes: "Pongal Free Saree Distribution Scheme (பொங்கல் விலையில்லா சேலை)",
    },
  });

  // Paavus for Saree:
  await prisma.paavuRecord.create({
    data: {
      clothType: "SAREE",
      unitId: sareeUnit1.id,
      weaverName: sareeUnit1.weaverName,
      paavuNumber: "PV-S-201",
      paavuMeters: 1200.0,
      machineNumber: "Loom #5 (சேலை தறி 5)",
      status: "COMPLETED",
      loadedAt: new Date("2026-10-02"),
      completedAt: new Date("2026-10-15"),
      actualProducedMeters: 1192.0,
      meterDifference: -8.0, // -8m shrinkage
      notes: "Jacquard border test run, standard shrinkage",
    },
  });

  await prisma.paavuRecord.create({
    data: {
      clothType: "SAREE",
      unitId: sareeUnit1.id,
      weaverName: sareeUnit1.weaverName,
      paavuNumber: "PV-S-202",
      paavuMeters: 1200.0,
      machineNumber: "Loom #6 (சேலை தறி 6)",
      status: "RUNNING",
      loadedAt: new Date("2026-10-16"),
      notes: "Running at 70 picks/min",
    },
  });

  await prisma.paavuRecord.create({
    data: {
      clothType: "SAREE",
      unitId: sareeUnit1.id,
      weaverName: sareeUnit1.weaverName,
      paavuNumber: "PV-S-203",
      paavuMeters: 1200.0,
      machineNumber: null,
      status: "UNLOADED",
      notes: "Beams delivered from sizing mill, ready to load on Loom #7",
    },
  });

  // Initial Government Handover logs
  await prisma.governmentHandoverLog.create({
    data: {
      clothType: "VEATTI",
      unitId: veattiUnit1.id,
      challanNo: "CH-GOVT-VT-098",
      handoverDate: new Date("2026-10-16"),
      meters: 1800.0,
      recipientDept: "Tamil Nadu Co-optex Central Godown (ஈரோடு கிடங்கு)",
      vehicleNo: "TN 33 BB 4092 (Eicher)",
      officerName: "T. Muthuraman (Asst Director Handlooms)",
      notes: "First consignment cleared and inspected",
    },
  });

  await prisma.governmentHandoverLog.create({
    data: {
      clothType: "SAREE",
      unitId: sareeUnit1.id,
      challanNo: "CH-GOVT-SR-112",
      handoverDate: new Date("2026-10-18"),
      meters: 2500.0,
      recipientDept: "Tamil Nadu Co-optex Central Godown (ஈரோடு கிடங்கு)",
      vehicleNo: "TN 33 AF 8109 (Tata 407)",
      officerName: "M. Soundararajan (Inspection Officer)",
      notes: "Festival batch handover",
    },
  });

  console.log("[✓] Successfully seeded Veatti and Saree units, paavus, and government handovers!");
}

seedProductionData()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
