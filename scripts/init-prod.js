const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("=====================================================================");
console.log(" INITIALIZING PRODUCTION ENVIRONMENT FOR CHERAN CO-OPERATIVE SOCIETY");
console.log("=====================================================================\n");

process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "file:./prod.db";

// 1. Run Backup if prod.db exists
if (fs.existsSync(path.join(__dirname, "../prisma/prod.db"))) {
  console.log("[1/4] Running pre-initialization safety backup...");
  execSync("node scripts/backup-db.js", { stdio: "inherit" });
}

// 2. Push Schema to Production Database
console.log("\n[2/4] Syncing database schema to prisma/prod.db...");
execSync("npx prisma db push --skip-generate --accept-data-loss", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: "file:./prod.db" },
});

// 3. Seed Clean Production Data (FY 2026-2027, Zero Demo Accounts, Official Users)
console.log("\n[3/4] Seeding clean production master data...");
execSync("npx tsx prisma/seed-prod.ts", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: "file:./prod.db" },
});

// 4. Build Next.js Production Bundle
console.log("\n[4/4] Generating optimized Next.js production build...");
execSync("npm run build", { stdio: "inherit" });

console.log("\n=====================================================================");
console.log(" PRODUCTION INITIALIZATION COMPLETE!");
console.log(" Active Database : prisma/prod.db (Clean zero demo records)");
console.log(" Start Server    : npm start (or double-click start-production.bat)");
console.log("=====================================================================\n");
