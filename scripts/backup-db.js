const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: fs.existsSync(".env.production") ? ".env.production" : ".env" });

// 1. Dual Backup Directories:
// - Main Backup on D: Drive: D:\Backup DB
// - Local Safety Backup on C: Drive: C:\Users\sthiy\Desktop\cheran accounting software\backups
const backupDestinations = [];

const mainDriveDBackupDir = "D:\\Backup DB";
if (fs.existsSync("D:\\")) {
  if (!fs.existsSync(mainDriveDBackupDir)) {
    fs.mkdirSync(mainDriveDBackupDir, { recursive: true });
  }
  backupDestinations.push({ label: "Main Backup (D: Drive)", dir: mainDriveDBackupDir });
}

const cDriveDesktopBackupDir = "C:\\Users\\sthiy\\Desktop\\cheran accounting software\\backups";
if (!fs.existsSync(cDriveDesktopBackupDir)) {
  fs.mkdirSync(cDriveDesktopBackupDir, { recursive: true });
}
backupDestinations.push({ label: "Desktop Backup (C: Drive)", dir: cDriveDesktopBackupDir });

// 2. Discover databases to backup (dev.db, prod.db, and DATABASE_URL)
const dbPathsToBackup = new Set();

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const rawPath = dbUrl.replace(/^file:/i, "").trim();

if (path.isAbsolute(rawPath) || /^[a-zA-Z]:/.test(rawPath)) {
  if (fs.existsSync(rawPath)) dbPathsToBackup.add(path.resolve(rawPath));
} else {
  const inPrisma = path.resolve(process.cwd(), "prisma", rawPath.replace(/^\.[/\\]/, ""));
  if (fs.existsSync(inPrisma)) dbPathsToBackup.add(inPrisma);
}

// Also ensure prisma/dev.db and prisma/prod.db are included if they exist
const devDb = path.resolve(process.cwd(), "prisma", "dev.db");
const prodDb = path.resolve(process.cwd(), "prisma", "prod.db");
if (fs.existsSync(devDb)) dbPathsToBackup.add(devDb);
if (fs.existsSync(prodDb)) dbPathsToBackup.add(prodDb);

if (dbPathsToBackup.size === 0) {
  console.warn(`[Backup Notice] No database files found to back up.`);
  process.exit(0);
}

const now = new Date();
const timestamp = now.toISOString().replace(/T/, "_").replace(/:/g, "-").split(".")[0];

console.log("========================================================");
console.log("  CHERAN ACCOUNTING DATABASE BACKUP SYSTEM");
console.log("========================================================");

for (const dest of backupDestinations) {
  console.log(`\n[Target: ${dest.label}] -> ${dest.dir}`);
  for (const dbPath of dbPathsToBackup) {
    try {
      const baseName = path.basename(dbPath, path.extname(dbPath));
      const backupFileName = `cheran_accounting_${baseName}_${timestamp}.db`;
      const backupFilePath = path.join(dest.dir, backupFileName);

      fs.copyFileSync(dbPath, backupFilePath);
      const stats = fs.statSync(backupFilePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(` ✓ ${baseName} backed up -> ${backupFileName} (${sizeKB} KB)`);
    } catch (err) {
      console.error(` ✗ Failed to backup ${dbPath}:`, err.message);
    }
  }

  // Retention policy: Keep the last 50 backups in each destination
  try {
    const backupFiles = fs
      .readdirSync(dest.dir)
      .filter((file) => file.startsWith("cheran_accounting_") && file.endsWith(".db"))
      .map((file) => ({
        name: file,
        path: path.join(dest.dir, file),
        time: fs.statSync(path.join(dest.dir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (backupFiles.length > 50) {
      const toDelete = backupFiles.slice(50);
      toDelete.forEach((f) => {
        fs.unlinkSync(f.path);
        console.log(` [Pruning] Removed older backup: ${f.name}`);
      });
    }
  } catch (e) {
    // Ignore pruning errors
  }
}

console.log("\n[Backup Completed Successfully]");
