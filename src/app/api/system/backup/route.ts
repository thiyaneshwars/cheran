import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

const getMainBackupDir = () => path.join("D:", "Backup DB");
const getDesktopBackupDir = () => path.join("C:", "Users", "sthiy", "Desktop", "cheran accounting software", "backups");

function getActiveDbPath(): string {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  const rawPath = dbUrl.replace(/^file:/i, "").trim();

  if (path.isAbsolute(rawPath) || /^[a-zA-Z]:/.test(rawPath)) {
    return path.resolve(rawPath);
  }

  const inPrisma = path.resolve(process.cwd(), "prisma", rawPath.replace(/^\.[/\\]/, ""));
  if (fs.existsSync(inPrisma)) return inPrisma;

  const inRoot = path.resolve(process.cwd(), rawPath.replace(/^\.[/\\]/, ""));
  if (fs.existsSync(inRoot)) return inRoot;

  // Fallbacks
  const devDb = path.resolve(process.cwd(), "prisma", "dev.db");
  if (fs.existsSync(devDb)) return devDb;

  const prodDb = path.resolve(process.cwd(), "prisma", "prod.db");
  if (fs.existsSync(prodDb)) return prodDb;

  return inPrisma;
}

/**
 * GET /api/system/backup
 * List all existing backups on D: drive (and fallback local backups)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dDriveAvailable = fs.existsSync("D:\\");
    let targetDir = getMainBackupDir();

    if (!dDriveAvailable || !fs.existsSync(getMainBackupDir())) {
      targetDir = fs.existsSync(getDesktopBackupDir())
        ? getDesktopBackupDir()
        : path.resolve(process.cwd(), "backups");
    }

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({
        backups: [],
        dDriveAvailable,
        backupDir: targetDir,
      });
    }

    const files = fs
      .readdirSync(targetDir)
      .filter((file) => file.endsWith(".db"))
      .map((file) => {
        const filePath = path.join(targetDir, file);
        const stats = fs.statSync(filePath);
        return {
          fileName: file,
          filePath,
          sizeKB: (stats.size / 1024).toFixed(2),
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          formattedDate: new Date(stats.mtime).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          }),
        };
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return NextResponse.json({
      backups: files,
      dDriveAvailable,
      backupDir: targetDir,
      totalCount: files.length,
    });
  } catch (error: any) {
    console.error("GET /api/system/backup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list backups" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system/backup
 * Perform instant database backup directly into D:\Backup DB
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbPath = getActiveDbPath();
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { error: `Active database file not found at: ${dbPath}` },
        { status: 404 }
      );
    }

    const dDriveAvailable = fs.existsSync("D:\\");
    if (!dDriveAvailable) {
      return NextResponse.json(
        { error: "D: Drive is not mounted or accessible on this system." },
        { status: 400 }
      );
    }

    const mainBackupDir = getMainBackupDir();
    const desktopBackupDir = getDesktopBackupDir();

    // Ensure D:\Backup DB exists
    if (!fs.existsSync(mainBackupDir)) {
      fs.mkdirSync(mainBackupDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/T/, "_")
      .replace(/:/g, "-")
      .split(".")[0];
    const baseName = path.basename(dbPath, path.extname(dbPath));
    const backupFileName = `cheran_accounting_${baseName}_${timestamp}.db`;
    const dDriveBackupPath = path.join(mainBackupDir, backupFileName);

    // 1. Copy to D:\Backup DB
    fs.copyFileSync(dbPath, dDriveBackupPath);
    const stats = fs.statSync(dDriveBackupPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    // 2. Also copy to local Desktop backups directory for double safety
    try {
      if (!fs.existsSync(desktopBackupDir)) {
        fs.mkdirSync(desktopBackupDir, { recursive: true });
      }
      const desktopBackupPath = path.join(desktopBackupDir, backupFileName);
      fs.copyFileSync(dbPath, desktopBackupPath);
    } catch (e) {
      console.warn("Secondary Desktop backup write warning:", e);
    }

    return NextResponse.json({
      success: true,
      message: `Database successfully backed up to D: Drive!`,
      fileName: backupFileName,
      backupPath: dDriveBackupPath,
      sizeKB,
      timestamp: now.toISOString(),
      sourceDb: dbPath,
    });
  } catch (error: any) {
    console.error("POST /api/system/backup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create database backup" },
      { status: 500 }
    );
  }
}

