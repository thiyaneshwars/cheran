const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: fs.existsSync(".env.production") ? ".env.production" : ".env" });

// 1. Resolve active database target path
const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const rawPath = dbUrl.replace(/^file:/i, "").trim();
let dbPath;

if (path.isAbsolute(rawPath) || /^[a-zA-Z]:/.test(rawPath)) {
  dbPath = path.resolve(rawPath);
} else {
  const inPrisma = path.resolve(process.cwd(), "prisma", rawPath.replace(/^\.[/\\]/, ""));
  const inRoot = path.resolve(process.cwd(), rawPath.replace(/^\.[/\\]/, ""));
  dbPath = fs.existsSync(inPrisma) ? inPrisma : (fs.existsSync(inRoot) ? inRoot : inPrisma);
}

// 2. Discover backup sources (D:\Backup DB preferred, fallback to Desktop backups on C:)
const candidateDirs = [
  "D:\\Backup DB",
  "C:\\Users\\sthiy\\Desktop\\cheran accounting software\\backups",
  path.resolve(process.cwd(), "backups"),
];

let backupDir = null;
for (const dir of candidateDirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.startsWith("cheran_accounting_") && f.endsWith(".db"));
    if (files.length > 0) {
      backupDir = dir;
      break;
    }
  }
}

if (!backupDir) {
  console.error("[Restore Error] No backup database files found in D:\\Backup DB or C: Desktop backups.");
  process.exit(1);
}

const backupFiles = fs
  .readdirSync(backupDir)
  .filter((f) => f.startsWith("cheran_accounting_") && f.endsWith(".db"))
  .map((f) => ({
    name: f,
    path: path.join(backupDir, f),
    time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
  }))
  .sort((a, b) => b.time - a.time);

const targetFile = process.argv[2] ? path.resolve(backupDir, process.argv[2]) : backupFiles[0].path;

if (!fs.existsSync(targetFile)) {
  console.error(`[Restore Error] Specified backup file not found: ${targetFile}`);
  process.exit(1);
}

try {
  // Pre-backup current DB before overwriting
  if (fs.existsSync(dbPath)) {
    const preRestoreBackup = path.join(backupDir, `pre_restore_snapshot_${Date.now()}.db`);
    fs.copyFileSync(dbPath, preRestoreBackup);
    console.log(`[Safety Notice] Saved snapshot of existing database to: ${preRestoreBackup}`);
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(dbPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.copyFileSync(targetFile, dbPath);
  console.log(`[Restore Success] Database restored successfully:`);
  console.log(` -> Source: ${targetFile}`);
  console.log(` -> Active database: ${dbPath}`);
} catch (err) {
  console.error("[Restore Error] Failed to restore database:", err.message);
  process.exit(1);
}
