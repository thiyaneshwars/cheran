import {
  PrismaClient,
  Role,
  AccountType,
  AccountStatus,
  SectionType,
  TransactionType,
  Direction,
  PaymentStatus,
  PartyType,
  TransactionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Safety guard: Protect live user data from accidental overwrite
  const bankCount = await prisma.bankAccount.count();
  const txnCount = await prisma.transaction.count();
  const partyCount = await prisma.party.count();
  if ((bankCount > 0 || txnCount > 0 || partyCount > 0) && process.env.CONFIRM_DEMO_OVERWRITE !== "true") {
    console.warn("⚠️ Live real-time data detected in database. Demo seeding aborted to protect user data.");
    console.warn("If you intentionally want to wipe live data, set CONFIRM_DEMO_OVERWRITE=true");
    return;
  }

  console.log("Seeding Cheran Co-operative Society Accounting Database with Rich Demo Data...");

  // 1. Clean existing records in correct foreign key order
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
  await prisma.liquidCashAccount.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.party.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.accountingPeriod.deleteMany();

  // 2. Accounting Periods
  await prisma.accountingPeriod.create({
    data: {
      name: "FY 2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isClosed: false,
    },
  });

  // 3. Create Users across all roles
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("Society@2026", salt);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@cheran.coop",
      passwordHash,
      fullName: "K. R. Sengottaiyan (Secretary/Admin)",
      role: Role.ADMIN,
      phone: "9842100001",
    },
  });

  const accountantUser = await prisma.user.create({
    data: {
      email: "accountant@cheran.coop",
      passwordHash,
      fullName: "R. Natarajan (Head Accountant)",
      role: Role.ACCOUNTANT,
      phone: "9842100002",
    },
  });

  const dataEntryUser = await prisma.user.create({
    data: {
      email: "operator@cheran.coop",
      passwordHash,
      fullName: "S. Kavitha (Data Entry Operator)",
      role: Role.DATA_ENTRY,
      phone: "9842100003",
    },
  });

  const auditorUser = await prisma.user.create({
    data: {
      email: "auditor@cheran.coop",
      passwordHash,
      fullName: "CA S. Sundararajan (Statutory Auditor)",
      role: Role.AUDITOR,
      phone: "9842100004",
    },
  });

  const managementUser = await prisma.user.create({
    data: {
      email: "management@cheran.coop",
      passwordHash,
      fullName: "M. Arumugam (Society President)",
      role: Role.MANAGEMENT,
      phone: "9842100005",
    },
  });

  // 4. Create Bank Accounts
  const bankA = await prisma.bankAccount.create({
    data: {
      bankName: "State Bank of India",
      accountName: "SBI Main Society Current A/c",
      accountNumber: "40192837461",
      branchName: "Erode Bazaar",
      ifscCode: "SBIN0000832",
      accountType: AccountType.CURRENT,
      openingBalance: 500000,
      currentBalance: 650000,
      statementBalance: 650000,
      status: AccountStatus.ACTIVE,
      isDefault: true,
    },
  });

  const bankB = await prisma.bankAccount.create({
    data: {
      bankName: "Canara Bank",
      accountName: "Canara Weavers Wage Fund",
      accountNumber: "1520101039482",
      branchName: "Bhavani Road",
      ifscCode: "CNRB0001520",
      accountType: AccountType.SAVINGS,
      openingBalance: 350000,
      currentBalance: 280000,
      statementBalance: 280000,
      status: AccountStatus.ACTIVE,
    },
  });

  const bankC = await prisma.bankAccount.create({
    data: {
      bankName: "HDFC Bank",
      accountName: "HDFC Sizing & Powerloom Operations",
      accountNumber: "50200039281746",
      branchName: "Chennimalai Branch",
      ifscCode: "HDFC0000492",
      accountType: AccountType.CURRENT,
      openingBalance: 150000,
      currentBalance: 220000,
      statementBalance: 220000,
      status: AccountStatus.ACTIVE,
    },
  });

  const bankD = await prisma.bankAccount.create({
    data: {
      bankName: "Erode District Central Co-op Bank",
      accountName: "EDCC Reserve & Welfare Fund",
      accountNumber: "20188492019",
      branchName: "Netaji Road Central",
      ifscCode: "EDCC0001004",
      accountType: AccountType.CURRENT,
      openingBalance: 200000,
      currentBalance: 200000,
      statementBalance: 200000,
      status: AccountStatus.ACTIVE,
    },
  });

  // 5. Society Liquid Cash Account & Entries
  const liquidAccount = await prisma.liquidCashAccount.create({
    data: {
      id: "society_liquid_cash",
      accountName: "Society Liquid Cash (கையிருப்பு ரொக்கம்)",
      currentBalance: 45000,
    },
  });

  await prisma.liquidCashEntry.createMany({
    data: [
      {
        voucherNo: "LC-2026-001",
        entryDate: new Date("2026-08-01"),
        type: "CASH_IN",
        category: "CASH_DRAWN_FROM_BANK",
        amount: 50000,
        balanceBefore: 0,
        balanceAfter: 50000,
        description: "Withdrawn from SBI Main A/c for petty cash & worker advance",
        bankAccountId: bankA.id,
        createdById: accountantUser.id,
        status: "ACTIVE",
      },
      {
        voucherNo: "LC-2026-002",
        entryDate: new Date("2026-08-15"),
        type: "CASH_OUT",
        category: "WORKER_ADVANCE",
        amount: 15000,
        balanceBefore: 50000,
        balanceAfter: 35000,
        description: "Urgent festival advance disbursed to Weaver P. Muthusamy",
        createdById: accountantUser.id,
        status: "ACTIVE",
      },
      {
        voucherNo: "LC-2026-003",
        entryDate: new Date("2026-09-05"),
        type: "CASH_IN",
        category: "DIRECT_COLLECTION",
        amount: 20000,
        balanceBefore: 35000,
        balanceAfter: 55000,
        description: "Direct counter cash collection from Kongu Handloom for sample cloth delivery",
        createdById: dataEntryUser.id,
        status: "ACTIVE",
      },
      {
        voucherNo: "LC-2026-004",
        entryDate: new Date("2026-09-20"),
        type: "CASH_OUT",
        category: "OFFICE_EXPENSE",
        amount: 10000,
        balanceBefore: 55000,
        balanceAfter: 45000,
        description: "Local loading wages and tempo freight cash payment",
        createdById: dataEntryUser.id,
        status: "ACTIVE",
      },
    ],
  });

  // 6. Parties (Customers & Suppliers)
  const party1 = await prisma.party.create({
    data: {
      code: "PTY-001",
      name: "Sri Ramalingam Textiles Ltd",
      partyType: PartyType.CUSTOMER,
      contactPerson: "Mr. V. Ramalingam",
      phone: "9842711223",
      email: "orders@ramalingamtextiles.in",
      address: "142, Netaji Road, Erode",
      gstin: "33AAACR1234F1Z1",
      openingBalance: 0,
      currentOutstanding: 75000,
    },
  });

  const party2 = await prisma.party.create({
    data: {
      code: "PTY-002",
      name: "Kongu Handloom & Weaving Corp",
      partyType: PartyType.CUSTOMER,
      contactPerson: "M. Shanmugam",
      phone: "9842344556",
      email: "info@konguweaving.com",
      address: "88, West Street, Komarapalayam",
      gstin: "33AABCK5678G1Z2",
      openingBalance: 0,
      currentOutstanding: 50000,
    },
  });

  const party3 = await prisma.party.create({
    data: {
      code: "PTY-003",
      name: "Tirupur Sizing Starch & Chemicals",
      partyType: PartyType.SUPPLIER,
      contactPerson: "K. Mohan",
      phone: "9842566778",
      email: "sales@tirupurstarch.com",
      address: "24, Industrial Estate, Tirupur",
      gstin: "33AABCT9988H1Z5",
      openingBalance: 0,
      currentOutstanding: 20000,
    },
  });

  const party4 = await prisma.party.create({
    data: {
      code: "PTY-004",
      name: "Bhavani Silk & Cotton Fabrics",
      partyType: PartyType.CUSTOMER,
      contactPerson: "S. K. Periasamy",
      phone: "9842677889",
      email: "contact@bhavanisilk.com",
      address: "55, Cauvery Nagar, Bhavani",
      gstin: "33AACPB4433K1Z8",
      openingBalance: 0,
      currentOutstanding: 0,
    },
  });

  const party5 = await prisma.party.create({
    data: {
      code: "PTY-005",
      name: "Chennimalai Weavers Co-operative Union",
      partyType: PartyType.BOTH,
      contactPerson: "R. Chinnasamy",
      phone: "9842899001",
      email: "chennimalai.union@coop.tn.gov.in",
      address: "10, Society Street, Chennimalai",
      gstin: "33AAATC7788L1Z3",
      openingBalance: 0,
      currentOutstanding: 99000,
    },
  });

  // 7. Workers
  const worker1 = await prisma.worker.create({
    data: {
      workerCode: "WRK-001",
      name: "P. Muthusamy",
      phone: "9788112233",
      department: "Powerloom Section",
      dailyRate: 750,
      openingAdvance: 0,
      currentAdvance: 1000,
    },
  });

  const worker2 = await prisma.worker.create({
    data: {
      workerCode: "WRK-002",
      name: "K. Palanisamy",
      phone: "9788223344",
      department: "Sizing Mill Operator",
      dailyRate: 800,
      openingAdvance: 0,
      currentAdvance: 0,
    },
  });

  const worker3 = await prisma.worker.create({
    data: {
      workerCode: "WRK-003",
      name: "S. Murugesan",
      phone: "9788334455",
      department: "Warp Preparation",
      dailyRate: 650,
      openingAdvance: 0,
      currentAdvance: 500,
    },
  });

  const worker4 = await prisma.worker.create({
    data: {
      workerCode: "WRK-004",
      name: "R. Velusamy",
      phone: "9788445566",
      department: "Babin Winding Section",
      dailyRate: 700,
      openingAdvance: 0,
      currentAdvance: 0,
    },
  });

  const worker5 = await prisma.worker.create({
    data: {
      workerCode: "WRK-005",
      name: "A. Chinnasamy",
      phone: "9788556677",
      department: "Loading & Helper Section",
      dailyRate: 600,
      openingAdvance: 0,
      currentAdvance: 200,
    },
  });

  // 8. Powerloom Weavers (Master Register)
  const weaver1 = await prisma.powerloomWeaver.create({
    data: {
      name: "K. Ramasamy Powerlooms",
      location: "Chennimalai North",
      category: "VETTI",
      phone: "9842101010",
      loomCount: 8,
    },
  });

  const weaver2 = await prisma.powerloomWeaver.create({
    data: {
      name: "P. Shanmugavel Weavers",
      location: "Sirumugai Main",
      category: "SAREE",
      phone: "9842202020",
      loomCount: 6,
    },
  });

  const weaver3 = await prisma.powerloomWeaver.create({
    data: {
      name: "M. Thangavel Looms",
      location: "Anthiyur East",
      category: "VETTI",
      phone: "9842303030",
      loomCount: 10,
    },
  });

  const weaver4 = await prisma.powerloomWeaver.create({
    data: {
      name: "S. Periasamy Weaving Shed",
      location: "Pallipalayam",
      category: "SAREE",
      phone: "9842404040",
      loomCount: 12,
    },
  });

  // 9. Sizing Bills (Both VETTI and SAREE)
  const sizingBill1 = await prisma.sizingBill.create({
    data: {
      billNumber: "VET-2026-001",
      billType: "VETTI",
      billDate: new Date("2026-08-15"),
      partyId: party1.id,
      numberOfBeams: 12,
      noOfBags: 25,
      bagWeightKg: 50,
      ratePerKg: 160,
      totalKg: 1250,
      quantity: 1250,
      rate: 160,
      totalAmount: 200000,
      amountSettled: 125000,
      outstandingAmount: 75000,
      dueDate: new Date("2026-09-15"),
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      paymentMethod: "NEFT/RTGS",
      bankAccountId: bankC.id,
      notes: "Vetti yarn sizing: 25 bags @ 50 kg (12 beams)",
    },
  });

  const sizingBill2 = await prisma.sizingBill.create({
    data: {
      billNumber: "SAR-2026-002",
      billType: "SAREE",
      billDate: new Date("2026-08-28"),
      partyId: party2.id,
      numberOfBeams: 15,
      noOfBags: 30,
      bagWeightKg: 50,
      ratePerKg: 100,
      totalKg: 1500,
      quantity: 1500,
      rate: 100,
      totalAmount: 150000,
      amountSettled: 100000,
      outstandingAmount: 50000,
      dueDate: new Date("2026-09-28"),
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      paymentMethod: "RTGS",
      bankAccountId: bankB.id,
      notes: "Saree yarn sizing: 30 bags @ 50 kg (15 beams)",
    },
  });

  const sizingBill3 = await prisma.sizingBill.create({
    data: {
      billNumber: "VET-2026-003",
      billType: "VETTI",
      billDate: new Date("2026-09-10"),
      partyId: party4.id,
      numberOfBeams: 10,
      noOfBags: 20,
      bagWeightKg: 50,
      ratePerKg: 175,
      totalKg: 1000,
      quantity: 1000,
      rate: 175,
      totalAmount: 175000,
      amountSettled: 175000,
      outstandingAmount: 0,
      dueDate: new Date("2026-10-10"),
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: "NEFT",
      bankAccountId: bankA.id,
      notes: "Vetti super-fine yarn sizing: 20 bags @ 50 kg (Fully settled)",
    },
  });

  const sizingBill4 = await prisma.sizingBill.create({
    data: {
      billNumber: "SAR-2026-004",
      billType: "SAREE",
      billDate: new Date("2026-09-25"),
      partyId: party5.id,
      numberOfBeams: 8,
      noOfBags: 18,
      bagWeightKg: 50,
      ratePerKg: 110,
      totalKg: 900,
      quantity: 900,
      rate: 110,
      totalAmount: 99000,
      amountSettled: 0,
      outstandingAmount: 99000,
      dueDate: new Date("2026-10-25"),
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: "BANK_TRANSFER",
      bankAccountId: bankA.id,
      notes: "Chennimalai Saree yarn sizing: 18 bags @ 50 kg",
    },
  });

  // 10. Powerloom Transactions
  const pl1 = await prisma.powerloomTransaction.create({
    data: {
      transactionNumber: "PL-VET-001",
      category: "VETTI",
      transactionDate: new Date("2026-08-18"),
      weaverName: weaver1.name,
      weaverLocation: weaver1.location,
      loomReference: "Shed-A / Looms 1-8",
      noOfPaavu: 6,
      totalMeters: 3600,
      wageRate: 50,
      grossWages: 180000,
      weftBags: 12,
      weftKg: 600,
      bobbinSets: 6,
      advancePaid: 20000,
      productionQuantity: 3600,
      rate: 50,
      totalAmount: 160000,
      amountSettled: 115000,
      outstandingAmount: 45000,
      dueDate: new Date("2026-09-20"),
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      bankAccountId: bankA.id,
      notes: "Vetti weaving contract: 6 paavu, 3600 meters",
    },
  });

  const pl2 = await prisma.powerloomTransaction.create({
    data: {
      transactionNumber: "PL-SAR-002",
      category: "SAREE",
      transactionDate: new Date("2026-08-30"),
      weaverName: weaver2.name,
      weaverLocation: weaver2.location,
      loomReference: "Shed-B / Looms 1-6",
      noOfPaavu: 4,
      totalMeters: 2400,
      wageRate: 60,
      grossWages: 144000,
      weftBags: 8,
      weftKg: 400,
      bobbinSets: 4,
      advancePaid: 14000,
      productionQuantity: 2400,
      rate: 60,
      totalAmount: 130000,
      amountSettled: 90000,
      outstandingAmount: 40000,
      dueDate: new Date("2026-09-30"),
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      bankAccountId: bankB.id,
      notes: "Saree weaving contract: 4 paavu, 2400 meters",
    },
  });

  const pl3 = await prisma.powerloomTransaction.create({
    data: {
      transactionNumber: "PL-VET-003",
      category: "VETTI",
      transactionDate: new Date("2026-09-12"),
      weaverName: weaver3.name,
      weaverLocation: weaver3.location,
      loomReference: "Shed-C / Looms 1-10",
      noOfPaavu: 8,
      totalMeters: 4800,
      wageRate: 52,
      grossWages: 249600,
      weftBags: 16,
      weftKg: 800,
      bobbinSets: 8,
      advancePaid: 25000,
      productionQuantity: 4800,
      rate: 52,
      totalAmount: 224600,
      amountSettled: 224600,
      outstandingAmount: 0,
      dueDate: new Date("2026-10-12"),
      paymentStatus: PaymentStatus.PAID,
      bankAccountId: bankB.id,
      notes: "Anthiyur Vetti bulk contract - Complete delivery & full payment",
    },
  });

  const pl4 = await prisma.powerloomTransaction.create({
    data: {
      transactionNumber: "PL-SAR-004",
      category: "SAREE",
      transactionDate: new Date("2026-09-28"),
      weaverName: weaver4.name,
      weaverLocation: weaver4.location,
      loomReference: "Shed-D / Looms 1-12",
      noOfPaavu: 5,
      totalMeters: 3000,
      wageRate: 65,
      grossWages: 195000,
      weftBags: 10,
      weftKg: 500,
      bobbinSets: 5,
      advancePaid: 20000,
      productionQuantity: 3000,
      rate: 65,
      totalAmount: 175000,
      amountSettled: 0,
      outstandingAmount: 175000,
      dueDate: new Date("2026-10-28"),
      paymentStatus: PaymentStatus.PENDING,
      bankAccountId: bankA.id,
      notes: "Pallipalayam Saree contract - Paavu beams issued, in production",
    },
  });

  // 11. Daily Wage Records (Both BABIN and OTHERS)
  const wage1 = await prisma.wageRecord.create({
    data: {
      wageType: "BABIN",
      workerId: worker4.id,
      workDate: new Date("2026-08-25"),
      babinRuns: 120,
      babinDistributed: 110,
      dailyProfit: 1800,
      daysWorked: 1,
      dailyWage: 3500,
      grossWages: 3500,
      advancesApplied: 0,
      deductions: 0,
      netWagesPayable: 3500,
      amountPaid: 3500,
      outstandingWages: 0,
      paymentDate: new Date("2026-08-25"),
      paymentMethod: "LIQUID_CASH",
      paymentStatus: PaymentStatus.PAID,
      notes: "Babin winding shift: 120 bobbins wound, 110 issued to weavers",
    },
  });

  const wage2 = await prisma.wageRecord.create({
    data: {
      wageType: "BABIN",
      workerId: worker4.id,
      workDate: new Date("2026-09-15"),
      babinRuns: 140,
      babinDistributed: 135,
      dailyProfit: 2100,
      daysWorked: 1,
      dailyWage: 4200,
      grossWages: 4200,
      advancesApplied: 0,
      deductions: 0,
      netWagesPayable: 4200,
      amountPaid: 4200,
      outstandingWages: 0,
      paymentDate: new Date("2026-09-15"),
      paymentMethod: "LIQUID_CASH",
      paymentStatus: PaymentStatus.PAID,
      notes: "High output babin shift: 140 runs wound",
    },
  });

  const wage3 = await prisma.wageRecord.create({
    data: {
      wageType: "OTHERS",
      workerId: worker1.id,
      workDate: new Date("2026-09-30"),
      workDescription: "Fortnight Weaving Shift - 40 Loom hours",
      daysWorked: 26,
      dailyWage: 1153.85,
      grossWages: 30000,
      advancesApplied: 5000,
      deductions: 1000,
      netWagesPayable: 24000,
      amountPaid: 10000,
      outstandingWages: 14000,
      paymentDate: new Date("2026-10-02"),
      paymentMethod: "BANK_TRANSFER",
      bankAccountId: bankB.id,
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      notes: "Partial wage disbursement from Canara wage account",
    },
  });

  const wage4 = await prisma.wageRecord.create({
    data: {
      wageType: "OTHERS",
      workerId: worker2.id,
      workDate: new Date("2026-10-05"),
      workDescription: "Sizing shift operator wage",
      daysWorked: 24,
      dailyWage: 800,
      grossWages: 19200,
      advancesApplied: 0,
      deductions: 200,
      netWagesPayable: 19000,
      amountPaid: 19000,
      outstandingWages: 0,
      paymentDate: new Date("2026-10-06"),
      paymentMethod: "BANK_TRANSFER",
      bankAccountId: bankB.id,
      paymentStatus: PaymentStatus.PAID,
      notes: "Fully paid on schedule",
    },
  });

  const wage5 = await prisma.wageRecord.create({
    data: {
      wageType: "OTHERS",
      workerId: worker3.id,
      workDate: new Date("2026-10-10"),
      workDescription: "Warp preparation & sizing beam fitting",
      daysWorked: 22,
      dailyWage: 650,
      grossWages: 14300,
      advancesApplied: 500,
      deductions: 300,
      netWagesPayable: 13500,
      amountPaid: 13500,
      outstandingWages: 0,
      paymentDate: new Date("2026-10-10"),
      paymentMethod: "LIQUID_CASH",
      paymentStatus: PaymentStatus.PAID,
      notes: "Cash wage payment via society counter",
    },
  });

  // 12. Transport Bills
  const trans1 = await prisma.transportBill.create({
    data: {
      transactionNumber: "TR-2026-001",
      transactionDate: new Date("2026-08-20"),
      vehicleNumber: "TN-33-AU-8921",
      transporterName: "Erode City Transport Logistics",
      sourceLocation: "Sizing Mill, Bhavani",
      destinationLocation: "Weaving Units, Chennimalai",
      description: "Transport of 12 Sizing beams",
      freightCharge: 32000,
      additionalExpenses: 3000,
      totalAmount: 35000,
      amountSettled: 25000,
      outstandingAmount: 10000,
      dueDate: new Date("2026-09-20"),
      bankAccountId: bankA.id,
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      notes: "Balance ₹10,000 payable upon return trip voucher verification",
    },
  });

  const trans2 = await prisma.transportBill.create({
    data: {
      transactionNumber: "TR-2026-002",
      transactionDate: new Date("2026-09-01"),
      vehicleNumber: "TN-39-BX-1044",
      transporterName: "Salem Express Carriers",
      sourceLocation: "Chennimalai Weaving Shed",
      destinationLocation: "Coimbatore Textile Market",
      description: "Grey fabric bales delivery",
      freightCharge: 18500,
      additionalExpenses: 1500,
      totalAmount: 20000,
      amountSettled: 20000,
      outstandingAmount: 0,
      dueDate: new Date("2026-09-15"),
      bankAccountId: bankA.id,
      paymentStatus: PaymentStatus.PAID,
      notes: "Fully paid via SBI",
    },
  });

  const trans3 = await prisma.transportBill.create({
    data: {
      transactionNumber: "TR-2026-003",
      transactionDate: new Date("2026-09-18"),
      vehicleNumber: "TN-36-K-4512",
      transporterName: "Kongu Fast Cargo Logistics",
      sourceLocation: "Tirupur Chemical Hub",
      destinationLocation: "Society Central Godown",
      description: "Raw cotton yarn cones and starch bags carriage",
      freightCharge: 28000,
      additionalExpenses: 2000,
      totalAmount: 30000,
      amountSettled: 15000,
      outstandingAmount: 15000,
      dueDate: new Date("2026-10-18"),
      bankAccountId: bankC.id,
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      notes: "Advance ₹15,000 cleared via HDFC; balance due next cycle",
    },
  });

  const trans4 = await prisma.transportBill.create({
    data: {
      transactionNumber: "TR-2026-004",
      transactionDate: new Date("2026-10-02"),
      vehicleNumber: "TN-33-CJ-6789",
      transporterName: "Bhavani Roadlines",
      sourceLocation: "Weaving Shed B",
      destinationLocation: "Erode Dyers Association",
      description: "Finished vetti and saree rolls transport",
      freightCharge: 15000,
      additionalExpenses: 1000,
      totalAmount: 16000,
      amountSettled: 0,
      outstandingAmount: 16000,
      dueDate: new Date("2026-10-25"),
      bankAccountId: bankA.id,
      paymentStatus: PaymentStatus.PENDING,
      notes: "Trip completed; awaiting consignment acknowledgment",
    },
  });

  // 13. Settlements (Linking sections and bank accounts)
  await prisma.settlement.create({
    data: {
      settlementNumber: "SET-2026-001",
      settlementDate: new Date("2026-08-25"),
      section: SectionType.SIZING_BILL,
      entityType: "SizingBill",
      entityId: sizingBill1.id,
      partyId: party1.id,
      amount: 125000,
      paymentMethod: "NEFT",
      bankAccountId: bankC.id,
      referenceNo: "NEFT-HDFC-9921",
      notes: "Advance installment against bill VET-2026-001",
      createdById: accountantUser.id,
    },
  });

  await prisma.settlement.create({
    data: {
      settlementNumber: "SET-2026-002",
      settlementDate: new Date("2026-08-31"),
      section: SectionType.POWERLOOM,
      entityType: "PowerloomTransaction",
      entityId: pl1.id,
      amount: 115000,
      paymentMethod: "RTGS",
      bankAccountId: bankA.id,
      referenceNo: "RTGS-SBI-8821",
      notes: "Weaving contract delivery payment",
      createdById: accountantUser.id,
    },
  });

  await prisma.settlement.create({
    data: {
      settlementNumber: "SET-2026-003",
      settlementDate: new Date("2026-10-02"),
      section: SectionType.DAILY_WAGE,
      entityType: "WageRecord",
      entityId: wage3.id,
      workerId: worker1.id,
      amount: 10000,
      paymentMethod: "BANK_TRANSFER",
      bankAccountId: bankB.id,
      referenceNo: "CNRB-WAGE-1029",
      notes: "Wage payout to P. Muthusamy",
      createdById: accountantUser.id,
    },
  });

  await prisma.settlement.create({
    data: {
      settlementNumber: "SET-2026-004",
      settlementDate: new Date("2026-09-02"),
      section: SectionType.TRANSPORT,
      entityType: "TransportBill",
      entityId: trans1.id,
      amount: 25000,
      paymentMethod: "NEFT",
      bankAccountId: bankA.id,
      referenceNo: "NEFT-SBI-4432",
      notes: "Partial freight settlement for sizing beam carriage",
      createdById: accountantUser.id,
    },
  });

  // 14. Transactions for the Transactions Page & Bank Ledgers
  const txnData = [
    {
      referenceNo: "TXN-2026-001",
      transactionDate: new Date("2026-08-25"),
      section: SectionType.SIZING_BILL,
      type: TransactionType.PAYMENT_RECEIVED,
      direction: Direction.DEBIT,
      amount: 125000,
      counterparty: "Sri Ramalingam Textiles Ltd",
      bankAccountId: bankC.id,
      paymentMethod: "NEFT",
      paymentRef: "NEFT-HDFC-9921",
      notes: "Sizing advance installment collection against VET-2026-001",
      createdById: accountantUser.id,
      debitCode: "1020",
      debitName: "Bank Account (HDFC Bank)",
      creditCode: "1200",
      creditName: "Accounts Receivable (Sundry Debtors)",
    },
    {
      referenceNo: "TXN-2026-002",
      transactionDate: new Date("2026-08-31"),
      section: SectionType.POWERLOOM,
      type: TransactionType.PAYMENT_RECEIVED,
      direction: Direction.DEBIT,
      amount: 115000,
      counterparty: "K. Ramasamy Powerlooms",
      bankAccountId: bankA.id,
      paymentMethod: "RTGS",
      paymentRef: "RTGS-SBI-8821",
      notes: "Powerloom fabric delivery collection for PL-VET-001",
      createdById: accountantUser.id,
      debitCode: "1020",
      debitName: "Bank Account (State Bank of India)",
      creditCode: "1200",
      creditName: "Accounts Receivable (Sundry Debtors)",
    },
    {
      referenceNo: "TXN-2026-003",
      transactionDate: new Date("2026-09-02"),
      section: SectionType.TRANSPORT,
      type: TransactionType.PAYMENT_PAID,
      direction: Direction.CREDIT,
      amount: 25000,
      counterparty: "Erode City Transport Logistics",
      bankAccountId: bankA.id,
      paymentMethod: "NEFT",
      paymentRef: "NEFT-SBI-4432",
      notes: "Freight payment installment for sizing beam transport",
      createdById: accountantUser.id,
      debitCode: "2000",
      debitName: "Accounts Payable (Transporters)",
      creditCode: "1020",
      creditName: "Bank Account (State Bank of India)",
    },
    {
      referenceNo: "TXN-2026-004",
      transactionDate: new Date("2026-09-05"),
      section: SectionType.BANK_TRANSFER,
      type: TransactionType.INTERNAL_TRANSFER,
      direction: Direction.CREDIT,
      amount: 50000,
      counterparty: "Society Liquid Cash (கையிருப்பு)",
      bankAccountId: bankA.id,
      paymentMethod: "CHEQUE",
      paymentRef: "CHQ-SBI-1002",
      notes: "Cash drawn from SBI Main for counter cash vault",
      createdById: accountantUser.id,
      debitCode: "1010",
      debitName: "Cash in Hand (Liquid Cash)",
      creditCode: "1020",
      creditName: "Bank Account (State Bank of India)",
    },
    {
      referenceNo: "TXN-2026-005",
      transactionDate: new Date("2026-09-12"),
      section: SectionType.SIZING_BILL,
      type: TransactionType.PAYMENT_RECEIVED,
      direction: Direction.DEBIT,
      amount: 110000,
      counterparty: "Bhavani Silk & Cotton Fabrics",
      bankAccountId: bankA.id,
      paymentMethod: "NEFT",
      paymentRef: "NEFT-SBI-7721",
      notes: "Full settlement for VET-2026-003 invoice",
      createdById: dataEntryUser.id,
      debitCode: "1020",
      debitName: "Bank Account (State Bank of India)",
      creditCode: "1200",
      creditName: "Accounts Receivable (Sundry Debtors)",
    },
    {
      referenceNo: "TXN-2026-006",
      transactionDate: new Date("2026-09-15"),
      section: SectionType.SIZING_BILL,
      type: TransactionType.PAYMENT_RECEIVED,
      direction: Direction.DEBIT,
      amount: 100000,
      counterparty: "Kongu Handloom & Weaving Corp",
      bankAccountId: bankB.id,
      paymentMethod: "RTGS",
      paymentRef: "RTGS-CNRB-3321",
      notes: "Saree sizing installment collection against SAR-2026-002",
      createdById: accountantUser.id,
      debitCode: "1020",
      debitName: "Bank Account (Canara Bank)",
      creditCode: "1200",
      creditName: "Accounts Receivable (Sundry Debtors)",
    },
    {
      referenceNo: "TXN-2026-007",
      transactionDate: new Date("2026-09-18"),
      section: SectionType.POWERLOOM,
      type: TransactionType.PAYMENT_PAID,
      direction: Direction.CREDIT,
      amount: 141000,
      counterparty: "M. Thangavel Looms",
      bankAccountId: bankB.id,
      paymentMethod: "RTGS",
      paymentRef: "RTGS-CNRB-5544",
      notes: "Weaving charges clearance for PL-VET-003",
      createdById: accountantUser.id,
      debitCode: "2000",
      debitName: "Accounts Payable (Weavers)",
      creditCode: "1020",
      creditName: "Bank Account (Canara Bank)",
    },
    {
      referenceNo: "TXN-2026-008",
      transactionDate: new Date("2026-10-02"),
      section: SectionType.DAILY_WAGE,
      type: TransactionType.WAGE_PAYMENT,
      direction: Direction.CREDIT,
      amount: 10000,
      counterparty: "P. Muthusamy",
      bankAccountId: bankB.id,
      paymentMethod: "BANK_TRANSFER",
      paymentRef: "CNRB-WAGE-1029",
      notes: "Fortnight wage partial disbursement",
      createdById: accountantUser.id,
      debitCode: "2100",
      debitName: "Wages Payable",
      creditCode: "1020",
      creditName: "Bank Account (Canara Bank)",
    },
    {
      referenceNo: "TXN-2026-009",
      transactionDate: new Date("2026-10-06"),
      section: SectionType.DAILY_WAGE,
      type: TransactionType.WAGE_PAYMENT,
      direction: Direction.CREDIT,
      amount: 19000,
      counterparty: "K. Palanisamy",
      bankAccountId: bankB.id,
      paymentMethod: "BANK_TRANSFER",
      paymentRef: "CNRB-WAGE-1030",
      notes: "Sizing shift operator wage payout",
      createdById: accountantUser.id,
      debitCode: "2100",
      debitName: "Wages Payable",
      creditCode: "1020",
      creditName: "Bank Account (Canara Bank)",
    },
    {
      referenceNo: "TXN-2026-010",
      transactionDate: new Date("2026-10-08"),
      section: SectionType.GENERAL,
      type: TransactionType.EXPENSE_RECORDED,
      direction: Direction.CREDIT,
      amount: 45000,
      counterparty: "Tirupur Sizing Starch & Chemicals",
      bankAccountId: bankC.id,
      paymentMethod: "NEFT",
      paymentRef: "NEFT-HDFC-7761",
      notes: "Chemical & starch invoice payment",
      createdById: accountantUser.id,
      debitCode: "5000",
      debitName: "Direct Operating Costs",
      creditCode: "1020",
      creditName: "Bank Account (HDFC Bank)",
    },
    {
      referenceNo: "TXN-2026-011",
      transactionDate: new Date("2026-10-10"),
      section: SectionType.TRANSPORT,
      type: TransactionType.PAYMENT_PAID,
      direction: Direction.CREDIT,
      amount: 10000,
      counterparty: "Kongu Fast Cargo Logistics",
      bankAccountId: bankC.id,
      paymentMethod: "NEFT",
      paymentRef: "NEFT-HDFC-8819",
      notes: "Freight payment installment",
      createdById: accountantUser.id,
      debitCode: "2000",
      debitName: "Accounts Payable (Transporters)",
      creditCode: "1020",
      creditName: "Bank Account (HDFC Bank)",
    },
  ];

  for (const t of txnData) {
    const txn = await prisma.transaction.create({
      data: {
        referenceNo: t.referenceNo,
        transactionDate: t.transactionDate,
        section: t.section,
        type: t.type,
        direction: t.direction,
        amount: t.amount,
        counterparty: t.counterparty,
        bankAccountId: t.bankAccountId,
        paymentMethod: t.paymentMethod,
        paymentRef: t.paymentRef,
        status: TransactionStatus.POSTED,
        notes: t.notes,
        createdById: t.createdById,
      },
    });

    const je = await prisma.journalEntry.create({
      data: {
        entryNumber: `JE-${t.referenceNo}`,
        date: t.transactionDate,
        description: t.notes,
        transactionId: txn.id,
        status: "POSTED",
        lines: {
          create: [
            {
              accountCode: t.debitCode,
              accountName: t.debitName,
              section: t.section,
              debit: t.amount,
              credit: 0,
            },
            {
              accountCode: t.creditCode,
              accountName: t.creditName,
              section: t.section,
              debit: 0,
              credit: t.amount,
            },
          ],
        },
      },
    });
  }

  // 15. Operational Accrual Journal Entries for Multi-Month Profit & Loss and Trial Balance
  // August Sizing Revenue Recognition
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-REV-AUG-01",
      date: new Date("2026-08-15"),
      description: "August Sizing Revenue Recognition (Bill 1 & Bill 2)",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "1200", accountName: "Accounts Receivable (Sundry Debtors)", section: SectionType.SIZING_BILL, debit: 350000, credit: 0 },
          { accountCode: "4000", accountName: "Sizing Mill Revenue", section: SectionType.SIZING_BILL, debit: 0, credit: 350000 },
        ],
      },
    },
  });

  // September Sizing Revenue Recognition
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-REV-SEP-01",
      date: new Date("2026-09-15"),
      description: "September Sizing Revenue Recognition (Bill 3 & Bill 4)",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "1200", accountName: "Accounts Receivable (Sundry Debtors)", section: SectionType.SIZING_BILL, debit: 274000, credit: 0 },
          { accountCode: "4000", accountName: "Sizing Mill Revenue", section: SectionType.SIZING_BILL, debit: 0, credit: 274000 },
        ],
      },
    },
  });

  // August Powerloom Revenue Recognition
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-REV-AUG-02",
      date: new Date("2026-08-20"),
      description: "August Powerloom Production Revenue Recognition",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "1200", accountName: "Accounts Receivable (Sundry Debtors)", section: SectionType.POWERLOOM, debit: 290000, credit: 0 },
          { accountCode: "4100", accountName: "Powerloom Weaving Revenue", section: SectionType.POWERLOOM, debit: 0, credit: 290000 },
        ],
      },
    },
  });

  // September Powerloom Revenue Recognition
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-REV-SEP-02",
      date: new Date("2026-09-20"),
      description: "September Powerloom Production Revenue Recognition",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "1200", accountName: "Accounts Receivable (Sundry Debtors)", section: SectionType.POWERLOOM, debit: 399600, credit: 0 },
          { accountCode: "4100", accountName: "Powerloom Weaving Revenue", section: SectionType.POWERLOOM, debit: 0, credit: 399600 },
        ],
      },
    },
  });

  // Direct Operating Costs (Chemicals, Power & Loom Maintenance)
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-COST-001",
      date: new Date("2026-08-25"),
      description: "Direct Costs - Sizing Chemicals & Power Charges (August)",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "5000", accountName: "Direct Operating Costs", section: SectionType.GENERAL, debit: 90000, credit: 0 },
          { accountCode: "2000", accountName: "Accounts Payable (Suppliers)", section: SectionType.GENERAL, debit: 0, credit: 90000 },
        ],
      },
    },
  });

  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-COST-002",
      date: new Date("2026-09-25"),
      description: "Direct Costs - Sizing Chemicals & Power Charges (September)",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "5000", accountName: "Direct Operating Costs", section: SectionType.GENERAL, debit: 90000, credit: 0 },
          { accountCode: "2000", accountName: "Accounts Payable (Suppliers)", section: SectionType.GENERAL, debit: 0, credit: 90000 },
        ],
      },
    },
  });

  // Daily Wages Accrued
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-WAGE-001",
      date: new Date("2026-09-30"),
      description: "Daily Wages Accrued for Fortnight",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "5100", accountName: "Daily Wage Expense", section: SectionType.DAILY_WAGE, debit: 90900, credit: 0 },
          { accountCode: "2100", accountName: "Wages Payable", section: SectionType.DAILY_WAGE, debit: 0, credit: 84200 },
          { accountCode: "1150", accountName: "Worker Advance Recovery", section: SectionType.DAILY_WAGE, debit: 0, credit: 5500 },
          { accountCode: "2200", accountName: "Statutory & Society Deductions", section: SectionType.DAILY_WAGE, debit: 0, credit: 1200 },
        ],
      },
    },
  });

  // Transport Freight Expenses
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-TRANS-001",
      date: new Date("2026-09-20"),
      description: "Transport & Logistics Freight Incurred",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "5200", accountName: "Transport Freight Expense", section: SectionType.TRANSPORT, debit: 101000, credit: 0 },
          { accountCode: "2000", accountName: "Accounts Payable (Transporters)", section: SectionType.TRANSPORT, debit: 0, credit: 101000 },
        ],
      },
    },
  });

  // General Administrative Expenses
  await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-ADMIN-001",
      date: new Date("2026-09-28"),
      description: "Society Office Electricity, Printing & Statutory Stationery",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "5300", accountName: "General Operating Expense", section: SectionType.GENERAL, debit: 35000, credit: 0 },
          { accountCode: "2000", accountName: "Accounts Payable (Suppliers)", section: SectionType.GENERAL, debit: 0, credit: 35000 },
        ],
      },
    },
  });

  // 16. Bank Reconciliations (Matched with Zero Discrepancy)
  await prisma.bankReconciliation.createMany({
    data: [
      {
        bankAccountId: bankA.id,
        statementDate: new Date("2026-10-15"),
        statementBalance: 650000,
        bookBalance: 650000,
        difference: 0,
        status: "MATCHED",
        notes: "Monthly statement matched exactly with society cash book.",
      },
      {
        bankAccountId: bankB.id,
        statementDate: new Date("2026-10-15"),
        statementBalance: 280000,
        bookBalance: 280000,
        difference: 0,
        status: "MATCHED",
        notes: "Wage fund ledger reconciled with Canara passbook.",
      },
      {
        bankAccountId: bankC.id,
        statementDate: new Date("2026-10-15"),
        statementBalance: 220000,
        bookBalance: 220000,
        difference: 0,
        status: "MATCHED",
        notes: "Operations account verified against HDFC netbanking statement.",
      },
    ],
  });

  // 17. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: "DATABASE_INITIALIZED",
        entityType: "System",
        entityId: "SYS-001",
        performedById: adminUser.id,
        details: "Co-operative Society accounting database initialized with master chart of accounts.",
        createdAt: new Date("2026-08-01T09:00:00Z"),
      },
      {
        action: "BANK_ACCOUNT_CREATED",
        entityType: "BankAccount",
        entityId: bankA.id,
        performedById: adminUser.id,
        details: "SBI Main Society Current A/c registered as default operating account.",
        createdAt: new Date("2026-08-01T09:30:00Z"),
      },
      {
        action: "SIZING_BILL_CREATED",
        entityType: "SizingBill",
        entityId: sizingBill1.id,
        performedById: dataEntryUser.id,
        details: "Bill VET-2026-001 for ₹2,00,000 issued to Sri Ramalingam Textiles Ltd.",
        createdAt: new Date("2026-08-15T11:15:00Z"),
      },
      {
        action: "POWERLOOM_CONTRACT_ISSUED",
        entityType: "PowerloomTransaction",
        entityId: pl1.id,
        performedById: dataEntryUser.id,
        details: "Weaving contract PL-VET-001 allocated to K. Ramasamy Powerlooms.",
        createdAt: new Date("2026-08-18T14:20:00Z"),
      },
      {
        action: "TRANSACTION_POSTED",
        entityType: "Transaction",
        entityId: "TXN-2026-001",
        performedById: accountantUser.id,
        details: "Payment received ₹1,25,000 via NEFT credited to HDFC Bank.",
        createdAt: new Date("2026-08-25T16:00:00Z"),
      },
      {
        action: "LIQUID_CASH_DISBURSED",
        entityType: "LiquidCashEntry",
        entityId: "LC-2026-002",
        performedById: accountantUser.id,
        details: "Festival cash advance ₹15,000 disbursed to P. Muthusamy.",
        createdAt: new Date("2026-08-15T12:00:00Z"),
      },
      {
        action: "WAGE_DISBURSEMENT_APPROVED",
        entityType: "WageRecord",
        entityId: wage3.id,
        performedById: accountantUser.id,
        details: "Wage disbursement voucher approved for Powerloom Fortnight shift.",
        createdAt: new Date("2026-10-02T10:30:00Z"),
      },
      {
        action: "BANK_RECONCILIATION_VERIFIED",
        entityType: "BankReconciliation",
        entityId: bankA.id,
        performedById: auditorUser.id,
        details: "Statutory reconciliation verified by CA S. Sundararajan. Zero difference found.",
        createdAt: new Date("2026-10-15T17:00:00Z"),
      },
    ],
  });

  // 18. Additional Testing Data
  await prisma.productionUnit.createMany({
    data: [
      {
        clothType: "VEATTI",
        weaverName: "Test Veatti Weaver A",
        machineCount: 3,
        paavuCount: 4,
        paavuMeters: 4800,
        babinCount: 120,
        targetMeters: 5000,
        targetDate: new Date("2026-12-31"),
        totalProducedMeters: 3000,
        handoveredMeters: 1500,
        godownMeters: 1500,
        balanceToHandover: 3500,
      },
      {
        clothType: "SAREE",
        weaverName: "Test Saree Weaver B",
        machineCount: 2,
        paavuCount: 3,
        paavuMeters: 3600,
        babinCount: 80,
        targetMeters: 4000,
        targetDate: new Date("2026-12-15"),
        totalProducedMeters: 2000,
        handoveredMeters: 800,
        godownMeters: 1200,
        balanceToHandover: 3200,
      },
    ],
  });

  await prisma.paavuRecord.createMany({
    data: [
      {
        clothType: "VEATTI",
        paavuNumber: "PV-TEST-001",
        paavuMeters: 1200,
        weaverName: "Test Veatti Weaver A",
        machineNumber: null,
        status: "UNLOADED",
      },
      {
        clothType: "SAREE",
        paavuNumber: "PV-TEST-002",
        paavuMeters: 1000,
        weaverName: "Test Saree Weaver B",
        machineNumber: "Loom #5",
        status: "RUNNING",
      },
    ],
  });

  await prisma.governmentHandoverLog.createMany({
    data: [
      {
        clothType: "VEATTI",
        unitId: "unit-test-1",
        challanNo: "CH-GOVT-TEST-01",
        meters: 800,
        recipientDept: "Test Govt Dept",
      },
      {
        clothType: "SAREE",
        unitId: "unit-test-2",
        challanNo: "CH-GOVT-TEST-02",
        meters: 600,
        recipientDept: "Test Govt Dept",
      },
    ],
  });

  await prisma.sizingBill.createMany({
    data: [
      {
        billNumber: "VET-TEST-001",
        billType: "VEATTI",
        billDate: new Date("2026-11-10"),
        partyId: party1.id,
        numberOfBeams: 10,
        noOfBags: 20,
        bagWeightKg: 50,
        ratePerKg: 150,
        totalKg: 1000,
        quantity: 1000,
        rate: 150,
        totalAmount: 150000,
        amountSettled: 0,
        outstandingAmount: 150000,
        dueDate: new Date("2026-12-10"),
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: "NEFT",
        bankAccountId: bankA.id,
        notes: "Test Vetti sizing bill",
      },
      {
        billNumber: "SAR-TEST-002",
        billType: "SAREE",
        billDate: new Date("2026-11-15"),
        partyId: party2.id,
        numberOfBeams: 12,
        noOfBags: 24,
        bagWeightKg: 50,
        ratePerKg: 130,
        totalKg: 1200,
        quantity: 1200,
        rate: 130,
        totalAmount: 156000,
        amountSettled: 0,
        outstandingAmount: 156000,
        dueDate: new Date("2026-12-15"),
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: "NEFT",
        bankAccountId: bankB.id,
        notes: "Test Saree sizing bill",
      },
    ],
  });

  await prisma.powerloomTransaction.createMany({
    data: [
      {
        transactionNumber: "PL-TEST-VT-001",
        category: "VEATTI",
        transactionDate: new Date("2026-11-20"),
        weaverName: weaver1.name,
        weaverLocation: weaver1.location,
        loomReference: "Test Shed-A",
        noOfPaavu: 4,
        totalMeters: 3200,
        wageRate: 55,
        grossWages: 176000,
        weftBags: 10,
        weftKg: 500,
        bobbinSets: 4,
        advancePaid: 15000,
        productionQuantity: 3200,
        rate: 55,
        totalAmount: 176000,
        amountSettled: 0,
        outstandingAmount: 176000,
        dueDate: new Date("2026-12-20"),
        paymentStatus: PaymentStatus.PENDING,
        bankAccountId: bankA.id,
        notes: "Test Vetti powerloom contract",
      },
      {
        transactionNumber: "PL-TEST-SR-002",
        category: "SAREE",
        transactionDate: new Date("2026-11-25"),
        weaverName: weaver2.name,
        weaverLocation: weaver2.location,
        loomReference: "Test Shed-B",
        noOfPaavu: 3,
        totalMeters: 2400,
        wageRate: 60,
        grossWages: 144000,
        weftBags: 8,
        weftKg: 400,
        bobbinSets: 3,
        advancePaid: 12000,
        productionQuantity: 2400,
        rate: 60,
        totalAmount: 144000,
        amountSettled: 0,
        outstandingAmount: 144000,
        dueDate: new Date("2026-12-25"),
        paymentStatus: PaymentStatus.PENDING,
        bankAccountId: bankB.id,
        notes: "Test Saree powerloom contract",
      },
    ],
  });

  await prisma.wageRecord.createMany({
    data: [
      {
        wageType: "BABIN",
        workerId: worker4.id,
        workDate: new Date("2026-11-05"),
        babinRuns: 130,
        babinDistributed: 125,
        dailyProfit: 2000,
        daysWorked: 1,
        dailyWage: 3800,
        grossWages: 3800,
        advancesApplied: 0,
        deductions: 0,
        netWagesPayable: 3800,
        amountPaid: 3800,
        outstandingWages: 0,
        paymentDate: new Date("2026-11-05"),
        paymentMethod: "LIQUID_CASH",
        paymentStatus: PaymentStatus.PAID,
        notes: "Test babin winding shift",
      },
      {
        wageType: "OTHERS",
        workerId: worker1.id,
        workDate: new Date("2026-11-10"),
        workDescription: "Test overtime",
        daysWorked: 1,
        dailyWage: 1200,
        grossWages: 1200,
        advancesApplied: 0,
        deductions: 0,
        netWagesPayable: 1200,
        amountPaid: 1200,
        outstandingWages: 0,
        paymentDate: new Date("2026-11-10"),
        paymentMethod: "BANK_TRANSFER",
        bankAccountId: bankB.id,
        paymentStatus: PaymentStatus.PAID,
        notes: "Test overtime payment",
      },
    ],
  });

  await prisma.transportBill.createMany({
    data: [
      {
        transactionNumber: "TR-TEST-001",
        transactionDate: new Date("2026-11-15"),
        vehicleNumber: "TN-99-XX-1234",
        transporterName: "Test Transport Co",
        sourceLocation: "Test Source",
        destinationLocation: "Test Destination",
        description: "Test transport of finished goods",
        freightCharge: 12000,
        additionalExpenses: 800,
        totalAmount: 12800,
        amountSettled: 0,
        outstandingAmount: 12800,
        dueDate: new Date("2026-12-01"),
        bankAccountId: bankA.id,
        paymentStatus: PaymentStatus.PENDING,
        notes: "Test transport record",
      },
    ],
  });
  console.log("Database seeded successfully with complete demo data!");
  console.log("Admin credentials: admin@cheran.coop / Society@2026");
  console.log("Accountant credentials: accountant@cheran.coop / Society@2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
