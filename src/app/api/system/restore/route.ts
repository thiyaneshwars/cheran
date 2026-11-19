import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

const MAIN_D_BACKUP_DIR = "D:\\Backup DB";
const DESKTOP_BACKUP_DIR = "C:\\Users\\sthiy\\Desktop\\cheran accounting software\\backups";

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

  const devDb = path.resolve(process.cwd(), "prisma", "dev.db");
  if (fs.existsSync(devDb)) return devDb;

  return inPrisma;
}

/**
 * POST /api/system/restore
 * Restore active database from a backup stored in D:\Backup DB
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dDriveAvailable = fs.existsSync("D:\\");
    let backupDir = MAIN_D_BACKUP_DIR;

    if (!dDriveAvailable || !fs.existsSync(MAIN_D_BACKUP_DIR)) {
      if (fs.existsSync(DESKTOP_BACKUP_DIR)) {
        backupDir = DESKTOP_BACKUP_DIR;
      } else if (fs.existsSync(path.resolve(process.cwd(), "backups"))) {
        backupDir = path.resolve(process.cwd(), "backups");
      } else {
        return NextResponse.json(
          { error: `No backup directory found at: ${MAIN_D_BACKUP_DIR} or local backups folder.` },
          { status: 404 }
        );
      }
    }

    // Determine target backup file
    let fileName: string | null = null;
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.fileName && typeof body.fileName === "string") {
        fileName = body.fileName.trim();
      }
    } catch {
      // Body is optional
    }

    let sourceBackupPath: string;

    if (fileName) {
      sourceBackupPath = path.join(backupDir, path.basename(fileName));
    } else {
      // Find latest backup in directory
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith(".db"))
        .map((f) => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length === 0) {
        return NextResponse.json(
          { error: `No backup database files (.db) found in ${backupDir}` },
          { status: 404 }
        );
      }

      sourceBackupPath = files[0].path;
      fileName = files[0].name;
    }

    if (!fs.existsSync(sourceBackupPath)) {
      return NextResponse.json(
        { error: `Selected backup file does not exist: ${sourceBackupPath}` },
        { status: 404 }
      );
    }

    const activeDbPath = getActiveDbPath();

    // Ensure target folder exists
    const targetFolder = path.dirname(activeDbPath);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Clean up auxiliary SQLite journal/WAL/SHM files to ensure clean overwrite
    const walPath = `${activeDbPath}-wal`;
    const shmPath = `${activeDbPath}-shm`;
    const journalPath = `${activeDbPath}-journal`;
    if (fs.existsSync(walPath)) {
      try {
        fs.unlinkSync(walPath);
      } catch (err) {
        console.warn("Could not remove old WAL file:", err);
      }
    }
    if (fs.existsSync(shmPath)) {
      try {
        fs.unlinkSync(shmPath);
      } catch (err) {
        console.warn("Could not remove old SHM file:", err);
      }
    }
    if (fs.existsSync(journalPath)) {
      try {
        fs.unlinkSync(journalPath);
      } catch (err) {
        console.warn("Could not remove old journal file:", err);
      }
    }

    // Directly overwrite the active database file with the selected backup snapshot
    fs.copyFileSync(sourceBackupPath, activeDbPath);

    const stats = fs.statSync(activeDbPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    return NextResponse.json({
      success: true,
      message: `Database successfully restored from D: Drive backup!`,
      restoredFrom: fileName,
      sourcePath: sourceBackupPath,
      activeDbPath,
      sizeKB,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("POST /api/system/restore error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to restore database from backup" },
      { status: 500 }
    );
  }
}

