"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  HardDrive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Clock,
  FileCheck,
  FolderOpen,
} from "lucide-react";

interface BackupItem {
  fileName: string;
  filePath: string;
  sizeKB: string;
  sizeBytes: number;
  modifiedAt: string;
  formattedDate: string;
}

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "backup" | "restore";
  onSuccess?: (msg: string) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSuccess,
}) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingList, setFetchingList] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const fetchBackups = async () => {
    setFetchingList(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/system/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
        if (data.backups && data.backups.length > 0) {
          setSelectedFile(data.backups[0].fileName);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Failed to load backups from D: Drive");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error loading backups");
    } finally {
      setFetchingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setResultMsg(null);
      fetchBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePerformBackup = async () => {
    setLoading(true);
    setErrorMsg(null);
    setResultMsg(null);
    try {
      const res = await fetch("/api/system/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setResultMsg(`✓ Backup created successfully in D:\\Backup DB\nFile: ${data.fileName} (${data.sizeKB} KB)`);
        if (onSuccess) onSuccess(`✓ Database backed up to D:\\Backup DB (${data.sizeKB} KB)`);
        await fetchBackups();
      } else {
        setErrorMsg(data.error || "Failed to create backup on D: Drive");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error performing backup");
    } finally {
      setLoading(false);
    }
  };

  const handlePerformRestore = async () => {
    if (!selectedFile) {
      setErrorMsg("Please select a backup file from D: Drive to restore.");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to restore the database from:\n"${selectedFile}"?\n\nThis will directly overwrite the current active database with this backup snapshot. No extra file will be created.`
    );
    if (!confirmed) return;

    setLoading(true);
    setErrorMsg(null);
    setResultMsg(null);
    try {
      const res = await fetch("/api/system/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: selectedFile }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResultMsg(`✓ Database successfully restored from D:\\Backup DB\\${data.restoredFrom}!`);
        if (onSuccess) onSuccess(`✓ Restored from ${data.restoredFrom}`);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setErrorMsg(data.error || "Failed to restore database from D: Drive");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error performing restore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${mode === "backup" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
              {mode === "backup" ? <HardDrive className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {mode === "backup" ? "Backup Database to D: Drive" : "Restore Database from D: Drive"}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Target Folder: <span className="text-slate-200 font-mono">D:\Backup DB</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Status Message / Success */}
          {resultMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line leading-relaxed">{resultMsg}</div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {mode === "backup" ? (
            /* BACKUP MODE EXPLANATION */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span>Instant D: Drive Snapshot</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Clicking the button below will immediately create a secure, timestamped backup of the active ledger database directly into <strong className="text-slate-900 font-mono">D:\Backup DB</strong> (and a safety copy on Desktop).
                </p>
              </div>

              {/* Existing Backups Count info */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Existing snapshots in D:\Backup DB:</span>
                <span className="font-bold text-slate-800">{backups.length} backups</span>
              </div>
            </div>
          ) : (
            /* RESTORE MODE FILE SELECTION */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Safety Notice</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Select a backup snapshot from the list below. The active database will be directly overwritten with this snapshot.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Select Backup from D:\Backup DB:
                  </label>
                  <button
                    type="button"
                    onClick={fetchBackups}
                    disabled={fetchingList}
                    className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className={`h-3 w-3 ${fetchingList ? "animate-spin" : ""}`} />
                    <span>Refresh list</span>
                  </button>
                </div>

                {fetchingList ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading backups from D: Drive...</div>
                ) : backups.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No backups found in D:\Backup DB. Click "Backup to D:" first to create one.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                    {backups.map((b) => (
                      <label
                        key={b.fileName}
                        className={`flex items-center justify-between p-3.5 text-xs cursor-pointer transition ${
                          selectedFile === b.fileName
                            ? "bg-amber-50/90 font-bold text-amber-900 border-l-4 border-l-amber-600"
                            : "hover:bg-white text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="backupSelection"
                            value={b.fileName}
                            checked={selectedFile === b.fileName}
                            onChange={(e) => setSelectedFile(e.target.value)}
                            className="accent-amber-600"
                          />
                          <div>
                            <span className="font-mono text-xs block text-slate-900">{b.fileName}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {b.formattedDate}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                          {b.sizeKB} KB
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
          >
            Cancel
          </button>

          {mode === "backup" ? (
            <button
              type="button"
              onClick={handlePerformBackup}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              <HardDrive className={`h-4 w-4 ${loading ? "animate-pulse" : "text-emerald-400"}`} />
              <span>{loading ? "Backing up to D: Drive..." : "Hit Backup to D: Drive"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePerformRestore}
              disabled={loading || !selectedFile}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Restoring from D: Drive..." : "Hit Restore from D: Drive"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

