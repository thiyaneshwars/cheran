"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  HardDrive,
  Database,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Clock,
  ShieldCheck,
  FolderOpen,
  ArrowDownToLine,
  FileText,
  Server,
  Activity,
  Check,
  AlertCircle,
} from "lucide-react";
import { SkeletonBackupRestoreView } from "./backup/SkeletonBackupRestoreView";

interface BackupItem {
  fileName: string;
  filePath: string;
  sizeKB: string;
  sizeBytes: number;
  modifiedAt: string;
  formattedDate: string;
}

export const BackupRestoreView: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [dDriveAvailable, setDDriveAvailable] = useState<boolean>(true);
  const [backupDir, setBackupDir] = useState<string>("D:\\Backup DB");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Action States
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string>("");
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  // Feedback Notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string, details?: string) => {
    setFeedback({ type, message, details });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Fetch Backups from D: Drive
  const fetchBackups = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/system/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
        setDDriveAvailable(data.dDriveAvailable !== false);
        if (data.backupDir) setBackupDir(data.backupDir);
        if (data.backups && data.backups.length > 0 && !selectedBackupForRestore) {
          setSelectedBackupForRestore(data.backups[0].fileName);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification("error", err.error || "Failed to load backups from D: Drive");
      }
    } catch (err: any) {
      showNotification("error", "Network error communicating with backup system", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBackups(true);
  }, []);

  // Filtered Backups
  const filteredBackups = useMemo(() => {
    if (!searchQuery.trim()) return backups;
    const q = searchQuery.toLowerCase().trim();
    return backups.filter(
      (b) =>
        b.fileName.toLowerCase().includes(q) ||
        b.formattedDate.toLowerCase().includes(q)
    );
  }, [backups, searchQuery]);

  // Aggregate Metrics
  const totalStorageSizeKB = useMemo(() => {
    return backups.reduce((acc, b) => acc + (parseFloat(b.sizeKB) || 0), 0);
  }, [backups]);

  const latestBackupTime = useMemo(() => {
    if (backups.length === 0) return "No snapshots yet";
    return backups[0].formattedDate;
  }, [backups]);

  // Trigger Instant Backup to D: Drive
  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch("/api/system/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(
          "success",
          "Snapshot successfully archived to D: Drive!",
          `Saved to: ${data.backupPath} (${data.sizeKB} KB)`
        );
        await fetchBackups(false);
      } else {
        showNotification("error", data.error || "Backup failed to complete on D: Drive");
      }
    } catch (err: any) {
      showNotification("error", "Error communicating with backup service", err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Trigger Restore from D: Drive
  const handleConfirmRestore = async (targetFileName?: string) => {
    const fileToRestore = targetFileName || selectedBackupForRestore;
    if (!fileToRestore) {
      showNotification("error", "Please select a backup snapshot to restore.");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ RESTORE VERIFICATION:\n\nAre you sure you want to restore the accounting database from:\n"${fileToRestore}"?\n\nThis will directly overwrite the active database with this snapshot. No extra safety file will be created.`
    );
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const res = await fetch("/api/system/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: fileToRestore }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowRestoreModal(false);
        showNotification(
          "success",
          "Database successfully restored from D: Drive!",
          `Restored from: ${data.restoredFrom}. Refreshing application data...`
        );
        setTimeout(() => {
          window.location.reload();
        }, 1800);
      } else {
        showNotification("error", data.error || "Database restoration failed from D: Drive");
      }
    } catch (err: any) {
      showNotification("error", "Error executing restore operation", err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  if (loading) {
    return <SkeletonBackupRestoreView />;
  }

  return (
    <div className="space-y-7 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-slide-up">
      {/* 1. Header & Live Telemetry Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Database Vault &amp; D: Drive Disaster Recovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time live persistence, hardware-redundant backups in <code className="font-mono font-bold text-slate-800">D:\Backup DB</code>, and one-click state restoration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchBackups(false)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh snapshot list from D: Drive"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-slate-900" : "text-slate-500"}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh Snapshots"}</span>
          </button>
        </div>
      </div>

      {/* Floating Status Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 shadow-lg animate-slide-up ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="font-bold text-sm">{feedback.message}</div>
            {feedback.details && <div className="text-xs opacity-90 font-mono">{feedback.details}</div>}
          </div>
        </div>
      )}

      {/* 2. Hardware Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: D: Drive Health */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Storage Drive</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>Drive D:\</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
              {dDriveAvailable ? "Mounted & Active" : "Drive Disconnected"}
            </div>
          </div>
        </div>

        {/* Metric 2: Target Vault Path */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Vault Destination</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-slate-900 font-mono truncate" title={backupDir}>
              {backupDir}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Primary Disaster Recovery
            </div>
          </div>
        </div>

        {/* Metric 3: Total Snapshots Count */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Available Snapshots</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tabular-nums font-mono">
              {backups.length} Backups
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {(totalStorageSizeKB / 1024).toFixed(2)} MB Total Size
            </div>
          </div>
        </div>

        {/* Metric 4: Latest Snapshot Age */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Most Recent Backup</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 truncate">
              {latestBackupTime}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Automated Retention: 50 Snaps
            </div>
          </div>
        </div>
      </div>

      {/* 3. Vault Integrity Status & Action Operations Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Statutory Ledger Archive Monitor */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <div className="flex-1 rounded-2xl bg-[#14233C] text-[#FAF7F0] border border-[#14233C] p-6 sm:p-7 flex flex-col justify-between min-h-[260px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-[11px] font-semibold text-[#E7C37B]">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dDriveAvailable ? "bg-[#4ADE80]" : "bg-[#FCA5A5]"
                    }`}
                  />
                  <span>
                    {dDriveAvailable
                      ? "Archive Storage Mounted"
                      : "Target Drive Offline"}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold text-white mt-4">
                  Society Database Archive Vault
                </h3>
                <p className="text-xs text-[#CBD5E1] mt-1.5 max-w-md leading-relaxed">
                  Direct binary replica protection for SQLite double-entry ledgers, bank reconciliation books, and Co-optex dispatch tallies.
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#0A101B] border border-[#B47B2B]/60 flex items-center justify-center text-[#E7C37B] flex-shrink-0">
                <Database
                  className={`h-6 w-6 ${
                    isBackingUp || isRestoring ? "animate-pulse" : ""
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-5 mt-6 border-t border-white/10">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[11px] text-[#A8B6CE]">Target Path</div>
                <div className="font-financial text-xs font-bold text-white mt-1 truncate">
                  {backupDir}
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[11px] text-[#A8B6CE]">Archived Snaps</div>
                <div className="font-financial text-base font-bold text-[#E7C37B] mt-0.5">
                  {backups.length} Files
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[11px] text-[#A8B6CE]">Engine Mode</div>
                <div className="font-financial text-xs font-bold text-[#86EFAC] mt-1">
                  {isBackingUp
                    ? "WRITING..."
                    : isRestoring
                    ? "RESTORING..."
                    : "WAL CHECKED"}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-[#5B6B84] px-2 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Full Double-Entry Database Snapshot Integrity Guaranteed</span>
            </span>
            <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
              SQLite + WAL Safe
            </span>
          </div>
        </div>

        {/* Right: Dual Command Action Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Card A: Instant Backup Action */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span>Execute Backup to D: Drive</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono">
                  ONE-CLICK
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Immediately freeze a safe timestamped replica of the active accounting ledger directly inside <strong className="text-slate-800 font-mono">D:\Backup DB</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTriggerBackup}
              disabled={isBackingUp || !dDriveAvailable}
              className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <HardDrive className={`h-4 w-4 ${isBackingUp ? "animate-pulse text-emerald-300" : "text-emerald-400"}`} />
              <span>{isBackingUp ? "Writing Snapshot to D: Drive..." : "Hit Backup to D: Drive"}</span>
            </button>
          </div>

          {/* Card B: Restore Action */}
          <div className="p-6 rounded-3xl bg-amber-50/40 border border-amber-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-amber-300 transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-amber-950 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-amber-700" />
                  <span>Restore from D: Drive Archive</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono">
                  DISASTER RECOVERY
                </span>
              </div>
              <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                Select any past snapshot to safely reload all ledgers, powerloom registers, and accounts. Directly overwrites the active database with the selected snapshot.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowRestoreModal(true)}
              disabled={isRestoring || backups.length === 0}
              className="w-full py-3 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={`h-4 w-4 ${isRestoring ? "animate-spin" : ""}`} />
              <span>Hit Restore from D: Drive</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Snapshot Ledger Archive Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Archive Ledger of Snapshots</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-mono font-bold">
                {filteredBackups.length} Total
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Verified physical backups located in <code className="font-mono text-slate-700">D:\Backup DB</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search snapshots by name, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-slate-400 bg-white shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Snapshot Table */}
        <div className="overflow-x-auto scrollbar-landscape pb-2">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Snapshot Filename</th>
                <th className="py-3 px-4">Creation Date &amp; Time</th>
                <th className="py-3 px-4 text-right">File Size</th>
                <th className="py-3 px-4 text-center">Storage Target</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
              {filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    <div className="max-w-md mx-auto space-y-2">
                      <HardDrive className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-600">No backup snapshots found</p>
                      <p className="text-xs text-slate-400">
                        Hit the "Backup to D: Drive" button above to create your first archival snapshot in D:\Backup DB.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBackups.map((snap, idx) => (
                  <tr
                    key={snap.fileName}
                    className="hover:bg-slate-50/80 transition group border-b border-slate-100"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 text-[11px] font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{snap.fileName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-sm mt-0.5">
                        {snap.filePath}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{snap.formattedDate}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {snap.sizeKB} KB
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold border border-emerald-200">
                        D:\Drive
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleConfirmRestore(snap.fileName)}
                        disabled={isRestoring}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] transition shadow-2xs flex items-center gap-1.5 mx-auto cursor-pointer"
                        title="Restore this snapshot"
                      >
                        <RotateCcw className="h-3 w-3 text-amber-700" />
                        <span>Restore This</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Restore Modal Selector */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Restore Database from D: Drive
                  </h3>
                  <p className="text-xs text-slate-400 font-medium font-mono">
                    Target: D:\Backup DB
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <span>Important Safeguard</span>
                </div>
                <p className="leading-relaxed opacity-90">
                  The active database will be directly overwritten with this snapshot. The application will automatically reload once restoration completes.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Select Backup Snapshot:
                </label>
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/60">
                  {backups.map((b) => (
                    <label
                      key={b.fileName}
                      className={`flex items-center justify-between p-3 text-xs cursor-pointer transition ${
                        selectedBackupForRestore === b.fileName
                          ? "bg-amber-50 font-bold text-amber-950 ring-1 ring-inset ring-amber-500/70"
                          : "hover:bg-white text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="restoreFile"
                          value={b.fileName}
                          checked={selectedBackupForRestore === b.fileName}
                          onChange={(e) => setSelectedBackupForRestore(e.target.value)}
                          className="accent-amber-600"
                        />
                        <div>
                          <span className="font-mono text-xs block text-slate-900">{b.fileName}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {b.formattedDate}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-600">
                        {b.sizeKB} KB
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestore(selectedBackupForRestore)}
                disabled={isRestoring || !selectedBackupForRestore}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className={`h-4 w-4 ${isRestoring ? "animate-spin" : ""}`} />
                <span>{isRestoring ? "Restoring..." : "Confirm & Restore"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
